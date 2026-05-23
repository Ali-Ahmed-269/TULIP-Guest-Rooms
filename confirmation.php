<?php
declare(strict_types=1);

session_start();
require_once __DIR__ . '/config/db.php';
require_once __DIR__ . '/php/includes/booking_helpers.php';

$rawId = $_GET['booking_id'] ?? $_SESSION['last_booking_id'] ?? null;
$bookingId = resolveBookingId($pdo, $rawId);
$booking = $bookingId ? fetchBookingSummary($pdo, $bookingId) : null;

$pageTitle = 'Booking Confirmation — Tulip Guest Rooms';
$activeNav = 'booking';

require __DIR__ . '/includes/layout_start.php';
?>

<div class="public-card" id="confirmation-print-area">
<?php if (!$booking): ?>
    <h1>Booking Not Found</h1>
    <p class="lead">We could not find a booking for this link. Check your reference or look up bookings by phone.</p>
    <div class="action-row no-print">
        <a href="lookup.php" class="btn btn-primary">Look Up My Bookings</a>
        <a href="index.html#booking" class="btn btn-secondary">Make a New Booking</a>
    </div>
<?php else:
    $isPending = isPendingVerificationBooking($booking);
    $isConfirmed = isConfirmedBooking($booking);
    $isCancelled = $booking['booking_status'] === 'Cancelled';
    $ref = h((string) $booking['booking_reference']);
    $statusLabel = h((string) $booking['booking_status']);
    $paymentLabel = h((string) $booking['payment_status']);
?>

    <?php if ($isCancelled): ?>
    <div class="status-banner cancelled">
        <i class="fa-solid fa-circle-xmark" aria-hidden="true"></i>
        <div>
            <strong>Booking cancelled</strong>
            <p>This reservation is no longer active.</p>
        </div>
    </div>
    <?php elseif ($isPending): ?>
    <div class="status-banner pending">
        <i class="fa-solid fa-clock" aria-hidden="true"></i>
        <div>
            <strong>Pending verification</strong>
            <p>Thank you! We received your booking and payment screenshot. Our team will verify your payment shortly (usually within 24 hours). You will receive an email once confirmed.</p>
        </div>
    </div>
    <?php elseif ($isConfirmed): ?>
    <div class="status-banner confirmed">
        <i class="fa-solid fa-circle-check" aria-hidden="true"></i>
        <div>
            <strong>Booking confirmed</strong>
            <p>Your stay is confirmed. We look forward to welcoming you to Tulip Guest Rooms.</p>
        </div>
    </div>
    <?php else: ?>
    <div class="status-banner pending">
        <i class="fa-solid fa-info-circle" aria-hidden="true"></i>
        <div>
            <strong>Booking status: <?= $statusLabel ?></strong>
            <p>Please contact us if you have any questions about your reservation.</p>
        </div>
    </div>
    <?php endif; ?>

    <h1>Booking Summary</h1>
    <p class="lead">Reference <strong><?= $ref ?></strong></p>

    <dl class="summary-grid">
        <div class="summary-row">
            <dt>Guest name</dt>
            <dd><?= h((string) $booking['guest_name']) ?></dd>
        </div>
        <div class="summary-row">
            <dt>Booking ID</dt>
            <dd><?= $ref ?></dd>
        </div>
        <div class="summary-row">
            <dt>Room</dt>
            <dd><?= h((string) $booking['room_number']) ?> — <?= h((string) $booking['room_type']) ?></dd>
        </div>
        <div class="summary-row">
            <dt>Dates</dt>
            <dd><?= h((string) $booking['check_in_date']) ?> to <?= h((string) $booking['check_out_date']) ?></dd>
        </div>
        <div class="summary-row">
            <dt>Guests</dt>
            <dd><?= (int) $booking['guests_count'] ?></dd>
        </div>
        <div class="summary-row">
            <dt>Total</dt>
            <dd><?= h(formatPkr((float) $booking['total_amount'])) ?></dd>
        </div>
        <div class="summary-row">
            <dt>Status</dt>
            <dd><?= $statusLabel ?> (Payment: <?= $paymentLabel ?>)</dd>
        </div>
    </dl>

    <?php if ($isConfirmed): ?>
    <div class="action-row no-print">
        <a href="php/generate_invoice.php?booking_id=<?= (int) $booking['id'] ?>"
           class="btn btn-primary" download>
            <i class="fa-solid fa-download"></i> Download Invoice
        </a>
        <button type="button" class="btn btn-secondary" onclick="window.print()">
            <i class="fa-solid fa-print"></i> Print
        </button>
    </div>
    <?php endif; ?>

    <div class="action-row no-print">
        <a href="lookup.php" class="btn btn-secondary">Look Up All My Bookings</a>
        <a href="index.html" class="btn btn-secondary">Back to Home</a>
    </div>

<?php endif; ?>
</div>

<?php require __DIR__ . '/includes/layout_end.php'; ?>
