-- Run on existing databases created before site_settings support
CREATE TABLE IF NOT EXISTS site_settings (
    setting_key VARCHAR(64) PRIMARY KEY,
    setting_value TEXT NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

INSERT INTO site_settings (setting_key, setting_value) VALUES
('smtp_host', 'smtp.gmail.com')
ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value);

INSERT INTO site_settings (setting_key, setting_value) VALUES
('smtp_port', '587')
ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value);

INSERT INTO site_settings (setting_key, setting_value) VALUES
('smtp_secure', 'tls')
ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value);

INSERT INTO site_settings (setting_key, setting_value) VALUES
('smtp_username', '')
ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value);

INSERT INTO site_settings (setting_key, setting_value) VALUES
('smtp_password', '')
ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value);

INSERT INTO site_settings (setting_key, setting_value) VALUES
('smtp_from_email', 'noreply@tulipguestrooms.com')
ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value);

INSERT INTO site_settings (setting_key, setting_value) VALUES
('smtp_from_name', 'Tulip Guest Rooms')
ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value);

INSERT INTO site_settings (setting_key, setting_value) VALUES
('guesthouse_name', 'Tulip Guest Rooms')
ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value);

INSERT INTO site_settings (setting_key, setting_value) VALUES
('guesthouse_address', 'Karachi, Pakistan')
ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value);

INSERT INTO site_settings (setting_key, setting_value) VALUES
('guesthouse_phone', '0300-1234567')
ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value);

INSERT INTO site_settings (setting_key, setting_value) VALUES
('guesthouse_email', 'hello@tulipguestrooms.com')
ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value);

INSERT INTO site_settings (setting_key, setting_value) VALUES
('jazzcash_number', '0300-1234567')
ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value);

INSERT INTO site_settings (setting_key, setting_value) VALUES
('easypaisa_number', '0311-7654321')
ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value);
