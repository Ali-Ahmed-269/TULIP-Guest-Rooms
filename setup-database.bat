@echo off
title Tulip Guest Rooms - Database Setup
set PROJECT_DIR=%~dp0
set SQL_FILE=%PROJECT_DIR%database.sql

echo.
echo  Database setup for Tulip Guest Rooms
echo  ===================================
echo.

set MYSQL=
if exist "C:\xampp\mysql\bin\mysql.exe" set MYSQL=C:\xampp\mysql\bin\mysql.exe
if exist "C:\laragon\bin\mysql\mysql-8.0.30-winx64\bin\mysql.exe" set MYSQL=C:\laragon\bin\mysql\mysql-8.0.30-winx64\bin\mysql.exe

if "%MYSQL%"=="" (
    echo  ERROR: MySQL not found.
    echo  Install XAMPP from https://www.apachefriends.org/
    echo  Then start MySQL in XAMPP Control Panel and run this script again.
    pause
    exit /b 1
)

echo  Using: %MYSQL%
echo  Creating database and tables...
echo.

"%MYSQL%" -u root -e "CREATE DATABASE IF NOT EXISTS tulip_guest_rooms CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
if errorlevel 1 (
    echo  Failed to connect. Is MySQL running in XAMPP?
    pause
    exit /b 1
)

"%MYSQL%" -u root tulip_guest_rooms < "%SQL_FILE%"
if errorlevel 1 (
    echo  Import failed. Check database.sql
    pause
    exit /b 1
)

echo.
echo  SUCCESS: Database 'tulip_guest_rooms' is ready.
echo  Start the site with start-local.bat
echo.
pause
