import { NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/utils/supabase/server';
import { sendBookingEmailTriggers } from '@/utils/resend';

function isValidPhone(phone: string) {
  return /^03\d{2}-\d{7}$/.test(phone);
}

function isValidCnic(cnic: string) {
  return /^\d{5}-\d{7}-\d$/.test(cnic);
}

function getClientIp(request: Request) {
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || request.headers.get('x-real-ip')
    || 'unknown';
}

export async function POST(request: Request) {
  let createdBookingId: number | null = null;
  const supabase = createServiceRoleClient();

  try {
    const formData = await request.formData();
    
    // 1. Extract inputs
    const fullname = (formData.get('fullname') as string || '').trim();
    const email = (formData.get('email') as string || '').trim();
    const phone = (formData.get('phone') as string || '').trim();
    const cnic = (formData.get('cnic') as string || '').trim();
    const address = (formData.get('address') as string || '').trim();
    const checkInRaw = (formData.get('check_in') as string || '').trim();
    const checkOutRaw = (formData.get('check_out') as string || '').trim();
    const roomType = (formData.get('room_type') as string || '').trim();
    const roomNumber = (formData.get('room_id') as string || '').trim(); // 'room_id' contains room_number on client
    const guests = parseInt(formData.get('guests') as string || '0', 10);
    const paymentMethod = (formData.get('payment_method') as string || '').trim();
    const specialRequests = (formData.get('special_requests') as string || '').trim();
    const paymentProof = formData.get('payment_proof') as File | null;

    // 2. Server-side validations
    if (!fullname) return NextResponse.json({ success: false, message: 'Full Name is required.' }, { status: 400 });
    if (fullname.length > 100) return NextResponse.json({ success: false, message: 'Full Name must not exceed 100 characters.' }, { status: 400 });
    if (!address) return NextResponse.json({ success: false, message: 'Address is required.' }, { status: 400 });
    
    if (!email) return NextResponse.json({ success: false, message: 'Email address is required.' }, { status: 400 });
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) return NextResponse.json({ success: false, message: 'Please enter a valid email address.' }, { status: 400 });

    if (!phone) return NextResponse.json({ success: false, message: 'Phone number is required.' }, { status: 400 });
    if (!isValidPhone(phone)) {
      return NextResponse.json({ success: false, message: 'Phone number must follow format 03XX-XXXXXXX.' }, { status: 400 });
    }

    if (!cnic) return NextResponse.json({ success: false, message: 'CNIC is required.' }, { status: 400 });
    if (!isValidCnic(cnic)) {
      return NextResponse.json({ success: false, message: 'CNIC must follow format XXXXX-XXXXXXX-X.' }, { status: 400 });
    }

    if (!checkInRaw || !checkOutRaw) {
      return NextResponse.json({ success: false, message: 'Check-in and Check-out dates are required.' }, { status: 400 });
    }

    const checkInDate = new Date(checkInRaw);
    const checkOutDate = new Date(checkOutRaw);
    const todayDate = new Date();
    todayDate.setHours(0, 0, 0, 0);

    if (isNaN(checkInDate.getTime()) || isNaN(checkOutDate.getTime())) {
      return NextResponse.json({ success: false, message: 'Invalid date format. Use YYYY-MM-DD.' }, { status: 400 });
    }
    if (checkInDate < todayDate) {
      return NextResponse.json({ success: false, message: 'Check-in date cannot be in the past.' }, { status: 400 });
    }
    if (checkOutDate <= checkInDate) {
      return NextResponse.json({ success: false, message: 'Check-out date must be strictly after the Check-in date.' }, { status: 400 });
    }

    const diffTime = checkOutDate.getTime() - checkInDate.getTime();
    const nights = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    if (nights < 1) return NextResponse.json({ success: false, message: 'Minimum stay is 1 night.' }, { status: 400 });

    if (!roomType) return NextResponse.json({ success: false, message: 'Room Type is required.' }, { status: 400 });
    if (!roomNumber) return NextResponse.json({ success: false, message: 'Room Number is required.' }, { status: 400 });

    if (guests < 1) return NextResponse.json({ success: false, message: 'Number of guests must be at least 1.' }, { status: 400 });
    if (guests > 10) return NextResponse.json({ success: false, message: 'Number of guests cannot exceed 10.' }, { status: 400 });

    const validMethods = ['jazzcash', 'easypaisa', 'pay_at_hotel'];
    if (!validMethods.includes(paymentMethod)) {
      return NextResponse.json({ success: false, message: 'Invalid payment method selected.' }, { status: 400 });
    }

    // 3. Rate limiting (database-backed, max 5 POSTs per IP per hour)
    const ip = getClientIp(request);
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();

    // Clean up old rate limit logs
    await supabase
      .from('rate_limit_log')
      .delete()
      .eq('ip_address', ip)
      .lt('attempted_at', oneHourAgo);

    // Count recent attempts
    const { count: attempts, error: limitErr } = await supabase
      .from('rate_limit_log')
      .select('*', { count: 'exact', head: true })
      .eq('ip_address', ip)
      .gte('attempted_at', oneHourAgo);

    if (limitErr) {
      console.warn('[Rate Limiter] Error counting logs, bypassing rate limit checks:', limitErr);
    } else if (attempts && attempts >= 5) {
      return NextResponse.json({
        success: false,
        message: 'Rate limit exceeded. You can submit up to 5 bookings per hour. Please try again later.'
      }, { status: 429 });
    }

    // Log the current attempt
    await supabase
      .from('rate_limit_log')
      .insert({ ip_address: ip });

    // 4. Validate Room details
    const { data: room, error: roomErr } = await supabase
      .from('rooms')
      .select('id, room_type, price_per_night, max_guests, status')
      .eq('room_number', roomNumber)
      .single();

    if (roomErr || !room) {
      return NextResponse.json({ success: false, message: 'The selected room number does not exist.' }, { status: 404 });
    }
    if (room.status !== 'Available') {
      return NextResponse.json({ success: false, message: `Room ${roomNumber} is currently ${room.status} and cannot be booked.` }, { status: 400 });
    }
    if (room.room_type !== roomType) {
      return NextResponse.json({ success: false, message: 'Room type mismatch.' }, { status: 400 });
    }
    if (guests > room.max_guests) {
      return NextResponse.json({ success: false, message: `Room ${roomNumber} accommodates a maximum of ${room.max_guests} guests.` }, { status: 400 });
    }

    // 5. Overlap Check
    const { data: overlap, error: overlapErr } = await supabase
      .from('bookings')
      .select('id')
      .eq('room_id', room.id)
      .neq('booking_status', 'Cancelled')
      .lt('check_in_date', checkOutRaw)
      .gt('check_out_date', checkInRaw)
      .limit(1)
      .maybeSingle();

    if (overlapErr) {
      console.error('[API Book] Overlap check database error:', overlapErr);
      return NextResponse.json({ success: false, message: 'Availability check failed.' }, { status: 500 });
    }
    if (overlap) {
      return NextResponse.json({ success: false, message: `Room ${roomNumber} is already booked for the selected dates. Please choose different dates.` }, { status: 400 });
    }

    // 6. Screenshot validation (online payment only)
    let uploadedProofUrl = null;
    let paymentStatus = 'Unpaid';
    let bookingStatus = 'Pending';
    let roomNewStatus = 'Reserved';

    if (paymentMethod === 'pay_at_hotel') {
      paymentStatus = 'Unpaid';
      bookingStatus = 'Confirmed';
      roomNewStatus = 'Booked';
    } else {
      paymentStatus = 'Pending Verification';
      bookingStatus = 'Pending';
      roomNewStatus = 'Reserved';

      if (!paymentProof || paymentProof.size === 0) {
        return NextResponse.json({ success: false, message: 'A payment screenshot is required.' }, { status: 400 });
      }
      if (paymentProof.size > 2 * 1024 * 1024) {
        return NextResponse.json({ success: false, message: 'Payment screenshot must not exceed 2 MB.' }, { status: 400 });
      }
      const validTypes = ['image/jpeg', 'image/jpg', 'image/png'];
      if (!validTypes.includes(paymentProof.type)) {
        return NextResponse.json({ success: false, message: 'Only JPG and PNG images are accepted.' }, { status: 400 });
      }
    }

    const totalAmount = nights * Number(room.price_per_night);

    // 7. Insert booking row (initial entry without reference)
    const { data: newBooking, error: insertErr } = await supabase
      .from('bookings')
      .insert({
        room_id: room.id,
        guest_name: fullname,
        guest_email: email,
        guest_phone: phone,
        guest_cnic: cnic,
        guest_address: address,
        check_in_date: checkInRaw,
        check_out_date: checkOutRaw,
        guests_count: guests,
        total_amount: totalAmount,
        payment_method: paymentMethod,
        payment_status: paymentStatus as any,
        booking_status: bookingStatus as any,
        special_requests: specialRequests || null,
      })
      .select('id')
      .single();

    if (insertErr || !newBooking) {
      console.error('[API Book] Booking insertion failed:', insertErr);
      return NextResponse.json({ success: false, message: 'Failed to create booking in database.' }, { status: 500 });
    }

    createdBookingId = newBooking.id;
    const currentYear = new Date().getFullYear();
    const bookingRef = `TGR-${currentYear}-${String(createdBookingId).padStart(4, '0')}`;

    // 8. Upload payment proof to storage bucket & update booking row
    if (paymentMethod !== 'pay_at_hotel' && paymentProof) {
      const fileExt = paymentProof.name.split('.').pop() || 'png';
      const storagePath = `screenshot_${createdBookingId}_${Date.now()}.${fileExt}`;
      const fileBuffer = Buffer.from(await paymentProof.arrayBuffer());

      const { data: uploadData, error: uploadErr } = await supabase.storage
        .from('payments-proofs')
        .upload(storagePath, fileBuffer, {
          contentType: paymentProof.type,
          upsert: true,
        });

      if (uploadErr) {
        console.error('[API Book] Storage upload error:', uploadErr);
        // Rollback inserted booking
        await supabase.from('bookings').delete().eq('id', createdBookingId);
        return NextResponse.json({ success: false, message: 'Failed to upload payment screenshot. Booking rolled back.' }, { status: 500 });
      }

      // Get Public URL
      const { data: publicUrlData } = supabase.storage
        .from('payments-proofs')
        .getPublicUrl(storagePath);
      
      uploadedProofUrl = publicUrlData.publicUrl;

      // Update booking row with reference and screenshot URL
      const { error: updateErr } = await supabase
        .from('bookings')
        .update({
          booking_reference: bookingRef,
          payment_proof: uploadedProofUrl,
        })
        .eq('id', createdBookingId);

      if (updateErr) {
        console.error('[API Book] Booking final update error:', updateErr);
        await supabase.from('bookings').delete().eq('id', createdBookingId);
        return NextResponse.json({ success: false, message: 'Database confirmation failed.' }, { status: 500 });
      }
    } else {
      // Just update reference for pay_at_hotel
      const { error: updateErr } = await supabase
        .from('bookings')
        .update({ booking_reference: bookingRef })
        .eq('id', createdBookingId);

      if (updateErr) {
        console.error('[API Book] Booking final reference update error:', updateErr);
        await supabase.from('bookings').delete().eq('id', createdBookingId);
        return NextResponse.json({ success: false, message: 'Database confirmation failed.' }, { status: 500 });
      }
    }

    // 9. Update room status
    const { error: roomUpdateErr } = await supabase
      .from('rooms')
      .update({ status: roomNewStatus as any })
      .eq('id', room.id);

    if (roomUpdateErr) {
      console.error('[API Book] Room status update failed:', roomUpdateErr);
      if (createdBookingId) {
        await supabase.from('bookings').delete().eq('id', createdBookingId);
      }
      if (uploadedProofUrl) {
        const proofFile = uploadedProofUrl.split('/').pop();
        if (proofFile) {
          await supabase.storage.from('payments-proofs').remove([proofFile]);
        }
      }
      return NextResponse.json({ success: false, message: 'Failed to update room status after booking. Please try again.' }, { status: 500 });
    }

    // 10. Fire Email Triggers
    try {
      const emailTriggers = paymentMethod === 'pay_at_hotel'
        ? ['pay_at_hotel', 'admin_alert']
        : ['pending_verification', 'admin_alert'];

      if (createdBookingId !== null) {
        await sendBookingEmailTriggers(createdBookingId, emailTriggers);
      }
    } catch (mailErr) {
      console.error('[API Book] Email sending triggered warning:', mailErr);
    }

    return NextResponse.json({
      success: true,
      booking_id: createdBookingId,
      booking_reference: bookingRef,
      redirect_url: `confirmation?booking_id=${encodeURIComponent(bookingRef)}`,
    });

  } catch (err: any) {
    console.error('[API Book] Unexpected server error:', err);
    if (createdBookingId) {
      // Cleanup booking row if anything failed at the end
      await supabase.from('bookings').delete().eq('id', createdBookingId);
    }
    return NextResponse.json({ success: false, message: 'Unexpected server error occurred. Please try again.' }, { status: 500 });
  }
}
