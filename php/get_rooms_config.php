<?php
// Returns all room config (number, type, price, maxGuests) as JSON
require_once __DIR__ . '/../config/db.php';
header('Content-Type: application/json; charset=UTF-8');

try {
    $stmt = $pdo->query('SELECT room_number, room_type, price_per_night, max_guests FROM rooms ORDER BY CAST(room_number AS UNSIGNED)');
    $rooms = [];
    foreach ($stmt->fetchAll(PDO::FETCH_ASSOC) as $row) {
        $rooms[$row['room_number']] = [
            'type' => $row['room_type'],
            'price' => (float)$row['price_per_night'],
            'maxGuests' => (int)$row['max_guests'],
        ];
    }
    echo json_encode($rooms, JSON_THROW_ON_ERROR);
} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Unable to load room config']);
}
