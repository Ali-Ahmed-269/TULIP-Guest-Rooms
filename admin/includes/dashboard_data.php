<?php
declare(strict_types=1);

/**
 * Dashboard queries and occupancy grid builder.
 */

function adminFormatPkr(float $amount): string
{
    return 'PKR ' . number_format($amount, 2);
}

function fetchDashboardStats(PDO $pdo): array
{
    $total = (int) $pdo->query('SELECT COUNT(*) FROM bookings')->fetchColumn();

    $confirmed = (int) $pdo->query(
        "SELECT COUNT(*) FROM bookings WHERE booking_status = 'Confirmed'"
    )->fetchColumn();

    $walkins = (int) $pdo->query(
        "SELECT COUNT(*) FROM bookings WHERE payment_method = 'walk_in'"
    )->fetchColumn();

    $revenue = (float) $pdo->query(
        "SELECT COALESCE(SUM(total_amount), 0) FROM bookings
         WHERE booking_status IN ('Confirmed', 'Completed')
           AND booking_status != 'Cancelled'"
    )->fetchColumn();

    $pendingPayments = (int) $pdo->query(
        "SELECT COUNT(*) FROM bookings WHERE payment_status = 'Pending Verification'"
    )->fetchColumn();

    return [
        'total_bookings'   => $total,
        'confirmed'        => $confirmed,
        'walkins'          => $walkins,
        'revenue'          => $revenue,
        'pending_payments' => $pendingPayments,
    ];
}

/**
 * @return list<array<string, mixed>>
 */
function fetchRecentBookings(PDO $pdo, int $limit = 10): array
{
    $stmt = $pdo->prepare(
        "SELECT b.id, b.booking_reference, b.guest_name, b.check_in_date, b.check_out_date,
                b.total_amount, b.booking_status, b.payment_status, b.payment_method,
                r.room_number
         FROM bookings b
         INNER JOIN rooms r ON b.room_id = r.id
         ORDER BY b.created_at DESC
         LIMIT ?"
    );
    $stmt->bindValue(1, $limit, PDO::PARAM_INT);
    $stmt->execute();
    return $stmt->fetchAll();
}

/**
 * @return list<array<string, mixed>>
 */
function fetchAllRooms(PDO $pdo): array
{
    return $pdo->query(
        'SELECT id, room_number, room_type, status FROM rooms ORDER BY CAST(room_number AS UNSIGNED)'
    )->fetchAll();
}

/**
 * Build occupancy grid for a calendar month.
 *
 * @return array{year:int, month:int, month_label:string, days:int, rooms:list, grid:array, bookings_by_room:array}
 */
function buildOccupancyCalendar(PDO $pdo, ?int $year = null, ?int $month = null): array
{
    $year  = $year ?? (int) date('Y');
    $month = $month ?? (int) date('n');

    $daysInMonth = (int) date('t', mktime(0, 0, 0, $month, 1, $year));
    $monthStart  = sprintf('%04d-%02d-01', $year, $month);
    $monthEnd    = sprintf('%04d-%02d-%02d', $year, $month, $daysInMonth);

    $rooms = fetchAllRooms($pdo);

    $bookStmt = $pdo->prepare(
        "SELECT b.id, b.room_id, b.check_in_date, b.check_out_date,
                b.booking_status, b.payment_status, r.room_number
         FROM bookings b
         INNER JOIN rooms r ON b.room_id = r.id
         WHERE b.booking_status != 'Cancelled'
           AND b.check_in_date < DATE_ADD(?, INTERVAL 1 DAY)
           AND b.check_out_date > ?"
    );
    $bookStmt->execute([$monthEnd, $monthStart]);
    $bookings = $bookStmt->fetchAll();

    $byRoom = [];
    foreach ($bookings as $b) {
        $byRoom[(int) $b['room_id']][] = $b;
    }

    $grid = [];

    foreach ($rooms as $room) {
        $roomId = (int) $room['id'];
        $baseStatus = (string) $room['status'];
        $row = [];

        for ($day = 1; $day <= $daysInMonth; $day++) {
            $dateStr = sprintf('%04d-%02d-%02d', $year, $month, $day);
            $cellClass = 'occ-available';
            $title = 'Available';

            if ($baseStatus === 'Maintenance') {
                $cellClass = 'occ-maintenance';
                $title = 'Maintenance';
            }

            $overlap = null;
            foreach ($byRoom[$roomId] ?? [] as $booking) {
                if ($dateStr >= $booking['check_in_date'] && $dateStr < $booking['check_out_date']) {
                    $overlap = $booking;
                    break;
                }
            }

            if ($overlap) {
                // Treat walk-in and paid bookings as confirmed; pending payments show as pending
                if ($overlap['booking_status'] === 'Pending'
                    || $overlap['payment_status'] === 'Pending Verification') {
                    $cellClass = 'occ-pending';
                    $title = 'Pending verification';
                } else {
                    $cellClass = 'occ-booked';
                    $title = 'Booked — ' . ($overlap['booking_reference'] ?? '');
                }
            } elseif ($baseStatus === 'Reserved') {
                $cellClass = 'occ-reserved';
                $title = 'Reserved (room status)';
            } elseif ($baseStatus === 'Booked' && $cellClass === 'occ-available') {
                $cellClass = 'occ-booked';
                $title = 'Booked (room status)';
            }

            $row[$day] = ['class' => $cellClass, 'title' => $title];
        }

        $grid[$room['room_number']] = $row;
    }

    return [
        'year'        => $year,
        'month'       => $month,
        'month_label' => date('F Y', mktime(0, 0, 0, $month, 1, $year)),
        'days'        => $daysInMonth,
        'rooms'       => $rooms,
        'grid'        => $grid,
    ];
}
