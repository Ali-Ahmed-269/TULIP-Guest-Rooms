-- Run if admin_users is empty: mysql -u root tulip_guest_rooms < admin/seed_admin.sql
INSERT INTO admin_users (username, password_hash) VALUES
('admin', '$2y$10$RMOrQgBax8.JiNPS0a.g7u.7MwNqm.r3Qt8Be1fa2JEx0eOzYtQna')
ON DUPLICATE KEY UPDATE username = username;
