<?php
declare(strict_types=1);

session_start();
require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/includes/booking_helpers.php';

header('Content-Type: application/json; charset=UTF-8');

$method = $_SERVER['REQUEST_METHOD'];

try {
    if ($method === 'GET') {
        handleGetApprovedReviews($pdo);
    } elseif ($method === 'POST') {
        handleSubmitReview($pdo);
    } else {
        http_response_code(405);
        echo json_encode(['success' => false, 'message' => 'Method not allowed.']);
    }
} catch (Throwable $e) {
    error_log('[TGR api_reviews] ' . $e->getMessage());
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Server error. Please try again later.']);
}

function handleGetApprovedReviews(PDO $pdo): void
{
    $stmt = $pdo->query(
        "SELECT guest_name, rating, review_text, created_at
         FROM reviews
         WHERE status = 'Approved'
         ORDER BY created_at DESC
         LIMIT 100"
    );
    $reviews = $stmt->fetchAll(PDO::FETCH_ASSOC);

    $out = array_map(static function (array $r): array {
        return [
            'guest_name'  => $r['guest_name'],
            'rating'      => (int) $r['rating'],
            'review_text' => $r['review_text'],
            'created_at'  => $r['created_at'],
        ];
    }, $reviews);

    echo json_encode(['success' => true, 'reviews' => $out]);
}

function handleSubmitReview(PDO $pdo): void
{
    $csrf = (string) ($_POST['csrf_token'] ?? '');
    if (
        empty($_SESSION['csrf_token'])
        || !hash_equals((string) $_SESSION['csrf_token'], $csrf)
    ) {
        http_response_code(403);
        echo json_encode(['success' => false, 'message' => 'Invalid security token. Please refresh the page.']);
        return;
    }

    $bookingRef = trim((string) ($_POST['booking_id'] ?? ''));
    $phone      = trim((string) ($_POST['phone'] ?? ''));
    $rating     = (int) ($_POST['rating'] ?? 0);
    $guestName  = trim((string) ($_POST['guest_name'] ?? ''));
    $reviewText = trim((string) ($_POST['review_text'] ?? ''));

    if ($bookingRef === '') {
        echo json_encode(['success' => false, 'message' => 'Booking ID is required.']);
        return;
    }
    if ($phone === '' || !preg_match('/^03\d{2}-\d{7}$/', $phone)) {
        echo json_encode(['success' => false, 'message' => 'Valid phone number (03XX-XXXXXXX) is required.']);
        return;
    }
    if ($rating < 1 || $rating > 5) {
        echo json_encode(['success' => false, 'message' => 'Please select a rating from 1 to 5 stars.']);
        return;
    }
    if ($guestName === '') {
        echo json_encode(['success' => false, 'message' => 'Your name is required.']);
        return;
    }
    if (mb_strlen($guestName) > 100) {
        echo json_encode(['success' => false, 'message' => 'Name must not exceed 100 characters.']);
        return;
    }
    if ($reviewText === '') {
        echo json_encode(['success' => false, 'message' => 'Review text is required.']);
        return;
    }
    if (mb_strlen($reviewText) > 2000) {
        echo json_encode(['success' => false, 'message' => 'Review must not exceed 2000 characters.']);
        return;
    }

    $bookingId = resolveBookingId($pdo, $bookingRef);
    if (!$bookingId) {
        echo json_encode(['success' => false, 'message' => 'Booking not found. Check your Booking ID.']);
        return;
    }

    $booking = fetchBookingSummary($pdo, $bookingId);
    if (!$booking) {
        echo json_encode(['success' => false, 'message' => 'Booking not found.']);
        return;
    }

    if ($booking['guest_phone'] !== $phone) {
        echo json_encode(['success' => false, 'message' => 'Phone number does not match this booking.']);
        return;
    }

    if (!in_array($booking['booking_status'], ['Confirmed', 'Completed'], true)) {
        echo json_encode([
            'success' => false,
            'message' => 'Reviews can only be submitted after your stay is confirmed or completed.',
        ]);
        return;
    }

    $dup = $pdo->prepare('SELECT id FROM reviews WHERE booking_id = ? LIMIT 1');
    $dup->execute([$bookingId]);
    if ($dup->fetch()) {
        echo json_encode(['success' => false, 'message' => 'A review has already been submitted for this booking.']);
        return;
    }

    $insert = $pdo->prepare(
        "INSERT INTO reviews (booking_id, guest_name, rating, review_text, status)
         VALUES (?, ?, ?, ?, 'Pending')"
    );
    $insert->execute([$bookingId, $guestName, $rating, $reviewText]);

    echo json_encode([
        'success' => true,
        'message' => 'Thank you! Your review has been submitted and will appear after approval.',
    ]);
}
