<?php
/**
 * php/admin_booking_email.php — Send admin-triggered booking emails (triggers 3–5)
 *
 * Intended for admin panel integration. POST JSON or form:
 *   booking_id  (int)
 *   action      payment_verified | payment_rejected | booking_cancelled
 *   admin_token (required — set ADMIN_API_TOKEN in the environment)
 *
 * Example:
 *   curl -X POST http://localhost:8080/php/admin_booking_email.php \
 *     -d "booking_id=1&action=payment_verified&admin_token=secret"
 */

declare(strict_types=1);

require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../config/email.php';
require_once __DIR__ . '/send_email.php';

header('Content-Type: application/json; charset=UTF-8');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'POST required.']);
    exit;
}

if (!defined('ADMIN_API_TOKEN') || ADMIN_API_TOKEN === '') {
    http_response_code(503);
    echo json_encode([
        'success' => false,
        'message' => 'Admin email endpoint is not configured. Set ADMIN_API_TOKEN in the environment before using this endpoint.',
    ]);
    exit;
}

$token = (string) ($_POST['admin_token'] ?? $_SERVER['HTTP_X_ADMIN_TOKEN'] ?? '');
if (!hash_equals(ADMIN_API_TOKEN, $token)) {
    http_response_code(403);
    echo json_encode(['success' => false, 'message' => 'Unauthorized.']);
    exit;
}

$bookingId = (int) ($_POST['booking_id'] ?? 0);
$action    = trim((string) ($_POST['action'] ?? ''));

$map = [
    'payment_verified'  => 'payment_verified',
    'payment_rejected'  => 'payment_rejected',
    'booking_cancelled' => 'booking_cancelled',
];

if ($bookingId < 1 || !isset($map[$action])) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'message' => 'Invalid booking_id or action. Use: payment_verified, payment_rejected, booking_cancelled.',
    ]);
    exit;
}

$trigger = $map[$action];
$results = sendBookingEmailTriggers($pdo, $bookingId, [$trigger]);

echo json_encode([
    'success' => (bool) ($results[$trigger] ?? false),
    'trigger' => $trigger,
    'sent'    => $results[$trigger] ?? false,
]);
