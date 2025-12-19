// app/api/frogs/fotd/init/route.js
import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';

const PERIOD_DURATION = 60000; // 1 minute for testing

export async function GET() {
  try {
    const client = await clientPromise;
    const db = client.db('federation_of_frogs');
    const fotdCollection = db.collection('fotd_periods');

    const now = new Date();

    // Check if any period already exists
    const existingPeriod = await fotdCollection.findOne({});
    
    if (existingPeriod) {
      return NextResponse.json({
        success: false,
        message: 'FOTD system already initialized',
        existingPeriod: {
          startTime: existingPeriod.startTime,
          endTime: existingPeriod.endTime,
          winnerProcessed: existingPeriod.winnerProcessed
        }
      });
    }

    // Create the very first period
    const startTime = now;
    const endTime = new Date(startTime.getTime() + PERIOD_DURATION);

    const result = await fotdCollection.insertOne({
      startTime,
      endTime,
      winnerProcessed: false,
      createdAt: now,
      initialPeriod: true
    });

    console.log('✅ FOTD System Initialized!');
    console.log('   Period ID:', result.insertedId);
    console.log('   Starts:', startTime.toISOString());
    console.log('   Ends:', endTime.toISOString());

    return NextResponse.json({
      success: true,
      message: 'FOTD system initialized successfully',
      period: {
        id: result.insertedId,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
        duration: '1 minute (testing mode)'
      }
    });

  } catch (error) {
    console.error('❌ Initialization error:', error);
    return NextResponse.json(
      { error: 'Failed to initialize FOTD system', details: error.message },
      { status: 500 }
    );
  }
}

export const dynamic = 'force-dynamic';