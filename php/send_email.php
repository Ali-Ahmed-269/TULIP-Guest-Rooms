<?php
/**
 * php/send_email.php — PHPMailer notifications for Tulip Guest Rooms
 *
 * Core: sendEmail($to, $subject, $htmlBody, $attachPdf = null)
 *
 * Triggers (call after DB updates):
 *   1. pay_at_hotel        — guest confirmation + invoice PDF
 *   2. pending_verification — guest pending notice (screenshot uploaded)
 *   3. payment_verified    — guest confirmation + invoice PDF
 *   4. payment_rejected    — guest resend payment request
 *   5. booking_cancelled   — guest cancellation notice
 *   6. admin_alert         — owner alert for any new booking
 *
 *   sendBookingEmailTriggers($pdo, $bookingId, ['pay_at_hotel', 'admin_alert']);
 */

declare(strict_types=1);

use PHPMailer\PHPMailer\Exception as MailerException;
use PHPMailer\PHPMailer\PHPMailer;

require_once __DIR__ . '/../vendor/autoload.php';
require_once __DIR__ . '/../config/email.php';
require_once __DIR__ . '/generate_invoice.php';

/**
 * Send an HTML email via SMTP (settings from config/email.php).
 *
 * @param string      $to         Recipient email
 * @param string      $subject    Subject line
 * @param string      $htmlBody   HTML message body
 * @param string|null $attachPdf  Raw PDF bytes to attach, or null
 * @param string      $attachName Attachment filename when attaching PDF
 * @return bool True if sent successfully
 */
function sendEmail(
    string $to,
    string $subject,
    string $htmlBody,
    ?string $attachPdf = null,
    string $attachName = 'invoice.pdf'
): bool {
    $mail = new PHPMailer(true);

    try {
        $mail->isSMTP();
        $mail->Host       = SMTP_HOST;
        $mail->Port       = (int) SMTP_PORT;
        $mail->SMTPAuth   = SMTP_USER !== '' && SMTP_PASS !== '';

        if (SMTP_SECURE !== '') {
            $mail->SMTPSecure = SMTP_SECURE;
        }

        if ($mail->SMTPAuth) {
            $mail->Username = SMTP_USER;
            $mail->Password = SMTP_PASS;
        }

        $mail->setFrom(SMTP_FROM_EMAIL, SMTP_FROM_NAME);
        $mail->addAddress($to);
        $mail->isHTML(true);
        $mail->CharSet = PHPMailer::CHARSET_UTF8;
        $mail->Subject = $subject;
        $mail->Body    = $htmlBody;
        $mail->AltBody = strip_tags(str_replace(['<br>', '<br/>', '<br />'], "\n", $htmlBody));

        if ($attachPdf !== null && $attachPdf !== '') {
            $mail->addStringAttachment($attachPdf, $attachName, PHPMailer::ENCODING_BASE64, 'application/pdf');
        }

        $mail->send();
        return true;
    } catch (MailerException $e) {
        error_log('[TGR send_email] ' . $e->getMessage());
        return false;
    }
}

/**
 * @return array<string, mixed>
 */
function loadBookingForEmail(PDO $pdo, int $bookingId): array
{
    return loadBookingForInvoice($pdo, $bookingId);
}

