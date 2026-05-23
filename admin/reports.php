<?php
declare(strict_types=1);

require_once __DIR__ . '/includes/auth.php';
adminRequireLogin();

require_once __DIR__ . '/../config/db.php';

$stats = [
    'total_bookings' => (int) $pdo->query("SELECT COUNT(*) FROM bookings")->fetchColumn(),
    'confirmed_bookings' => (int) $pdo->query("SELECT COUNT(*) FROM bookings WHERE booking_status = 'Confirmed'")->fetchColumn(),
    'cancelled_bookings' => (int) $pdo->query("SELECT COUNT(*) FROM bookings WHERE booking_status = 'Cancelled'")->fetchColumn(),
    'pending_payments' => (int) $pdo->query("SELECT COUNT(*) FROM bookings WHERE payment_status = 'Pending Verification'")->fetchColumn(),
    'revenue' => (float) $pdo->query(
        "SELECT COALESCE(SUM(total_amount), 0)
         FROM bookings
         WHERE booking_status IN ('Confirmed', 'Completed')
           AND booking_status != 'Cancelled'"
    )->fetchColumn(),
];

$topRooms = $pdo->query(
    "SELECT r.room_type, COUNT(*) AS bookings, COALESCE(SUM(b.total_amount), 0) AS revenue
     FROM bookings b
     INNER JOIN rooms r ON r.id = b.room_id
     GROUP BY r.room_type
     ORDER BY bookings DESC, revenue DESC
     LIMIT 5"
)->fetchAll();

$monthlyRevenue = $pdo->query(
    "SELECT DATE_FORMAT(check_in_date, '%Y-%m') AS month,
            COALESCE(SUM(total_amount), 0) AS revenue,
            COUNT(*) AS bookings
     FROM bookings
     WHERE check_in_date >= DATE_SUB(CURDATE(), INTERVAL 12 MONTH)
       AND booking_status IN ('Confirmed', 'Completed')
     GROUP BY DATE_FORMAT(check_in_date, '%Y-%m')
     ORDER BY month ASC"
)->fetchAll();

$activePage = 'reports';
$pageTitle = 'Reports';
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
            <h1>Reports</h1>
            <p style="color:#666; margin-top:4px;">High-level performance insights and activity summaries.</p>
        </div>

        <div class="summary-cards">
            <div class="summary-card">
                <div class="label">Total Bookings</div>
                <div class="value"><?= (int) $stats['total_bookings'] ?></div>
            </div>
            <div class="summary-card sage">
                <div class="label">Confirmed</div>
                <div class="value"><?= (int) $stats['confirmed_bookings'] ?></div>
            </div>
            <div class="summary-card">
                <div class="label">Cancelled</div>
                <div class="value"><?= (int) $stats['cancelled_bookings'] ?></div>
            </div>
            <div class="summary-card gold">
                <div class="label">Pending Payments</div>
                <div class="value"><?= (int) $stats['pending_payments'] ?></div>
            </div>
            <div class="summary-card">
                <div class="label">Revenue</div>
                <div class="value" style="font-size:1.35rem;"><?= adminH('PKR ' . number_format((float) $stats['revenue'], 2)) ?></div>
            </div>
        </div>

        <section class="admin-panel">
            <h2><i class="fa-solid fa-chart-simple"></i> Revenue by month</h2>
            <div class="admin-table-wrap">
                <table class="admin-table">
                    <thead>
                    <tr>
                        <th>Month</th>
                        <th>Bookings</th>
                        <th>Revenue</th>
                    </tr>
                    </thead>
                    <tbody>
                    <?php if (count($monthlyRevenue) === 0): ?>
                        <tr><td colspan="3" style="text-align:center;color:#888;">No revenue data yet.</td></tr>
                    <?php else: ?>
                        <?php foreach ($monthlyRevenue as $row): ?>
                            <tr>
                                <td><?= adminH((string) $row['month']) ?></td>
                                <td><?= (int) $row['bookings'] ?></td>
                                <td><?= adminH('PKR ' . number_format((float) $row['revenue'], 2)) ?></td>
                            </tr>
                        <?php endforeach; ?>
                    <?php endif; ?>
                    </tbody>
                </table>
            </div>
        </section>

        <section class="admin-panel">
            <h2><i class="fa-solid fa-door-open"></i> Top room types</h2>
            <div class="admin-table-wrap">
                <table class="admin-table">
                    <thead>
                    <tr>
                        <th>Room Type</th>
                        <th>Bookings</th>
                        <th>Revenue</th>
                    </tr>
                    </thead>
                    <tbody>
                    <?php if (count($topRooms) === 0): ?>
                        <tr><td colspan="3" style="text-align:center;color:#888;">No room activity yet.</td></tr>
                    <?php else: ?>
                        <?php foreach ($topRooms as $room): ?>
                            <tr>
                                <td><?= adminH((string) $room['room_type']) ?></td>
                                <td><?= (int) $room['bookings'] ?></td>
                                <td><?= adminH('PKR ' . number_format((float) $room['revenue'], 2)) ?></td>
                            </tr>
                        <?php endforeach; ?>
                    <?php endif; ?>
                    </tbody>
                </table>
            </div>
        </section>
    </main>
</div>
</body>
</html>
