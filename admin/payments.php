<?php
declare(strict_types=1);

require_once __DIR__ . '/includes/auth.php';
adminRequireLogin();

require_once __DIR__ . '/../config/db.php';

$stmt = $pdo->query(
    "SELECT b.id, b.booking_reference, b.guest_name, b.guest_phone,
            b.check_in_date, b.check_out_date, b.total_amount, b.payment_method,
            b.payment_proof, b.created_at, r.room_number
     FROM bookings b
     INNER JOIN rooms r ON b.room_id = r.id
     WHERE b.payment_status = 'Pending Verification'
     ORDER BY b.created_at DESC"
);
$pending = $stmt->fetchAll();

$activePage = 'payments';
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Payments — Tulip Admin</title>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <link rel="stylesheet" href="admin.css">
</head>
<body class="admin-body">
<div class="admin-layout">
    <?php require __DIR__ . '/includes/sidebar.php'; ?>
    <main class="admin-main">
        <div class="admin-page-header">
            <h1>Payments awaiting verification</h1>
            <a href="dashboard.php" class="admin-btn admin-btn-outline admin-btn-sm">← Dashboard</a>
        </div>
        <section class="admin-panel">
            <?php if (count($pending) === 0): ?>
            <p style="color:#666;">No payments pending verification.</p>
            <?php else: ?>
            <div class="admin-table-wrap">
                <table class="admin-table">
                    <thead>
                        <tr>
                            <th>Reference</th>
                            <th>Guest</th>
                            <th>Room</th>
                            <th>Amount</th>
                            <th>Method</th>
                            <th>Proof</th>
                            <th>Submitted</th>
                        </tr>
                    </thead>
                    <tbody>
                        <?php foreach ($pending as $p): ?>
                        <tr>
                            <td><strong><?= adminH((string) ($p['booking_reference'] ?? '')) ?></strong></td>
                            <td><?= adminH((string) $p['guest_name']) ?><br>
                                <small><?= adminH((string) $p['guest_phone']) ?></small></td>
                            <td><?= adminH((string) $p['room_number']) ?></td>
                            <td><?= adminH('PKR ' . number_format((float) $p['total_amount'], 2)) ?></td>
                            <td><?= adminH((string) $p['payment_method']) ?></td>
                            <td>
                                <?php if (!empty($p['payment_proof'])): ?>
                                <a href="view_proof.php?booking_id=<?= (int) $p['id'] ?>" target="_blank" rel="noopener">View</a>
                                <?php else: ?>—<?php endif; ?>
                            </td>
                            <td><?= adminH((string) $p['created_at']) ?></td>
                        </tr>
                        <?php endforeach; ?>
                    </tbody>
                </table>
            </div>
            <?php endif; ?>
        </section>
    </main>
</div>
</body>
</html>
