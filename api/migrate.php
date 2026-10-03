<?php
// Database migration script - run once to set up new tables
require_once __DIR__ . '/config.php';

$db = getDB();

// 1. Remove role column from users if it exists (admins now have separate table)
try {
    $db->exec("ALTER TABLE users DROP COLUMN role");
} catch (PDOException $e) {
    // Column doesn't exist or already removed - ignore
}

// 1c. Add loyalty columns to users table for points tracking
try {
    $db->exec("ALTER TABLE users ADD COLUMN loyalty_points_balance INT NOT NULL DEFAULT 0 AFTER is_verified");
} catch (PDOException $e) {
    // Column already exists - ignore
}

try {
    $db->exec("ALTER TABLE users ADD COLUMN loyalty_points_earned INT NOT NULL DEFAULT 0 AFTER loyalty_points_balance");
} catch (PDOException $e) {
    // Column already exists - ignore
}

// 1b. Create admins table
$db->exec("
    CREATE TABLE IF NOT EXISTS admins (
        id INT AUTO_INCREMENT PRIMARY KEY,
        full_name VARCHAR(100) NOT NULL,
        email VARCHAR(255) NOT NULL UNIQUE,
        password_hash VARCHAR(255) NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
");

// 2. Create rooms table
$db->exec("
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
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
");

// 3. Create reservations table
$db->exec("
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
        status ENUM('pending','approved','paid','cancelled') DEFAULT 'pending',
        admin_note TEXT DEFAULT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
");

// 3b. Add loyalty points column for existing reservations tables
try {
    $db->exec("ALTER TABLE reservations ADD COLUMN loyalty_points_awarded INT NOT NULL DEFAULT 0 AFTER total_price");
} catch (PDOException $e) {
    // Column already exists - ignore
}

// 3c. Create loyalty subscriptions table for redeemable cafe plans
$db->exec("
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
        status ENUM('active','cancelled','expired') NOT NULL DEFAULT 'active',
        expires_at DATETIME NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_loyalty_subscriptions_user (user_id),
        INDEX idx_loyalty_subscriptions_brand (brand_key),
        INDEX idx_loyalty_subscriptions_status_expires (status, expires_at),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
");

// 4. Insert default rooms if empty
$count = $db->query("SELECT COUNT(*) FROM rooms")->fetchColumn();
if ($count == 0) {
    $db->exec("
        INSERT INTO rooms (id, name, location, price_per_night, rating, reviews_count, image) VALUES
        (1, 'The Azure Bay Resort', 'Marine Drive, Cox''s Bazar', 150.00, 4.7, 1289, 'img/rooms/room1.jpg'),
        (2, 'Tea Garden Retreat', 'Sugandha, Cox''s Bazar', 190.00, 4.8, 9880, 'img/rooms/room2.jpg'),
        (3, 'Queen Garden', 'Inani, Cox''s Bazar', 110.00, 4.5, 7610, 'img/rooms/room3.jpg'),
        (4, 'Azure Crest Resort', 'Kolatoli, Cox''s Bazar', 150.00, 4.7, 1289, 'img/rooms/room4.jpg'),
        (5, 'Tea Garden Cove', 'Laboni, Cox''s Bazar', 190.00, 4.8, 9880, 'img/rooms/room5.jpg'),
        (6, 'The Nature Royal', 'Moheshkhali, Cox''s Bazar', 110.00, 4.5, 7610, 'img/rooms/room6.jpg')
    ");
}

// 5. Ensure all hotels have 24 rooms
$db->exec("UPDATE rooms SET total_rooms = 24 WHERE total_rooms IS NULL OR total_rooms != 24");

// 6. Create admin account in admins table if not exists (password: Admin@123)
$adminHash = password_hash('Admin@123', PASSWORD_BCRYPT);
$stmt = $db->prepare("SELECT id FROM admins WHERE email = ?");
$stmt->execute(['admin@roomfound.com']);
if (!$stmt->fetch()) {
    $stmt = $db->prepare("INSERT INTO admins (full_name, email, password_hash) VALUES (?, ?, ?)");
    $stmt->execute(['Admin', 'admin@roomfound.com', $adminHash]);
}

// 6b. Remove old admin row from users table if it exists
$db->exec("DELETE FROM users WHERE email = 'admin@roomfound.com'");

// 6c. Ensure employees table exists and has hotel assignment column
$db->exec(<<<SQL
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
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
SQL
);

try {
    $db->exec("ALTER TABLE employees ADD COLUMN hotel_id INT NULL AFTER role");
} catch (PDOException $e) {
    // Column already exists - ignore
}

try {
    $db->exec("ALTER TABLE employees ADD INDEX idx_employees_hotel (hotel_id)");
} catch (PDOException $e) {
    // Index already exists - ignore
}

// 7. Backfill loyalty points from paid reservations so legacy bookings are counted.
$db->exec("UPDATE reservations SET loyalty_points_awarded = FLOOR(total_price * 0.5) WHERE status = 'paid' AND loyalty_points_awarded = 0");

// 8. Performance indexes for the hot queries (availability overlap, status filters).
$db->exec("CREATE INDEX IF NOT EXISTS idx_reservations_room_dates ON reservations (room_id, check_in, check_out)");
$db->exec("CREATE INDEX IF NOT EXISTS idx_reservations_status ON reservations (status)");

// 9. Verification codes gain a purpose so password-reset codes never collide
//    with the signup verification flow.
try {
    $db->exec("ALTER TABLE verification_codes ADD COLUMN purpose ENUM('verify','reset') NOT NULL DEFAULT 'verify' AFTER code");
} catch (PDOException $e) {
    // Column already exists.
}

// 10. Hotel reviews stored in the database (replaces localStorage reviews).
$db->exec("
    CREATE TABLE IF NOT EXISTS reviews (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        room_id INT NOT NULL,
        rating TINYINT NOT NULL,
        description TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY uq_review_user_room (user_id, room_id),
        INDEX idx_reviews_room (room_id),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
");

// 11. Support inquiries table (in case it was never imported from the schema).
$db->exec("
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
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
");

jsonResponse(true, 'Migration completed successfully.');

// Keep user-level counters at least as high as paid booking totals.
$db->exec("
    UPDATE users u
    LEFT JOIN (
        SELECT user_id, COALESCE(SUM(loyalty_points_awarded), 0) AS earned_points
        FROM reservations
        GROUP BY user_id
    ) r ON r.user_id = u.id
    SET
        u.loyalty_points_earned = GREATEST(u.loyalty_points_earned, COALESCE(r.earned_points, 0)),
        u.loyalty_points_balance = GREATEST(u.loyalty_points_balance, COALESCE(r.earned_points, 0))
");

jsonResponse(true, 'Migration completed successfully.');
