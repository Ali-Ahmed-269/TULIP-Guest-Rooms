<?php
declare(strict_types=1);

require_once __DIR__ . '/includes/auth.php';
adminRequireLogin();

require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/includes/dashboard_data.php';

$stats   = fetchDashboardStats($pdo);
$recent  = fetchRecentBookings($pdo, 10);
$rooms   = fetchAllRooms($pdo);
$calendar = buildOccupancyCalendar($pdo);

$activePage = 'dashboard';
$pageTitle  = 'Dashboard';
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
            <h1>Dashboard</h1>
            <a href="walkin.php" class="admin-btn admin-btn-gold">
                <i class="fa-solid fa-plus"></i> Add Walk-in Booking
            </a>
        </div>

        <?php if ($stats['pending_payments'] > 0): ?>
        <div class="admin-alert admin-alert-warning" style="margin-bottom:24px;">
            <i class="fa-solid fa-triangle-exclamation"></i>
            <strong><?= (int) $stats['pending_payments'] ?></strong>
            payment<?= $stats['pending_payments'] === 1 ? '' : 's' ?> awaiting verification
            <a href="payments.php" style="margin-left:12px;font-weight:700;color:var(--primary-dark);">View All</a>
        </div>
        <?php endif; ?>

        <div class="summary-cards">
            <div class="summary-card">
                <div class="label">Total Bookings</div>
                <div class="value"><?= (int) $stats['total_bookings'] ?></div>
            </div>
            <div class="summary-card sage">
                <div class="label">Confirmed</div>
                <div class="value"><?= (int) $stats['confirmed'] ?></div>
            </div>
            <div class="summary-card gold">
                <div class="label">Walk-ins</div>
                <div class="value"><?= (int) $stats['walkins'] ?></div>
            </div>
            <div class="summary-card">
                <div class="label">Revenue</div>
                <div class="value" style="font-size:1.35rem;"><?= adminH(adminFormatPkr((float) $stats['revenue'])) ?></div>
            </div>
        </div>

        <section class="admin-panel">
            <h2><i class="fa-solid fa-calendar-days"></i> Occupancy — <?= adminH($calendar['month_label']) ?></h2>
            <div class="occ-legend">
                <span><span class="occ-swatch" style="background:var(--cal-available)"></span> Available</span>
                <span><span class="occ-swatch" style="background:var(--cal-booked)"></span> Booked</span>
                <span><span class="occ-swatch" style="background:var(--cal-reserved)"></span> Reserved</span>
                <span><span class="occ-swatch" style="background:var(--cal-pending)"></span> Pending verification</span>
                <span><span class="occ-swatch" style="background:var(--cal-maintenance)"></span> Maintenance</span>
            </div>
            <div class="occ-calendar-wrap">
                <table class="occ-table">
                    <thead>
                        <tr>
                            <th class="room-col">Room</th>
                            <?php for ($d = 1; $d <= $calendar['days']; $d++): ?>
                            <th><?= $d ?></th>
                            <?php endfor; ?>
                        </tr>
                    </thead>
                    <tbody>
                        <?php foreach ($calendar['rooms'] as $room):
                            $num = (string) $room['room_number'];
                            $row = $calendar['grid'][$num] ?? [];
                        ?>
                        <tr>
                            <th class="room-col"><?= adminH($num) ?></th>
                            <?php for ($d = 1; $d <= $calendar['days']; $d++):
                                $cell = $row[$d] ?? ['class' => 'occ-available', 'title' => ''];
                            ?>
                            <td class="occ-cell <?= adminH($cell['class']) ?>"
                                title="<?= adminH($cell['title']) ?>"></td>
                            <?php endfor; ?>
                        </tr>
                        <?php endforeach; ?>
                    </tbody>
                </table>
            </div>
        </section>

        <section class="admin-panel">
            <h2><i class="fa-solid fa-sliders"></i> Room status quick-toggle</h2>
            <p style="font-size:0.9rem;color:#666;margin-bottom:16px;">
                Set base room status (Available / Maintenance / Reserved). Booked status is set automatically by confirmed bookings.
            </p>
            <div class="room-toggle-grid" id="room_toggle_grid">
                <?php foreach ($rooms as $room):
                    $num = (string) $room['room_number'];
                    $cur = (string) $room['status'];
                    $selectStatus = in_array($cur, ['Available', 'Maintenance', 'Reserved'], true)
                        ? $cur : 'Available';
                ?>
                <div class="room-toggle-item" data-room="<?= adminH($num) ?>">
                    <span class="room-num"><?= adminH($num) ?></span>
                    <select class="room-status-select" aria-label="Status for room <?= adminH($num) ?>">
                        <option value="Available" <?= $selectStatus === 'Available' ? 'selected' : '' ?>>Available</option>
                        <option value="Maintenance" <?= $selectStatus === 'Maintenance' ? 'selected' : '' ?>>Maintenance</option>
                        <option value="Reserved" <?= $selectStatus === 'Reserved' ? 'selected' : '' ?>>Reserved</option>
                    </select>
                    <span class="toggle-msg"></span>
                </div>
                <?php endforeach; ?>
            </div>
        </section>

        <section class="admin-panel">
            <h2><i class="fa-solid fa-clock-rotate-left"></i> Recent bookings</h2>
            <div class="admin-table-wrap">
                <table class="admin-table">
                    <thead>
                        <tr>
                            <th>Reference</th>
                            <th>Guest</th>
                            <th>Room</th>
                            <th>Dates</th>
                            <th>Total</th>
                            <th>Status</th>
                            <th>Payment</th>
                        </tr>
                    </thead>
                    <tbody>
                        <?php if (count($recent) === 0): ?>
                        <tr><td colspan="7" style="text-align:center;color:#888;">No bookings yet.</td></tr>
                        <?php else: ?>
                        <?php foreach ($recent as $b):
                            $badge = match ($b['booking_status']) {
                                'Confirmed' => 'badge-confirmed',
                                'Cancelled' => 'badge-cancelled',
                                default     => 'badge-pending',
                            };
                        ?>
                        <tr>
                            <td><strong><?= adminH((string) ($b['booking_reference'] ?? '#' . $b['id'])) ?></strong></td>
                            <td><?= adminH((string) $b['guest_name']) ?></td>
                            <td><?= adminH((string) $b['room_number']) ?></td>
                            <td><?= adminH((string) $b['check_in_date']) ?> → <?= adminH((string) $b['check_out_date']) ?></td>
                            <td><?= adminH(adminFormatPkr((float) $b['total_amount'])) ?></td>
                            <td><span class="badge <?= $badge ?>"><?= adminH((string) $b['booking_status']) ?></span></td>
                            <td><?= adminH((string) $b['payment_status']) ?></td>
                        </tr>
                        <?php endforeach; ?>
                        <?php endif; ?>
                    </tbody>
                </table>
            </div>
            <p style="margin-top:16px;">
                <a href="bookings.php" class="admin-btn admin-btn-outline admin-btn-sm">View all bookings</a>
            </p>
        </section>
    </main>
</div>
<script>
(function () {
    document.querySelectorAll('.room-status-select').forEach(function (sel) {
        sel.addEventListener('change', function () {
            const item = this.closest('.room-toggle-item');
            const msg = item.querySelector('.toggle-msg');
            const roomNumber = item.dataset.room;
            const status = this.value;

            msg.textContent = '…';
            msg.classList.remove('error');

            const fd = new FormData();
            fd.append('room_number', roomNumber);
            fd.append('status', status);

            fetch('api/toggle_room_status.php', { method: 'POST', body: fd })
                .then(function (r) { return r.json(); })
                .then(function (data) {
                    if (data.success) {
                        msg.textContent = 'Saved';
                        setTimeout(function () { msg.textContent = ''; }, 2000);
                    } else {
                        msg.textContent = 'Error';
                        msg.classList.add('error');
                        msg.title = data.message || 'Failed';
                    }
                })
                .catch(function () {
                    msg.textContent = 'Error';
                    msg.classList.add('error');
                });
        });
    });
})();
</script>
</body>
</html>
