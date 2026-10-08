<?php
// Admin API - Dashboard stats, reservation management
require_once __DIR__ . '/config.php';

if (!isset($_SESSION['user_id'])) {
    http_response_code(401);
    jsonResponse(false, 'Not authenticated.');
}

// Check admin role
$db = getDB();
$stmt = $db->prepare('SELECT id FROM admins WHERE id = ?');
$stmt->execute([$_SESSION['user_id']]);
$admin = $stmt->fetch();

if (!$admin || ($_SESSION['user_role'] ?? '') !== 'admin') {
    http_response_code(403);
    jsonResponse(false, 'Access denied.');
}

$action = $_GET['action'] ?? $_POST['action'] ?? '';

// GET actions
if ($_SERVER['REQUEST_METHOD'] === 'GET') {

    // Dashboard stats
    if ($action === 'stats') {
        // Total users
        $totalUsers = $db->query("SELECT COUNT(*) FROM users")->fetchColumn();

        // Total reservations
        $totalReservations = $db->query("SELECT COUNT(*) FROM reservations")->fetchColumn();

        // Today's check-ins
        $today = date('Y-m-d');
        $todayCheckins = $db->prepare("SELECT COUNT(*) FROM reservations WHERE check_in = ? AND status IN ('paid','approved')");
        $todayCheckins->execute([$today]);
        $todayCheckins = $todayCheckins->fetchColumn();

        // Today's check-outs
        $todayCheckouts = $db->prepare("SELECT COUNT(*) FROM reservations WHERE check_out = ? AND status = 'paid'");
        $todayCheckouts->execute([$today]);
        $todayCheckouts = $todayCheckouts->fetchColumn();

        // Total booked (paid)
        $totalBooked = $db->query("SELECT COUNT(*) FROM reservations WHERE status = 'paid'")->fetchColumn();

        // Pending approvals
        $pendingCount = $db->query("SELECT COUNT(*) FROM reservations WHERE status = 'pending'")->fetchColumn();

        // Revenue (sum of total_price for paid reservations)
        $totalRevenue = $db->query("SELECT COALESCE(SUM(total_price), 0) FROM reservations WHERE status = 'paid'")->fetchColumn();

        // Monthly revenue (last 30 days)
        $monthlyRevenue = $db->query("SELECT COALESCE(SUM(total_price), 0) FROM reservations WHERE status = 'paid' AND created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)")->fetchColumn();

        // Revenue by day (last 7 days)
        $revenueByDay = [];
        $stmt = $db->query("
            SELECT DATE(created_at) as day, SUM(total_price) as revenue, COUNT(*) as bookings
            FROM reservations
            WHERE status = 'paid' AND created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
            GROUP BY DATE(created_at)
            ORDER BY day ASC
        ");
        $revenueByDay = $stmt->fetchAll();

        // Rooms actually occupied right now across all hotels (date-aware)
        $today = date('Y-m-d');
        $occupiedNowStmt = $db->prepare("
            SELECT COALESCE(SUM(rooms_count), 0)
            FROM reservations
            WHERE status IN ('pending', 'approved', 'paid')
              AND check_in < ? AND check_out > ?
        ");
        $occupiedNowStmt->execute([date('Y-m-d', strtotime($today . ' +1 day')), $today]);
        $occupiedNow = intval($occupiedNowStmt->fetchColumn());

        // Total inventory across all hotels (occupancy must be measured
        // against the real total, not one hotel's 24 rooms)
        $totalRoomsAll = intval($db->query('SELECT COALESCE(SUM(total_rooms), 0) FROM rooms')->fetchColumn());

        // Reservations by status
        $byStatus = $db->query("
            SELECT status, COUNT(*) as count
            FROM reservations
            GROUP BY status
        ")->fetchAll();

        // Newsletter subscribers count
        $totalSubscribers = 0;
        try {
            $totalSubscribers = intval($db->query('SELECT COUNT(*) FROM subscribers')->fetchColumn());
        } catch (PDOException $e) {
            $totalSubscribers = 0;
        }

        jsonResponse(true, 'Stats loaded.', [
            'stats' => [
                'total_users' => intval($totalUsers),
                'total_reservations' => intval($totalReservations),
                'total_subscribers' => $totalSubscribers,
                'today_checkins' => intval($todayCheckins),
                'today_checkouts' => intval($todayCheckouts),
                'total_booked' => intval($totalBooked),
                'pending_count' => intval($pendingCount),
                'occupied_now' => $occupiedNow,
                'total_rooms_all' => $totalRoomsAll,
                'total_revenue' => floatval($totalRevenue),
                'monthly_revenue' => floatval($monthlyRevenue),
                'revenue_by_day' => $revenueByDay,
                'by_status' => $byStatus
            ]
        ]);
    }

    // All reservations (with user info)
    if ($action === 'reservations') {
        $status = $_GET['status'] ?? '';
        $sql = "
            SELECT r.*, u.full_name as user_name, u.email as user_email
            FROM reservations r
            JOIN users u ON r.user_id = u.id
        ";
        $params = [];
        if ($status && in_array($status, ['pending', 'approved', 'paid', 'cancelled'])) {
            $sql .= " WHERE r.status = ?";
            $params[] = $status;
        }
        $sql .= " ORDER BY r.created_at DESC";

        $stmt = $db->prepare($sql);
        $stmt->execute($params);
        $reservations = $stmt->fetchAll();

        jsonResponse(true, 'Reservations loaded.', ['reservations' => $reservations]);
    }

    // List all hotels (rooms table)
    if ($action === 'hotels') {
        $stmt = $db->query("SELECT id, name, location, price_per_night, rating, total_rooms FROM rooms ORDER BY name ASC");
        jsonResponse(true, 'Hotels loaded.', ['hotels' => $stmt->fetchAll()]);
    }

    // Per-hotel room status breakdown
    if ($action === 'hotel_stats') {
        $hotelId = intval($_GET['hotel_id'] ?? 0);
        if ($hotelId < 1) {
            jsonResponse(false, 'Invalid hotel ID.');
        }

        // Get hotel info
        $stmt = $db->prepare('SELECT id, name, location, total_rooms FROM rooms WHERE id = ?');
        $stmt->execute([$hotelId]);
        $hotel = $stmt->fetch();
        if (!$hotel) {
            jsonResponse(false, 'Hotel not found.');
        }

        $totalRooms = intval($hotel['total_rooms']);

        // Reservation breakdown by status for this hotel
        $stmt = $db->prepare("
            SELECT status, COUNT(*) as count
            FROM reservations
            WHERE room_id = ?
            GROUP BY status
        ");
        $stmt->execute([$hotelId]);
        $byStatus = $stmt->fetchAll();

        // Revenue for this hotel
        $stmt = $db->prepare("SELECT COALESCE(SUM(total_price), 0) FROM reservations WHERE room_id = ? AND status = 'paid'");
        $stmt->execute([$hotelId]);
        $hotelRevenue = floatval($stmt->fetchColumn());

        // Rooms occupied right now (consistent with availability/employee overview)
        $today = date('Y-m-d');
        $occupied = getBookedRooms($db, $hotelId, $today, date('Y-m-d', strtotime($today . ' +1 day')));

        jsonResponse(true, 'Hotel stats loaded.', [
            'hotel' => $hotel,
            'total_rooms' => $totalRooms,
            'occupied_now' => $occupied,
            'available_now' => max(0, $totalRooms - $occupied),
            'by_status' => $byStatus,
            'hotel_revenue' => $hotelRevenue
        ]);
    }

    // All users
    if ($action === 'users') {
        $stmt = $db->query("
            SELECT id, full_name, email, phone, location, 'user' as role, is_verified, created_at,
                   (SELECT COUNT(*) FROM reservations WHERE user_id = users.id) as reservation_count
            FROM users
            ORDER BY created_at DESC
        ");
        jsonResponse(true, 'Users loaded.', ['users' => $stmt->fetchAll()]);
    }

    // List all employees
    if ($action === 'employees') {
        try {
            $stmt = $db->query("
                SELECT e.id, e.full_name, e.email, e.role, e.hotel_id,
                       rm.name AS hotel_name, e.phone, e.is_active, e.created_at
                FROM employees e
                LEFT JOIN rooms rm ON rm.id = e.hotel_id
                ORDER BY e.created_at DESC
            ");
            jsonResponse(true, 'Employees loaded.', ['employees' => $stmt->fetchAll()]);
        } catch (PDOException $e) {
            jsonResponse(true, 'Employees loaded.', ['employees' => []]);
        }
    }

    // Support inquiries inbox
    if ($action === 'support') {
        $stmt = $db->query('SELECT id, first_name, last_name, country, phone, email, message, status, created_at FROM support_inquiries ORDER BY created_at DESC LIMIT 200');
        jsonResponse(true, 'Support inquiries loaded.', ['inquiries' => $stmt->fetchAll()]);
    }

}

// POST actions
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $input = json_decode(file_get_contents('php://input'), true);
    $action = $input['action'] ?? '';

    if ($action === 'update_status') {
        $reservationId = intval($input['reservation_id'] ?? 0);
        $newStatus = $input['status'] ?? '';
        $adminNote = trim($input['admin_note'] ?? '');

        if ($reservationId < 1) {
            jsonResponse(false, 'Invalid reservation ID.');
        }
        if (!in_array($newStatus, ['pending', 'approved', 'paid', 'cancelled'])) {
            jsonResponse(false, 'Invalid status.');
        }

        try {
            $db->beginTransaction();
            // Shared transition keeps loyalty points consistent (awards on paid,
            // revokes when a paid booking is cancelled or moved back).
            list($ok, $message) = setReservationStatus($db, $reservationId, $newStatus);
            if (!$ok) {
                $db->rollBack();
                jsonResponse(false, $message);
            }
            $db->commit();
        } catch (PDOException $e) {
            if ($db->inTransaction()) {
                $db->rollBack();
            }
            error_log('Admin status update failed: ' . $e->getMessage());
            jsonResponse(false, 'Could not update the reservation. Please try again.');
        }

        if ($adminNote !== '') {
            $stmt = $db->prepare('UPDATE reservations SET admin_note = ? WHERE id = ?');
            $stmt->execute([$adminNote, $reservationId]);
        }

        jsonResponse(true, $message);
    }

    // Create new employee
    if ($action === 'create_employee') {
        $name  = trim($input['full_name'] ?? '');
        $email = trim($input['email'] ?? '');
        $pass  = $input['password'] ?? '';
        $role  = $input['role'] ?? '';
        $hotelId = intval($input['hotel_id'] ?? 0);
        $phone = trim($input['phone'] ?? '');

        if (empty($name) || empty($email) || empty($pass) || empty($role) || $hotelId < 1) {
            jsonResponse(false, 'Name, email, password, role, and hotel are required.');
        }
        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            jsonResponse(false, 'Invalid email address.');
        }
        if (!in_array($role, ['manager', 'waiter'])) {
            jsonResponse(false, 'Role must be manager or waiter.');
        }
        $stmt = $db->prepare('SELECT id, name FROM rooms WHERE id = ?');
        $stmt->execute([$hotelId]);
        $hotel = $stmt->fetch();
        if (!$hotel) {
            jsonResponse(false, 'Selected hotel does not exist.');
        }
        if (strlen($pass) < 8) {
            jsonResponse(false, 'Password must be at least 8 characters.');
        }

        // Check duplicate
        $stmt = $db->prepare('SELECT id FROM employees WHERE email = ?');
        $stmt->execute([$email]);
        if ($stmt->fetch()) {
            jsonResponse(false, 'An employee with this email already exists.');
        }

        $hash = password_hash($pass, PASSWORD_DEFAULT);
        $stmt = $db->prepare('INSERT INTO employees (full_name, email, password_hash, role, hotel_id, phone, created_by) VALUES (?, ?, ?, ?, ?, ?, ?)');
        $stmt->execute([$name, $email, $hash, $role, $hotelId, $phone ?: null, $_SESSION['user_id']]);
        $newId = $db->lastInsertId();

        jsonResponse(true, 'Employee created successfully.', [
            'employee' => [
                'id' => $newId,
                'full_name' => $name,
                'email' => $email,
                'role' => $role,
                'hotel_id' => intval($hotel['id']),
                'hotel_name' => $hotel['name']
            ]
        ]);
    }

    // Toggle employee active/inactive
    if ($action === 'toggle_employee') {
        $empId = intval($input['employee_id'] ?? 0);
        if ($empId < 1) jsonResponse(false, 'Invalid employee ID.');

        $stmt = $db->prepare('UPDATE employees SET is_active = 1 - is_active WHERE id = ?');
        $stmt->execute([$empId]);

        $stmt = $db->prepare('SELECT is_active FROM employees WHERE id = ?');
        $stmt->execute([$empId]);
        $row = $stmt->fetch();

        jsonResponse(true, $row['is_active'] ? 'Employee activated.' : 'Employee deactivated.', [
            'is_active' => intval($row['is_active'])
        ]);
    }

    // Delete employee
    if ($action === 'delete_employee') {
        $empId = intval($input['employee_id'] ?? 0);
        if ($empId < 1) jsonResponse(false, 'Invalid employee ID.');

        $stmt = $db->prepare('DELETE FROM employees WHERE id = ?');
        $stmt->execute([$empId]);
        jsonResponse(true, 'Employee removed.');
    }

    // Update support inquiry status
    if ($action === 'update_support_status') {
        $inquiryId = intval($input['inquiry_id'] ?? 0);
        $newStatus = $input['status'] ?? '';

        if ($inquiryId < 1) {
            jsonResponse(false, 'Invalid inquiry ID.');
        }
        if (!in_array($newStatus, ['new', 'read', 'replied', 'closed'])) {
            jsonResponse(false, 'Invalid status.');
        }

        $stmt = $db->prepare('UPDATE support_inquiries SET status = ? WHERE id = ?');
        $stmt->execute([$newStatus, $inquiryId]);
        if ($stmt->rowCount() === 0) {
            jsonResponse(false, 'Inquiry not found.');
        }
        jsonResponse(true, 'Inquiry marked as ' . $newStatus . '.');
    }

    // Hotel management: create or update
    if ($action === 'save_hotel') {
        $hotelId = intval($input['id'] ?? 0);
        $name = trim($input['name'] ?? '');
        $location = trim($input['location'] ?? '');
        $price = floatval($input['price_per_night'] ?? 0);
        $totalRooms = intval($input['total_rooms'] ?? 24);
        $rating = floatval($input['rating'] ?? 4.5);
        $image = trim($input['image'] ?? '');
        $description = trim($input['description'] ?? '');

        if ($name === '' || $location === '') {
            jsonResponse(false, 'Hotel name and location are required.');
        }
        if (mb_strlen($name) > 150 || mb_strlen($location) > 255) {
            jsonResponse(false, 'Name or location is too long.');
        }
        if ($price <= 0 || $price > 100000) {
            jsonResponse(false, 'Price per night must be greater than 0.');
        }
        if ($totalRooms < 1 || $totalRooms > 500) {
            jsonResponse(false, 'Total rooms must be between 1 and 500.');
        }
        if ($rating < 0 || $rating > 5) {
            jsonResponse(false, 'Rating must be between 0 and 5.');
        }

        if ($hotelId > 0) {
            $stmt = $db->prepare('SELECT id FROM rooms WHERE id = ?');
            $stmt->execute([$hotelId]);
            if (!$stmt->fetch()) {
                jsonResponse(false, 'Hotel not found.');
            }
            $stmt = $db->prepare('UPDATE rooms SET name = ?, location = ?, price_per_night = ?, total_rooms = ?, rating = ?, image = ?, description = ? WHERE id = ?');
            $stmt->execute([$name, $location, $price, $totalRooms, $rating, $image ?: null, $description ?: null, $hotelId]);
            jsonResponse(true, 'Hotel updated successfully.', ['id' => $hotelId]);
        }

        $stmt = $db->prepare('INSERT INTO rooms (name, location, price_per_night, rating, reviews_count, image, description, total_rooms) VALUES (?, ?, ?, ?, 0, ?, ?, ?)');
        $stmt->execute([$name, $location, $price, $rating, $image ?: null, $description ?: null, $totalRooms]);
        jsonResponse(true, 'Hotel added successfully.', ['id' => intval($db->lastInsertId())]);
    }

    // Hotel management: delete (blocked while bookings exist to protect history)
    if ($action === 'delete_hotel') {
        $hotelId = intval($input['id'] ?? 0);
        if ($hotelId < 1) {
            jsonResponse(false, 'Invalid hotel ID.');
        }

        $stmt = $db->prepare('SELECT COUNT(*) FROM reservations WHERE room_id = ?');
        $stmt->execute([$hotelId]);
        if (intval($stmt->fetchColumn()) > 0) {
            jsonResponse(false, 'This hotel has bookings in its history and cannot be deleted.');
        }

        $stmt = $db->prepare('DELETE FROM rooms WHERE id = ?');
        $stmt->execute([$hotelId]);
        if ($stmt->rowCount() === 0) {
            jsonResponse(false, 'Hotel not found.');
        }
        jsonResponse(true, 'Hotel deleted successfully.');
    }
}

http_response_code(400);
jsonResponse(false, 'Invalid action.');
