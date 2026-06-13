import { NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/utils/supabase/server';

function isValidPhone(phone: string) {
  return /^03\d{2}-\d{7}$/.test(phone);
}

async function enforceRateLimit(supabase: ReturnType<typeof createServiceRoleClient>, ip: string, action = 'reviews') {
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { count, error } = await supabase
    .from('rate_limit_log')
    .select('*', { count: 'exact', head: true })
    .eq('ip_address', `${action}:${ip}`)
    .gte('attempted_at', oneHourAgo);

  if (error) {
    console.warn('[Rate Limiter] Review limit check failed, allowing request:', error);
    return true;
  }

  if ((count || 0) >= 8) {
    return false;
  }

  await supabase.from('rate_limit_log').insert({ ip_address: `${action}:${ip}` });
  return true;
}

export async function GET() {
  try {
    const supabase = createServiceRoleClient();
    
    const { data: reviews, error } = await supabase
      .from('reviews')
      .select('guest_name, rating, review_text, created_at')
      .eq('status', 'Approved')
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) {
      console.error('[API Reviews GET] Database error:', error);
      return NextResponse.json({ success: false, message: 'Server error' }, { status: 500 });
    }

    return NextResponse.json({ success: true, reviews: reviews || [] });
  } catch (err: any) {
    console.error('[API Reviews GET] Unexpected error:', err);
    return NextResponse.json({ success: false, message: 'Server error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    let bookingRef = '';
    let phone = '';
    let rating = 0;
    let guestName = '';
    let reviewText = '';

    // Parse body (FormData or JSON)
    const contentType = request.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      const body = await request.json();
      bookingRef = (body.booking_id || '').trim(); // 'booking_id' contains the reference string (e.g. TGR-2026-0001)
      phone = (body.phone || '').trim();
      rating = parseInt(body.rating || '0', 10);
      guestName = (body.guest_name || '').trim();
      reviewText = (body.review_text || '').trim();
    } else {
      const formData = await request.formData();
      bookingRef = (formData.get('booking_id') as string || '').trim();
      phone = (formData.get('phone') as string || '').trim();
      rating = parseInt(formData.get('rating') as string || '0', 10);
      guestName = (formData.get('guest_name') as string || '').trim();
      reviewText = (formData.get('review_text') as string || '').trim();
    }

    // Input validations
    if (!bookingRef) return NextResponse.json({ success: false, message: 'Booking ID is required.' }, { status: 400 });
    if (!phone || !isValidPhone(phone)) {
      return NextResponse.json({ success: false, message: 'Valid phone number (03XX-XXXXXXX) is required.' }, { status: 400 });
    }
    if (rating < 1 || rating > 5) {
      return NextResponse.json({ success: false, message: 'Please select a rating from 1 to 5 stars.' }, { status: 400 });
    }
    if (!guestName) return NextResponse.json({ success: false, message: 'Your name is required.' }, { status: 400 });
    if (guestName.length > 100) return NextResponse.json({ success: false, message: 'Name must not exceed 100 characters.' }, { status: 400 });
    if (!reviewText) return NextResponse.json({ success: false, message: 'Review text is required.' }, { status: 400 });
    if (reviewText.length > 2000) return NextResponse.json({ success: false, message: 'Review must not exceed 2000 characters.' }, { status: 400 });

    const supabase = createServiceRoleClient();
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || 'unknown';

    if (!(await enforceRateLimit(supabase, ip))) {
      return NextResponse.json({ success: false, message: 'Too many review attempts. Please try again later.' }, { status: 429 });
    }

    // 1. Resolve booking reference
    const { data: booking, error: bookingErr } = await supabase
      .from('bookings')
      .select('id, guest_phone, booking_status')
      .eq('booking_reference', bookingRef)
      .maybeSingle();

    if (bookingErr || !booking) {
      return NextResponse.json({ success: false, message: 'Booking not found. Check your Booking ID.' }, { status: 404 });
    }

    // 2. Verify phone matches
    if (booking.guest_phone !== phone) {
      return NextResponse.json({ success: false, message: 'Phone number does not match this booking.' }, { status: 400 });
    }

    // 3. Verify booking status is Confirmed or Completed
    if (!['Confirmed', 'Completed'].includes(booking.booking_status)) {
      return NextResponse.json({
        success: false,
        message: 'Reviews can only be submitted after your stay is confirmed or completed.',
      }, { status: 400 });
    }

    // 4. Check for duplicates
    const { data: dupReview } = await supabase
      .from('reviews')
      .select('id')
      .eq('booking_id', booking.id)
      .maybeSingle();

    if (dupReview) {
      return NextResponse.json({ success: false, message: 'A review has already been submitted for this booking.' }, { status: 400 });
    }

    // 5. Insert new review
    const { error: insertErr } = await supabase
      .from('reviews')
      .insert({
        booking_id: booking.id,
        guest_name: guestName,
        rating: rating,
        review_text: reviewText,
        status: 'Pending',
      });

    if (insertErr) {
      console.error('[API Reviews POST] Insertion failed:', insertErr);
      return NextResponse.json({ success: false, message: 'Failed to submit review.' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Thank you! Your review has been submitted and will appear after approval.',
    });
  } catch (err: any) {
    console.error('[API Reviews POST] Unexpected error:', err);
    return NextResponse.json({ success: false, message: 'Server error occurred.' }, { status: 500 });
  }
}
