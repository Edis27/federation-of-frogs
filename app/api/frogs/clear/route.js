// app/api/frogs/clear/route.js
import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';

export async function DELETE() {
  try {
    const client = await clientPromise;
    const db = client.db('federation_of_frogs');
    const frogsCollection = db.collection('frogs');

    // Delete all documents in the frogs collection
    const result = await frogsCollection.deleteMany({});

    console.log(`🗑️ Deleted ${result.deletedCount} frogs from database`);

    return NextResponse.json({
      success: true,
      deletedCount: result.deletedCount,
      message: `Successfully deleted ${result.deletedCount} frogs`
    });

  } catch (error) {
    console.error('❌ Error clearing frogs:', error);
    return NextResponse.json(
      { error: 'Failed to clear frogs', details: error.message },
      { status: 500 }
    );
  }
}

// Also support GET for easy browser access
export async function GET() {
  return DELETE();
}