function emailEscape(string $value): string
{
    return htmlspecialchars($value, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
}

function wrapEmailHtml(string $title, string $bodyHtml): string
{
    $gh = emailEscape(GUEST_HOUSE_NAME);
    return <<<HTML
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"></head>
<body style="font-family:Arial,sans-serif;line-height:1.5;color:#222;max-width:600px;margin:0 auto;padding:16px;">
  <div style="border-bottom:2px solid #1a5f4a;padding-bottom:12px;margin-bottom:16px;">
    <strong style="font-size:18px;color:#1a5f4a;">{$gh}</strong>
  </div>
  <h2 style="color:#1a5f4a;font-size:16px;">{$title}</h2>
  {$bodyHtml}
  <p style="margin-top:24px;font-size:12px;color:#666;">
    {$gh}<br>
    {emailEscape(GUEST_HOUSE_PHONE)} · {emailEscape(GUEST_HOUSE_EMAIL)}
  </p>
</body>
</html>
HTML;
}

function bookingSummaryHtml(array $b): string
{
    $ref    = emailEscape((string) ($b['booking_reference'] ?? ''));
    $room   = emailEscape((string) $b['room_number']) . ' — ' . emailEscape((string) $b['room_type']);
    $in     = emailEscape((string) $b['check_in_date']);
    $out    = emailEscape((string) $b['check_out_date']);
    $total  = emailEscape(formatMoney((float) $b['total_amount']));
    $method = emailEscape((string) $b['payment_method_label']);
    $status = emailEscape((string) $b['payment_status']);

    return <<<HTML
<ul style="padding-left:18px;">
  <li><strong>Booking reference:</strong> {$ref}</li>
  <li><strong>Room:</strong> {$room}</li>
  <li><strong>Check-in:</strong> {$in}</li>
  <li><strong>Check-out:</strong> {$out}</li>
  <li><strong>Total:</strong> {$total}</li>
  <li><strong>Payment method:</strong> {$method}</li>
  <li><strong>Payment status:</strong> {$status}</li>
</ul>
HTML;
}

/* ── Trigger 1: Pay at Hotel — confirmation + invoice ─────── */

function sendPayAtHotelConfirmationEmail(PDO $pdo, int $bookingId): bool
{
    $b = loadBookingForEmail($pdo, $bookingId);
    $to = (string) $b['guest_email'];
    $ref = emailEscape((string) ($b['booking_reference'] ?? ''));

    $body = wrapEmailHtml(
        'Booking Confirmed',
        "<p>Dear " . emailEscape((string) $b['guest_name']) . ",</p>
         <p>Your booking <strong>{$ref}</strong> is confirmed. Payment will be collected at check-in.</p>
         " . bookingSummaryHtml($b) . "
         <p>Your invoice is attached to this email.</p>"
    );

    $pdf = generateInvoicePdf($pdo, $bookingId);
    return sendEmail(
        $to,
        GUEST_HOUSE_NAME . ' — Booking Confirmed (' . ($b['booking_reference'] ?? '') . ')',
        $body,
        $pdf,
        getInvoiceFilename($bookingId)
    );
}

/* ── Trigger 2: Screenshot uploaded — pending verification ── */

function sendPendingVerificationEmail(PDO $pdo, int $bookingId): bool
{
    $b = loadBookingForEmail($pdo, $bookingId);
    $to = (string) $b['guest_email'];
    $ref = emailEscape((string) ($b['booking_reference'] ?? ''));

    $body = wrapEmailHtml(
        'Payment Under Review',
        "<p>Dear " . emailEscape((string) $b['guest_name']) . ",</p>
         <p>We received your payment screenshot for booking <strong>{$ref}</strong>.</p>
         <p>Status: <strong>Pending Verification</strong>. We will email you once payment is verified (usually within 24 hours).</p>
         " . bookingSummaryHtml($b)
    );

    return sendEmail(
        $to,
        GUEST_HOUSE_NAME . ' — Payment Pending Verification (' . ($b['booking_reference'] ?? '') . ')',
        $body
    );
}

/* ── Trigger 3: Admin verified payment — confirmation + invoice */

function sendPaymentVerifiedEmail(PDO $pdo, int $bookingId): bool
{
    $b = loadBookingForEmail($pdo, $bookingId);
    $to = (string) $b['guest_email'];
    $ref = emailEscape((string) ($b['booking_reference'] ?? ''));

    $body = wrapEmailHtml(
        'Payment Verified — Booking Confirmed',
        "<p>Dear " . emailEscape((string) $b['guest_name']) . ",</p>
         <p>Your payment for booking <strong>{$ref}</strong> has been verified. Your stay is confirmed.</p>
         " . bookingSummaryHtml($b) . "
         <p>Your invoice is attached to this email.</p>"
    );

    $pdf = generateInvoicePdf($pdo, $bookingId);
    return sendEmail(
        $to,
        GUEST_HOUSE_NAME . ' — Payment Verified (' . ($b['booking_reference'] ?? '') . ')',
        $body,
        $pdf,
        getInvoiceFilename($bookingId)
    );
}

/* ── Trigger 4: Admin rejected payment — resend request ─────── */

function sendPaymentRejectedEmail(PDO $pdo, int $bookingId): bool
{
    $b = loadBookingForEmail($pdo, $bookingId);
    $to = (string) $b['guest_email'];
    $ref = emailEscape((string) ($b['booking_reference'] ?? ''));
    $site = emailEscape(SITE_URL);

    $body = wrapEmailHtml(
        'Payment Not Verified — Action Required',
        "<p>Dear " . emailEscape((string) $b['guest_name']) . ",</p>
         <p>We could not verify the payment screenshot for booking <strong>{$ref}</strong>.</p>
         <p>Please submit a clear payment screenshot (JPG/PNG, max 2MB) via our booking page or contact us at "
         . emailEscape(GUEST_HOUSE_EMAIL) . ".</p>
         <p><a href=\"{$site}#booking\">Resubmit payment proof</a></p>
         " . bookingSummaryHtml($b)
    );

    return sendEmail(
        $to,
        GUEST_HOUSE_NAME . ' — Please Resubmit Payment (' . ($b['booking_reference'] ?? '') . ')',
        $body
    );
}

/* ── Trigger 5: Booking cancelled ─────────────────────────── */

function sendBookingCancelledEmail(PDO $pdo, int $bookingId): bool
{
    $b = loadBookingForEmail($pdo, $bookingId);
    $to = (string) $b['guest_email'];
    $ref = emailEscape((string) ($b['booking_reference'] ?? ''));

    $body = wrapEmailHtml(
        'Booking Cancelled',
        "<p>Dear " . emailEscape((string) $b['guest_name']) . ",</p>
         <p>Your booking <strong>{$ref}</strong> has been cancelled.</p>
         " . bookingSummaryHtml($b) . "
         <p>If you have questions, contact us at " . emailEscape(GUEST_HOUSE_EMAIL) . ".</p>"
    );

    return sendEmail(
        $to,
        GUEST_HOUSE_NAME . ' — Booking Cancelled (' . ($b['booking_reference'] ?? '') . ')',
        $body
    );
}

/* ── Trigger 6: Admin alert — any new booking ─────────────── */

function sendAdminNewBookingAlert(PDO $pdo, int $bookingId): bool
{
    $b   = loadBookingForEmail($pdo, $bookingId);
    $ref = (string) ($b['booking_reference'] ?? '');

    $body = wrapEmailHtml(
        'New Booking Received',
        "<p>A new booking has been submitted.</p>
         <table style=\"width:100%;border-collapse:collapse;font-size:14px;\">
           <tr><td style=\"padding:6px;border:1px solid #ddd;\"><strong>Reference</strong></td>
               <td style=\"padding:6px;border:1px solid #ddd;\">" . emailEscape($ref) . "</td></tr>
           <tr><td style=\"padding:6px;border:1px solid #ddd;\"><strong>Guest</strong></td>
               <td style=\"padding:6px;border:1px solid #ddd;\">" . emailEscape((string) $b['guest_name']) . "</td></tr>
           <tr><td style=\"padding:6px;border:1px solid #ddd;\"><strong>Email</strong></td>
               <td style=\"padding:6px;border:1px solid #ddd;\">" . emailEscape((string) $b['guest_email']) . "</td></tr>
           <tr><td style=\"padding:6px;border:1px solid #ddd;\"><strong>Phone</strong></td>
               <td style=\"padding:6px;border:1px solid #ddd;\">" . emailEscape((string) $b['guest_phone']) . "</td></tr>
           <tr><td style=\"padding:6px;border:1px solid #ddd;\"><strong>CNIC</strong></td>
               <td style=\"padding:6px;border:1px solid #ddd;\">" . emailEscape((string) $b['guest_cnic']) . "</td></tr>
           <tr><td style=\"padding:6px;border:1px solid #ddd;\"><strong>Room</strong></td>
               <td style=\"padding:6px;border:1px solid #ddd;\">"
               . emailEscape((string) $b['room_number']) . ' — ' . emailEscape((string) $b['room_type']) . "</td></tr>
           <tr><td style=\"padding:6px;border:1px solid #ddd;\"><strong>Dates</strong></td>
               <td style=\"padding:6px;border:1px solid #ddd;\">"
               . emailEscape((string) $b['check_in_date']) . ' → ' . emailEscape((string) $b['check_out_date']) . "</td></tr>
           <tr><td style=\"padding:6px;border:1px solid #ddd;\"><strong>Guests</strong></td>
               <td style=\"padding:6px;border:1px solid #ddd;\">" . (int) $b['guests_count'] . "</td></tr>
           <tr><td style=\"padding:6px;border:1px solid #ddd;\"><strong>Total</strong></td>
               <td style=\"padding:6px;border:1px solid #ddd;\">" . emailEscape(formatMoney((float) $b['total_amount'])) . "</td></tr>
           <tr><td style=\"padding:6px;border:1px solid #ddd;\"><strong>Payment</strong></td>
               <td style=\"padding:6px;border:1px solid #ddd;\">"
               . emailEscape((string) $b['payment_method_label']) . ' / ' . emailEscape((string) $b['payment_status']) . "</td></tr>
           <tr><td style=\"padding:6px;border:1px solid #ddd;\"><strong>Booking status</strong></td>
               <td style=\"padding:6px;border:1px solid #ddd;\">" . emailEscape((string) $b['booking_status']) . "</td></tr>
         </table>"
    );

    return sendEmail(
        ADMIN_EMAIL,
        GUEST_HOUSE_NAME . ' — New Booking ' . $ref,
        $body
    );
}

/** @var list<string> */
const BOOKING_EMAIL_TRIGGERS = [
    'pay_at_hotel',
    'pending_verification',
    'payment_verified',
    'payment_rejected',
    'booking_cancelled',
    'admin_alert',
];

/**
 * Dispatch one or more email triggers for a booking.
 *
 * @param list<string> $triggers
 * @return array<string, bool> trigger => sent
 */
function sendBookingEmailTriggers(PDO $pdo, int $bookingId, array $triggers): array
{
    $results = [];

    foreach ($triggers as $trigger) {
        try {
            $results[$trigger] = match ($trigger) {
                'pay_at_hotel'         => sendPayAtHotelConfirmationEmail($pdo, $bookingId),
                'pending_verification' => sendPendingVerificationEmail($pdo, $bookingId),
                'payment_verified'     => sendPaymentVerifiedEmail($pdo, $bookingId),
                'payment_rejected'     => sendPaymentRejectedEmail($pdo, $bookingId),
                'booking_cancelled'    => sendBookingCancelledEmail($pdo, $bookingId),
                'admin_alert'          => sendAdminNewBookingAlert($pdo, $bookingId),
                default                => throw new InvalidArgumentException("Unknown email trigger: {$trigger}"),
            };
        } catch (Throwable $e) {
            error_log('[TGR send_email trigger ' . $trigger . '] ' . $e->getMessage());
            $results[$trigger] = false;
        }
    }

    return $results;
}

/**
 * Fire the correct guest + admin emails immediately after a new booking in book.php.
 */
function sendNewBookingEmails(PDO $pdo, int $bookingId, string $paymentMethod): void
{
    if ($paymentMethod === 'pay_at_hotel') {
        sendBookingEmailTriggers($pdo, $bookingId, ['pay_at_hotel', 'admin_alert']);
    } else {
        sendBookingEmailTriggers($pdo, $bookingId, ['pending_verification', 'admin_alert']);
    }
}
