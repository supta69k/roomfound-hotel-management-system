-- Hotel Management Database Setup
CREATE DATABASE IF NOT EXISTS hotel_management;
USE hotel_management;

-- Users table (regular users only)
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    full_name VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    phone VARCHAR(20) DEFAULT NULL,
    location VARCHAR(255) DEFAULT NULL,
    is_verified TINYINT(1) DEFAULT 0,
    loyalty_points_balance INT NOT NULL DEFAULT 0,
    loyalty_points_earned INT NOT NULL DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Admins table (separate from users)
CREATE TABLE IF NOT EXISTS admins (
    id INT AUTO_INCREMENT PRIMARY KEY,
    full_name VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Email verification codes
CREATE TABLE IF NOT EXISTS verification_codes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    code VARCHAR(6) NOT NULL,
    expires_at DATETIME NOT NULL,
    used TINYINT(1) DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Rooms table (static hotel data)
CREATE TABLE IF NOT EXISTS rooms (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    location VARCHAR(255) NOT NULL,
    price_per_night DECIMAL(10,2) NOT NULL,
    rating DECIMAL(2,1) DEFAULT 0.0,
    reviews_count INT DEFAULT 0,
    description TEXT,
    image VARCHAR(255) DEFAULT NULL,
    total_rooms INT DEFAULT 24,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Reservations table
CREATE TABLE IF NOT EXISTS reservations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    room_id INT NOT NULL,
    hotel_name VARCHAR(150) NOT NULL,
    check_in DATE NOT NULL,
    check_out DATE NOT NULL,
    nights INT NOT NULL DEFAULT 1,
    guests INT NOT NULL DEFAULT 1,
    rooms_count INT NOT NULL DEFAULT 1,
    services TEXT DEFAULT NULL,
    base_price DECIMAL(10,2) NOT NULL,
    services_price DECIMAL(10,2) DEFAULT 0.00,
    taxes DECIMAL(10,2) DEFAULT 0.00,
    total_price DECIMAL(10,2) NOT NULL,
    loyalty_points_awarded INT NOT NULL DEFAULT 0,
    status ENUM('pending', 'approved', 'paid', 'cancelled') DEFAULT 'pending',
    admin_note TEXT DEFAULT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Loyalty subscriptions table (redeem with points)
CREATE TABLE IF NOT EXISTS loyalty_subscriptions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    brand_key VARCHAR(64) NOT NULL,
    brand_name VARCHAR(150) NOT NULL,
    brand_logo VARCHAR(255) NOT NULL,
    tier_plan VARCHAR(32) NOT NULL,
    duration_label VARCHAR(32) NOT NULL DEFAULT '1 Month',
    points_cost INT NOT NULL,
    monthly_price DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    offers_json TEXT NOT NULL,
    auto_renew TINYINT(1) NOT NULL DEFAULT 1,
    status ENUM('active', 'cancelled', 'expired') NOT NULL DEFAULT 'active',
    expires_at DATETIME NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_loyalty_subscriptions_user (user_id),
    INDEX idx_loyalty_subscriptions_brand (brand_key),
    INDEX idx_loyalty_subscriptions_status_expires (status, expires_at),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Insert default rooms
INSERT INTO rooms (id, name, location, price_per_night, rating, reviews_count, image, total_rooms) VALUES
(1, 'The Azure Bay Resort', 'Marine Drive, Cox''s Bazar', 150.00, 4.7, 1289, 'img/rooms/room1.jpg', 24),
(2, 'Tea Garden Retreat', 'Sugandha, Cox''s Bazar', 190.00, 4.8, 9880, 'img/rooms/room2.jpg', 24),
(3, 'Queen Garden', 'Inani, Cox''s Bazar', 110.00, 4.5, 7610, 'img/rooms/room3.jpg', 24),
(4, 'Azure Crest Resort', 'Kolatoli, Cox''s Bazar', 150.00, 4.7, 1289, 'img/rooms/room4.jpg', 24),
(5, 'Tea Garden Cove', 'Laboni, Cox''s Bazar', 190.00, 4.8, 9880, 'img/rooms/room5.jpg', 24),
(6, 'The Nature Royal', 'Moheshkhali, Cox''s Bazar', 110.00, 4.5, 7610, 'img/rooms/room6.jpg', 24)
ON DUPLICATE KEY UPDATE name=VALUES(name), total_rooms=VALUES(total_rooms);

-- Default admin account (email: admin@roomfound.com) is created by api/migrate.php
-- on first run, so no credentials are stored in this schema file.

-- Employees table (managers and waiters)
CREATE TABLE IF NOT EXISTS employees (
    id INT AUTO_INCREMENT PRIMARY KEY,
    full_name VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('manager','waiter') NOT NULL DEFAULT 'waiter',
    hotel_id INT NULL,
    phone VARCHAR(20) DEFAULT NULL,
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    created_by INT DEFAULT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_employees_hotel (hotel_id),
    FOREIGN KEY (hotel_id) REFERENCES rooms(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Support inquiries table
CREATE TABLE IF NOT EXISTS support_inquiries (
    id INT AUTO_INCREMENT PRIMARY KEY,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    country VARCHAR(100) DEFAULT NULL,
    phone VARCHAR(20) DEFAULT NULL,
    email VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    status ENUM('new','read','replied','closed') DEFAULT 'new',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Newsletter subscribers (public homepage form)
CREATE TABLE IF NOT EXISTS subscribers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
