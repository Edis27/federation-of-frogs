import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';

export async function POST() {
  try {
    const client = await clientPromise;
    const db = client.db('federation_of_frogs');
    const fotdCollection = db.collection('fotd_periods');

    const now = new Date();
    const endTime = new Date(now.getTime() + 60000); // 1 minute from now

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
```

Then when you launch, just visit:
```
https://federation-of-frogs.vercel.app/api/frogs/fotd/init