<?php
declare(strict_types=1);
require_once __DIR__ . '/includes/auth.php';

adminLogout();
header('Location: index.php');
exit;
