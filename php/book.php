<?php
/**
 * php/book.php — Tulip Guest Rooms booking submission handler
 *
 * Responsibilities:
 *  1. Verify CSRF token
 *  2. Rate-limit: max 5 POSTs per IP per hour (DB-backed)
 *  3. Server-side validate every input field
 *  4. Check room availability (overlap query)
 *  5. Check room status = 'Available' and guest count ≤ max_guests
 *  6. Handle payment-proof screenshot upload (MIME bytes check, 2 MB max)
 *  7. Insert booking in a DB transaction with correct statuses
 *  8. Update room status accordingly
 *  9. Return JSON: { success, booking_id, booking_reference } or { success, message }
 */

declare(strict_types=1);

session_start();
require_once __DIR__ . '/../config/db.php';

header('Content-Type: application/json; charset=UTF-8');

/* ─────────────────────────────────────────────────────────────
   Helper: send a JSON error response and exit immediately
───────────────────────────────────────────────────────────── */
function sendError(string $msg): never
{
    echo json_encode([
        'success' => false,
        'message' => htmlspecialchars($msg, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8'),
    ]);
    exit;
}

/* ─────────────────────────────────────────────────────────────
   Helper: get CSRF token from POST body OR request header
   (getallheaders() is absent on some nginx/cli environments)
───────────────────────────────────────────────────────────── */
function getCsrfToken(): string
{
    if (!empty($_POST['csrf_token'])) {
        return (string) $_POST['csrf_token'];
    }
    // Try the HTTP header variant
    $headers = function_exists('getallheaders') ? getallheaders() : [];
    return (string) ($headers['X-CSRF-Token'] ?? $headers['x-csrf-token'] ?? '');
}

/* ─────────────────────────────────────────────────────────────
   Only accept POST requests
───────────────────────────────────────────────────────────── */
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    sendError('Method Not Allowed.');
}

/* ─────────────────────────────────────────────────────────────
   STEP 1 — Verify CSRF token
───────────────────────────────────────────────────────────── */
$csrfToken = getCsrfToken();
if (
    empty($_SESSION['csrf_token']) ||
    !hash_equals((string) $_SESSION['csrf_token'], $csrfToken)
) {
    http_response_code(403);
    sendError('Invalid or expired security token. Please refresh the page and try again.');
}

/* ─────────────────────────────────────────────────────────────
   STEP 2 — Rate limit: max 5 POSTs per IP per hour (DB-backed)
   Falls back to session-based tracking if the table doesn't
   exist yet, so the handler still works without a migration.
───────────────────────────────────────────────────────────── */
$ip  = filter_var($_SERVER['REMOTE_ADDR'] ?? '', FILTER_VALIDATE_IP) ?: 'unknown';
$now = time();

try {
    // Purge entries older than 1 hour, then count
    $pdo->prepare(
        "DELETE FROM rate_limit_log WHERE ip_address = ? AND attempted_at < DATE_SUB(NOW(), INTERVAL 1 HOUR)"
    )->execute([$ip]);

    $countStmt = $pdo->prepare(
        "SELECT COUNT(*) FROM rate_limit_log WHERE ip_address = ? AND attempted_at >= DATE_SUB(NOW(), INTERVAL 1 HOUR)"
    );
    $countStmt->execute([$ip]);
    $attempts = (int) $countStmt->fetchColumn();

    if ($attempts >= 5) {
        http_response_code(429);
        sendError('Rate limit exceeded. You may submit a maximum of 5 booking requests per hour. Please try again later.');
    }

    // Record this attempt
    $pdo->prepare(
        "INSERT INTO rate_limit_log (ip_address, attempted_at) VALUES (?, NOW())"
    )->execute([$ip]);

} catch (\PDOException) {
    // rate_limit_log table may not exist yet — fall back to session
    if (!isset($_SESSION['_tgr_rate'])) {
        $_SESSION['_tgr_rate'] = [];
    }
    $_SESSION['_tgr_rate'] = array_filter(
        $_SESSION['_tgr_rate'],
        fn(int $ts) => ($now - $ts) < 3600
    );
    if (count($_SESSION['_tgr_rate']) >= 5) {
        http_response_code(429);
        sendError('Rate limit exceeded. You may submit a maximum of 5 booking requests per hour. Please try again later.');
    }
    $_SESSION['_tgr_rate'][] = $now;
}

