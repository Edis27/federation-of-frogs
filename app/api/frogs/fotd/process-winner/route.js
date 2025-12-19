// app/api/frogs/fotd/process-winner/route.js
import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
// ... other imports

// ✅ Store period duration in database, not code
const DEFAULT_PERIOD_DURATION = 60000; // Only used for first-time setup

export async function GET(request) {
  console.log('🤖 CRON CHECK:', new Date().toISOString());
  return handleProcessWinner(request);
}

async function handleProcessWinner(request) {
  try {
    // Auth check...
    
    const client = await clientPromise;
    const db = client.db('federation_of_frogs');
    const frogsCollection = db.collection('frogs');
    const fotdCollection = db.collection('fotd_periods');
    const payoutsCollection = db.collection('fotd_payouts');
    const configCollection = db.collection('fotd_config');

    const now = new Date();

    // ✅ Get configuration from database
    let config = await configCollection.findOne({ _id: 'main' });
    if (!config) {
      // First-time setup
      config = {
        _id: 'main',
        periodDurationMs: DEFAULT_PERIOD_DURATION,
        createdAt: now
      };
      await configCollection.insertOne(config);
    }

    // ✅ Find expired periods (timer stored in DB)
    const expiredPeriod = await fotdCollection.findOne({
      endTime: { $lte: now },
      winnerProcessed: false
    });

    if (!expiredPeriod) {
      // Check for active period
      const activePeriod = await fotdCollection.findOne({
        endTime: { $gt: now }
      });

      if (activePeriod) {
        console.log('⏰ Period still active, ends:', activePeriod.endTime.toISOString());
        return NextResponse.json({
          success: true,
          message: 'No action needed',
          nextCheck: activePeriod.endTime.toISOString()
        });
      }

      // ✅ No active period - create one using database config
      console.log('🔄 Creating new period');
      const startTime = now;
      const endTime = new Date(startTime.getTime() + config.periodDurationMs);

      await fotdCollection.insertOne({
        startTime,
        endTime,
        winnerProcessed: false,
        createdAt: now
      });

      console.log('✅ New period created, ends:', endTime.toISOString());
      return NextResponse.json({
        success: true,
        message: 'New period created',
        periodEndsAt: endTime.toISOString()
      });
    }

    // ✅ Process expired period (rest of your logic)
    console.log('🏆 Processing expired period:', expiredPeriod._id);
    
    // ... your existing winner processing logic ...
    
    // After processing, create next period using DB config
    const nextStartTime = expiredPeriod.endTime;
    const nextEndTime = new Date(nextStartTime.getTime() + config.periodDurationMs);

    await fotdCollection.insertOne({
      startTime: nextStartTime,
      endTime: nextEndTime,
      winnerProcessed: false,
      createdAt: now
    });

    // ... rest of response ...

  } catch (error) {
    console.error('❌ Error:', error);
    return NextResponse.json(
      { error: 'Failed to process', details: error.message },
      { status: 500 }
    );
  }
}