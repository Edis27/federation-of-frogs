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

    // ✅ ONLY auto-initialize if NO periods exist at all (first time ever)
    if (!currentPeriod) {
      console.log('🔍 No active period found, checking for recent expired periods...');
      
      // Check if there's a recently expired period (within last 2 minutes)
      // This means cron is about to create a new one, so we should wait
      const recentExpiredPeriod = await fotdCollection.findOne({
        endTime: { 
          $lte: now,
          $gt: new Date(now.getTime() - 120000) // Within last 2 minutes
        }
      });

      if (recentExpiredPeriod) {
        console.log('⏳ Recent expired period found - waiting for cron to create next period');
        console.log('   Expired at:', recentExpiredPeriod.endTime.toISOString());
        
        // Return info about the expired period for now
        return NextResponse.json({
          success: true,
          currentFrog: null,
          periodEndsAt: null,
          timeRemaining: 0,
          message: 'Waiting for next period to be created by cron',
          lastPeriodEnded: recentExpiredPeriod.endTime.toISOString()
        });
      }

      // Check if ANY periods exist at all
      const anyPeriod = await fotdCollection.findOne({});
      
      if (anyPeriod) {
        console.log('⚠️ Periods exist but none are active - this should not happen!');
        // Don't create a new period - let cron handle it
        return NextResponse.json({
          success: false,
          error: 'No active period and system needs initialization',
          message: 'Please wait for cron to create next period'
        }, { status: 503 });
      }

      // Only initialize if this is the VERY FIRST TIME (no periods exist at all)
      console.log('🚀 First time initialization - no periods exist at all');
      
      const startTime = now;
      const endTime = new Date(startTime.getTime() + PERIOD_DURATION);

      const result = await fotdCollection.insertOne({
        startTime,
        endTime,
        winnerProcessed: false,
        createdAt: now,
        firstTimeInit: true
      });

      console.log('✅ FIRST PERIOD EVER created');
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