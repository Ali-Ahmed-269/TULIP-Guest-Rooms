<?php

declare(strict_types=1);

if (!function_exists('tgr_get_encryption_key')) {
    function tgr_get_encryption_key(): string
    {
        $key = getenv('APP_KEY');
        if ($key === false || $key === '') {
            $key = getenv('TGR_APP_KEY');
        }
        if ($key === false || $key === '') {
            $key = $_ENV['APP_KEY'] ?? '';
        }
        if ($key === false || $key === '') {
            $key = $_ENV['TGR_APP_KEY'] ?? '';
        }

        if ($key === '') {
            $key = 'tulip_guest_rooms_local_dev_key';
        }

        return hash('sha256', (string) $key, true);
    }
}

if (!function_exists('tgr_encrypt_secret')) {
    function tgr_encrypt_secret(string $plaintext): string
    {
        $iv = random_bytes(12);
        $tag = '';
        $ciphertext = openssl_encrypt(
            $plaintext,
            'aes-256-gcm',
            tgr_get_encryption_key(),
            OPENSSL_RAW_DATA,
            $iv,
            $tag
        );

        if ($ciphertext === false) {
            throw new RuntimeException('Unable to encrypt secret value.');
        }

        return 'enc:v1:' . base64_encode($iv . $tag . $ciphertext);
    }
}

if (!function_exists('tgr_decrypt_secret')) {
    function tgr_decrypt_secret(string $storedValue): string
    {
        if (!str_starts_with($storedValue, 'enc:v1:')) {
            return $storedValue;
        }

        $payload = base64_decode(substr($storedValue, 7), true);
        if ($payload === false || strlen($payload) < 28) {
            throw new RuntimeException('Unable to decode encrypted secret value.');
        }

        $iv = substr($payload, 0, 12);
        $tag = substr($payload, 12, 16);
        $ciphertext = substr($payload, 28);

        $plaintext = openssl_decrypt(
            $ciphertext,
            'aes-256-gcm',
            tgr_get_encryption_key(),
            OPENSSL_RAW_DATA,
            $iv,
            $tag
        );

        if ($plaintext === false) {
            throw new RuntimeException('Unable to decrypt secret value.');
        }

        return $plaintext;
    }
}
