import { NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/utils/supabase/server';

export async function POST(request: Request) {
  try {
    let phone = '';

    // Parse payload (accept both JSON and FormData)
    const contentType = request.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      const body = await request.json();
      phone = (body.phone || '').trim();
    } else {
      const formData = await request.formData();
      phone = (formData.get('phone') as string || '').trim();
    }

    if (!phone) {
      return NextResponse.json({ success: false, message: 'Phone number is required.' }, { status: 400 });
    }

    if (!/^03\d{2}-\d{7}$/.test(phone)) {
      return NextResponse.json({ success: false, message: 'Phone must follow format 03XX-XXXXXXX.' }, { status: 400 });
    }

    const supabase = createServiceRoleClient();

    // Query bookings joining room details
    const { data: rows, error } = await supabase
      .from('bookings')
      .select('id, booking_reference, check_in_date, check_out_date, booking_status, payment_status, rooms(room_number, room_type)')
      .eq('guest_phone', phone)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[API Booking Lookup] Database error:', error);
      return NextResponse.json({ success: false, message: 'Could not search bookings.' }, { status: 500 });
    }

    const bookings = (rows || []).map((row: any) => ({
      id: row.id,
      booking_reference: row.booking_reference,
      room_number: row.rooms?.room_number || 'N/A',
      room_type: row.rooms?.room_type || 'N/A',
      check_in_date: row.check_in_date,
      check_out_date: row.check_out_date,
      booking_status: row.booking_status,
      payment_status: row.payment_status,
      invoice_url: `/api/bookings/invoice?booking_id=${row.id}`,
    }));

    return NextResponse.json({
      success: true,
      count: bookings.length,
      bookings: bookings,
    });
  } catch (err: any) {
    console.error('[API Booking Lookup] Unexpected error:', err);
    return NextResponse.json({ success: false, message: 'Server error occurred.' }, { status: 500 });
  }
}
