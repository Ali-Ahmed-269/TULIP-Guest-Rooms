@echo off
title Tulip Guest Rooms - Local Server
set PROJECT_DIR=%~dp0
cd /d "%PROJECT_DIR%"

echo.
echo  Tulip Guest Rooms - Local Development Server
echo  ============================================
echo.
echo  Site URL:  http://localhost:8080/
echo  Stop:      Press Ctrl+C in this window
echo.
echo  Note: Booking requires MySQL (XAMPP). Run setup-database.bat first.
echo.

php -S localhost:8080 -t "%PROJECT_DIR%"
pause
