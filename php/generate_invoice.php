<?php
/**
 * php/generate_invoice.php — DOMPDF booking invoice
 *
 * Invoice number format: INV-TGR-{year}-{XXXX}
 *
 * Usage:
 *   require_once __DIR__ . '/generate_invoice.php';
 *   $pdfBinary = generateInvoicePdf($pdo, $bookingId);
 *   $base64    = generateInvoicePdfBase64($pdo, $bookingId);
 *
 * HTTP download (optional):
 *   GET /php/generate_invoice.php?booking_id=1
 */

declare(strict_types=1);

use Dompdf\Dompdf;
use Dompdf\Options;

require_once __DIR__ . '/../vendor/autoload.php';

/**
 * Load booking + room row for invoicing.
 *
 * @return array<string, mixed>
 */
function loadBookingForInvoice(PDO $pdo, int $bookingId): array
{
    $stmt = $pdo->prepare(
        "SELECT b.*,
                r.room_number,
                r.room_type,
                r.price_per_night
         FROM bookings b
         INNER JOIN rooms r ON b.room_id = r.id
         WHERE b.id = ?
         LIMIT 1"
    );
    $stmt->execute([$bookingId]);
    $row = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$row) {
        throw new RuntimeException("Booking #{$bookingId} not found.");
    }

    $checkIn  = new DateTimeImmutable((string) $row['check_in_date']);
    $checkOut = new DateTimeImmutable((string) $row['check_out_date']);
    $nights   = max(1, (int) $checkIn->diff($checkOut)->days);

    $row['nights']           = $nights;
    $row['invoice_number']   = 'INV-TGR-' . date('Y') . '-' . str_pad((string) $bookingId, 4, '0', STR_PAD_LEFT);
    $row['payment_method_label'] = formatPaymentMethodLabel((string) $row['payment_method']);

    return $row;
}

function formatPaymentMethodLabel(string $method): string
{
    return match ($method) {
        'jazzcash'     => 'JazzCash',
        'easypaisa'    => 'Easypaisa',
        'pay_at_hotel' => 'Pay at Hotel',
        default        => ucfirst(str_replace('_', ' ', $method)),
    };
}

