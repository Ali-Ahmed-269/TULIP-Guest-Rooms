import { NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/utils/supabase/server';

export async function POST(request: Request) {
  try {
    let check_in = '';
    let check_out = '';

    // Handle both JSON and FormData requests
    const contentType = request.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      const body = await request.json();
      check_in = body.check_in || '';
      check_out = body.check_out || '';
    } else {
      const formData = await request.formData();
      check_in = (formData.get('check_in') as string) || '';
      check_out = (formData.get('check_out') as string) || '';
    }

    if (!check_in || !check_out) {
      return NextResponse.json({ error: 'Please provide both dates' }, { status: 400 });
    }

    const supabase = createServiceRoleClient();

    // 1. Fetch all rooms
    const { data: rooms, error: roomsError } = await supabase
      .from('rooms')
      .select('id, room_number, status');

    if (roomsError || !rooms) {
      console.error('[API Check Availability] Error fetching rooms:', roomsError);
      return NextResponse.json({ error: 'Server database error' }, { status: 500 });
    }

    // 2. Fetch overlapping bookings
    // booking_status != 'Cancelled' AND check_in_date < check_out AND check_out_date > check_in
    const { data: overlaps, error: overlapsError } = await supabase
      .from('bookings')
      .select('room_id, booking_status, payment_status, payment_method, rooms(room_number)')
      .neq('booking_status', 'Cancelled')
      .lt('check_in_date', check_out)
      .gt('check_out_date', check_in);

    if (overlapsError) {
      console.error('[API Check Availability] Error fetching overlaps:', overlapsError);
      return NextResponse.json({ error: 'Server database error' }, { status: 500 });
    }

    // 3. Map overlapping bookings by room ID
    const byRoom: Record<number, any[]> = {};
    overlaps?.forEach((o: any) => {
      if (!byRoom[o.room_id]) {
        byRoom[o.room_id] = [];
      }
      byRoom[o.room_id].push(o);
    });

    const availability: Record<string, string> = {};

    rooms.forEach((room) => {
      const num = room.room_number;
      const baseStatus = room.status;

      // Maintenance takes precedence
      if (baseStatus === 'Maintenance') {
        availability[num] = 'Maintenance';
        return;
      }

      const overlapList = byRoom[room.id] || [];

      let hasPendingVerification = false;
      let hasConfirmedOverlap = false;

      overlapList.forEach((ob) => {
        if (ob.booking_status === 'Pending' || ob.payment_status === 'Pending Verification') {
          hasPendingVerification = true;
        }
        if (ob.booking_status === 'Confirmed' || ob.payment_status === 'Paid' || ob.payment_method === 'walk_in') {
          hasConfirmedOverlap = true;
        }
      });

      if (hasPendingVerification) {
        availability[num] = 'Pending Verification';
        return;
      }

      if (hasConfirmedOverlap || baseStatus === 'Booked') {
        availability[num] = 'Booked';
        return;
      }

      if (baseStatus === 'Reserved') {
        availability[num] = 'Reserved';
        return;
      }

      availability[num] = 'Available';
    });

    return NextResponse.json(availability);
  } catch (err: any) {
    console.error('[API Check Availability] Unexpected error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
