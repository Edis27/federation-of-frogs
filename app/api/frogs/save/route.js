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

    const frogDocument = {
      walletAddress,
      signature,
      imageData: frogData.image,
      rarity: frogData.rarity,
      mintedAt: new Date(),
      traits: frogData.traits || {}
    };

    const result = await frogsCollection.insertOne(frogDocument);

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