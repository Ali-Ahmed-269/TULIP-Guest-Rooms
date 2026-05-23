# Tulip Guest Rooms

Local development and deployment notes for Tulip Guest Rooms.

## Quick local setup (XAMPP on Windows)

1. Install XAMPP and start Apache + MySQL.
2. Create database `tulip_guest_rooms` and import `database.sql`:

```sql
-- from XAMPP MySQL shell or phpMyAdmin
SOURCE path/to/project/database.sql;
```

3. Place this project folder inside your Apache `htdocs` or configure a virtual host pointing to the project root.
4. Ensure `uploads/` is writable by the webserver.
5. Install Composer dependencies:

```powershell
composer install
```

6. Start PHP built-in server for quick testing (from project root):

```powershell
# optional: use built-in server
php -S localhost:8080 -t .
```

## Composer
This project uses PHPMailer and Dompdf. Install with:

```powershell
composer require phpmailer/phpmailer
composer require dompdf/dompdf
```

## Default admin user
- Username: `admin`
- Password: `admin123`

Change the password after first login. To create a new hash locally:

```powershell
php -r "echo password_hash('YOUR_NEW_PASSWORD', PASSWORD_DEFAULT).PHP_EOL;"
```
Then update `admin_users.password_hash` via MySQL.

## Production checklist
-- Set `site_settings` values via `admin/settings.php` (SMTP creds, phone numbers).
- Ensure Apache `.htaccess` is enabled (for HTTPS redirect and directory protections).
- Set correct file permissions for `uploads/` and ensure `uploads/payments/.htaccess` exists.
- Populate SMTP in settings and test email sending.
- Replace default admin password and remove example accounts.
- Disable display_errors in `php.ini` (this app sets it off by default in `config/db.php`).

## Security notes
- CSRF tokens are enforced on all forms.
- Booking endpoint rate-limits by IP (5 attempts per hour) and validates uploaded files by MIME bytes.
- Session cookies are set with `HttpOnly` and `Secure` flags when HTTPS is detected.
- Direct access to `config/` and `uploads/payments/` is blocked with `.htaccess`.

If you need me to run tests or finish a full security audit across all templates, allow terminal access or run the test commands and paste outputs.