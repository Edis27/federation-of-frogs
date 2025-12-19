// app/api/frogs/save/route.js
import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';

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

    console.log('💾 Saving frog with all 7 traits');

    const result = await frogsCollection.insertOne(frogDocument);

    console.log('✅ Frog saved to database!', result.insertedId);

    // ✅ NO FOTD PERIOD LOGIC HERE
    // Periods are managed ONLY by the cron job

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