// app/api/frogs/fotd/process-winner/route.js
import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import {
  Connection,
  PublicKey,
  Transaction,
  Keypair,
  clusterApiUrl
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

// This should be called by a cron job every minute to check for expired periods
export async function POST(request) {
  try {
    // Verify this is a legitimate cron call (you can add authentication here)
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
      return NextResponse.json({
        success: true,
        message: 'No expired periods to process'
      });
    }

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
      // No frogs minted during this period, just mark as processed
      await fotdCollection.updateOne(
        { _id: expiredPeriod._id },
        { $set: { winnerProcessed: true, noWinner: true } }
      );

      return NextResponse.json({
        success: true,
        message: 'No frogs minted during period'
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
        console.log('Treasury balance too low for payout');
        await fotdCollection.updateOne(
          { _id: expiredPeriod._id },
          { $set: { winnerProcessed: true, payoutSkipped: true, reason: 'insufficient_balance' } }
        );

        return NextResponse.json({
          success: true,
          message: 'Treasury balance too low'
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

      console.log(`✅ FOTD payout successful! Winner: ${winner.walletAddress}, Amount: ${payoutAmount}, TX: ${signature}`);

      return NextResponse.json({
        success: true,
        winner: winner.walletAddress,
        rarityScore: winner.rarity.score,
        payoutAmount: payoutAmount.toString(),
        signature
      });

    } catch (payoutError) {
      console.error('Error processing payout:', payoutError);
      
      // Mark as processed with error to avoid retry loops
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

      throw payoutError;
    }

  } catch (error) {
    console.error('Error in FOTD winner processing:', error);
    return NextResponse.json(
      { error: 'Failed to process FOTD winner', details: error.message },
      { status: 500 }
    );
  }
}

export const dynamic = 'force-dynamic';