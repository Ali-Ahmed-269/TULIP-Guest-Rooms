<?php
declare(strict_types=1);

require_once __DIR__ . '/includes/auth.php';
adminRequireLogin();

require_once __DIR__ . '/../config/db.php';

$id = (int) ($_GET['booking_id'] ?? 0);
if ($id < 1) {
    http_response_code(400);
    exit('Invalid booking.');
}

$stmt = $pdo->prepare('SELECT payment_proof FROM bookings WHERE id = ? LIMIT 1');
$stmt->execute([$id]);
$file = $stmt->fetchColumn();

if (!$file || !is_string($file)) {
    http_response_code(404);
    exit('No proof on file.');
}

$path = realpath(__DIR__ . '/../uploads/payments/' . basename($file));
$base = realpath(__DIR__ . '/../uploads/payments');

if ($path === false || $base === false || !str_starts_with($path, $base) || !is_readable($path)) {
    http_response_code(404);
    exit('File not found.');
}

$mime = mime_content_type($path) ?: 'application/octet-stream';
header('Content-Type: ' . $mime);
header('Content-Disposition: inline; filename="' . basename($path) . '"');
readfile($path);
exit;
