// app/api/frogs/fotd/process-winner/route.js
import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import {
  Connection,
  PublicKey,
  Transaction,
  Keypair,
} from '@solana/web3.js';
import {
  TOKEN_2022_PROGRAM_ID,
  getAssociatedTokenAddressSync,
  createTransferCheckedInstruction,
  createAssociatedTokenAccountInstruction,
} from '@solana/spl-token';
import bs58 from 'bs58';

const RIBBIT_MINT_ADDRESS = new PublicKey("8aW5vwBWQP3vTqqHGSGs6MSqnRkSvHnti96b55ygpump");
const TREASURY_WALLET = new PublicKey("6hNozPrcywMv5Lyx6VuqaSooWCsNsvQyoXie9W4u8RTK");
const RIBBIT_TOKEN_DECIMALS = 6;

// ✅ 1 MINUTE FOR TESTING - Change to 86400000 for 24 hours in production
const PERIOD_DURATION = 60000; // 1 minute

// ✅ VERCEL CRON USES GET BY DEFAULT
export async function GET(request) {
  console.log('🤖 CRON JOB TRIGGERED (GET):', new Date().toISOString());
  return handleProcessWinner(request);
}

// Also support POST for manual testing
export async function POST(request) {
  console.log('🤖 MANUAL TRIGGER (POST):', new Date().toISOString());
  return handleProcessWinner(request);
}

