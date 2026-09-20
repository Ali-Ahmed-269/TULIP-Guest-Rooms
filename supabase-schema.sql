-- Enums for Statuses
CREATE TYPE room_status AS ENUM ('Available', 'Reserved', 'Booked', 'Maintenance');
CREATE TYPE payment_status_type AS ENUM ('Pending Verification', 'Unpaid', 'Paid', 'Failed');
CREATE TYPE booking_status_type AS ENUM ('Pending', 'Confirmed', 'Cancelled', 'Completed');
CREATE TYPE review_status_type AS ENUM ('Pending', 'Approved', 'Rejected');

-- Rooms Table
CREATE TABLE rooms (
    id SERIAL PRIMARY KEY,
    room_number VARCHAR(10) NOT NULL UNIQUE,
    room_type VARCHAR(50) NOT NULL,
    price_per_night DECIMAL(10,2) NOT NULL,
    max_guests INT NOT NULL DEFAULT 2,
    status room_status NOT NULL DEFAULT 'Available',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Enable RLS & Policies for Rooms Table
ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access to rooms"
ON rooms FOR SELECT TO public USING (true);

CREATE POLICY "Allow authenticated insert rooms"
ON rooms FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Allow authenticated update rooms"
ON rooms FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow authenticated delete rooms"
ON rooms FOR DELETE TO authenticated USING (true);

-- Bookings Table
CREATE TABLE bookings (
    id SERIAL PRIMARY KEY,
    room_id INT NOT NULL REFERENCES rooms(id) ON DELETE RESTRICT,
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
    payment_status payment_status_type NOT NULL DEFAULT 'Unpaid',
    payment_proof VARCHAR(255), -- Supabase Storage URL
    booking_status booking_status_type NOT NULL DEFAULT 'Pending',
    special_requests TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Enable RLS & Policies for Bookings Table
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated select bookings"
ON bookings FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated insert bookings"
ON bookings FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Allow authenticated update bookings"
ON bookings FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow authenticated delete bookings"
ON bookings FOR DELETE TO authenticated USING (true);

-- Reviews Table
CREATE TABLE reviews (
    id SERIAL PRIMARY KEY,
    booking_id INT NOT NULL UNIQUE REFERENCES bookings(id) ON DELETE CASCADE,
    guest_name VARCHAR(100) NOT NULL,
    rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
    review_text TEXT NOT NULL,
    status review_status_type NOT NULL DEFAULT 'Pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Enable RLS & Policies for Reviews Table
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public select approved reviews"
ON reviews FOR SELECT TO public USING (status = 'Approved');

CREATE POLICY "Allow authenticated insert reviews"
ON reviews FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Allow authenticated update reviews"
ON reviews FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow authenticated delete reviews"
ON reviews FOR DELETE TO authenticated USING (true);

-- Rate Limit Table (Optional PostgreSQL fallback rate limit log)
CREATE TABLE rate_limit_log (
    id SERIAL PRIMARY KEY,
    ip_address VARCHAR(45) NOT NULL,
    attempted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_ip_attempted ON rate_limit_log(ip_address, attempted_at);

-- Enable RLS & Policies for Rate Limit Log Table
ALTER TABLE rate_limit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated select rate_limit_log"
ON rate_limit_log FOR SELECT TO authenticated USING (true);

-- Site Settings Table
CREATE TABLE site_settings (
    setting_key VARCHAR(64) PRIMARY KEY,
    setting_value TEXT NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Enable RLS & Policies for Site Settings Table
ALTER TABLE site_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public select site_settings"
ON site_settings FOR SELECT TO public USING (true);

CREATE POLICY "Allow authenticated insert site_settings"
ON site_settings FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Allow authenticated update site_settings"
ON site_settings FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow authenticated delete site_settings"
ON site_settings FOR DELETE TO authenticated USING (true);

-- Seed Rooms
INSERT INTO rooms (room_number, room_type, price_per_night, max_guests, status) VALUES
('101', 'Standard', 3000, 2, 'Available'),
('102', 'Standard', 3000, 2, 'Available'),
('106', 'Standard', 3000, 2, 'Available'),
('107', 'Standard', 3000, 2, 'Available'),
('108', 'Standard', 3000, 2, 'Available'),
('103', 'Premium', 4000, 3, 'Available'),
('104', 'Premium', 4000, 3, 'Available'),
('105', 'Premium', 4000, 3, 'Available'),
('109', 'Premium', 4000, 3, 'Available'),
('110', 'Premium', 4000, 3, 'Available'),
('111', 'Comfort Plus', 7500, 4, 'Available'),
('112', 'Comfort Plus', 7500, 4, 'Available');

-- Seed Site Settings
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
('easypaisa_number', '0311-7654321');