/* ─────────────────────────────────────────────────────────────
   STEP 3 — Collect & sanitise POST fields
───────────────────────────────────────────────────────────── */
$fullname        = trim((string) ($_POST['fullname']        ?? ''));
$email           = trim((string) ($_POST['email']           ?? ''));
$phone           = trim((string) ($_POST['phone']           ?? ''));
$cnic            = trim((string) ($_POST['cnic']            ?? ''));
$address         = trim((string) ($_POST['address']         ?? ''));
$checkInRaw      = trim((string) ($_POST['check_in']        ?? ''));
$checkOutRaw     = trim((string) ($_POST['check_out']       ?? ''));
$roomType        = trim((string) ($_POST['room_type']       ?? ''));
$roomNumber      = trim((string) ($_POST['room_number']     ?? ($_POST['room_id'] ?? '')));
$guests          = (int)         ($_POST['guests']          ?? 0);
$paymentMethod   = trim((string) ($_POST['payment_method']  ?? ''));
$specialRequests = trim((string) ($_POST['special_requests'] ?? ''));

/* ─────────────────────────────────────────────────────────────
   STEP 3a — Validate each field server-side
───────────────────────────────────────────────────────────── */

// Full Name
if ($fullname === '') {
    sendError('Full Name is required.');
}
if (mb_strlen($fullname) > 100) {
    sendError('Full Name must not exceed 100 characters.');
}

// Address
if ($address === '') {
    sendError('Address is required.');
}

// Email
if ($email === '') {
    sendError('Email address is required.');
}
if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    sendError('Please enter a valid email address.');
}

// Phone — format: 03XX-XXXXXXX
if ($phone === '') {
    sendError('Phone number is required.');
}
if (!preg_match('/^03\d{2}-\d{7}$/', $phone)) {
    sendError('Phone number must follow the format 03XX-XXXXXXX (e.g. 0312-3456789).');
}

// CNIC — format: XXXXX-XXXXXXX-X
if ($cnic === '') {
    sendError('CNIC is required.');
}
if (!preg_match('/^\d{5}-\d{7}-\d$/', $cnic)) {
    sendError('CNIC must follow the format XXXXX-XXXXXXX-X (e.g. 12345-1234567-8).');
}

// Dates
if ($checkInRaw === '' || $checkOutRaw === '') {
    sendError('Check-in and Check-out dates are required.');
}

$checkIn  = \DateTimeImmutable::createFromFormat('Y-m-d', $checkInRaw);
$checkOut = \DateTimeImmutable::createFromFormat('Y-m-d', $checkOutRaw);
$today    = new \DateTimeImmutable('today');

if ($checkIn === false || $checkOut === false) {
    sendError('Invalid date format. Dates must be in YYYY-MM-DD format.');
}
if ($checkIn < $today) {
    sendError('Check-in date cannot be in the past.');
}
if ($checkOut <= $checkIn) {
    sendError('Check-out date must be strictly after the Check-in date (minimum 1 night).');
}

$nights = (int) $checkIn->diff($checkOut)->days;
if ($nights < 1) {
    sendError('Minimum stay is 1 night.');
}

// Room fields
if ($roomType === '') {
    sendError('Room Type is required.');
}
if ($roomNumber === '') {
    sendError('Room Number is required.');
}

// Guests
if ($guests < 1) {
    sendError('Number of guests must be at least 1.');
}
if ($guests > 10) {
    // Hard upper bound — per-room check comes later
    sendError('Number of guests cannot exceed 10.');
}

// Payment method
$validMethods = ['jazzcash', 'easypaisa', 'pay_at_hotel'];
if (!in_array($paymentMethod, $validMethods, true)) {
    sendError('Invalid payment method selected. Choose JazzCash, Easypaisa, or Pay at Hotel.');
}

/* ─────────────────────────────────────────────────────────────
   STEP 4 — Validate screenshot upload (online payments only)
   Done BEFORE DB work so we don't start a transaction on a
   bad file upload.
───────────────────────────────────────────────────────────── */
$uploadedExt      = '';
$uploadedTmpPath  = '';

