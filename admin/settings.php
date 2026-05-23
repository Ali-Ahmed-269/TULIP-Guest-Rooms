<?php
declare(strict_types=1);

require_once __DIR__ . '/includes/auth.php';
adminRequireLogin();

require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../config/crypto.php';

if (empty($_SESSION['csrf_token'])) {
    $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
}

$defaults = [
    'smtp_host' => 'smtp.gmail.com',
    'smtp_port' => '587',
    'smtp_secure' => 'tls',
    'smtp_username' => '',
    'smtp_password' => '',
    'smtp_from_email' => 'noreply@tulipguestrooms.com',
    'smtp_from_name' => 'Tulip Guest Rooms',
    'guesthouse_name' => 'Tulip Guest Rooms',
    'guesthouse_address' => 'Karachi, Pakistan',
    'guesthouse_phone' => '0300-1234567',
    'guesthouse_email' => 'hello@tulipguestrooms.com',
    'jazzcash_number' => '0300-1234567',
    'easypaisa_number' => '0311-7654321',
];

function ensureSiteSettingsTable(PDO $pdo): void
{
    $pdo->exec(
        "CREATE TABLE IF NOT EXISTS site_settings (
            setting_key VARCHAR(64) PRIMARY KEY,
            setting_value TEXT NOT NULL,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )"
    );
}

function loadSettings(PDO $pdo, array $defaults): array
{
    ensureSiteSettingsTable($pdo);

    $rows = $pdo->query('SELECT setting_key, setting_value FROM site_settings')->fetchAll(PDO::FETCH_ASSOC);
    $settings = $defaults;

    foreach ($rows as $row) {
        $key = (string) $row['setting_key'];
        if (array_key_exists($key, $settings)) {
            $settings[$key] = (string) $row['setting_value'];
        }
    }

    return $settings;
}

$settings = loadSettings($pdo, $defaults);

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $csrf = (string) ($_POST['csrf_token'] ?? '');
    if (!hash_equals($_SESSION['csrf_token'] ?? '', $csrf)) {
        $_SESSION['flash_error'] = 'Invalid CSRF security token.';
        header('Location: settings.php');
        exit;
    }

    ensureSiteSettingsTable($pdo);

    $posted = [
        'smtp_host' => trim((string) ($_POST['smtp_host'] ?? '')),
        'smtp_port' => trim((string) ($_POST['smtp_port'] ?? '')),
        'smtp_secure' => trim((string) ($_POST['smtp_secure'] ?? '')),
        'smtp_username' => trim((string) ($_POST['smtp_username'] ?? '')),
        'smtp_password' => trim((string) ($_POST['smtp_password'] ?? '')),
        'smtp_from_email' => trim((string) ($_POST['smtp_from_email'] ?? '')),
        'smtp_from_name' => trim((string) ($_POST['smtp_from_name'] ?? '')),
        'guesthouse_name' => trim((string) ($_POST['guesthouse_name'] ?? '')),
        'guesthouse_address' => trim((string) ($_POST['guesthouse_address'] ?? '')),
        'guesthouse_phone' => trim((string) ($_POST['guesthouse_phone'] ?? '')),
        'guesthouse_email' => trim((string) ($_POST['guesthouse_email'] ?? '')),
        'jazzcash_number' => trim((string) ($_POST['jazzcash_number'] ?? '')),
        'easypaisa_number' => trim((string) ($_POST['easypaisa_number'] ?? '')),
    ];

    $currentPassword = (string) ($settings['smtp_password'] ?? '');
    if ($posted['smtp_password'] === '') {
        if ($currentPassword === '') {
            $posted['smtp_password'] = '';
        } elseif (str_starts_with($currentPassword, 'enc:v1:')) {
            $posted['smtp_password'] = $currentPassword;
        } else {
            $posted['smtp_password'] = tgr_encrypt_secret($currentPassword);
        }
    } else {
        $posted['smtp_password'] = tgr_encrypt_secret($posted['smtp_password']);
    }

    $errors = [];
    if ($posted['smtp_host'] === '') {
        $errors[] = 'SMTP host is required.';
    }
    if ($posted['smtp_from_email'] === '' || !filter_var($posted['smtp_from_email'], FILTER_VALIDATE_EMAIL)) {
        $errors[] = 'SMTP from email must be a valid email address.';
    }
    if ($posted['smtp_from_name'] === '') {
        $errors[] = 'SMTP from name is required.';
    }
    if ($posted['guesthouse_name'] === '') {
        $errors[] = 'Guesthouse name is required.';
    }
    if ($posted['guesthouse_email'] === '' || !filter_var($posted['guesthouse_email'], FILTER_VALIDATE_EMAIL)) {
        $errors[] = 'Guesthouse email must be a valid email address.';
    }
    if ($posted['smtp_port'] === '' || !ctype_digit($posted['smtp_port']) || (int) $posted['smtp_port'] < 1 || (int) $posted['smtp_port'] > 65535) {
        $errors[] = 'SMTP port must be a number between 1 and 65535.';
    }

    if ($errors !== []) {
        $_SESSION['flash_error'] = implode(' ', $errors);
        $settings = array_merge($settings, $posted);
    } else {
        try {
            $pdo->beginTransaction();
            $upsert = $pdo->prepare(
                "INSERT INTO site_settings (setting_key, setting_value)
                 VALUES (?, ?)
                 ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)"
            );
            foreach ($posted as $key => $value) {
                $upsert->execute([$key, $value]);
            }
            $pdo->commit();
            $settings = $posted;
            $_SESSION['flash_success'] = 'Settings saved successfully.';
        } catch (Throwable $e) {
            if ($pdo->inTransaction()) {
                $pdo->rollBack();
            }
            error_log('[TGR admin settings] ' . $e->getMessage());
            $_SESSION['flash_error'] = 'Unable to save settings right now.';
        }
    }

    header('Location: settings.php');
    exit;
}

