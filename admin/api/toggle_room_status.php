<?php
declare(strict_types=1);

require_once __DIR__ . '/../includes/auth.php';
require_once __DIR__ . '/../../config/db.php';

header('Content-Type: application/json; charset=UTF-8');

adminRequireLogin();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'POST required.']);
    exit;
}

$roomNumber = trim((string) ($_POST['room_number'] ?? ''));
$status     = trim((string) ($_POST['status'] ?? ''));

$allowed = ['Available', 'Maintenance', 'Reserved'];

if ($roomNumber === '' || !in_array($status, $allowed, true)) {
    echo json_encode([
        'success' => false,
        'message' => 'Invalid room or status. Allowed: Available, Maintenance, Reserved.',
    ]);
    exit;
}

try {
    $check = $pdo->prepare('SELECT id, status FROM rooms WHERE room_number = ? LIMIT 1');
    $check->execute([$roomNumber]);
    $room = $check->fetch();

    if (!$room) {
        echo json_encode(['success' => false, 'message' => 'Room not found.']);
        exit;
    }


    // Prevent changing a room away from a booked state if it currently has active bookings
    if ($status !== 'Booked') {
        $active = $pdo->prepare(
            "SELECT id FROM bookings
             WHERE room_id = ? AND booking_status IN ('Confirmed', 'Pending')
               AND check_out_date >= CURDATE()
             LIMIT 1"
        );
        $active->execute([$room['id']]);
        if ($active->fetch()) {
            echo json_encode([
                'success' => false,
                'message' => 'Room has an active booking. Cancel or complete it before changing status.',
            ]);
            exit;
        }
    }

    $update = $pdo->prepare('UPDATE rooms SET status = ? WHERE room_number = ?');
    $update->execute([$status, $roomNumber]);

    echo json_encode([
        'success'     => true,
        'room_number' => $roomNumber,
        'status'      => $status,
        'message'     => "Room {$roomNumber} set to {$status}.",
    ]);
} catch (Throwable $e) {
    error_log('[TGR admin toggle_room] ' . $e->getMessage());
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Database error.']);
}
