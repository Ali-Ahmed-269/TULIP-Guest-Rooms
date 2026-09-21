import { Resend } from 'resend';
import { createServiceRoleClient } from './supabase/server';
import { generateInvoicePdf } from './pdf-generator';

const getResendClient = () => {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey || apiKey === 'your_resend_api_key') {
    console.warn('Resend API key is missing or placeholder. Emails will be logged to console instead.');
    return null;
  }
  return new Resend(apiKey);
};

const ROOM_DISPLAY_NAMES: Record<string, string> = {
  'Standard':     'Standard Room',
  'Premium':      'Premium Room',
  'Comfort Plus': 'Comfort Plus',
};

function getRoomTypeDisplayName(type: string): string {
  return ROOM_DISPLAY_NAMES[type] || type;
}

// Formats amount to PKR currency format
const formatMoney = (amount: number) => {
  return 'PKR ' + amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

/**
 * Escapes HTML special characters in a string to prevent XSS in email templates.
 * Must be applied to every user-supplied or admin-supplied value before interpolation.
 */
function escHtml(raw: unknown): string {
  if (raw === null || raw === undefined) return '';
  return String(raw)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// HTML Wrapper for Guest House Emails
function wrapEmailHtml(title: string, bodyHtml: string, settings: any): string {
  const ghName  = escHtml(settings.guesthouse_name  || 'Tulip Guest Rooms');
  const ghPhone = escHtml(settings.guesthouse_phone || '0300-1234567');
  const ghEmail = escHtml(settings.guesthouse_email || 'hello@tulipguestrooms.com');

  return `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"></head>
<body style="font-family: Arial, sans-serif; line-height: 1.5; color: #222; max-width: 600px; margin: 0 auto; padding: 16px;">
  <div style="border-bottom: 2px solid #1a5f4a; padding-bottom: 12px; margin-bottom: 16px;">
    <strong style="font-size: 18px; color: #1a5f4a;">${ghName}</strong>
  </div>
  <h2 style="color: #1a5f4a; font-size: 16px;">${escHtml(title)}</h2>
  ${bodyHtml}
  <p style="margin-top: 24px; font-size: 12px; color: #666; border-top: 1px solid #eee; padding-top: 12px;">
    <strong>${ghName}</strong><br>
    Phone: ${ghPhone} &nbsp;·&nbsp; Email: ${ghEmail}
  </p>
</body>
</html>
  `;
}

// Generate email summary of booking — all guest-supplied values escaped
function getBookingSummaryHtml(b: any): string {
  const checkIn  = new Date(b.check_in_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  const checkOut = new Date(b.check_out_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  
  const paymentLabelMap: Record<string, string> = {
    'jazzcash':    'JazzCash',
    'easypaisa':   'Easypaisa',
    'pay_at_hotel':'Pay at Hotel',
    'walk_in':     'Walk-in',
  };
  const payMethod = paymentLabelMap[b.payment_method] || escHtml(b.payment_method) || 'N/A';
  const roomNum   = escHtml(b.rooms?.room_number || b.room_number || 'N/A');
  const roomType  = escHtml(getRoomTypeDisplayName(b.rooms?.room_type || b.room_type || 'N/A'));

  return `
<ul style="padding-left: 18px; line-height: 1.6;">
  <li><strong>Booking Reference:</strong> ${escHtml(b.booking_reference) || 'N/A'}</li>
  <li><strong>Room Assigned:</strong> Room ${roomNum} (${roomType})</li>
  <li><strong>Check-in:</strong> ${checkIn}</li>
  <li><strong>Check-out:</strong> ${checkOut}</li>
  <li><strong>Total Amount:</strong> ${formatMoney(Number(b.total_amount || 0))}</li>
  <li><strong>Payment Method:</strong> ${payMethod}</li>
  <li><strong>Payment Status:</strong> ${escHtml(b.payment_status)}</li>
</ul>
  `;
}

export async function sendBookingEmailTriggers(bookingId: number, triggers: string[]) {
  const supabase = createServiceRoleClient();
  
  // 1. Fetch Booking with associated room details
  const { data: booking, error: bookingErr } = await supabase
    .from('bookings')
    .select('*, rooms(*)')
    .eq('id', bookingId)
    .single();
    
  if (bookingErr || !booking) {
    console.error(`[Resend Helper] Error fetching booking #${bookingId}:`, bookingErr);
    return;
  }

  // 2. Fetch Guesthouse Settings
  const { data: settingsData } = await supabase
    .from('site_settings')
    .select('setting_key, setting_value');
    
  const settings: Record<string, string> = {};
  settingsData?.forEach((row: any) => {
    settings[row.setting_key] = row.setting_value;
  });

  const ghName     = settings.guesthouse_name  || 'Tulip Guest Rooms';
  const fromEmail  = settings.smtp_from_email?.trim();
  const fromName   = settings.smtp_from_name   || 'Tulip Guest Rooms';
  const adminEmail = settings.guesthouse_email || 'hello@tulipguestrooms.com';

  // (#4) Fail loudly if fromEmail is not configured — do NOT silently fall back to sandbox address
  if (!fromEmail) {
    console.error(
      '[Resend Helper] CRITICAL: smtp_from_email is not set in site_settings. ' +
      'Email triggers ABORTED for booking #' + bookingId + '. ' +
      'Please configure smtp_from_email in the Admin → Settings panel.'
    );
    return;
  }

  const resend = getResendClient();
  
  // Generate invoice on demand if any trigger needs it
  let pdfBuffer: Buffer | null = null;
  const getInvoiceBuffer = async () => {
    if (!pdfBuffer) {
      pdfBuffer = await generateInvoicePdf(booking, settings);
    }
    return pdfBuffer;
  };

  const results: Record<string, boolean> = {};

  for (const trigger of triggers) {
    let subject     = '';
    let htmlContent = '';
    let attachments: any[] = [];
    let recipient   = booking.guest_email;

    // Escape guest-supplied values used in templates
    const guestName     = escHtml(booking.guest_name);
    const bookingRef    = escHtml(booking.booking_reference);
    const contactEmail  = escHtml(settings.guesthouse_email);

    try {
      if (trigger === 'pay_at_hotel') {
        subject     = `${ghName} — Booking Confirmed (${booking.booking_reference})`;
        htmlContent = wrapEmailHtml(
          'Booking Confirmed',
          `<p>Dear ${guestName},</p>
           <p>Your booking <strong>${bookingRef}</strong> has been confirmed. Payment will be collected at check-in.</p>
           ${getBookingSummaryHtml(booking)}
           <p>Your invoice is attached to this email.</p>`,
          settings
        );
        const buffer = await getInvoiceBuffer();
        const invoiceFilename = `INV-TGR-${new Date().getFullYear()}-${String(booking.id).padStart(4, '0')}.pdf`;
        attachments.push({ filename: invoiceFilename, content: buffer });

      } else if (trigger === 'pending_verification') {
        subject     = `${ghName} — Payment Under Review (${booking.booking_reference})`;
        htmlContent = wrapEmailHtml(
          'Payment Under Review',
          `<p>Dear ${guestName},</p>
           <p>We have received your payment screenshot for booking <strong>${bookingRef}</strong>.</p>
           <p>Status: <strong>Pending Verification</strong>. We will verify the payment and email you confirmation within 24 hours.</p>
           ${getBookingSummaryHtml(booking)}`,
          settings
        );

      } else if (trigger === 'payment_verified') {
        subject     = `${ghName} — Payment Verified (${booking.booking_reference})`;
        htmlContent = wrapEmailHtml(
          'Payment Verified — Booking Confirmed',
          `<p>Dear ${guestName},</p>
           <p>Your payment for booking <strong>${bookingRef}</strong> has been verified. Your stay is confirmed.</p>
           ${getBookingSummaryHtml(booking)}
           <p>Your invoice is attached to this email.</p>`,
          settings
        );
        const buffer = await getInvoiceBuffer();
        const invoiceFilename = `INV-TGR-${new Date().getFullYear()}-${String(booking.id).padStart(4, '0')}.pdf`;
        attachments.push({ filename: invoiceFilename, content: buffer });

      } else if (trigger === 'payment_rejected') {
        subject     = `${ghName} — Please Resubmit Payment (${booking.booking_reference})`;
        htmlContent = wrapEmailHtml(
          'Payment Not Verified — Action Required',
          `<p>Dear ${guestName},</p>
           <p>We could not verify the payment screenshot for booking <strong>${bookingRef}</strong>.</p>
           <p>Please log in or contact us at ${contactEmail} to resubmit a clear screenshot of your transaction proof (JazzCash/Easypaisa, Max 2MB).</p>
           ${getBookingSummaryHtml(booking)}`,
          settings
        );

      } else if (trigger === 'booking_cancelled') {
        subject     = `${ghName} — Booking Cancelled (${booking.booking_reference})`;
        htmlContent = wrapEmailHtml(
          'Booking Cancelled',
          `<p>Dear ${guestName},</p>
           <p>Your booking <strong>${bookingRef}</strong> has been cancelled.</p>
           ${getBookingSummaryHtml(booking)}
           <p>If you have questions, please contact us at ${contactEmail}.</p>`,
          settings
        );

      } else if (trigger === 'admin_alert') {
        recipient   = adminEmail;
        subject     = `NEW BOOKING ALERT — ${booking.booking_reference}`;
        htmlContent = wrapEmailHtml(
          'New Booking Received',
          `<p>A new booking request has been submitted to the system.</p>
           <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
             <tr><td style="padding: 6px; border: 1px solid #ddd;"><strong>Reference</strong></td>
                 <td style="padding: 6px; border: 1px solid #ddd;">${escHtml(booking.booking_reference)}</td></tr>
             <tr><td style="padding: 6px; border: 1px solid #ddd;"><strong>Guest</strong></td>
                 <td style="padding: 6px; border: 1px solid #ddd;">${escHtml(booking.guest_name)}</td></tr>
             <tr><td style="padding: 6px; border: 1px solid #ddd;"><strong>Phone</strong></td>
                 <td style="padding: 6px; border: 1px solid #ddd;">${escHtml(booking.guest_phone)}</td></tr>
             <tr><td style="padding: 6px; border: 1px solid #ddd;"><strong>Email</strong></td>
                 <td style="padding: 6px; border: 1px solid #ddd;">${escHtml(booking.guest_email)}</td></tr>
             <tr><td style="padding: 6px; border: 1px solid #ddd;"><strong>Room</strong></td>
                 <td style="padding: 6px; border: 1px solid #ddd;">Room ${escHtml(booking.rooms?.room_number || 'N/A')}</td></tr>
             <tr><td style="padding: 6px; border: 1px solid #ddd;"><strong>Dates</strong></td>
                 <td style="padding: 6px; border: 1px solid #ddd;">${escHtml(booking.check_in_date)} to ${escHtml(booking.check_out_date)}</td></tr>
             <tr><td style="padding: 6px; border: 1px solid #ddd;"><strong>Total</strong></td>
                 <td style="padding: 6px; border: 1px solid #ddd;">${formatMoney(Number(booking.total_amount || 0))}</td></tr>
             <tr><td style="padding: 6px; border: 1px solid #ddd;"><strong>Method / Status</strong></td>
                 <td style="padding: 6px; border: 1px solid #ddd;">${escHtml(booking.payment_method)} / ${escHtml(booking.payment_status)}</td></tr>
           </table>`,
          settings
        );
      }

      // Send the email or log it
      if (resend) {
        const { error: sendError } = await resend.emails.send({
          from:        `${fromName} <${fromEmail}>`,
          to:          recipient,
          subject:     subject,
          html:        htmlContent,
          attachments: attachments,
        });
        // (#3) Log exactly which trigger failed and why
        if (sendError) {
          console.error(`[Resend Helper] Trigger "${trigger}" FAILED to send to ${recipient} for booking #${bookingId}:`, sendError);
          results[trigger] = false;
        } else {
          console.log(`[Resend Helper] Trigger "${trigger}" sent successfully to ${recipient} for booking #${bookingId}`);
          results[trigger] = true;
        }
      } else {
        console.log(`[Resend Simulator] Email logged to console:
-----------------------------
FROM: ${fromName} <${fromEmail}>
TO: ${recipient}
SUBJECT: ${subject}
ATTACHMENTS: ${attachments.length > 0 ? attachments.map(a => a.filename).join(', ') : 'None'}
-----------------------------`);
        results[trigger] = true;
      }
    } catch (err) {
      // (#3) Structured error log: trigger name, recipient, booking ID, and the actual error
      console.error(`[Resend Helper] Trigger "${trigger}" threw an exception for booking #${bookingId} (recipient: ${recipient}):`, err);
      results[trigger] = false;
    }
  }

  return results;
}
