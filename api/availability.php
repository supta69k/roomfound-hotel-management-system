<?php
// Room availability API - returns booked/available count for a hotel over a date range
require_once __DIR__ . '/config.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    jsonResponse(false, 'Method not allowed.');
}

$roomId = intval($_GET['room_id'] ?? 0);
$checkIn = trim($_GET['check_in'] ?? '');
$checkOut = trim($_GET['check_out'] ?? '');

if ($roomId < 1) {
    jsonResponse(false, 'Missing room_id.');
}

// Validate dates if provided, otherwise use today
if (empty($checkIn) || !preg_match('/^\d{4}-\d{2}-\d{2}$/', $checkIn)) {
    $checkIn = date('Y-m-d');
}
if (empty($checkOut) || !preg_match('/^\d{4}-\d{2}-\d{2}$/', $checkOut)) {
    $checkOut = date('Y-m-d', strtotime($checkIn . ' +1 day'));
}
if (strtotime($checkOut) <= strtotime($checkIn)) {
    jsonResponse(false, 'Check-out must be after check-in.');
}

$db = getDB();

// Get total rooms for this hotel
$stmt = $db->prepare('SELECT total_rooms FROM rooms WHERE id = ?');
$stmt->execute([$roomId]);
$room = $stmt->fetch();

if (!$room) {
    jsonResponse(false, 'Hotel not found.');
}

$totalRooms = intval($room['total_rooms']);

// Only count stays that actually overlap the requested dates — a booking from
// last month must not reduce availability for next weekend.
$booked = getBookedRooms($db, $roomId, $checkIn, $checkOut);
$available = max(0, $totalRooms - $booked);

jsonResponse(true, 'Availability loaded.', [
    'total_rooms' => $totalRooms,
    'booked' => $booked,
    'available' => $available
]);
