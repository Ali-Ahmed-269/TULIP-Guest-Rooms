<?php

declare(strict_types=1);

require_once __DIR__ . '/db.php';
require_once __DIR__ . '/crypto.php';

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

if (!defined('SITE_URL')) {
    $scheme = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https' : 'http';
    $host = $_SERVER['HTTP_HOST'] ?? 'localhost:8080';
    define('SITE_URL', rtrim($scheme . '://' . $host, '/'));
}

if (!defined('ADMIN_API_TOKEN')) {
    $adminApiToken = getenv('ADMIN_API_TOKEN');
    if ($adminApiToken === false || $adminApiToken === null) {
        $adminApiToken = $_ENV['ADMIN_API_TOKEN'] ?? '';
    }
    define('ADMIN_API_TOKEN', (string) $adminApiToken);
}

$settings = $defaults;

try {
    $tableExists = $pdo->query("SHOW TABLES LIKE 'site_settings'")->fetchColumn();
    if ($tableExists) {
        $stmt = $pdo->query('SELECT setting_key, setting_value FROM site_settings');
        foreach ($stmt->fetchAll(PDO::FETCH_ASSOC) as $row) {
            $key = (string) $row['setting_key'];
            if (array_key_exists($key, $settings)) {
                $settings[$key] = (string) $row['setting_value'];
            }
        }
    }
} catch (Throwable) {
    $settings = $defaults;
}

$currentPassword = (string) ($settings['smtp_password'] ?? '');
if ($currentPassword !== '' && !str_starts_with($currentPassword, 'enc:v1:')) {
    try {
        $encryptedPassword = tgr_encrypt_secret($currentPassword);
        $stmt = $pdo->prepare(
            "UPDATE site_settings SET setting_value = ? WHERE setting_key = 'smtp_password'"
        );
        $stmt->execute([$encryptedPassword]);
        $settings['smtp_password'] = $encryptedPassword;
    } catch (Throwable $e) {
        error_log('[TGR config/email.php] ' . $e->getMessage());
    }
}

try {
    $settings['smtp_password'] = tgr_decrypt_secret((string) ($settings['smtp_password'] ?? ''));
} catch (Throwable $e) {
    error_log('[TGR config/email.php] ' . $e->getMessage());
}

foreach ($settings as $key => $value) {
    $constant = match ($key) {
        'smtp_host' => 'SMTP_HOST',
        'smtp_port' => 'SMTP_PORT',
        'smtp_secure' => 'SMTP_SECURE',
        'smtp_username' => 'SMTP_USER',
        'smtp_password' => 'SMTP_PASS',
        'smtp_from_email' => 'SMTP_FROM_EMAIL',
        'smtp_from_name' => 'SMTP_FROM_NAME',
        'guesthouse_name' => 'GUEST_HOUSE_NAME',
        'guesthouse_address' => 'GUEST_HOUSE_ADDRESS',
        'guesthouse_phone' => 'GUEST_HOUSE_PHONE',
        'guesthouse_email' => 'GUEST_HOUSE_EMAIL',
        'jazzcash_number' => 'JAZZCASH_NUMBER',
        'easypaisa_number' => 'EASYPAISA_NUMBER',
        default => null,
    };

    if ($constant !== null && !defined($constant)) {
        define($constant, (string) $value);
    }
}

return [
    'smtp_host' => (string) $settings['smtp_host'],
    'smtp_port' => (string) $settings['smtp_port'],
    'smtp_secure' => (string) $settings['smtp_secure'],
    'smtp_username' => (string) $settings['smtp_username'],
    'smtp_password' => (string) $settings['smtp_password'],
    'smtp_from_email' => (string) $settings['smtp_from_email'],
    'smtp_from_name' => (string) $settings['smtp_from_name'],
    'guesthouse_name' => (string) $settings['guesthouse_name'],
    'guesthouse_address' => (string) $settings['guesthouse_address'],
    'guesthouse_phone' => (string) $settings['guesthouse_phone'],
    'guesthouse_email' => (string) $settings['guesthouse_email'],
    'jazzcash_number' => (string) $settings['jazzcash_number'],
    'easypaisa_number' => (string) $settings['easypaisa_number'],
];

if (!defined('ADMIN_EMAIL')) {
    define('ADMIN_EMAIL', (string) $settings['guesthouse_email']);
}