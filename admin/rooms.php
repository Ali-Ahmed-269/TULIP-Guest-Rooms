<?php
declare(strict_types=1);

require_once __DIR__ . '/includes/auth.php';
adminRequireLogin();

require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/includes/dashboard_data.php';

$rooms = fetchAllRooms($pdo);
$activePage = 'rooms';
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Rooms — Tulip Admin</title>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <link rel="stylesheet" href="admin.css">
</head>
<body class="admin-body">
<div class="admin-layout">
    <?php require __DIR__ . '/includes/sidebar.php'; ?>
    <main class="admin-main">
        <div class="admin-page-header"><h1>Rooms</h1></div>
        <section class="admin-panel">
            <p style="margin-bottom:16px;color:#666;">Change status from the <a href="dashboard.php">dashboard</a> quick-toggle, or below.</p>
            <div class="room-toggle-grid" id="room_toggle_grid">
                <?php foreach ($rooms as $room):
                    $num = (string) $room['room_number'];
                    $cur = (string) $room['status'];
                    $selectStatus = in_array($cur, ['Available', 'Maintenance', 'Reserved'], true) ? $cur : 'Available';
                ?>
                <div class="room-toggle-item" data-room="<?= adminH($num) ?>">
                    <span class="room-num"><?= adminH($num) ?></span>
                    <small style="color:#888;"><?= adminH((string) $room['room_type']) ?></small>
                    <select class="room-status-select">
                        <option value="Available" <?= $selectStatus === 'Available' ? 'selected' : '' ?>>Available</option>
                        <option value="Maintenance" <?= $selectStatus === 'Maintenance' ? 'selected' : '' ?>>Maintenance</option>
                        <option value="Reserved" <?= $selectStatus === 'Reserved' ? 'selected' : '' ?>>Reserved</option>
                    </select>
                    <span class="toggle-msg"></span>
                </div>
                <?php endforeach; ?>
            </div>
        </section>
    </main>
</div>
<script>
(function () {
    document.querySelectorAll('.room-status-select').forEach(function (sel) {
        sel.addEventListener('change', function () {
            const item = this.closest('.room-toggle-item');
            const msg = item.querySelector('.toggle-msg');
            const fd = new FormData();
            fd.append('room_number', item.dataset.room);
            fd.append('status', this.value);
            msg.textContent = '…';
            fetch('api/toggle_room_status.php', { method: 'POST', body: fd })
                .then(r => r.json())
                .then(d => { msg.textContent = d.success ? 'Saved' : 'Error'; msg.classList.toggle('error', !d.success); })
                .catch(() => { msg.textContent = 'Error'; msg.classList.add('error'); });
        });
    });
})();
</script>
</body>
</html>
