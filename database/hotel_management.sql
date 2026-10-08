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
(6, 'The Nature Royal', 'Moheshkhali, Cox''s Bazar', 110.00, 4.5, 7610, 'img/rooms/room6.jpg', 24),
(7, 'The Grand Dhaka Palace', 'Gulshan, Dhaka', 180.00, 4.6, 5420, 'img/rooms/room1.jpg', 24),
(8, 'Dhaka River View Hotel', 'Sadarghat, Dhaka', 120.00, 4.3, 3210, 'img/rooms/room2.jpg', 24),
(9, 'Sylhet Tea Resort', 'Sreemangal, Sylhet', 160.00, 4.8, 6780, 'img/rooms/room3.jpg', 24),
(10, 'Jaflong Valley Lodge', 'Jaflong, Sylhet', 140.00, 4.5, 4350, 'img/rooms/room4.jpg', 24),
(11, 'Saint Martin Beach Resort', 'Saint Martin Island', 220.00, 4.9, 8920, 'img/rooms/room5.jpg', 24),
(12, 'Coral View Inn', 'Chera Dwip, Saint Martin', 170.00, 4.6, 5100, 'img/rooms/room6.jpg', 24),
(13, 'Sundarbans Safari Lodge', 'Mongla, Sundarbans', 200.00, 4.7, 7240, 'img/rooms/room1.jpg', 24),
(14, 'Mangrove Eco Resort', 'Harbaria, Sundarbans', 155.00, 4.4, 3890, 'img/rooms/room2.jpg', 24)
ON DUPLICATE KEY UPDATE name=VALUES(name), location=VALUES(location), price_per_night=VALUES(price_per_night), rating=VALUES(rating), reviews_count=VALUES(reviews_count), total_rooms=VALUES(total_rooms);

-- Add descriptions to default rooms
UPDATE rooms SET description = 'Located in the exclusive Marine Drive area of Cox''s Bazar, The Azure Bay Resort redefines tropical elegance. Designed for travelers who seek both adventure and serenity, our property blends modern architectural brilliance with the natural beauty of the Bay of Bengal.' WHERE id = 1 AND (description IS NULL OR description = '');
UPDATE rooms SET description = 'Nestled in the serene Sugandha area of Cox''s Bazar, Tea Garden Retreat offers a unique blend of nature and luxury. Surrounded by lush tea gardens and rolling hills, the resort provides a tranquil escape from the hustle and bustle of city life.' WHERE id = 2 AND (description IS NULL OR description = '');
UPDATE rooms SET description = 'Perched along the pristine shores of Inani Beach, Queen Garden is a haven of elegance and relaxation. The resort features stunning ocean views, lush tropical gardens, and architecture inspired by the region''s rich cultural heritage.' WHERE id = 3 AND (description IS NULL OR description = '');
UPDATE rooms SET description = 'Azure Crest Resort at Kolatoli brings world-class hospitality to the vibrant heart of Cox''s Bazar. Situated just steps from the famous Kolatoli Beach, this property combines urban convenience with beachfront luxury.' WHERE id = 4 AND (description IS NULL OR description = '');
UPDATE rooms SET description = 'Tea Garden Cove sits at the gateway to Cox''s Bazar''s most iconic beach stretch in Laboni. This boutique property offers an intimate atmosphere with personalized service that sets it apart from larger resorts.' WHERE id = 5 AND (description IS NULL OR description = '');
UPDATE rooms SET description = 'Located on the enchanting island of Moheshkhali, The Nature Royal offers a truly unique island getaway. Accessible by a scenic boat ride, the resort is surrounded by mangrove forests, traditional fishing villages, and untouched natural beauty.' WHERE id = 6 AND (description IS NULL OR description = '');
UPDATE rooms SET description = 'Experience luxury in the heart of Dhaka. The Grand Dhaka Palace offers world-class amenities, rooftop dining with city views, and easy access to diplomatic zones and business districts.' WHERE id = 7 AND (description IS NULL OR description = '');
UPDATE rooms SET description = 'Overlooking the historic Buriganga River, this boutique hotel combines old Dhaka charm with modern comfort. Enjoy river cruises, local cuisine tours, and proximity to Ahsan Manzil and Lalbagh Fort.' WHERE id = 8 AND (description IS NULL OR description = '');
UPDATE rooms SET description = 'Nestled among endless tea gardens of Sreemangal, this eco-resort offers breathtaking views of rolling green hills. Wake up to misty mornings, explore Lawachara rainforest, and savor world-famous Sylheti tea.' WHERE id = 9 AND (description IS NULL OR description = '');
UPDATE rooms SET description = 'Located at the gateway to Jaflong, this mountain lodge offers stunning views of crystal-clear rivers and the Khasi Hills of Meghalaya. Perfect for nature lovers and adventure seekers.' WHERE id = 10 AND (description IS NULL OR description = '');
UPDATE rooms SET description = 'Bangladesh''s only coral island paradise. Enjoy pristine turquoise waters, snorkeling, fresh seafood, and spectacular sunsets from your private beachfront cottage on Narikel Jinjira.' WHERE id = 11 AND (description IS NULL OR description = '');
UPDATE rooms SET description = 'A charming seaside inn on the southern tip of Saint Martin. Coral View Inn offers intimate cottage stays, guided snorkeling tours, and the freshest seafood dining on the island.' WHERE id = 12 AND (description IS NULL OR description = '');
UPDATE rooms SET description = 'Your gateway to the world''s largest mangrove forest. The Safari Lodge offers guided boat tours to spot Royal Bengal Tigers, spotted deer, and exotic birds in their natural habitat.' WHERE id = 13 AND (description IS NULL OR description = '');
UPDATE rooms SET description = 'An eco-friendly resort deep in the Sundarbans. Experience the magic of the mangrove forest with night safaris, kayaking through narrow creeks, and sleeping to the sounds of the wilderness.' WHERE id = 14 AND (description IS NULL OR description = '');

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
