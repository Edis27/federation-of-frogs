// app/api/admin/fotd/config/route.js
export async function POST(request) {
    const { periodDurationMs } = await request.json();
    
    // Validate auth, then:
    await configCollection.updateOne(
      { _id: 'main' },
      { $set: { periodDurationMs } }
    );
    
    return NextResponse.json({ success: true });
  }