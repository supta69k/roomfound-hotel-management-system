<?php
// Hotel reviews: public read, guest-only write (one review per user per hotel).
require_once __DIR__ . '/config.php';

$db = getDB();

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $roomId = intval($_GET['room_id'] ?? 0);
    if ($roomId < 1) {
        jsonResponse(false, 'Missing room_id.');
    }

    $stmt = $db->prepare('SELECT id, name, rating, reviews_count FROM rooms WHERE id = ?');
    $stmt->execute([$roomId]);
    $room = $stmt->fetch();
    if (!$room) {
        jsonResponse(false, 'Hotel not found.');
    }

    $stmt = $db->prepare('
        SELECT r.id, r.rating, r.description, r.created_at, u.full_name AS author
        FROM reviews r
        JOIN users u ON u.id = r.user_id
        WHERE r.room_id = ?
        ORDER BY r.created_at DESC
        LIMIT 50
    ');
    $stmt->execute([$roomId]);
    $reviews = $stmt->fetchAll();

    $count = count($reviews);
    // Real reviews take over from the seed rating as soon as they exist.
    if ($count > 0) {
        $sum = 0;
        foreach ($reviews as $r) {
            $sum += (int) $r['rating'];
        }
        $avg = round($sum / $count, 1);
    } else {
        $avg = floatval($room['rating']);
        $count = intval($room['reviews_count']);
    }

    jsonResponse(true, 'Reviews loaded.', [
        'avg_rating' => $avg,
        'reviews_count' => $count,
        'has_user_reviews' => count($reviews) > 0,
        'reviews' => $reviews
    ]);
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    if (!isset($_SESSION['user_id'])) {
        http_response_code(401);
        jsonResponse(false, 'Please log in to add a review.');
    }
    requireUserRole();

    $input = json_decode(file_get_contents('php://input'), true);
    $roomId = intval($input['room_id'] ?? 0);
    $rating = intval($input['rating'] ?? 0);
    $description = trim($input['description'] ?? '');

    if ($roomId < 1) {
        jsonResponse(false, 'Missing room_id.');
    }
    if ($rating < 1 || $rating > 5) {
        jsonResponse(false, 'Rating must be between 1 and 5 stars.');
    }
    if (mb_strlen($description) < 8) {
        jsonResponse(false, 'Please write at least 8 characters.');
    }
    if (mb_strlen($description) > 1000) {
        jsonResponse(false, 'Review is too long (max 1000 characters).');
    }

    $stmt = $db->prepare('SELECT id FROM rooms WHERE id = ?');
    $stmt->execute([$roomId]);
    if (!$stmt->fetch()) {
        jsonResponse(false, 'Hotel not found.');
    }

    // One review per user per hotel — resubmitting updates their review.
    $stmt = $db->prepare('
        INSERT INTO reviews (user_id, room_id, rating, description)
        VALUES (?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE rating = VALUES(rating), description = VALUES(description)
    ');
    $stmt->execute([$_SESSION['user_id'], $roomId, $rating, $description]);

    jsonResponse(true, 'Thanks for sharing your experience!');
}

http_response_code(405);
jsonResponse(false, 'Method not allowed.');
