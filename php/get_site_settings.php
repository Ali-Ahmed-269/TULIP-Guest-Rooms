<?php

declare(strict_types=1);

header('Content-Type: application/json; charset=UTF-8');

$settings = require __DIR__ . '/../config/email.php';

echo json_encode([
    'jazzcash_number' => $settings['jazzcash_number'],
    'easypaisa_number' => $settings['easypaisa_number'],
    'guesthouse_name' => $settings['guesthouse_name'],
    'guesthouse_phone' => $settings['guesthouse_phone'],
    'guesthouse_email' => $settings['guesthouse_email'],
    'guesthouse_address' => $settings['guesthouse_address'],
], JSON_THROW_ON_ERROR);
