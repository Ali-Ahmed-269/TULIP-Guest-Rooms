<?php
declare(strict_types=1);

require_once __DIR__ . '/includes/auth.php';
adminRequireLogin();

require_once __DIR__ . '/../config/db.php';

$guests = $pdo->query(
    "SELECT
        b.guest_name,
        b.guest_email,
        b.guest_phone,
        b.guest_cnic,
        COUNT(*) AS booking_count,
        MIN(b.check_in_date) AS first_stay,
        MAX(b.check_in_date) AS last_stay,
        COALESCE(SUM(b.total_amount), 0) AS total_spent,
        MAX(CASE WHEN b.booking_status = 'Confirmed' THEN 1 ELSE 0 END) AS has_confirmed
     FROM bookings b
     GROUP BY b.guest_email, b.guest_name, b.guest_phone, b.guest_cnic
     ORDER BY total_spent DESC, booking_count DESC, last_stay DESC"
)->fetchAll();

$activePage = 'guests';
$pageTitle = 'Guests';
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
            <h1>Guests</h1>
            <p style="color:#666; margin-top:4px;">A consolidated list of unique guests and their booking activity.</p>
        </div>

        <section class="admin-panel">
            <div class="admin-table-wrap">
                <table class="admin-table">
                    <thead>
                    <tr>
                        <th>Guest</th>
                        <th>Email</th>
                        <th>Phone</th>
                        <th>CNIC</th>
                        <th>Bookings</th>
                        <th>First Stay</th>
                        <th>Last Stay</th>
                        <th>Total Spent</th>
                    </tr>
                    </thead>
                    <tbody>
                    <?php if (count($guests) === 0): ?>
                        <tr>
                            <td colspan="8" style="text-align:center;color:#888;">No guest data yet.</td>
                        </tr>
                    <?php else: ?>
                        <?php foreach ($guests as $guest): ?>
                            <tr>
                                <td><?= adminH((string) $guest['guest_name']) ?></td>
                                <td><?= adminH((string) $guest['guest_email']) ?></td>
                                <td><?= adminH((string) $guest['guest_phone']) ?></td>
                                <td><?= adminH((string) $guest['guest_cnic']) ?></td>
                                <td><?= (int) $guest['booking_count'] ?></td>
                                <td><?= adminH((string) $guest['first_stay']) ?></td>
                                <td><?= adminH((string) $guest['last_stay']) ?></td>
                                <td><?= adminH('PKR ' . number_format((float) $guest['total_spent'], 2)) ?></td>
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
