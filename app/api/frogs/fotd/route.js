// app/api/frogs/fotd/route.js
import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';

// TESTING: 3 minutes (180000 ms) - Change to 86400000 for 24 hours in production
const PERIOD_DURATION = 180000; // 3 minutes for testing

export async function GET() {
  try {
    const client = await clientPromise;
    const db = client.db('federation_of_frogs');
    const frogsCollection = db.collection('frogs');
    const fotdCollection = db.collection('fotd_periods');

    const now = new Date();

    // Get current active period
    let currentPeriod = await fotdCollection.findOne({
      endTime: { $gt: now }
    });

    // If no active period exists, create a new one
    if (!currentPeriod) {
      const startTime = new Date();
      const endTime = new Date(startTime.getTime() + PERIOD_DURATION);

      currentPeriod = {
        startTime,
        endTime,
        winnerProcessed: false,
        createdAt: now
      };

      await fotdCollection.insertOne(currentPeriod);
    }

    // Get the rarest frog minted during this period
    const rarestFrog = await frogsCollection
      .findOne({
        mintedAt: {
          $gte: currentPeriod.startTime,
          $lt: currentPeriod.endTime
        }
      }, {
        sort: { 'rarity.score': -1 }
      });

    return NextResponse.json({
      success: true,
      currentFrog: rarestFrog,
      periodEndsAt: currentPeriod.endTime.toISOString(),
      timeRemaining: currentPeriod.endTime.getTime() - now.getTime()
    });

  } catch (error) {
    console.error('Error fetching FOTD:', error);
    return NextResponse.json(
      { error: 'Failed to fetch FOTD data' },
      { status: 500 }
    );
  }
}

export const dynamic = 'force-dynamic';