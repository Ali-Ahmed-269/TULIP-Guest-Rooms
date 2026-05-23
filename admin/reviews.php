<?php
declare(strict_types=1);

require_once __DIR__ . '/includes/auth.php';
adminRequireLogin();

require_once __DIR__ . '/../config/db.php';

if (empty($_SESSION['csrf_token'])) {
    $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $csrf = (string) ($_POST['csrf_token'] ?? '');
    if (!hash_equals($_SESSION['csrf_token'] ?? '', $csrf)) {
        $_SESSION['flash_error'] = 'Invalid CSRF security token.';
        header('Location: reviews.php');
        exit;
    }

    $reviewId = (int) ($_POST['review_id'] ?? 0);
    $action = (string) ($_POST['action'] ?? '');

    if ($reviewId <= 0 || !in_array($action, ['approve', 'reject'], true)) {
        $_SESSION['flash_error'] = 'Invalid review action.';
        header('Location: reviews.php');
        exit;
    }

    $status = $action === 'approve' ? 'Approved' : 'Rejected';
    $stmt = $pdo->prepare('UPDATE reviews SET status = ? WHERE id = ?');
    $stmt->execute([$status, $reviewId]);

    $_SESSION['flash_success'] = 'Review #' . $reviewId . ' marked as ' . $status . '.';
    header('Location: reviews.php');
    exit;
}

$reviews = $pdo->query(
    "SELECT rv.id, rv.booking_id, rv.guest_name, rv.rating, rv.review_text, rv.status, rv.created_at, b.booking_reference
     FROM reviews rv
     LEFT JOIN bookings b ON rv.booking_id = b.id
     ORDER BY rv.created_at DESC"
)->fetchAll();

$flashSuccess = (string) ($_SESSION['flash_success'] ?? '');
$flashError = (string) ($_SESSION['flash_error'] ?? '');
unset($_SESSION['flash_success'], $_SESSION['flash_error']);

$activePage = 'reviews';
$pageTitle = 'Reviews';
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
            <h1>Guest reviews</h1>
            <p style="color:#666; margin-top:4px;">Approve or reject guest reviews before publishing them on the public site.</p>
        </div>

        <?php if ($flashSuccess !== ''): ?>
            <div class="admin-alert admin-alert-info"><i class="fa-solid fa-circle-check"></i> <?= adminH($flashSuccess) ?></div>
        <?php endif; ?>
        <?php if ($flashError !== ''): ?>
            <div class="admin-alert admin-alert-error"><i class="fa-solid fa-circle-exclamation"></i> <?= adminH($flashError) ?></div>
        <?php endif; ?>

        <section class="admin-panel">
            <div class="admin-table-wrap">
                <table class="admin-table">
                    <thead>
                        <tr>
                            <th>Booking</th>
                            <th>Guest</th>
                            <th>Rating</th>
                            <th>Status</th>
                            <th>Review</th>
                            <th>Date</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        <?php if (count($reviews) === 0): ?>
                            <tr>
                                <td colspan="7" style="text-align:center;color:#888;">No reviews yet.</td>
                            </tr>
                        <?php else: ?>
                            <?php foreach ($reviews as $rv):
                                $statusBadge = match ((string) $rv['status']) {
                                    'Approved' => 'badge-confirmed',
                                    'Rejected' => 'badge-cancelled',
                                    default => 'badge-pending',
                                };
                            ?>
                            <tr>
                                <td><?= adminH((string) ($rv['booking_reference'] ?? '#' . $rv['booking_id'])) ?></td>
                                <td><?= adminH((string) $rv['guest_name']) ?></td>
                                <td><?= (int) $rv['rating'] ?> ★</td>
                                <td><span class="badge <?= $statusBadge ?>"><?= adminH((string) $rv['status']) ?></span></td>
                                <td><?= adminH((string) $rv['review_text']) ?></td>
                                <td><?= adminH((string) $rv['created_at']) ?></td>
                                <td>
                                    <?php if ((string) $rv['status'] === 'Pending'): ?>
                                        <form method="post" style="display:flex;gap:8px;flex-wrap:wrap;">
                                            <input type="hidden" name="csrf_token" value="<?= adminH($_SESSION['csrf_token']) ?>">
                                            <input type="hidden" name="review_id" value="<?= (int) $rv['id'] ?>">
                                            <button type="submit" name="action" value="approve" class="btn-action btn-action-success">Approve</button>
                                            <button type="submit" name="action" value="reject" class="btn-action btn-action-cancel">Reject</button>
                                        </form>
                                    <?php else: ?>
                                        <span style="color:#666;">Handled</span>
                                    <?php endif; ?>
                                </td>
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