async function handleProcessWinner(request) {
  try {
    // Verify this is a legitimate cron call
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    
    console.log('🔐 Auth check:', {
      hasAuthHeader: !!authHeader,
      hasCronSecret: !!cronSecret,
      match: cronSecret && authHeader === `Bearer ${cronSecret}`
    });
    
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      console.error('❌ UNAUTHORIZED: Auth header does not match CRON_SECRET');
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const client = await clientPromise;
    const db = client.db('federation_of_frogs');
    const frogsCollection = db.collection('frogs');
    const fotdCollection = db.collection('fotd_periods');
    const payoutsCollection = db.collection('fotd_payouts');

    const now = new Date();

    // Find expired periods that haven't been processed
    const expiredPeriod = await fotdCollection.findOne({
      endTime: { $lte: now },
      winnerProcessed: false
    });

    if (!expiredPeriod) {
      console.log('⏰ No expired periods - timer still running');
      return NextResponse.json({
        success: true,
        message: 'No expired periods to process'
      });
    }

    console.log('🏆 EXPIRED PERIOD FOUND:');
    console.log('   Period ID:', expiredPeriod._id);
    console.log('   Started:', expiredPeriod.startTime.toISOString());
    console.log('   Ended:', expiredPeriod.endTime.toISOString());

    // Get the winner (rarest frog during this period)
    const winner = await frogsCollection.findOne({
      mintedAt: {
        $gte: expiredPeriod.startTime,
        $lt: expiredPeriod.endTime
      }
    }, {
      sort: { 'rarity.score': -1 }
    });

    if (!winner) {
      console.log('📭 NO FROGS MINTED during period');
      
      // Mark as processed
      await fotdCollection.updateOne(
        { _id: expiredPeriod._id },
        { $set: { winnerProcessed: true, noWinner: true } }
      );

      // Create next period
      const nextStartTime = expiredPeriod.endTime;
      const nextEndTime = new Date(nextStartTime.getTime() + PERIOD_DURATION);

      await fotdCollection.insertOne({
        startTime: nextStartTime,
        endTime: nextEndTime,
        winnerProcessed: false,
        createdAt: now
      });

      console.log('🔄 Next period created (no winner)');
      console.log('   Starts:', nextStartTime.toISOString());
      console.log('   Ends:', nextEndTime.toISOString());

      return NextResponse.json({
        success: true,
        message: 'No frogs minted during period - next period created',
        nextPeriodEnds: nextEndTime.toISOString()
      });
    }

    console.log('🐸 WINNER FOUND:');
    console.log('   Wallet:', winner.walletAddress);
    console.log('   Rarity:', winner.rarity.score);
    console.log('   Minted:', winner.mintedAt.toISOString());

    // Process the payout
    try {
      console.log('💰 Starting payout process...');
      
      const connection = new Connection(
        'https://rpc.helius.xyz/?api-key=7a3e3e81-3a09-4804-8148-e4b4c3f53d33',
        'confirmed'
      );

      // Load treasury keypair from environment variable
      const treasuryPrivateKey = process.env.TREASURY_PRIVATE_KEY;
      if (!treasuryPrivateKey) {
        console.error('❌ TREASURY_PRIVATE_KEY not found in environment variables!');
        throw new Error('Treasury private key not configured');
      }
      
      console.log('🔑 Treasury private key found');

      let treasuryKeypair;
      try {
        treasuryKeypair = Keypair.fromSecretKey(bs58.decode(treasuryPrivateKey));
        console.log('✅ Treasury keypair decoded successfully');
        console.log('   Public key matches:', treasuryKeypair.publicKey.toString() === TREASURY_WALLET.toString());
      } catch (keyError) {
        console.error('❌ Failed to decode treasury private key:', keyError);
        throw new Error('Invalid treasury private key format');
      }

      // Get treasury token balance
      const treasuryATA = getAssociatedTokenAddressSync(
        RIBBIT_MINT_ADDRESS,
        TREASURY_WALLET,
        false,
        TOKEN_2022_PROGRAM_ID
      );

      console.log('📊 Fetching treasury balance...');
      console.log('   Treasury ATA:', treasuryATA.toString());

      const treasuryBalance = await connection.getTokenAccountBalance(treasuryATA);
      const currentBalance = BigInt(treasuryBalance.value.amount);

      console.log('💵 Treasury balance:', treasuryBalance.value.uiAmount, '$RIBBIT');
      console.log('   Raw amount:', currentBalance.toString());

      // Calculate 25% of treasury
      const payoutAmount = currentBalance / BigInt(4);
      const payoutUI = Number(payoutAmount) / Math.pow(10, RIBBIT_TOKEN_DECIMALS);

      console.log('💸 Payout calculation:');
      console.log('   25% of treasury:', payoutUI, '$RIBBIT');
      console.log('   Raw amount:', payoutAmount.toString());

      if (payoutAmount === BigInt(0)) {
        console.log('⚠️ TREASURY BALANCE TOO LOW for payout');
        
        await fotdCollection.updateOne(
          { _id: expiredPeriod._id },
          { $set: { winnerProcessed: true, payoutSkipped: true, reason: 'insufficient_balance' } }
        );

        // Create next period
        const nextStartTime = expiredPeriod.endTime;
        const nextEndTime = new Date(nextStartTime.getTime() + PERIOD_DURATION);

        await fotdCollection.insertOne({
          startTime: nextStartTime,
          endTime: nextEndTime,
          winnerProcessed: false,
          createdAt: now
        });

        console.log('🔄 Next period created (insufficient balance)');

        return NextResponse.json({
          success: true,
          message: 'Treasury balance too low - next period created',
          nextPeriodEnds: nextEndTime.toISOString()
        });
      }

      // Build transaction
      console.log('🔨 Building transaction...');
      
      const winnerWallet = new PublicKey(winner.walletAddress);
      const winnerATA = getAssociatedTokenAddressSync(
        RIBBIT_MINT_ADDRESS,
        winnerWallet,
        false,
        TOKEN_2022_PROGRAM_ID
      );

      console.log('   Winner ATA:', winnerATA.toString());

      const { blockhash } = await connection.getLatestBlockhash('confirmed');
      const transaction = new Transaction({
        recentBlockhash: blockhash,
        feePayer: TREASURY_WALLET,
      });

      // Check if winner's ATA exists, create if not
      const winnerAccountInfo = await connection.getAccountInfo(winnerATA);
      if (!winnerAccountInfo) {
        console.log('🆕 Creating winner ATA (account does not exist)');
        transaction.add(
          createAssociatedTokenAccountInstruction(
            TREASURY_WALLET,
            winnerATA,
            winnerWallet,
            RIBBIT_MINT_ADDRESS,
            TOKEN_2022_PROGRAM_ID
          )
        );
      } else {
        console.log('✅ Winner ATA already exists');
      }

      // Add transfer instruction
      console.log('💸 Adding transfer instruction...');
      transaction.add(
        createTransferCheckedInstruction(
          treasuryATA,
          RIBBIT_MINT_ADDRESS,
          winnerATA,
          TREASURY_WALLET,
          Number(payoutAmount),
          RIBBIT_TOKEN_DECIMALS,
          [],
          TOKEN_2022_PROGRAM_ID
        )
      );

      // Sign and send transaction
      console.log('✍️ Signing transaction...');
      transaction.sign(treasuryKeypair);
      
      console.log('📤 Sending transaction...');
      const signature = await connection.sendRawTransaction(
        transaction.serialize(),
        {
          skipPreflight: false,
          preflightCommitment: 'confirmed'
        }
      );

      console.log('📨 Transaction sent! Signature:', signature);
      console.log('⏳ Confirming transaction...');

      // Confirm transaction
      const confirmation = await connection.confirmTransaction({
        signature,
        blockhash,
        lastValidBlockHeight: (await connection.getLatestBlockhash()).lastValidBlockHeight
      }, 'confirmed');

      if (confirmation.value.err) {
        console.error('❌ Transaction failed on-chain:', confirmation.value.err);
        throw new Error(`Transaction failed: ${JSON.stringify(confirmation.value.err)}`);
      }

      console.log('✅ Transaction confirmed!');

      // Record the payout
      console.log('💾 Recording payout in database...');
      await payoutsCollection.insertOne({
        periodId: expiredPeriod._id,
        frogId: winner._id,
        winnerWallet: winner.walletAddress,
        rarityScore: winner.rarity.score,
        payoutAmount: payoutAmount.toString(),
        signature,
        paidAt: new Date()
      });

      // Mark period as processed
      await fotdCollection.updateOne(
        { _id: expiredPeriod._id },
        {
          $set: {
            winnerProcessed: true,
            winnerId: winner._id,
            payoutSignature: signature
          }
        }
      );

      // Create next period
      const nextStartTime = expiredPeriod.endTime;
      const nextEndTime = new Date(nextStartTime.getTime() + PERIOD_DURATION);

      await fotdCollection.insertOne({
        startTime: nextStartTime,
        endTime: nextEndTime,
        winnerProcessed: false,
        createdAt: now
      });

      console.log('✅✅✅ FOTD PAYOUT COMPLETE! ✅✅✅');
      console.log('   Winner:', winner.walletAddress);
      console.log('   Rarity:', winner.rarity.score);
      console.log('   Amount:', payoutUI, '$RIBBIT');
      console.log('   TX:', signature);
      console.log('   View: https://solscan.io/tx/' + signature);
      console.log('🔄 Next period created');
      console.log('   Starts:', nextStartTime.toISOString());
      console.log('   Ends:', nextEndTime.toISOString());

      return NextResponse.json({
        success: true,
        winner: winner.walletAddress,
        rarityScore: winner.rarity.score,
        payoutAmount: payoutAmount.toString(),
        payoutUI: payoutUI,
        signature,
        solscanUrl: `https://solscan.io/tx/${signature}`,
        nextPeriodEnds: nextEndTime.toISOString()
      });

    } catch (payoutError) {
      console.error('❌❌❌ PAYOUT ERROR ❌❌❌');
      console.error('Error type:', payoutError.constructor.name);
      console.error('Error message:', payoutError.message);
      console.error('Full error:', payoutError);
      
      // Mark as processed with error
      await fotdCollection.updateOne(
        { _id: expiredPeriod._id },
        {
          $set: {
            winnerProcessed: true,
            payoutFailed: true,
            error: payoutError.message,
            errorDetails: payoutError.toString()
          }
        }
      );

      // Create next period even after error
      const nextStartTime = expiredPeriod.endTime;
      const nextEndTime = new Date(nextStartTime.getTime() + PERIOD_DURATION);

      await fotdCollection.insertOne({
        startTime: nextStartTime,
        endTime: nextEndTime,
        winnerProcessed: false,
        createdAt: now
      });

      console.log('🔄 Next period created (after error)');

      // Return error details
      return NextResponse.json({
        success: false,
        error: 'Payout failed',
        details: payoutError.message,
        errorType: payoutError.constructor.name
      }, { status: 500 });
    }

  } catch (error) {
    console.error('❌ OUTER ERROR in FOTD winner processing:', error);
    return NextResponse.json(
      { error: 'Failed to process FOTD winner', details: error.message },
      { status: 500 }
    );
  }
}

export const dynamic = 'force-dynamic';