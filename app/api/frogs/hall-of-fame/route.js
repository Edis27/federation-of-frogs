// app/api/frogs/hall-of-fame/route.js
import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';

export async function GET() {
  try {
    const client = await clientPromise;
    const db = client.db('federation_of_frogs');
    const frogsCollection = db.collection('frogs');

    // Get top 10 rarest frogs sorted by rarity score (descending)
    const topFrogs = await frogsCollection
      .find({})
      .sort({ 'rarity.score': -1 })
      .limit(10)
      .toArray();

    return NextResponse.json({
      success: true,
      frogs: topFrogs
    });

  } catch (error) {
    console.error('Error fetching hall of fame:', error);
    return NextResponse.json(
      { error: 'Failed to fetch hall of fame' },
      { status: 500 }
    );
  }
}

export const dynamic = 'force-dynamic';