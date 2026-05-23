<?php
declare(strict_types=1);

/**
 * Admin session guard — include at top of every protected admin page.
 * Timeout: 30 minutes of inactivity.
 */

if (session_status() === PHP_SESSION_NONE) {
    $secure = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') || ($_SERVER['SERVER_PORT'] ?? '') === '443';
    session_set_cookie_params([
        'lifetime' => 0,
        'path' => '/',
        'domain' => $_SERVER['HTTP_HOST'] ?? '',
        'secure' => $secure,
        'httponly' => true,
        'samesite' => 'Lax',
    ]);
    session_start();
}

const ADMIN_SESSION_TIMEOUT = 1800;

function adminIsLoggedIn(): bool
{
    return !empty($_SESSION['admin_logged_in']) && $_SESSION['admin_logged_in'] === true;
}

function adminLogout(): void
{
    $_SESSION = [];
    if (ini_get('session.use_cookies')) {
        $p = session_get_cookie_params();
        setcookie(
            session_name(),
            '',
            time() - 42000,
            $p['path'],
            $p['domain'],
            (bool) $p['secure'],
            (bool) $p['httponly']
        );
    }
    session_destroy();
}

function adminLoginUrl(bool $withTimeout = false): string
{
    $script = str_replace('\\', '/', $_SERVER['SCRIPT_NAME'] ?? '');
    $login = (str_contains($script, '/admin/api/')) ? '../index.php' : 'index.php';
    return $withTimeout ? $login . '?timeout=1' : $login;
}

function adminRequireLogin(): void
{
    if (!adminIsLoggedIn()) {
        header('Location: ' . adminLoginUrl());
        exit;
    }

    $last = (int) ($_SESSION['LAST_ACTIVITY'] ?? 0);

    if ($last === 0 || (time() - $last) > ADMIN_SESSION_TIMEOUT) {
        adminLogout();
        header('Location: ' . adminLoginUrl(true));
        exit;
    }

    $_SESSION['LAST_ACTIVITY'] = time();
}

function adminH(string $value): string
{
    return htmlspecialchars($value, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
}
