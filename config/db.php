<?php
$host = '127.0.0.1';
$db   = 'tulip_guest_rooms';
$user = 'root';
$pass = '';
$charset = 'utf8mb4';

// Security: disable display errors in production by default
@ini_set('display_errors', '0');
@ini_set('display_startup_errors', '0');
error_reporting(E_ALL);

$dsn = "mysql:host=$host;dbname=$db;charset=$charset";
$options = [
    PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    PDO::ATTR_EMULATE_PREPARES   => false,
];

try {
    $pdo = new PDO($dsn, $user, $pass, $options);
} catch (\PDOException $e) {
    throw new \PDOException($e->getMessage(), (int)$e->getCode());
}
?>
