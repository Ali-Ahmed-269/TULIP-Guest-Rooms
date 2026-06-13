import { NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/utils/supabase/server';
import { generateInvoicePdf } from '@/utils/pdf-generator';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const bookingId = parseInt(searchParams.get('booking_id') || '0', 10);
    const mode = searchParams.get('mode') || '';

    if (bookingId <= 0) {
      return NextResponse.json({ success: false, message: 'booking_id is required.' }, { status: 400 });
    }

    const supabase = createServiceRoleClient();

    // 1. Load booking with associated room
    const { data: booking, error: bookingErr } = await supabase
      .from('bookings')
      .select('*, rooms(*)')
      .eq('id', bookingId)
      .single();

    if (bookingErr || !booking) {
      console.error(`[API Invoice] Error fetching booking #${bookingId}:`, bookingErr);
      return NextResponse.json({ success: false, message: 'Booking not found.' }, { status: 404 });
    }

    // 2. Load site settings
    const { data: settingsData } = await supabase
      .from('site_settings')
      .select('setting_key, setting_value');
      
    const settings: Record<string, string> = {};
    settingsData?.forEach((row: any) => {
      settings[row.setting_key] = row.setting_value;
    });

    // 3. Generate PDF
    const pdfBuffer = await generateInvoicePdf(booking, settings);
    const invoiceFilename = `INV-TGR-${new Date(booking.created_at).getFullYear()}-${String(booking.id).padStart(4, '0')}.pdf`;

    // 4. Return invoice (either as JSON base64 or download stream)
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
