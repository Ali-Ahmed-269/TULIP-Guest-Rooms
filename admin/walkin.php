<?php
declare(strict_types=1);

require_once __DIR__ . '/includes/auth.php';
adminRequireLogin();

require_once __DIR__ . '/../config/db.php';

if (empty($_SESSION['csrf_token'])) {
    $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
}

$formData = [
    'guest_name' => trim((string) ($_POST['guest_name'] ?? '')),
    'guest_email' => trim((string) ($_POST['guest_email'] ?? '')),
    'guest_phone' => trim((string) ($_POST['guest_phone'] ?? '')),
    'guest_cnic' => trim((string) ($_POST['guest_cnic'] ?? '')),
    'guest_address' => trim((string) ($_POST['guest_address'] ?? '')),
    'room_id' => (int) ($_POST['room_id'] ?? 0),
    'check_in_date' => trim((string) ($_POST['check_in_date'] ?? '')),
    'check_out_date' => trim((string) ($_POST['check_out_date'] ?? '')),
    'guests_count' => (int) ($_POST['guests_count'] ?? 1),
    'special_requests' => trim((string) ($_POST['special_requests'] ?? '')),
];

$availableRooms = $pdo->query(
    "SELECT id, room_number, room_type, price_per_night, max_guests
     FROM rooms
     WHERE status = 'Available'
     ORDER BY CAST(room_number AS UNSIGNED)"
)->fetchAll();

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $csrf = (string) ($_POST['csrf_token'] ?? '');
    if (!hash_equals($_SESSION['csrf_token'] ?? '', $csrf)) {
        $_SESSION['flash_error'] = 'Invalid CSRF security token.';
        header('Location: walkin.php');
        exit;
    }

    $errors = [];

    if ($formData['guest_name'] === '') {
        $errors[] = 'Guest name is required.';
    }
    if ($formData['guest_email'] === '' || !filter_var($formData['guest_email'], FILTER_VALIDATE_EMAIL)) {
        $errors[] = 'A valid guest email is required.';
    }
    if ($formData['guest_phone'] === '' || !preg_match('/^03\d{2}-\d{7}$/', $formData['guest_phone'])) {
        $errors[] = 'Guest phone must follow 03XX-XXXXXXX.';
    }
    if ($formData['guest_cnic'] === '' || !preg_match('/^\d{5}-\d{7}-\d$/', $formData['guest_cnic'])) {
        $errors[] = 'Guest CNIC must follow XXXXX-XXXXXXX-X.';
    }
    if ($formData['guest_address'] === '') {
        $errors[] = 'Guest address is required.';
    }
    if ($formData['room_id'] <= 0) {
        $errors[] = 'Please select a room.';
    }
    if ($formData['check_in_date'] === '' || $formData['check_out_date'] === '') {
        $errors[] = 'Check-in and check-out dates are required.';
    }
    if ($formData['guests_count'] < 1) {
        $errors[] = 'Guest count must be at least 1.';
    }

    $checkIn = $formData['check_in_date'] !== '' ? DateTimeImmutable::createFromFormat('Y-m-d', $formData['check_in_date']) : false;
    $checkOut = $formData['check_out_date'] !== '' ? DateTimeImmutable::createFromFormat('Y-m-d', $formData['check_out_date']) : false;
    $today = new DateTimeImmutable('today');

    if ($checkIn === false || $checkOut === false) {
        $errors[] = 'Dates must be valid YYYY-MM-DD values.';
    } elseif ($checkIn < $today) {
        $errors[] = 'Check-in date cannot be in the past.';
    } elseif ($checkOut <= $checkIn) {
        $errors[] = 'Check-out date must be after check-in.';
    }

    $room = null;
    if ($formData['room_id'] > 0) {
        $roomStmt = $pdo->prepare(
            "SELECT id, room_number, room_type, price_per_night, max_guests, status
             FROM rooms
             WHERE id = ?
             LIMIT 1"
        );
        $roomStmt->execute([$formData['room_id']]);
        $room = $roomStmt->fetch(PDO::FETCH_ASSOC);
        if (!$room) {
            $errors[] = 'Selected room does not exist.';
        } elseif ((string) $room['status'] !== 'Available') {
            $errors[] = 'Selected room is no longer available.';
        } elseif ($formData['guests_count'] > (int) $room['max_guests']) {
            $errors[] = 'Selected room cannot host that many guests.';
        }
    }

    if ($errors === []) {
        $nights = (int) $checkIn->diff($checkOut)->days;
        $overlapStmt = $pdo->prepare(
            "SELECT id
             FROM bookings
             WHERE room_id = ?
               AND booking_status != 'Cancelled'
               AND check_in_date < ?
               AND check_out_date > ?
             LIMIT 1"
        );
        $overlapStmt->execute([$room['id'], $formData['check_out_date'], $formData['check_in_date']]);
        if ($overlapStmt->fetch()) {
            $errors[] = 'The selected room is already booked for those dates.';
        }
    }

    if ($errors !== []) {
        $_SESSION['flash_error'] = implode(' ', $errors);
        header('Location: walkin.php');
        exit;
    }

    $totalAmount = $nights * (float) $room['price_per_night'];
    $currentYear = date('Y');

    try {
        $pdo->beginTransaction();

        $insert = $pdo->prepare(
            "INSERT INTO bookings (
                room_id,
                guest_name,
                guest_email,
                guest_phone,
                guest_cnic,
                guest_address,
                check_in_date,
                check_out_date,
                guests_count,
                total_amount,
                payment_method,
                payment_status,
                booking_status,
                special_requests
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'walk_in', 'Paid', 'Confirmed', ?)"
        );
        $insert->execute([
            $room['id'],
            $formData['guest_name'],
            $formData['guest_email'],
            $formData['guest_phone'],
            $formData['guest_cnic'],
            $formData['guest_address'],
            $formData['check_in_date'],
            $formData['check_out_date'],
            $formData['guests_count'],
            $totalAmount,
            $formData['special_requests'] !== '' ? $formData['special_requests'] : null,
        ]);

        $bookingId = (int) $pdo->lastInsertId();
        $bookingRef = 'TGR-' . $currentYear . '-' . str_pad((string) $bookingId, 4, '0', STR_PAD_LEFT);
        $pdo->prepare('UPDATE bookings SET booking_reference = ? WHERE id = ?')->execute([$bookingRef, $bookingId]);
        $pdo->prepare('UPDATE rooms SET status = ? WHERE id = ?')->execute(['Booked', $room['id']]);

        $pdo->commit();

        require_once __DIR__ . '/../php/send_email.php';
        try {
            sendBookingEmailTriggers($pdo, $bookingId, ['pay_at_hotel', 'admin_alert']);
        } catch (Throwable $mailErr) {
            error_log('[TGR walkin.php email] ' . $mailErr->getMessage());
        }

        $_SESSION['flash_success'] = 'Walk-in booking created successfully. Reference ' . $bookingRef . '.';
        header('Location: bookings.php?search=' . rawurlencode($bookingRef));
        exit;
    } catch (Throwable $e) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        error_log('[TGR walkin.php] ' . $e->getMessage());
        $_SESSION['flash_error'] = 'Unable to save the walk-in booking right now.';
        header('Location: walkin.php');
        exit;
    }
}

