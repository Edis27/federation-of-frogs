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

export async function POST(request) {
  try {
    // Verify this is a legitimate cron call
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
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

    console.log('🏆 Processing expired period:', expiredPeriod._id);

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
      console.log('📭 No frogs minted during this period');
      
      // Mark as processed
      await fotdCollection.updateOne(
        { _id: expiredPeriod._id },
        { $set: { winnerProcessed: true, noWinner: true } }
      );

      // ✅ CREATE NEXT PERIOD (NO WINNER CASE)
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

    // Process the payout
    try {
      const connection = new Connection(
        'https://rpc.helius.xyz/?api-key=7a3e3e81-3a09-4804-8148-e4b4c3f53d33',
        'confirmed'
      );

      // Load treasury keypair from environment variable
      const treasuryPrivateKey = process.env.TREASURY_PRIVATE_KEY;
      if (!treasuryPrivateKey) {
        throw new Error('Treasury private key not configured');
      }

      const treasuryKeypair = Keypair.fromSecretKey(
        bs58.decode(treasuryPrivateKey)
      );

      // Get treasury token balance
      const treasuryATA = getAssociatedTokenAddressSync(
        RIBBIT_MINT_ADDRESS,
        TREASURY_WALLET,
        false,
        TOKEN_2022_PROGRAM_ID
      );

      const treasuryBalance = await connection.getTokenAccountBalance(treasuryATA);
      const currentBalance = BigInt(treasuryBalance.value.amount);

      // Calculate 25% of treasury
      const payoutAmount = currentBalance / BigInt(4);

      if (payoutAmount === BigInt(0)) {
        console.log('💰 Treasury balance too low for payout');
        
        await fotdCollection.updateOne(
          { _id: expiredPeriod._id },
          { $set: { winnerProcessed: true, payoutSkipped: true, reason: 'insufficient_balance' } }
        );

        // ✅ CREATE NEXT PERIOD (INSUFFICIENT BALANCE CASE)
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
      const winnerWallet = new PublicKey(winner.walletAddress);
      const winnerATA = getAssociatedTokenAddressSync(
        RIBBIT_MINT_ADDRESS,
        winnerWallet,
        false,
        TOKEN_2022_PROGRAM_ID
      );

      const { blockhash } = await connection.getLatestBlockhash('confirmed');
      const transaction = new Transaction({
        recentBlockhash: blockhash,
        feePayer: TREASURY_WALLET,
      });

      // Check if winner's ATA exists, create if not
      const winnerAccountInfo = await connection.getAccountInfo(winnerATA);
      if (!winnerAccountInfo) {
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

      // Sign and send transaction
      transaction.sign(treasuryKeypair);
      const signature = await connection.sendRawTransaction(
        transaction.serialize()
      );

      // Confirm transaction
      await connection.confirmTransaction({
        signature,
        blockhash,
        lastValidBlockHeight: (await connection.getLatestBlockhash()).lastValidBlockHeight
      }, 'confirmed');

      // Record the payout
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

      // ✅ CREATE NEXT PERIOD (SUCCESS CASE)
      const nextStartTime = expiredPeriod.endTime;
      const nextEndTime = new Date(nextStartTime.getTime() + PERIOD_DURATION);

      await fotdCollection.insertOne({
        startTime: nextStartTime,
        endTime: nextEndTime,
        winnerProcessed: false,
        createdAt: now
      });

      console.log('✅ FOTD payout successful!');
      console.log('   Winner:', winner.walletAddress);
      console.log('   Rarity:', winner.rarity.score);
      console.log('   Amount:', payoutAmount.toString());
      console.log('   TX:', signature);
      console.log('🔄 Next period created');
      console.log('   Starts:', nextStartTime.toISOString());
      console.log('   Ends:', nextEndTime.toISOString());

      return NextResponse.json({
        success: true,
        winner: winner.walletAddress,
        rarityScore: winner.rarity.score,
        payoutAmount: payoutAmount.toString(),
        signature,
        nextPeriodEnds: nextEndTime.toISOString()
      });

    } catch (payoutError) {
      console.error('❌ Error processing payout:', payoutError);
      
      // Mark as processed with error
      await fotdCollection.updateOne(
        { _id: expiredPeriod._id },
        {
          $set: {
            winnerProcessed: true,
            payoutFailed: true,
            error: payoutError.message
          }
        }
      );

      // ✅ CREATE NEXT PERIOD (ERROR CASE)
      const nextStartTime = expiredPeriod.endTime;
      const nextEndTime = new Date(nextStartTime.getTime() + PERIOD_DURATION);

      await fotdCollection.insertOne({
        startTime: nextStartTime,
        endTime: nextEndTime,
        winnerProcessed: false,
        createdAt: now
      });

      console.log('🔄 Next period created (after error)');

      throw payoutError;
    }

  } catch (error) {
    console.error('❌ Error in FOTD winner processing:', error);
    return NextResponse.json(
      { error: 'Failed to process FOTD winner', details: error.message },
      { status: 500 }
    );
  }
}

export const dynamic = 'force-dynamic';