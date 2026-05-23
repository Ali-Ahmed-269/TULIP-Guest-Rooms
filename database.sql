CREATE TABLE admin_users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE rooms (
    id INT AUTO_INCREMENT PRIMARY KEY,
    room_number VARCHAR(10) NOT NULL UNIQUE,
    room_type VARCHAR(50) NOT NULL,
    price_per_night DECIMAL(10,2) NOT NULL,
    max_guests INT NOT NULL DEFAULT 2,
    status ENUM('Available', 'Reserved', 'Booked', 'Maintenance') DEFAULT 'Available',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE bookings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    room_id INT NOT NULL,
    booking_reference VARCHAR(20) UNIQUE,
    guest_name VARCHAR(100) NOT NULL,
    guest_email VARCHAR(100) NOT NULL,
    guest_phone VARCHAR(20) NOT NULL,
    guest_cnic VARCHAR(20) NOT NULL,
    guest_address TEXT NOT NULL,
    check_in_date DATE NOT NULL,
    check_out_date DATE NOT NULL,
    guests_count INT NOT NULL DEFAULT 1,
    total_amount DECIMAL(10,2) NOT NULL,
    payment_method VARCHAR(50) NOT NULL,
    payment_status ENUM('Pending Verification', 'Unpaid', 'Paid', 'Failed') DEFAULT 'Unpaid',
    payment_proof VARCHAR(255),
    booking_status ENUM('Pending', 'Confirmed', 'Cancelled', 'Completed') DEFAULT 'Pending',
    special_requests TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (room_id) REFERENCES rooms(id)
);

-- Used by php/book.php for IP rate limiting (max 5 POSTs per hour)
CREATE TABLE rate_limit_log (
    id INT AUTO_INCREMENT PRIMARY KEY,
    ip_address VARCHAR(45) NOT NULL,
    attempted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_ip_attempted (ip_address, attempted_at)
);

CREATE TABLE reviews (
    id INT AUTO_INCREMENT PRIMARY KEY,
    booking_id INT NOT NULL,
    guest_name VARCHAR(100) NOT NULL,
    rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
    review_text TEXT NOT NULL,
    status ENUM('Pending', 'Approved', 'Rejected') DEFAULT 'Pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_reviews_booking (booking_id),
    FOREIGN KEY (booking_id) REFERENCES bookings(id)
);

-- Pre-insert all 12 rooms (101-112) with types, capacity and price
INSERT INTO rooms (room_number, room_type, price_per_night, max_guests, status) VALUES 
('101', 'Standard Room', 50.00, 2, 'Available'),
('102', 'Standard Room', 50.00, 2, 'Available'),
('103', 'Standard Room', 50.00, 2, 'Available'),
('104', 'Standard Room', 50.00, 2, 'Available'),
('105', 'Deluxe Room', 80.00, 3, 'Available'),
('106', 'Deluxe Room', 80.00, 3, 'Available'),
('107', 'Deluxe Room', 80.00, 3, 'Available'),
('108', 'Deluxe Room', 80.00, 3, 'Available'),
('109', 'Suite', 120.00, 4, 'Available'),
('110', 'Suite', 120.00, 4, 'Available'),
('111', 'Suite', 120.00, 4, 'Available'),
('112', 'Suite', 120.00, 4, 'Available');

-- Default admin (username: admin, password: admin123) — change after first login
INSERT INTO admin_users (username, password_hash) VALUES
('admin', '$2y$10$RMOrQgBax8.JiNPS0a.g7u.7MwNqm.r3Qt8Be1fa2JEx0eOzYtQna');

CREATE TABLE IF NOT EXISTS site_settings (
    setting_key VARCHAR(64) PRIMARY KEY,
    setting_value TEXT NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

INSERT INTO site_settings (setting_key, setting_value) VALUES
('smtp_host', 'smtp.gmail.com'),
('smtp_port', '587'),
('smtp_secure', 'tls'),
('smtp_username', ''),
('smtp_password', ''),
('smtp_from_email', 'noreply@tulipguestrooms.com'),
('smtp_from_name', 'Tulip Guest Rooms'),
('guesthouse_name', 'Tulip Guest Rooms'),
('guesthouse_address', 'Karachi, Pakistan'),
('guesthouse_phone', '0300-1234567'),
('guesthouse_email', 'hello@tulipguestrooms.com'),
('jazzcash_number', '0300-1234567'),
('easypaisa_number', '0311-7654321')
ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value);