$flashSuccess = (string) ($_SESSION['flash_success'] ?? '');
$flashError = (string) ($_SESSION['flash_error'] ?? '');
unset($_SESSION['flash_success'], $_SESSION['flash_error']);

$activePage = 'settings';
$pageTitle = 'Settings';
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
            <h1>Site Settings</h1>
            <p style="color:#666; margin-top:4px;">Update booking, payment, and SMTP details used across the site.</p>
        </div>

        <?php if ($flashSuccess !== ''): ?>
            <div class="admin-alert admin-alert-info"><i class="fa-solid fa-circle-check"></i> <?= adminH($flashSuccess) ?></div>
        <?php endif; ?>
        <?php if ($flashError !== ''): ?>
            <div class="admin-alert admin-alert-error"><i class="fa-solid fa-circle-exclamation"></i> <?= adminH($flashError) ?></div>
        <?php endif; ?>

        <section class="admin-panel">
            <form method="post">
                <input type="hidden" name="csrf_token" value="<?= adminH($_SESSION['csrf_token']) ?>">

                <h2><i class="fa-solid fa-building"></i> Guesthouse information</h2>
                <div class="filter-grid">
                    <div class="admin-form-group">
                        <label for="guesthouse_name">Guesthouse name</label>
                        <input id="guesthouse_name" name="guesthouse_name" class="form-control" value="<?= adminH((string) $settings['guesthouse_name']) ?>">
                    </div>
                    <div class="admin-form-group">
                        <label for="guesthouse_phone">Guesthouse phone</label>
                        <input id="guesthouse_phone" name="guesthouse_phone" class="form-control" value="<?= adminH((string) $settings['guesthouse_phone']) ?>">
                    </div>
                    <div class="admin-form-group">
                        <label for="guesthouse_email">Guesthouse email</label>
                        <input id="guesthouse_email" name="guesthouse_email" class="form-control" value="<?= adminH((string) $settings['guesthouse_email']) ?>">
                    </div>
                    <div class="admin-form-group">
                        <label for="guesthouse_address">Guesthouse address</label>
                        <input id="guesthouse_address" name="guesthouse_address" class="form-control" value="<?= adminH((string) $settings['guesthouse_address']) ?>">
                    </div>
                </div>

                <h2 style="margin-top:20px;"><i class="fa-solid fa-wallet"></i> Payment numbers</h2>
                <div class="filter-grid">
                    <div class="admin-form-group">
                        <label for="jazzcash_number">JazzCash number</label>
                        <input id="jazzcash_number" name="jazzcash_number" class="form-control" value="<?= adminH((string) $settings['jazzcash_number']) ?>">
                    </div>
                    <div class="admin-form-group">
                        <label for="easypaisa_number">Easypaisa number</label>
                        <input id="easypaisa_number" name="easypaisa_number" class="form-control" value="<?= adminH((string) $settings['easypaisa_number']) ?>">
                    </div>
                </div>
                

                <h2 style="margin-top:20px;"><i class="fa-solid fa-envelope"></i> SMTP settings</h2>
                <div class="filter-grid">
                    <div class="admin-form-group">
                        <label for="smtp_host">SMTP host</label>
                        <input id="smtp_host" name="smtp_host" class="form-control" value="<?= adminH((string) $settings['smtp_host']) ?>">
                    </div>
                    <div class="admin-form-group">
                        <label for="smtp_port">SMTP port</label>
                        <input id="smtp_port" name="smtp_port" class="form-control" value="<?= adminH((string) $settings['smtp_port']) ?>">
                    </div>
                    <div class="admin-form-group">
                        <label for="smtp_secure">SMTP secure</label>
                        <select id="smtp_secure" name="smtp_secure" class="form-control">
                            <option value="" <?= $settings['smtp_secure'] === '' ? 'selected' : '' ?>>None</option>
                            <option value="tls" <?= $settings['smtp_secure'] === 'tls' ? 'selected' : '' ?>>TLS</option>
                            <option value="ssl" <?= $settings['smtp_secure'] === 'ssl' ? 'selected' : '' ?>>SSL</option>
                        </select>
                    </div>
                    <div class="admin-form-group">
                        <label for="smtp_username">SMTP username</label>
                        <input id="smtp_username" name="smtp_username" class="form-control" value="<?= adminH((string) $settings['smtp_username']) ?>">
                    </div>
                    <div class="admin-form-group">
                        <label for="smtp_password">SMTP password</label>
                        <input id="smtp_password" name="smtp_password" class="form-control" type="password" value="" autocomplete="new-password">
                        <small style="display:block;margin-top:8px;color:#666;">Leave blank to keep the current password.</small>
                    </div>
                    <div class="admin-form-group">
                        <label for="smtp_from_email">SMTP from email</label>
                        <input id="smtp_from_email" name="smtp_from_email" class="form-control" value="<?= adminH((string) $settings['smtp_from_email']) ?>">
                    </div>
                    <div class="admin-form-group">
                        <label for="smtp_from_name">SMTP from name</label>
                        <input id="smtp_from_name" name="smtp_from_name" class="form-control" value="<?= adminH((string) $settings['smtp_from_name']) ?>">
                    </div>
                </div>

                <div class="filter-actions">
                    <button type="submit" class="admin-btn admin-btn-primary" style="width:auto;">Save settings</button>
                </div>
            </form>
        </section>
    </main>
</div>
</body>
</html>
