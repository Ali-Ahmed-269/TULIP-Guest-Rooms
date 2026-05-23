-- Run on existing databases created before reviews schema update

ALTER TABLE reviews
    ADD COLUMN guest_name VARCHAR(100) NOT NULL DEFAULT 'Guest' AFTER booking_id,
    ADD COLUMN status ENUM('Pending', 'Approved', 'Rejected') NOT NULL DEFAULT 'Pending' AFTER review_text;

ALTER TABLE reviews MODIFY review_text TEXT NOT NULL;

ALTER TABLE reviews ADD UNIQUE KEY uq_reviews_booking (booking_id);
