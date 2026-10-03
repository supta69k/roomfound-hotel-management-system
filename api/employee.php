<?php
// Employee API — Manager & Waiter data endpoints
require_once __DIR__ . '/config.php';

if (!isset($_SESSION['user_id'])) {
    http_response_code(401);
    jsonResponse(false, 'Not authenticated.');
}

$role = $_SESSION['user_role'] ?? '';
if (!in_array($role, ['manager', 'waiter'])) {
    http_response_code(403);
    jsonResponse(false, 'Access denied. Employee only.');
}

$db = getDB();
$action = $_GET['action'] ?? '';
$employeeId = intval($_SESSION['user_id'] ?? 0);

$stmt = $db->prepare('SELECT id, hotel_id FROM employees WHERE id = ? LIMIT 1');
$stmt->execute([$employeeId]);
$employee = $stmt->fetch();
$assignedHotelId = intval($employee['hotel_id'] ?? 0);

if ($assignedHotelId < 1) {
    http_response_code(403);
    jsonResponse(false, 'Your account is not assigned to a hotel. Please contact admin.');
}

// ─── GET ───────────────────────────────────────────────────
if ($_SERVER['REQUEST_METHOD'] === 'GET') {

    // ── WAITER: all bookings ──────────────────────────────
    if ($action === 'bookings') {
        if ($role !== 'waiter') {
            http_response_code(403);
            jsonResponse(false, 'Waiters only.');
        }

        $status = $_GET['status'] ?? '';
        $search = trim($_GET['search'] ?? '');

        $sql = "
            SELECT r.id, r.hotel_name, r.check_in, r.check_out, r.nights,
                   r.guests, r.rooms_count, r.services, r.total_price,
                   r.status, r.created_at,
                   u.full_name AS guest_name, u.email AS guest_email
            FROM reservations r
            JOIN users u ON r.user_id = u.id
        ";
        $where = ['r.room_id = ?'];
        $params = [$assignedHotelId];

        if ($status && in_array($status, ['pending', 'approved', 'paid', 'cancelled'])) {
            $where[] = 'r.status = ?';
            $params[] = $status;
        }
        if ($search !== '') {
            $where[] = '(u.full_name LIKE ? OR r.hotel_name LIKE ? OR u.email LIKE ?)';
            $like = '%' . $search . '%';
            $params[] = $like;
            $params[] = $like;
            $params[] = $like;
        }
        if ($where) {
            $sql .= ' WHERE ' . implode(' AND ', $where);
        }
        $sql .= ' ORDER BY r.created_at DESC';

        $stmt = $db->prepare($sql);
        $stmt->execute($params);
        $bookings = $stmt->fetchAll();

        // Summary counts
        $stmt = $db->prepare("SELECT status, COUNT(*) as cnt FROM reservations WHERE room_id = ? GROUP BY status");
        $stmt->execute([$assignedHotelId]);
        $counts = $stmt->fetchAll();
        $summary = ['all' => 0, 'pending' => 0, 'approved' => 0, 'paid' => 0, 'cancelled' => 0];
        foreach ($counts as $c) {
            $summary[$c['status']] = intval($c['cnt']);
            $summary['all'] += intval($c['cnt']);
        }

        jsonResponse(true, 'Bookings loaded.', [
            'bookings' => $bookings,
            'summary' => $summary
        ]);
    }

    // ── MANAGER: hotel overview stats ────────────────────
    if ($action === 'overview') {
        if ($role !== 'manager') {
            http_response_code(403);
            jsonResponse(false, 'Managers only.');
        }

        $today = date('Y-m-d');

        // Today's check-ins
        $stmt = $db->prepare("SELECT COUNT(*) FROM reservations WHERE room_id = ? AND check_in = ? AND status IN ('paid','approved')");
        $stmt->execute([$assignedHotelId, $today]);
        $todayCheckins = intval($stmt->fetchColumn());

        // Today's check-outs
        $stmt = $db->prepare("SELECT COUNT(*) FROM reservations WHERE room_id = ? AND check_out = ? AND status = 'paid'");
        $stmt->execute([$assignedHotelId, $today]);
        $todayCheckouts = intval($stmt->fetchColumn());

        // Currently occupied (active stays: check_in <= today < check_out, paid/approved)
        $stmt = $db->prepare("SELECT COUNT(*) FROM reservations WHERE room_id = ? AND check_in <= ? AND check_out > ? AND status IN ('paid','approved')");
        $stmt->execute([$assignedHotelId, $today, $today]);
        $currentlyOccupied = intval($stmt->fetchColumn());

        // Pending reservations
        $stmt = $db->prepare("SELECT COUNT(*) FROM reservations WHERE room_id = ? AND status = 'pending'");
        $stmt->execute([$assignedHotelId]);
        $pendingCount = intval($stmt->fetchColumn());

        // Total rooms in assigned hotel
        $stmt = $db->prepare("SELECT total_rooms FROM rooms WHERE id = ? LIMIT 1");
        $stmt->execute([$assignedHotelId]);
        $totalRooms = intval($stmt->fetchColumn());

        // Assigned hotel only
        $stmt = $db->prepare("SELECT id, name, location, total_rooms, rating, reviews_count FROM rooms WHERE id = ? LIMIT 1");
        $stmt->execute([$assignedHotelId]);
        $hotels = $stmt->fetchAll();

        // Per-hotel occupancy (currently occupied rooms)
        $hotelStats = [];
        foreach ($hotels as $hotel) {
            $stmt = $db->prepare("
                SELECT COUNT(*) FROM reservations
                WHERE room_id = ? AND check_in <= ? AND check_out > ? AND status IN ('paid','approved')
            ");
            $stmt->execute([$hotel['id'], $today, $today]);
            $occupied = intval($stmt->fetchColumn());

            $stmt2 = $db->prepare("SELECT COUNT(*) FROM reservations WHERE room_id = ? AND status = 'pending'");
            $stmt2->execute([$hotel['id']]);
            $pending = intval($stmt2->fetchColumn());

            $hotelStats[] = [
                'id' => $hotel['id'],
                'name' => $hotel['name'],
                'location' => $hotel['location'],
                'total_rooms' => intval($hotel['total_rooms']),
                'rating' => floatval($hotel['rating']),
                'reviews_count' => intval($hotel['reviews_count']),
                'occupied' => $occupied,
                'pending' => $pending,
                'available' => max(0, intval($hotel['total_rooms']) - $occupied - $pending),
            ];
        }

        // Recent check-ins (last 10)
        $stmt = $db->prepare("
            SELECT r.id, r.hotel_name, r.check_in, r.check_out, r.guests,
                   r.rooms_count, r.status, u.full_name AS guest_name
            FROM reservations r
            JOIN users u ON r.user_id = u.id
            WHERE r.room_id = ? AND r.status IN ('paid','approved')
            ORDER BY r.check_in DESC
            LIMIT 10
        ");
        $stmt->execute([$assignedHotelId]);
        $recentCheckins = $stmt->fetchAll();

        jsonResponse(true, 'Overview loaded.', [
            'overview' => [
                'today_checkins'    => $todayCheckins,
                'today_checkouts'   => $todayCheckouts,
                'currently_occupied'=> $currentlyOccupied,
                'pending_count'     => $pendingCount,
                'total_rooms'       => $totalRooms,
            ],
            'hotels'         => $hotelStats,
            'recent_checkins'=> $recentCheckins
        ]);
    }

    // ── MANAGER: single hotel room breakdown ─────────────
    if ($action === 'hotel_rooms') {
        if ($role !== 'manager') {
            http_response_code(403);
            jsonResponse(false, 'Managers only.');
        }

        $hotelId = intval($_GET['hotel_id'] ?? 0);
        if ($hotelId < 1 || $hotelId !== $assignedHotelId) {
            jsonResponse(false, 'Invalid hotel ID.');
        }

        $today = date('Y-m-d');

        $stmt = $db->prepare('SELECT id, name, total_rooms FROM rooms WHERE id = ?');
        $stmt->execute([$hotelId]);
        $hotel = $stmt->fetch();
        if (!$hotel) jsonResponse(false, 'Hotel not found.');

        // Reservations for this hotel with guest info (no financial data)
        $stmt = $db->prepare("
            SELECT r.id, r.check_in, r.check_out, r.nights, r.guests,
                   r.rooms_count, r.status,
                   u.full_name AS guest_name
            FROM reservations r
            JOIN users u ON r.user_id = u.id
            WHERE r.room_id = ?
            ORDER BY r.check_in DESC
            LIMIT 50
        ");
        $stmt->execute([$hotelId]);
        $reservations = $stmt->fetchAll();

        jsonResponse(true, 'Hotel rooms loaded.', [
            'hotel'        => $hotel,
            'reservations' => $reservations
        ]);
    }
}

http_response_code(400);
jsonResponse(false, 'Invalid action.');
