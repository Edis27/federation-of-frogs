// app/api/frogs/save/route.js
import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';

const PERIOD_DURATION = 180000; // 3 minutes for testing

export async function POST(request) {
  try {
    const body = await request.json();
    const { walletAddress, frogData, signature } = body;

    if (!walletAddress || !frogData || !signature) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const client = await clientPromise;
    const db = client.db('federation_of_frogs');
    const frogsCollection = db.collection('frogs');

    // Prepare the frog document with all 7 traits
    const frogDocument = {
      walletAddress,
      signature,
      imageData: frogData.image,
      rarity: frogData.rarity,
      mintedAt: new Date(),
      traits: frogData.traits ? {
        background: {
          path: frogData.traits.background.path,
          weight: frogData.traits.background.weight
        },
        type: {
          path: frogData.traits.type.path,
          weight: frogData.traits.type.weight
        },
        head: {
          path: frogData.traits.head.path,
          weight: frogData.traits.head.weight
        },
        body: {
          path: frogData.traits.body.path,
          weight: frogData.traits.body.weight
        },
        eyes: {
          path: frogData.traits.eyes.path,
          weight: frogData.traits.eyes.weight
        },
        mouth: {
          path: frogData.traits.mouth.path,
          weight: frogData.traits.mouth.weight
        },
        accessory: {
          path: frogData.traits.accessory.path,
          weight: frogData.traits.accessory.weight
        }
      } : null
    };

    console.log('💾 Saving frog with all 7 traits:', frogDocument.traits);

    const result = await frogsCollection.insertOne(frogDocument);

    console.log('✅ Frog saved to database!', result.insertedId);

    // ✅ CHECK IF FOTD PERIOD NEEDS TO BE UPDATED
    console.log('🔍 Starting FOTD period check...');
    
    try {
      const fotdCollection = db.collection('fotd_periods');
      const now = new Date();

      console.log('🕐 Current time:', now.toISOString());

      // Get current active period
      const currentPeriod = await fotdCollection.findOne({
        endTime: { $gt: now }
      });

      console.log('📋 Current active period:', currentPeriod ? 'FOUND' : 'NOT FOUND');
      if (currentPeriod) {
        console.log('   Period ends at:', currentPeriod.endTime.toISOString());
      }

      // If no active period exists, create a new one
      if (!currentPeriod) {
        console.log('🔄 No active FOTD period found, creating new period...');
        
        // Check if there's an expired period to mark as processed
        const expiredPeriod = await fotdCollection.findOne({
          endTime: { $lte: now },
          winnerProcessed: false
        });

        if (expiredPeriod) {
          console.log('📌 Found expired period to mark as processed');
          await fotdCollection.updateOne(
            { _id: expiredPeriod._id },
            { $set: { winnerProcessed: true } }
          );
          console.log('✅ Marked expired period as processed');
        } else {
          console.log('ℹ️  No expired period found to mark');
        }

        // Create new period - make sure it includes the current frog
        const frogMintTime = frogDocument.mintedAt;
        const startTime = new Date(frogMintTime.getTime() - 1000); // Start 1 second before frog mint
        const endTime = new Date(startTime.getTime() + PERIOD_DURATION);

        const newPeriod = await fotdCollection.insertOne({
          startTime,
          endTime,
          winnerProcessed: false,
          createdAt: now
        });

        console.log('✅ New FOTD period created!');
        console.log('   Period ID:', newPeriod.insertedId);
        console.log('   Starts:', startTime.toISOString());
        console.log('   Ends:', endTime.toISOString());
        console.log('   Frog minted at:', frogMintTime.toISOString());
      }
    } catch (fotdError) {
      console.error('❌ Error in FOTD period check:', fotdError);
      // Don't throw - we still want the frog to be saved
    }

    return NextResponse.json({
      success: true,
      frogId: result.insertedId
    });

  } catch (error) {
    console.error('Error saving frog:', error);
    return NextResponse.json(
      { error: 'Failed to save frog' },
      { status: 500 }
    );
  }
}