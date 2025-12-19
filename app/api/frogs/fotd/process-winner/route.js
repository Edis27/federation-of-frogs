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

// ✅ 1 MINUTE FOR TESTING
const PERIOD_DURATION = 60000; // 1 minute

export async function GET(request) {
  console.log('🤖 CRON JOB TRIGGERED (GET):', new Date().toISOString());
  return handleProcessWinner(request);
}

export async function POST(request) {
  console.log('🤖 MANUAL TRIGGER (POST):', new Date().toISOString());
  return handleProcessWinner(request);
}

async function handleProcessWinner(request) {
  try {
    // ✅ FIX: Make authorization optional for cron jobs
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    
    // Only check auth if CRON_SECRET is actually set
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      console.error('❌ UNAUTHORIZED');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const client = await clientPromise;
    const db = client.db('federation_of_frogs');
    const frogsCollection = db.collection('frogs');
    const fotdCollection = db.collection('fotd_periods');
    const payoutsCollection = db.collection('fotd_payouts');

    const now = new Date();

    // Check if there's ANY period at all
    const anyPeriod = await fotdCollection.findOne({}, { sort: { endTime: -1 } });
    
    if (!anyPeriod) {
      // 🚀 FIRST TIME SETUP - Create the very first period
      console.log('🚀 FIRST RUN - Creating initial period');
      
      const startTime = now;
      const endTime = new Date(startTime.getTime() + PERIOD_DURATION);

      await fotdCollection.insertOne({
        startTime,
        endTime,
        winnerProcessed: false,
        createdAt: now,
        initialPeriod: true
      });

      console.log('✅ Initial period created');
      console.log('   Starts:', startTime.toISOString());
      console.log('   Ends:', endTime.toISOString());
      
      return NextResponse.json({
        success: true,
        message: 'Initial period created',
        periodEndsAt: endTime.toISOString()
      });
    }

    // Find expired periods that haven't been processed
    const expiredPeriod = await fotdCollection.findOne({
      endTime: { $lte: now },
      winnerProcessed: false
    });

    if (!expiredPeriod) {
      // Check if current period is still active
      const activePeriod = await fotdCollection.findOne({
        endTime: { $gt: now }
      });

      if (activePeriod) {
        console.log('⏰ Current period still active');
        console.log('   Ends:', activePeriod.endTime.toISOString());
        return NextResponse.json({
          success: true,
          message: 'No expired periods to process',
          currentPeriodEnds: activePeriod.endTime.toISOString()
        });
      } else {
        // No active period exists - create one now
        console.log('🔄 No active period found - creating new period');
        const startTime = now;
        const endTime = new Date(startTime.getTime() + PERIOD_DURATION);

        await fotdCollection.insertOne({
          startTime,
          endTime,
          winnerProcessed: false,
          createdAt: now
        });

        console.log('✅ New period created');
        return NextResponse.json({
          success: true,
          message: 'New period created',
          periodEndsAt: endTime.toISOString()
        });
      }
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

      // Create next period starting NOW
      const nextStartTime = now; // ✅ Use current time, not old period's endTime
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

      const treasuryPrivateKey = process.env.TREASURY_PRIVATE_KEY;
      if (!treasuryPrivateKey) {
        throw new Error('Treasury private key not configured');
      }

      const treasuryKeypair = Keypair.fromSecretKey(bs58.decode(treasuryPrivateKey));
      console.log('✅ Treasury keypair loaded');

      const treasuryATA = getAssociatedTokenAddressSync(
        RIBBIT_MINT_ADDRESS,
        TREASURY_WALLET,
        false,
        TOKEN_2022_PROGRAM_ID
      );

      const treasuryBalance = await connection.getTokenAccountBalance(treasuryATA);
      const currentBalance = BigInt(treasuryBalance.value.amount);

      console.log('💵 Treasury balance:', treasuryBalance.value.uiAmount, '$RIBBIT');

      // Calculate 25% of treasury
      const payoutAmount = currentBalance / BigInt(4);
      const payoutUI = Number(payoutAmount) / Math.pow(10, RIBBIT_TOKEN_DECIMALS);

      console.log('💸 Payout: 25% =', payoutUI, '$RIBBIT');

      if (payoutAmount === BigInt(0)) {
        console.log('⚠️ Treasury balance too low');
        
        await fotdCollection.updateOne(
          { _id: expiredPeriod._id },
          { $set: { winnerProcessed: true, payoutSkipped: true, reason: 'insufficient_balance' } }
        );

        // Create next period starting NOW
        const nextStartTime = now; // ✅ Use current time
        const nextEndTime = new Date(nextStartTime.getTime() + PERIOD_DURATION);

        await fotdCollection.insertOne({
          startTime: nextStartTime,
          endTime: nextEndTime,
          winnerProcessed: false,
          createdAt: now
        });

        return NextResponse.json({
          success: true,
          message: 'Treasury balance too low - next period created',
          nextPeriodEnds: nextEndTime.toISOString()
        });
      }

      // Build transaction
      const winnerWallet = new PublicKey(winner.walletAddress);
      const winnerATA = getAssociatedTokenAddressSync(
        RIBBIT_MINT_ADDRESS,
        winnerWallet,
        false,
        TOKEN_2022_PROGRAM_ID
      );

      const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed');
      const transaction = new Transaction({
        recentBlockhash: blockhash,
        feePayer: TREASURY_WALLET,
      });

      // Check if winner's ATA exists
      const winnerAccountInfo = await connection.getAccountInfo(winnerATA);
      if (!winnerAccountInfo) {
        console.log('🆕 Creating winner ATA');
        transaction.add(
          createAssociatedTokenAccountInstruction(
            TREASURY_WALLET,
            winnerATA,
            winnerWallet,
            RIBBIT_MINT_ADDRESS,
            TOKEN_2022_PROGRAM_ID
          )
        );
      }

      // Add transfer instruction
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

      // Sign and send
      transaction.sign(treasuryKeypair);
      const signature = await connection.sendRawTransaction(
        transaction.serialize(),
        { skipPreflight: false, preflightCommitment: 'confirmed' }
      );

      console.log('📨 Transaction sent:', signature);

      // Confirm transaction
      const confirmation = await connection.confirmTransaction({
        signature,
        blockhash,
        lastValidBlockHeight
      }, 'confirmed');

      if (confirmation.value.err) {
        throw new Error(`Transaction failed: ${JSON.stringify(confirmation.value.err)}`);
      }

      console.log('✅ Transaction confirmed!');

      // Record payout
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
        { $set: { winnerProcessed: true, winnerId: winner._id, payoutSignature: signature } }
      );

      // Create next period starting NOW
      const nextStartTime = now; // ✅ Use current time
      const nextEndTime = new Date(nextStartTime.getTime() + PERIOD_DURATION);

      await fotdCollection.insertOne({
        startTime: nextStartTime,
        endTime: nextEndTime,
        winnerProcessed: false,
        createdAt: now
      });

      console.log('✅✅✅ FOTD PAYOUT COMPLETE! ✅✅✅');
      console.log('   View: https://solscan.io/tx/' + signature);
      console.log('🔄 Next period: ends', nextEndTime.toISOString());

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
      console.error('❌ PAYOUT ERROR:', payoutError.message);
      
      // Mark as processed with error
      await fotdCollection.updateOne(
        { _id: expiredPeriod._id },
        { $set: { winnerProcessed: true, payoutFailed: true, error: payoutError.message } }
      );

      // Create next period even after error, starting NOW
      const nextStartTime = now; // ✅ Use current time
      const nextEndTime = new Date(nextStartTime.getTime() + PERIOD_DURATION);

      await fotdCollection.insertOne({
        startTime: nextStartTime,
        endTime: nextEndTime,
        winnerProcessed: false,
        createdAt: now
      });

      return NextResponse.json({
        success: false,
        error: 'Payout failed',
        details: payoutError.message,
        nextPeriodEnds: nextEndTime.toISOString()
      }, { status: 500 });
    }

  } catch (error) {
    console.error('❌ OUTER ERROR:', error);
    // ✅ FIX: Always return a response, even on error
    return NextResponse.json(
      { error: 'Failed to process FOTD winner', details: error.message },
      { status: 500 }
    );
  }
}

export const dynamic = 'force-dynamic';