if ($paymentMethod !== 'pay_at_hotel') {

    $fileError = $_FILES['payment_proof']['error'] ?? UPLOAD_ERR_NO_FILE;

    if ($fileError === UPLOAD_ERR_NO_FILE || !isset($_FILES['payment_proof'])) {
        sendError('A payment screenshot is required for JazzCash / Easypaisa payments.');
    }
    if ($fileError === UPLOAD_ERR_INI_SIZE || $fileError === UPLOAD_ERR_FORM_SIZE) {
        sendError('Payment screenshot exceeds the maximum allowed size of 2 MB.');
    }
    if ($fileError !== UPLOAD_ERR_OK) {
        sendError('File upload error (code ' . $fileError . '). Please try again.');
    }

    // Size check (2 MB hard limit)
    if ($_FILES['payment_proof']['size'] > 2 * 1024 * 1024) {
        sendError('Payment screenshot must not exceed 2 MB.');
    }

    $tmpPath = (string) $_FILES['payment_proof']['tmp_name'];

    if (!is_uploaded_file($tmpPath)) {
        sendError('Invalid file upload detected.');
    }

    // MIME type check against actual file bytes (not extension / Content-Type header)
    $finfo = new \finfo(FILEINFO_MIME_TYPE);
    $mime  = $finfo->file($tmpPath);

    $allowedMimes = [
        'image/jpeg' => 'jpg',
        'image/jpg'  => 'jpg',
        'image/png'  => 'png',
    ];

    if (!array_key_exists($mime, $allowedMimes)) {
        sendError('Only JPG and PNG images are accepted as payment proof. Detected: ' . htmlspecialchars($mime, ENT_QUOTES, 'UTF-8'));
    }

    $uploadedExt     = $allowedMimes[$mime];
    $uploadedTmpPath = $tmpPath;
}

