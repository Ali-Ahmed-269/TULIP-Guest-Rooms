<?php
declare(strict_types=1);

require_once __DIR__ . '/includes/auth.php';
require_once __DIR__ . '/../config/db.php';

if (adminIsLoggedIn()) {
    header('Location: dashboard.php');
    exit;
}

$error = '';
$timeout = isset($_GET['timeout']);

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $username = trim((string) ($_POST['username'] ?? ''));
    $password = (string) ($_POST['password'] ?? '');

    if ($username === '' || $password === '') {
        $error = 'Please enter both username and password.';
    } else {
        $stmt = $pdo->prepare(
            'SELECT id, username, password_hash FROM admin_users WHERE username = ? LIMIT 1'
        );
        $stmt->execute([$username]);
        $admin = $stmt->fetch();

        if ($admin && password_verify($password, (string) $admin['password_hash'])) {
            session_regenerate_id(true);
            $_SESSION['admin_logged_in'] = true;
            $_SESSION['admin_id'] = (int) $admin['id'];
            $_SESSION['admin_username'] = (string) $admin['username'];
            $_SESSION['LAST_ACTIVITY'] = time();
            header('Location: dashboard.php');
            exit;
        }

        $error = 'Invalid username or password.';
    }
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Admin Login — Tulip Guest Rooms</title>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <link rel="stylesheet" href="admin.css">
</head>
<body class="admin-body">
<div class="admin-login-wrap">
    <div class="admin-login-card">
        <h1>Tulip Guest Rooms</h1>
        <p class="subtitle">Admin sign in</p>

        <?php if ($timeout): ?>
        <div class="admin-alert admin-alert-warning">
            Your session expired after 30 minutes of inactivity. Please sign in again.
        </div>
        <?php endif; ?>

        <?php if ($error !== ''): ?>
        <div class="admin-alert admin-alert-error"><?= adminH($error) ?></div>
        <?php endif; ?>

        <form method="post" action="index.php" autocomplete="off">
            <div class="admin-form-group">
                <label for="username">Username</label>
                <input type="text" id="username" name="username" required autofocus
                       value="<?= adminH((string) ($_POST['username'] ?? '')) ?>">
            </div>
            <div class="admin-form-group">
                <label for="password">Password</label>
                <input type="password" id="password" name="password" required>
            </div>
            <button type="submit" class="admin-btn admin-btn-primary">
                <i class="fa-solid fa-right-to-bracket"></i> Sign In
            </button>
        </form>
    </div>
</div>
</body>
</html>
