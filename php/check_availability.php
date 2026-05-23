<?php
require_once '../config/db.php';

header('Content-Type: application/json; charset=UTF-8');

$check_in = trim((string) ($_POST['check_in'] ?? ''));
$check_out = trim((string) ($_POST['check_out'] ?? ''));

if ($check_in === '' || $check_out === '') {
    echo json_encode(['error' => 'Please provide both dates']);
    exit;
}

try {
    // Load rooms with base status
    $stmt = $pdo->query("SELECT id, room_number, status FROM rooms");
    $rooms = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // Find overlapping bookings in the requested range
    $overlapStmt = $pdo->prepare(
        "SELECT r.room_number, b.booking_status, b.payment_status, b.payment_method
         FROM bookings b
         JOIN rooms r ON b.room_id = r.id
         WHERE b.booking_status != 'Cancelled'
           AND b.check_in_date < :check_out
           AND b.check_out_date > :check_in"
    );
    $overlapStmt->execute([':check_out' => $check_out, ':check_in' => $check_in]);
    $overlaps = $overlapStmt->fetchAll(PDO::FETCH_ASSOC);

    // Map room_number => list of overlapping booking rows
    $byRoom = [];
    foreach ($overlaps as $o) {
        $byRoom[$o['room_number']][] = $o;
    }

    $availability = [];

    foreach ($rooms as $room) {
        $num = (string) $room['room_number'];
        $baseStatus = (string) $room['status'];

        // Maintenance always takes precedence
        if ($baseStatus === 'Maintenance') {
            $availability[$num] = 'Maintenance';
            continue;
        }

        $overlapList = $byRoom[$num] ?? [];

        // If any overlapping booking is pending verification or a Pending booking, surface that
        $hasPendingVerification = false;
        $hasConfirmedOverlap = false;
        foreach ($overlapList as $ob) {
            if (($ob['booking_status'] ?? '') === 'Pending' || ($ob['payment_status'] ?? '') === 'Pending Verification') {
                $hasPendingVerification = true;
            }
            if (($ob['booking_status'] ?? '') === 'Confirmed' || ($ob['payment_status'] ?? '') === 'Paid' || ($ob['payment_method'] ?? '') === 'walk_in') {
                $hasConfirmedOverlap = true;
            }
        }

        if ($hasPendingVerification) {
            $availability[$num] = 'Pending Verification';
            continue;
        }

        if ($hasConfirmedOverlap || $baseStatus === 'Booked') {
            $availability[$num] = 'Booked';
            continue;
        }

        if ($baseStatus === 'Reserved') {
            $availability[$num] = 'Reserved';
            continue;
        }

        $availability[$num] = 'Available';
    }

    echo json_encode($availability, JSON_THROW_ON_ERROR);

} catch (Throwable $e) {
    error_log('[TGR check_availability] ' . $e->getMessage());
    echo json_encode(['error' => 'Server error']);
}

?>