/* ─────────────────────────────────────────────────────────────
   STEP 5 — DB checks & booking insertion (single transaction)
───────────────────────────────────────────────────────────── */
try {
    // 5a. Fetch room record
    $roomStmt = $pdo->prepare(
        "SELECT id, room_type, price_per_night, max_guests, status
         FROM rooms
         WHERE room_number = ?
         LIMIT 1"
    );
    $roomStmt->execute([$roomNumber]);
    $room = $roomStmt->fetch();

    if (!$room) {
        sendError('The selected room number does not exist in our system.');
    }

    // 5b. Check room status = 'Available'
    if ($room['status'] !== 'Available') {
        $statusLabel = htmlspecialchars($room['status'], ENT_QUOTES, 'UTF-8');
        sendError("Room {$roomNumber} is currently {$statusLabel} and cannot be booked.");
    }

    // 5c. Check guests ≤ max_guests
    if ($room['room_type'] !== $roomType) {
        sendError('Room type does not match the selected room number.');
    }

    if ($guests > (int) $room['max_guests']) {
        sendError(
            "Guest count exceeds capacity. Room {$roomNumber} accommodates a maximum of {$room['max_guests']} guest(s)."
        );
    }

    // 5d. Check availability overlap (exact query from spec)
    $overlapStmt = $pdo->prepare(
        "SELECT id FROM bookings
         WHERE room_id = ?
           AND booking_status != 'Cancelled'
           AND check_in_date  < ?
           AND check_out_date > ?
         LIMIT 1"
    );
    $overlapStmt->execute([
        $room['id'],
        $checkOutRaw,   // check_in_date  < check_out (new booking's checkout)
        $checkInRaw,    // check_out_date > check_in  (new booking's checkin)
    ]);

    if ($overlapStmt->fetch()) {
        sendError("Room {$roomNumber} is already booked for the selected dates. Please choose different dates or a different room.");
    }

    // ── Determine statuses based on payment method ───────────
    if ($paymentMethod === 'pay_at_hotel') {
        $paymentStatus = 'Unpaid';
        $bookingStatus = 'Confirmed';
        $roomNewStatus = 'Booked';
    } else {
        $paymentStatus = 'Pending Verification';
        $bookingStatus = 'Pending';
        $roomNewStatus = 'Reserved';
    }

    $totalAmount = $nights * (float) $room['price_per_night'];
    $currentYear = date('Y');   // dynamic year — no hardcoding

    /* ── BEGIN TRANSACTION ───────────────────────────────── */
    $pdo->beginTransaction();

    // 5e. Insert booking row
    $insertStmt = $pdo->prepare(
        "INSERT INTO bookings (
            room_id,
            guest_name, guest_email, guest_phone, guest_cnic, guest_address,
            check_in_date, check_out_date,
            guests_count,
            total_amount,
            payment_method,
            payment_status,
            booking_status,
            special_requests
         ) VALUES (
            ?,
            ?, ?, ?, ?, ?,
            ?, ?,
            ?,
            ?,
            ?,
            ?,
            ?,
            ?
         )"
    );
    $insertStmt->execute([
        $room['id'],
        $fullname,
        $email,
        $phone,
        $cnic,
        $address,
        $checkInRaw,
        $checkOutRaw,
        $guests,
        $totalAmount,
        $paymentMethod,
        $paymentStatus,
        $bookingStatus,
        $specialRequests ?: null,
    ]);

    $bookingId  = (int) $pdo->lastInsertId();
    $bookingRef = 'TGR-' . $currentYear . '-' . str_pad((string) $bookingId, 4, '0', STR_PAD_LEFT);

    // 5f. Handle screenshot move & update booking_reference
    $proofFilename = null;

    if ($paymentMethod !== 'pay_at_hotel') {

        $uploadDir = __DIR__ . '/../uploads/payments/';

        if (!is_dir($uploadDir) && !mkdir($uploadDir, 0755, true)) {
            $pdo->rollBack();
            sendError('Server configuration error: could not create upload directory.');
        }

        // Filename: screenshot_[booking_id]_[timestamp].[ext]
        $proofFilename = "screenshot_{$bookingId}_" . $now . ".{$uploadedExt}";
        $destPath      = $uploadDir . $proofFilename;

        if (!move_uploaded_file($uploadedTmpPath, $destPath)) {
            $pdo->rollBack();
            sendError('Failed to save the payment screenshot. Please try again.');
        }

        // Secure the file — readable by web server, not executable
        @chmod($destPath, 0644);

        $updateStmt = $pdo->prepare(
            "UPDATE bookings
             SET booking_reference = ?,
                 payment_proof     = ?
             WHERE id = ?"
        );
        $updateStmt->execute([$bookingRef, $proofFilename, $bookingId]);

    } else {

        $updateStmt = $pdo->prepare(
            "UPDATE bookings
             SET booking_reference = ?
             WHERE id = ?"
        );
        $updateStmt->execute([$bookingRef, $bookingId]);
    }

    // 5g. Update room status
    $roomUpdateStmt = $pdo->prepare(
        "UPDATE rooms SET status = ? WHERE id = ?"
    );
    $roomUpdateStmt->execute([$roomNewStatus, $room['id']]);

    $pdo->commit();
    /* ── END TRANSACTION ─────────────────────────────────── */

    // Email triggers (1/2/6) — failures are logged only; booking already saved
    if (is_readable(__DIR__ . '/../vendor/autoload.php')) {
        require_once __DIR__ . '/send_email.php';
        try {
            sendNewBookingEmails($pdo, $bookingId, $paymentMethod);
        } catch (Throwable $mailErr) {
            error_log('[TGR book.php email] ' . $mailErr->getMessage());
        }
    }

    $_SESSION['last_booking_id'] = $bookingId;

    // Invalidate the CSRF token so it cannot be replayed
    unset($_SESSION['csrf_token']);

    echo json_encode([
        'success'           => true,
        'booking_id'        => $bookingId,
        'booking_reference' => $bookingRef,
        'redirect_url'      => 'confirmation.php?booking_id=' . rawurlencode($bookingRef),
    ]);

} catch (\PDOException $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    // Log the real error server-side; send a safe message to the client
    error_log('[TGR book.php PDO] ' . $e->getMessage());
    sendError('A database error occurred while processing your booking. Please try again or contact us directly.');

} catch (\Throwable $e) {
    if (isset($pdo) && $pdo->inTransaction()) {
        $pdo->rollBack();
    }
    error_log('[TGR book.php] ' . $e->getMessage());
    sendError('An unexpected error occurred. Please try again.');
}
