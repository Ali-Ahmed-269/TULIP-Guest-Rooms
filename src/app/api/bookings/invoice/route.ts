import { NextResponse } from 'next/server';
import { createServiceRoleClient, createClient } from '@/utils/supabase/server';
import { generateInvoicePdf } from '@/utils/pdf-generator';
import { validateOrigin } from '@/utils/csrf';

async function processInvoiceRequest(request: Request) {
  try {
    const url = new URL(request.url);
    const searchParams = url.searchParams;

    let bookingIdParam = (searchParams.get('booking_id') || '').trim();
    let mode = searchParams.get('mode') || '';
    let emailParam = (request.headers.get('x-guest-email') || '').trim().toLowerCase();
    let phoneParam = (request.headers.get('x-guest-phone') || '').trim();

    // Check if body contains data (for POST requests)
    if (request.method === 'POST') {
      try {
        const body = await request.clone().json();
        if (body) {
          if (!bookingIdParam && body.booking_id) {
            bookingIdParam = String(body.booking_id).trim();
          }
          if (!mode && body.mode) {
            mode = String(body.mode);
          }
          if (!emailParam && (body.email || body.guest_email)) {
            emailParam = (body.email || body.guest_email || '').trim().toLowerCase();
          }
          if (!phoneParam && (body.phone || body.guest_phone)) {
            phoneParam = (body.phone || body.guest_phone || '').trim();
          }
        }
      } catch {
        // Body parsing failed or empty body
      }
    }

    if (!bookingIdParam) {
      return NextResponse.json({ success: false, message: 'booking_id is required.' }, { status: 400 });
    }

    const supabase = createServiceRoleClient();

    // 1. Load booking with associated room
    let query = supabase.from('bookings').select('*, rooms(*)');
    if (/^\d+$/.test(bookingIdParam)) {
      query = query.eq('id', parseInt(bookingIdParam, 10));
    } else {
      query = query.eq('booking_reference', bookingIdParam);
    }

    const { data: booking, error: bookingErr } = await query.maybeSingle();

    if (bookingErr || !booking) {
      console.error(`[API Invoice] Error fetching booking "${bookingIdParam}":`, bookingErr);
      return NextResponse.json({ success: false, message: 'Booking not found.' }, { status: 404 });
    }

    // 2. Verification step: require guest's email or phone via body/header, OR authenticated admin session
    let isAuthorized = false;

    const emailMatches = Boolean(emailParam && booking.guest_email.toLowerCase() === emailParam);
    const cleanGuestPhone = (booking.guest_phone || '').replace(/\D/g, '');
    const cleanInputPhone = phoneParam.replace(/\D/g, '');
    const phoneMatches = Boolean(
      phoneParam &&
      (booking.guest_phone === phoneParam || (cleanGuestPhone.length >= 7 && cleanGuestPhone === cleanInputPhone))
    );

    if (emailMatches || phoneMatches) {
      isAuthorized = true;
    } else {
      // Check if user has an active admin session
      try {
        const userClient = await createClient();
        const { data: { user } } = await userClient.auth.getUser();
        if (user) {
          isAuthorized = true;
        }
      } catch (authErr) {
        // Not an admin session
      }
    }

    if (!isAuthorized) {
      return NextResponse.json({
        success: false,
        message: 'Access denied. Valid guest email or phone verification (sent via POST body or x-guest-email/x-guest-phone header) is required.',
      }, { status: 403 });
    }

    // 3. Load site settings
    const { data: settingsData } = await supabase
      .from('site_settings')
      .select('setting_key, setting_value');
      
    const settings: Record<string, string> = {};
    settingsData?.forEach((row: any) => {
      settings[row.setting_key] = row.setting_value;
    });

    // 4. Generate PDF
    const pdfBuffer = await generateInvoicePdf(booking, settings);
    const invoiceFilename = `INV-${booking.booking_reference || `TGR-${new Date(booking.created_at).getFullYear()}-${String(booking.id).padStart(4, '0')}`}.pdf`;

    // 5. Return invoice (either as JSON base64 or download stream)
    if (mode === 'base64') {
      return NextResponse.json({
        success: true,
        filename: invoiceFilename,
        pdf: pdfBuffer.toString('base64'),
      });
    }

    return new NextResponse(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${invoiceFilename}"`,
        'Cache-Control': 'private, max-age=0, must-revalidate',
      },
    });
  } catch (err: any) {
    console.error('[API Invoice] Error generating invoice:', err);
    return NextResponse.json({ success: false, message: 'Could not generate invoice.' }, { status: 500 });
  }
}

export async function GET(request: Request) {
  return processInvoiceRequest(request);
}

export async function POST(request: Request) {
  // CSRF origin check — reject cross-origin POST requests
  const csrfError = validateOrigin(request);
  if (csrfError) return csrfError;
  return processInvoiceRequest(request);
}
