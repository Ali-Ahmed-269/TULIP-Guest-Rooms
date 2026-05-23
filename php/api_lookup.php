<?php
declare(strict_types=1);

require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/includes/booking_helpers.php';

header('Content-Type: application/json; charset=UTF-8');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'POST required.']);
    exit;
}

$phone = trim((string) ($_POST['phone'] ?? ''));

if ($phone === '') {
    echo json_encode(['success' => false, 'message' => 'Phone number is required.']);
    exit;
}

if (!preg_match('/^03\d{2}-\d{7}$/', $phone)) {
    echo json_encode(['success' => false, 'message' => 'Phone must follow format 03XX-XXXXXXX.']);
    exit;
}

try {
    $stmt = $pdo->prepare(
        "SELECT b.id,
                b.booking_reference,
                b.check_in_date,
                b.check_out_date,
                b.booking_status,
                b.payment_status,
                r.room_number,
                r.room_type
         FROM bookings b
         INNER JOIN rooms r ON b.room_id = r.id
         WHERE b.guest_phone = ?
         ORDER BY b.created_at DESC"
    );
    $stmt->execute([$phone]);
    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

    $bookings = array_map(static function (array $row): array {
        return [
            'id'                 => (int) $row['id'],
            'booking_reference'  => $row['booking_reference'],
            'room_number'        => $row['room_number'],
            'room_type'          => $row['room_type'],
            'check_in_date'      => $row['check_in_date'],
            'check_out_date'     => $row['check_out_date'],
            'booking_status'     => $row['booking_status'],
            'payment_status'     => $row['payment_status'],
            'invoice_url'        => 'php/generate_invoice.php?booking_id=' . (int) $row['id'],
        ];
    }, $rows);

    echo json_encode([
        'success'  => true,
        'count'    => count($bookings),
        'bookings' => $bookings,
    ]);
} catch (Throwable $e) {
    error_log('[TGR api_lookup] ' . $e->getMessage());
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Could not search bookings. Please try again.']);
}
