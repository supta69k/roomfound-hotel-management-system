<?php
// Public rooms API - feeds the dynamic hotel cards on the homepage and the
// rooms listing grid. No auth: hotel data is public marketing content.
require_once __DIR__ . '/config.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    jsonResponse(false, 'Method not allowed.');
}

// Single room by ID: ?id=N (used by the hotel detail page)
if (isset($_GET['id'])) {
    $id = filter_input(INPUT_GET, 'id', FILTER_VALIDATE_INT);
    if (!$id || $id < 1) {
        jsonResponse(false, 'Invalid room ID.');
    }
    $db = getDB();
    $stmt = $db->prepare('SELECT id, name, location, price_per_night, rating, reviews_count, description, image, total_rooms FROM rooms WHERE id = ?');
    $stmt->execute([$id]);
    $room = $stmt->fetch();
    if (!$room) {
        http_response_code(404);
        jsonResponse(false, 'Room not found.');
    }
    $room['id'] = intval($room['id']);
    $room['price_per_night'] = floatval($room['price_per_night']);
    $room['rating'] = floatval($room['rating']);
    $room['reviews_count'] = intval($room['reviews_count']);
    $room['total_rooms'] = intval($room['total_rooms']);
    $room['image'] = $room['image'] !== null && $room['image'] !== ''
        ? './' . ltrim($room['image'], '/')
        : './img/rooms/hotel-interior1.jpg';
    jsonResponse(true, 'Room found.', ['room' => $room]);
}

// Optional filters: ?location=Cox's Bazar&limit=3
$location = trim($_GET['location'] ?? '');
// No limit param = return all rooms (rooms grid); explicit limit is clamped to sane bounds.
$limit = isset($_GET['limit']) ? max(1, min(24, intval($_GET['limit']))) : 0;

$sql = 'SELECT id, name, location, price_per_night, rating, reviews_count, image, total_rooms
        FROM rooms';
$params = [];
if ($location !== '') {
    $sql .= ' WHERE location LIKE :location';
    $params[':location'] = '%' . $location . '%';
}
// Top rated first, then newest, so the homepage "Our top rated Hotels" picks well.
$sql .= ' ORDER BY rating DESC, reviews_count DESC, id ASC';
if ($limit > 0) {
    $sql .= ' LIMIT ' . $limit;
}

$db = getDB();
$stmt = $db->prepare($sql);
$stmt->execute($params);
$rooms = $stmt->fetchAll();

// Full image URL path relative to /src where the pages live.
foreach ($rooms as &$room) {
    $room['id'] = intval($room['id']);
    $room['price_per_night'] = floatval($room['price_per_night']);
    $room['rating'] = floatval($room['rating']);
    $room['reviews_count'] = intval($room['reviews_count']);
    $room['total_rooms'] = intval($room['total_rooms']);
    $room['image'] = $room['image'] !== null && $room['image'] !== ''
        ? './' . ltrim($room['image'], '/')
        : './img/rooms/hotel-interior1.jpg';
}
unset($room);

jsonResponse(true, count($rooms) . ' hotels found.', ['rooms' => $rooms]);
