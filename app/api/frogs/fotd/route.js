// app/api/frogs/fotd/route.js
import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';

// This endpoint ONLY fetches the current period data
// It does NOT create periods - that's the cron's job!

export async function GET() {
  try {
    const client = await clientPromise;
    const db = client.db('federation_of_frogs');
    const frogsCollection = db.collection('frogs');
    const fotdCollection = db.collection('fotd_periods');

    const now = new Date();

    // Get current active period
    const currentPeriod = await fotdCollection.findOne({
      endTime: { $gt: now }
    });

    // If no active period exists, that's fine - just return null
    // The cron will create the next period when it runs
    if (!currentPeriod) {
      console.log('⏳ No active period - waiting for cron to create next period');
      
      return NextResponse.json({
        success: true,
        currentFrog: null,
        periodEndsAt: null,
        timeRemaining: 0,
        message: 'No active period - next period will start soon'
      });
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