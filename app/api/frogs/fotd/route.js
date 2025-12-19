// app/api/frogs/fotd/route.js
import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';

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
    }, {
      sort: { endTime: 1 } // Get the earliest ending active period
    });

    if (!currentPeriod) {
      console.log('⏳ No active period found');
      
      // Check when the last period ended
      const lastPeriod = await fotdCollection.findOne(
        {},
        { sort: { endTime: -1 } }
      );

      if (!lastPeriod) {
        console.log('📭 No periods exist at all - waiting for cron to initialize');
      } else {
        console.log('⌛ Last period ended:', lastPeriod.endTime.toISOString());
        console.log('   Waiting for cron to create next period...');
      }
      
      return NextResponse.json({
        success: true,
        currentFrog: null,
        periodEndsAt: null,
        timeRemaining: 0,
        message: 'No active period - next period starting soon'
      });
    }

    console.log('✅ Active period found');
    console.log('   Started:', currentPeriod.startTime.toISOString());
    console.log('   Ends:', currentPeriod.endTime.toISOString());

    // Get the rarest frog minted during this period
    const rarestFrog = await frogsCollection.findOne({
      mintedAt: {
        $gte: currentPeriod.startTime,
        $lt: currentPeriod.endTime
      }
    }, {
      sort: { 'rarity.score': -1 }
    });

    if (rarestFrog) {
      console.log('🐸 Current leader:', rarestFrog.walletAddress);
      console.log('   Rarity:', rarestFrog.rarity.score);
    } else {
      console.log('📭 No frogs minted yet this period');
    }

    const timeRemaining = currentPeriod.endTime.getTime() - now.getTime();

    return NextResponse.json({
      success: true,
      currentFrog: rarestFrog,
      periodEndsAt: currentPeriod.endTime.toISOString(),
      timeRemaining: Math.max(0, timeRemaining),
      periodStart: currentPeriod.startTime.toISOString()
    });

  } catch (error) {
    console.error('❌ Error fetching FOTD:', error);
    return NextResponse.json(
      { error: 'Failed to fetch FOTD data', details: error.message },
      { status: 500 }
    );
  }
}

export const dynamic = 'force-dynamic';