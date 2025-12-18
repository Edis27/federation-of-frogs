// app/api/frogs/fotd/route.js
import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';

// ✅ 1 MINUTE FOR TESTING - Change to 86400000 for 24 hours in production
const PERIOD_DURATION = 60000; // 1 minute

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

    // ✅ AUTO-INITIALIZE: If no active period exists, create one
    // This happens automatically on first request (no manual intervention needed)
    if (!currentPeriod) {
      console.log('🚀 No active period found - auto-initializing timer');
      
      const startTime = now;
      const endTime = new Date(startTime.getTime() + PERIOD_DURATION);

      const result = await fotdCollection.insertOne({
        startTime,
        endTime,
        winnerProcessed: false,
        createdAt: now,
        autoInitialized: true
      });

      console.log('✅ Timer auto-initialized');
      console.log('   Period ID:', result.insertedId);
      console.log('   Starts:', startTime.toISOString());
      console.log('   Ends:', endTime.toISOString());
      console.log('🤖 Cron will now manage all future periods');

      currentPeriod = {
        _id: result.insertedId,
        startTime,
        endTime,
        winnerProcessed: false,
        createdAt: now
      };
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