function escapeHtml(string $value): string
{
    return htmlspecialchars($value, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
}

function formatMoney(float $amount): string
{
    return 'PKR ' . number_format($amount, 2);
}

/**
 * Resolve logo for PDF: file path, or embedded text fallback.
 */
function getInvoiceLogoHtml(): string
{
    $candidates = [
        __DIR__ . '/../images/logo.png',
        __DIR__ . '/../images/logo.jpg',
        __DIR__ . '/../assets/logo.png',
    ];

    foreach ($candidates as $path) {
        if (!is_readable($path)) {
            continue;
        }
        $mime = mime_content_type($path) ?: 'image/png';
        $data = base64_encode((string) file_get_contents($path));
        return '<img src="data:' . escapeHtml($mime) . ';base64,' . $data . '" alt="Logo" style="max-height:56px;">';
    }

    if (!defined('GUEST_HOUSE_NAME')) {
        require_once __DIR__ . '/../config/email.php';
    }

    return '<div style="font-size:22px;font-weight:bold;color:#1a5f4a;">'
        . escapeHtml(GUEST_HOUSE_NAME)
        . '</div>';
}

/**
 * Build invoice HTML from booking row.
 *
 * @param array<string, mixed> $booking
 */
function buildInvoiceHtml(array $booking): string
{
    if (!defined('GUEST_HOUSE_NAME')) {
        require_once __DIR__ . '/../config/email.php';
    }

    $logoHtml = getInvoiceLogoHtml();
    $issued   = date('d M Y');
    $name     = escapeHtml((string) $booking['guest_name']);
    $email    = escapeHtml((string) $booking['guest_email']);
    $phone    = escapeHtml((string) $booking['guest_phone']);
    $cnic     = escapeHtml((string) $booking['guest_cnic']);
    $address  = escapeHtml((string) $booking['guest_address']);
    $ref      = escapeHtml((string) ($booking['booking_reference'] ?? ''));
    $invNo    = escapeHtml((string) $booking['invoice_number']);
    $roomNum  = escapeHtml((string) $booking['room_number']);
    $roomType = escapeHtml((string) $booking['room_type']);
    $checkIn  = escapeHtml((string) $booking['check_in_date']);
    $checkOut = escapeHtml((string) $booking['check_out_date']);
    $guests   = (int) $booking['guests_count'];
    $nights   = (int) $booking['nights'];
    $price    = formatMoney((float) $booking['price_per_night']);
    $total    = formatMoney((float) $booking['total_amount']);
    $payMethod = escapeHtml((string) $booking['payment_method_label']);
    $payStatus = escapeHtml((string) $booking['payment_status']);
    $bookStatus = escapeHtml((string) $booking['booking_status']);
    $special  = trim((string) ($booking['special_requests'] ?? ''));
    $specialHtml = $special !== ''
        ? '<tr><th>Special requests</th><td>' . escapeHtml($special) . '</td></tr>'
        : '';

    $ghName  = escapeHtml(GUEST_HOUSE_NAME);
    $ghAddr  = escapeHtml(GUEST_HOUSE_ADDRESS);
    $ghPhone = escapeHtml(GUEST_HOUSE_PHONE);
    $ghEmail = escapeHtml(GUEST_HOUSE_EMAIL);

    return <<<HTML
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<style>
  body { font-family: DejaVu Sans, sans-serif; font-size: 12px; color: #222; margin: 0; padding: 24px; }
  .header { border-bottom: 2px solid #1a5f4a; padding-bottom: 12px; margin-bottom: 20px; }
  .header table { width: 100%; }
  .title { font-size: 20px; color: #1a5f4a; margin: 8px 0 0; }
  .meta { text-align: right; font-size: 11px; color: #555; }
  h2 { font-size: 14px; color: #1a5f4a; margin: 18px 0 8px; }
  table.details { width: 100%; border-collapse: collapse; margin-bottom: 12px; }
  table.details th, table.details td { border: 1px solid #ddd; padding: 8px; text-align: left; vertical-align: top; }
  table.details th { background: #f4f8f6; width: 32%; }
  table.charges { width: 100%; border-collapse: collapse; }
  table.charges th, table.charges td { border: 1px solid #ddd; padding: 8px; }
  table.charges th { background: #1a5f4a; color: #fff; }
  .total-row td { font-weight: bold; font-size: 13px; }
  .footer { margin-top: 28px; padding-top: 12px; border-top: 1px solid #ccc; font-size: 10px; color: #555; text-align: center; }
</style>
</head>
<body>
  <div class="header">
    <table>
      <tr>
        <td>{$logoHtml}</td>
        <td class="meta">
          <strong>Invoice No:</strong> {$invNo}<br>
          <strong>Booking Ref:</strong> {$ref}<br>
          <strong>Date issued:</strong> {$issued}
        </td>
      </tr>
    </table>
    <div class="title">Booking Invoice</div>
  </div>

  <h2>Guest Details</h2>
  <table class="details">
    <tr><th>Full name</th><td>{$name}</td></tr>
    <tr><th>Email</th><td>{$email}</td></tr>
    <tr><th>Phone</th><td>{$phone}</td></tr>
    <tr><th>CNIC</th><td>{$cnic}</td></tr>
    <tr><th>Address</th><td>{$address}</td></tr>
    {$specialHtml}
  </table>

  <h2>Stay Details</h2>
  <table class="details">
    <tr><th>Room number</th><td>{$roomNum}</td></tr>
    <tr><th>Room type</th><td>{$roomType}</td></tr>
    <tr><th>Check-in</th><td>{$checkIn}</td></tr>
    <tr><th>Check-out</th><td>{$checkOut}</td></tr>
    <tr><th>Nights</th><td>{$nights}</td></tr>
    <tr><th>Guests</th><td>{$guests}</td></tr>
  </table>

  <h2>Charges</h2>
  <table class="charges">
    <thead>
      <tr>
        <th>Description</th>
        <th>Rate / night</th>
        <th>Nights</th>
        <th>Amount</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>Room {$roomNum} — {$roomType}</td>
        <td>{$price}</td>
        <td>{$nights}</td>
        <td>{$total}</td>
      </tr>
      <tr class="total-row">
        <td colspan="3" style="text-align:right;">Total (PKR)</td>
        <td>{$total}</td>
      </tr>
    </tbody>
  </table>

  <h2>Payment</h2>
  <table class="details">
    <tr><th>Payment method</th><td>{$payMethod}</td></tr>
    <tr><th>Payment status</th><td>{$payStatus}</td></tr>
    <tr><th>Booking status</th><td>{$bookStatus}</td></tr>
  </table>

  <div class="footer">
    <strong>{$ghName}</strong><br>
    {$ghAddr}<br>
    Phone: {$ghPhone} &nbsp;|&nbsp; Email: {$ghEmail}<br>
    Thank you for choosing {$ghName}.
  </div>
</body>
</html>
HTML;
}

/**
 * Render invoice PDF binary from booking id.
 */
function generateInvoicePdf(PDO $pdo, int $bookingId): string
{
    $booking = loadBookingForInvoice($pdo, $bookingId);
    $html    = buildInvoiceHtml($booking);

    $options = new Options();
    $options->set('isRemoteEnabled', false);
    $options->set('defaultFont', 'DejaVu Sans');

    $dompdf = new Dompdf($options);
    $dompdf->loadHtml($html);
    $dompdf->setPaper('A4', 'portrait');
    $dompdf->render();

    return $dompdf->output();
}

/**
 * Return base64-encoded PDF for email attachments.
 */
function generateInvoicePdfBase64(PDO $pdo, int $bookingId): string
{
    return base64_encode(generateInvoicePdf($pdo, $bookingId));
}

/**
 * Suggested attachment filename for a booking invoice.
 */
function getInvoiceFilename(int $bookingId): string
{
    $year = date('Y');
    return 'INV-TGR-' . $year . '-' . str_pad((string) $bookingId, 4, '0', STR_PAD_LEFT) . '.pdf';
}

/**
 * Stream PDF as download to the browser.
 */
function outputInvoiceDownload(PDO $pdo, int $bookingId): void
{
    $pdf      = generateInvoicePdf($pdo, $bookingId);
    $filename = getInvoiceFilename($bookingId);

    header('Content-Type: application/pdf');
    header('Content-Disposition: attachment; filename="' . $filename . '"');
    header('Content-Length: ' . (string) strlen($pdf));
    header('Cache-Control: private, max-age=0, must-revalidate');
    echo $pdf;
    exit;
}

// ── Direct HTTP access: download invoice ─────────────────────
if (PHP_SAPI !== 'cli' && basename($_SERVER['SCRIPT_FILENAME'] ?? '') === 'generate_invoice.php') {
    require_once __DIR__ . '/../config/db.php';

    $bookingId = (int) ($_GET['booking_id'] ?? 0);
    if ($bookingId < 1) {
        http_response_code(400);
        header('Content-Type: application/json');
        echo json_encode(['success' => false, 'message' => 'booking_id is required.']);
        exit;
    }

    try {
        if (isset($_GET['mode']) && $_GET['mode'] === 'base64') {
            header('Content-Type: application/json');
            echo json_encode([
                'success'  => true,
                'filename' => getInvoiceFilename($bookingId),
                'pdf'      => generateInvoicePdfBase64($pdo, $bookingId),
            ]);
            exit;
        }

        outputInvoiceDownload($pdo, $bookingId);
    } catch (Throwable $e) {
        error_log('[TGR generate_invoice] ' . $e->getMessage());
        http_response_code(500);
        header('Content-Type: application/json');
        echo json_encode(['success' => false, 'message' => 'Could not generate invoice.']);
    }
}
