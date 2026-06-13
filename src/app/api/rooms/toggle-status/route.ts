import { NextResponse } from 'next/server';
import { createClient, createServiceRoleClient } from '@/utils/supabase/server';

export async function POST(request: Request) {
  try {
    // 1. Guard route: verify admin auth session
    const clientSupabase = await createClient();
    const { data: { user } } = await clientSupabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ success: false, message: 'Unauthorized access.' }, { status: 401 });
    }

    // 2. Parse payload
    const formData = await request.formData();
    const roomNumber = (formData.get('room_number') as string) || '';
    const status = (formData.get('status') as string) || '';

    const allowed = ['Available', 'Maintenance', 'Reserved'];
    if (!roomNumber || !allowed.includes(status)) {
      return NextResponse.json({
        success: false,
        message: 'Invalid room or status. Allowed: Available, Maintenance, Reserved.',
      }, { status: 400 });
    }

    const supabase = createServiceRoleClient();

    // 3. Fetch room ID and current status
    const { data: room, error: roomErr } = await supabase
      .from('rooms')
      .select('id, status')
      .eq('room_number', roomNumber)
      .single();

    if (roomErr || !room) {
      return NextResponse.json({ success: false, message: 'Room not found.' }, { status: 404 });
    }

    // 4. Validate active bookings if status is being changed from Booked or setting to non-booked
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const { data: activeBooking, error: activeErr } = await supabase
      .from('bookings')
      .select('id')
      .eq('room_id', room.id)
      .in('booking_status', ['Confirmed', 'Pending'])
      .gte('check_out_date', today)
      .limit(1)
      .maybeSingle();

    if (activeBooking) {
      return NextResponse.json({
        success: false,
        message: 'Room has an active booking. Cancel or complete it before changing status.',
      }, { status: 400 });
    }

    // 5. Update room status
    const { error: updateErr } = await supabase
      .from('rooms')
      .update({ status: status as any })
      .eq('room_number', roomNumber);

    if (updateErr) {
      console.error('[API Toggle Room Status] Update error:', updateErr);
      return NextResponse.json({ success: false, message: 'Database update failed.' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      room_number: roomNumber,
      status: status,
      message: `Room ${roomNumber} set to ${status}.`,
    });
  } catch (err: any) {
    console.error('[API Toggle Room Status] Error:', err);
    return NextResponse.json({ success: false, message: 'Server error.' }, { status: 500 });
  }
}
