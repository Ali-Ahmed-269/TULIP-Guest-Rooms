<?php
declare(strict_types=1);

/**
 * Shared booking lookup helpers for public pages.
 */

function h(string $value): string
{
    return htmlspecialchars($value, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
}

function formatPkr(float $amount): string
{
    return 'PKR ' . number_format($amount, 2);
}

/**
 * Resolve numeric booking id from GET/session value (id or TGR-YYYY-XXXX reference).
 */
function resolveBookingId(PDO $pdo, string|int|null $raw): ?int
{
    if ($raw === null || $raw === '') {
        return null;
    }

    $raw = trim((string) $raw);

    if (ctype_digit($raw)) {
        return (int) $raw;
    }

    $stmt = $pdo->prepare('SELECT id FROM bookings WHERE booking_reference = ? LIMIT 1');
    $stmt->execute([$raw]);
    $id = $stmt->fetchColumn();

    return $id !== false ? (int) $id : null;
}

/**
 * @return array<string, mixed>|null
 */
function fetchBookingSummary(PDO $pdo, int $bookingId): ?array
{
    $stmt = $pdo->prepare(
        "SELECT b.id,
                b.booking_reference,
                b.guest_name,
                b.guest_email,
                b.guest_phone,
                b.check_in_date,
                b.check_out_date,
                b.guests_count,
                b.total_amount,
                b.payment_method,
                b.payment_status,
                b.booking_status,
                r.room_number,
                r.room_type
         FROM bookings b
         INNER JOIN rooms r ON b.room_id = r.id
         WHERE b.id = ?
         LIMIT 1"
    );
    $stmt->execute([$bookingId]);
    $row = $stmt->fetch(PDO::FETCH_ASSOC);

    return $row ?: null;
}

function isPendingVerificationBooking(array $booking): bool
{
    return $booking['booking_status'] === 'Pending'
        || $booking['payment_status'] === 'Pending Verification';
}

function isConfirmedBooking(array $booking): bool
{
    return $booking['booking_status'] === 'Confirmed';
}

function paymentMethodLabel(string $method): string
{
    return match ($method) {
        'jazzcash'     => 'JazzCash',
        'easypaisa'    => 'Easypaisa',
        'pay_at_hotel' => 'Pay at Hotel',
        default        => ucfirst(str_replace('_', ' ', $method)),
    };
}
