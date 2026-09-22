import { NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/utils/supabase/server';
import { validateOrigin } from '@/utils/csrf';

async function enforceRateLimit(supabase: ReturnType<typeof createServiceRoleClient>, ip: string) {
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { count, error } = await supabase
    .from('rate_limit_log')
    .select('*', { count: 'exact', head: true })
    .eq('ip_address', `lookup:${ip}`)
    .gte('attempted_at', oneHourAgo);

  if (error) {
    console.warn('[Rate Limiter] Lookup limit check failed, allowing request:', error);
    return true;
  }

  if ((count || 0) >= 10) {
    return false;
  }

  await supabase.from('rate_limit_log').insert({ ip_address: `lookup:${ip}` });
  return true;
}

export async function POST(request: Request) {
  // CSRF origin check — reject cross-origin POST requests
  const csrfError = validateOrigin(request);
  if (csrfError) return csrfError;

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
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || 'unknown';

    if (!(await enforceRateLimit(supabase, ip))) {
      return NextResponse.json({ success: false, message: 'Too many lookup attempts. Please try again later.' }, { status: 429 });
    }

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
      invoice_url: `/api/bookings/invoice?booking_id=${encodeURIComponent(row.booking_reference || row.id)}&phone=${encodeURIComponent(phone)}`,
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