$flashSuccess = (string) ($_SESSION['flash_success'] ?? '');
$flashError = (string) ($_SESSION['flash_error'] ?? '');
unset($_SESSION['flash_success'], $_SESSION['flash_error']);

$activePage = 'walkin';
$pageTitle = 'Walk-in';
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title><?= adminH($pageTitle) ?> — Tulip Admin</title>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <link rel="stylesheet" href="admin.css">
</head>
<body class="admin-body">
<div class="admin-layout">
    <?php require __DIR__ . '/includes/sidebar.php'; ?>
    <main class="admin-main">
        <div class="admin-page-header">
            <h1>Add walk-in booking</h1>
            <a href="dashboard.php" class="admin-btn admin-btn-outline admin-btn-sm">← Dashboard</a>
        </div>

        <?php if ($flashSuccess !== ''): ?>
            <div class="admin-alert admin-alert-info"><i class="fa-solid fa-circle-check"></i> <?= adminH($flashSuccess) ?></div>
        <?php endif; ?>
        <?php if ($flashError !== ''): ?>
            <div class="admin-alert admin-alert-error"><i class="fa-solid fa-circle-exclamation"></i> <?= adminH($flashError) ?></div>
        <?php endif; ?>

        <section class="admin-panel">
            <p style="margin-bottom:16px;color:#666;">
                Create a confirmed walk-in reservation and mark the room as booked immediately.
            </p>

            <?php if (count($availableRooms) === 0): ?>
                <div class="admin-alert admin-alert-warning">
                    <i class="fa-solid fa-triangle-exclamation"></i> No rooms are currently available for new walk-ins.
                </div>
            <?php endif; ?>

            <form method="post" style="display:grid;gap:16px;">
                <input type="hidden" name="csrf_token" value="<?= adminH($_SESSION['csrf_token']) ?>">

                <div class="filter-grid">
                    <div class="admin-form-group">
                        <label for="guest_name">Guest name</label>
                        <input id="guest_name" name="guest_name" class="form-control" required value="<?= adminH($formData['guest_name']) ?>">
                    </div>
                    <div class="admin-form-group">
                        <label for="guest_email">Email</label>
                        <input id="guest_email" name="guest_email" type="email" class="form-control" required value="<?= adminH($formData['guest_email']) ?>">
                    </div>
                    <div class="admin-form-group">
                        <label for="guest_phone">Phone</label>
                        <input id="guest_phone" name="guest_phone" class="form-control" placeholder="0300-1234567" required value="<?= adminH($formData['guest_phone']) ?>">
                    </div>
                    <div class="admin-form-group">
                        <label for="guest_cnic">CNIC</label>
                        <input id="guest_cnic" name="guest_cnic" class="form-control" placeholder="12345-1234567-1" required value="<?= adminH($formData['guest_cnic']) ?>">
                    </div>
                    <div class="admin-form-group">
                        <label for="guest_address">Address</label>
                        <input id="guest_address" name="guest_address" class="form-control" required value="<?= adminH($formData['guest_address']) ?>">
                    </div>
                    <div class="admin-form-group">
                        <label for="room_id">Room</label>
                        <select id="room_id" name="room_id" class="form-control" required>
                            <option value="">Select room</option>
                            <?php foreach ($availableRooms as $room): ?>
                                <option value="<?= (int) $room['id'] ?>" <?= $formData['room_id'] === (int) $room['id'] ? 'selected' : '' ?>>
                                    <?= adminH((string) $room['room_number']) ?> — <?= adminH((string) $room['room_type']) ?> (PKR <?= number_format((float) $room['price_per_night'], 2) ?>/night)
                                </option>
                            <?php endforeach; ?>
                        </select>
                    </div>
                    <div class="admin-form-group">
                        <label for="check_in_date">Check-in</label>
                        <input id="check_in_date" name="check_in_date" type="date" class="form-control" required value="<?= adminH($formData['check_in_date']) ?>">
                    </div>
                    <div class="admin-form-group">
                        <label for="check_out_date">Check-out</label>
                        <input id="check_out_date" name="check_out_date" type="date" class="form-control" required value="<?= adminH($formData['check_out_date']) ?>">
                    </div>
                    <div class="admin-form-group">
                        <label for="guests_count">Guests</label>
                        <input id="guests_count" name="guests_count" type="number" min="1" class="form-control" required value="<?= (int) $formData['guests_count'] ?>">
                    </div>
                </div>

                <div class="admin-form-group">
                    <label for="special_requests">Special requests</label>
                    <textarea id="special_requests" name="special_requests" class="form-control" rows="4"><?= adminH($formData['special_requests']) ?></textarea>
                </div>

                <div class="filter-actions">
                    <button type="submit" class="admin-btn admin-btn-primary" style="width:auto;" <?= count($availableRooms) === 0 ? 'disabled' : '' ?>>Create walk-in booking</button>
                </div>
            </form>
        </section>
    </main>
</div>
</body>
</html>
