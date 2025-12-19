import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';

export async function POST(request) {
  try {
    const { searchParams } = new URL(request.url);
    const secret = searchParams.get('secret');
    
    if (secret !== process.env.INIT_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const client = await clientPromise;
    const db = client.db('federation_of_frogs');
    const fotdCollection = db.collection('fotd_periods');

    const now = new Date();
    const endTime = new Date(now.getTime() + 60000);

    await fotdCollection.insertOne({
      startTime: now,
      endTime: endTime,
      winnerProcessed: false,
      createdAt: now,
      manualInit: true
    });

    return NextResponse.json({
      success: true,
      message: 'Period initialized',
      endsAt: endTime.toISOString()
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic';