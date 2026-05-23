@echo off
title Install PHP dependencies (PHPMailer + DOMPDF)
cd /d "%~dp0"

if not exist "composer.phar" (
    echo Downloading Composer...
    powershell -Command "Invoke-WebRequest -Uri 'https://getcomposer.org/download/latest-stable/composer.phar' -OutFile 'composer.phar'"
)

echo Installing packages...
php composer.phar install --no-interaction
if errorlevel 1 (
    echo.
    echo If install failed, enable in php.ini: extension=openssl, mbstring, curl, zip
    pause
    exit /b 1
)

echo.
echo Done. vendor/ is ready for send_email.php and generate_invoice.php
pause
