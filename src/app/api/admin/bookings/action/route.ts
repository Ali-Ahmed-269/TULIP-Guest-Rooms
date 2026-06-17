import { NextResponse } from 'next/server';
import { createClient, createServiceRoleClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';

export async function POST(request: Request) {
  try {
    // 1. Guard route: verify admin auth session
    const clientSupabase = await createClient();
    const { data: { user } } = await clientSupabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ success: false, message: 'Unauthorized access.' }, { status: 401 });
    }

    // 2. Parse payload
    const body = await request.json();
    const { booking_id, action } = body;

    if (!booking_id || !['verify', 'reject', 'cancel'].includes(action)) {
      return NextResponse.json({ success: false, message: 'Invalid payload.' }, { status: 400 });
    }

    const supabase = createServiceRoleClient();

    // Fetch the booking record to get room_id
    const { data: booking, error: fetchErr } = await supabase
      .from('bookings')
      .select('id, room_id')
      .eq('id', booking_id)
      .single();

    if (fetchErr || !booking) {
      return NextResponse.json({ success: false, message: 'Booking not found.' }, { status: 404 });
    }

    if (action === 'verify') {
      // Set payment_status = 'Paid', booking_status = 'Confirmed'
      const { error: bookingUpdateErr } = await supabase
        .from('bookings')
        .update({
          payment_status: 'Paid',
          booking_status: 'Confirmed'
        })
        .eq('id', booking_id);

      if (bookingUpdateErr) {
        return NextResponse.json({ success: false, message: 'Failed to update booking status.' }, { status: 500 });
      }

      // Update room status to 'Booked'
      await supabase
        .from('rooms')
        .update({ status: 'Booked' })
        .eq('id', booking.room_id);

      revalidatePath('/admin', 'layout');
      return NextResponse.json({ success: true, message: 'Booking verified successfully.' });
    }

    if (action === 'reject') {
      // Set payment_status = 'Failed', booking_status = 'Cancelled'
      const { error: bookingUpdateErr } = await supabase
        .from('bookings')
        .update({
          payment_status: 'Failed',
          booking_status: 'Cancelled'
        })
        .eq('id', booking_id);

      if (bookingUpdateErr) {
        return NextResponse.json({ success: false, message: 'Failed to reject booking.' }, { status: 500 });
      }

      // Update room status to 'Available'
      await supabase
        .from('rooms')
        .update({ status: 'Available' })
        .eq('id', booking.room_id);

      revalidatePath('/admin', 'layout');
      return NextResponse.json({ success: true, message: 'Booking rejected and cancelled.' });
    }

    if (action === 'cancel') {
      // Set booking_status = 'Cancelled'
      const { error: bookingUpdateErr } = await supabase
        .from('bookings')
        .update({
          booking_status: 'Cancelled'
        })
        .eq('id', booking_id);

      if (bookingUpdateErr) {
        return NextResponse.json({ success: false, message: 'Failed to cancel booking.' }, { status: 500 });
      }

      // Update room status to 'Available'
      await supabase
        .from('rooms')
        .update({ status: 'Available' })
        .eq('id', booking.room_id);

      revalidatePath('/admin', 'layout');
      return NextResponse.json({ success: true, message: 'Booking cancelled successfully.' });
    }

    return NextResponse.json({ success: false, message: 'Unsupported action.' }, { status: 400 });

  } catch (err: any) {
    console.error('[API Booking Action] Error:', err);
    return NextResponse.json({ success: false, message: 'Server error occurred.' }, { status: 500 });
  }
}
