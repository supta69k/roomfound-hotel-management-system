<?php
require_once 'config.php';

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    jsonResponse(false, 'Method not allowed');
}

if (!isset($_SESSION['user_id'])) {
    http_response_code(401);
    jsonResponse(false, 'Not authenticated');
}
requireUserRole();

$data = json_decode(file_get_contents('php://input'), true);
$reservationId = isset($data['reservation_id']) ? intval($data['reservation_id']) : 0;

if ($reservationId <= 0) {
    jsonResponse(false, 'Invalid reservation ID');
}

try {
    $db = getDB();
    $db->beginTransaction();

    // Verify reservation belongs to user and is approved
    $stmt = $db->prepare('SELECT id, user_id, total_price, status FROM reservations WHERE id = ? AND user_id = ? FOR UPDATE');
    $stmt->execute([$reservationId, $_SESSION['user_id']]);
    $reservation = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$reservation) {
        $db->rollBack();
        jsonResponse(false, 'Reservation not found');
    }

    if ($reservation['status'] !== 'approved') {
        $db->rollBack();
        jsonResponse(false, 'This reservation is not ready for payment. Current status: ' . $reservation['status']);
    }

    // Award loyalty points and flip the status through the shared transition
    // handler so points stay consistent with admin status changes.
    list($ok, $message) = setReservationStatus($db, $reservationId, 'paid');
    if (!$ok) {
        $db->rollBack();
        jsonResponse(false, $message);
    }

    $stmt = $db->prepare('SELECT loyalty_points_awarded FROM reservations WHERE id = ?');
    $stmt->execute([$reservationId]);
    $pointsAwarded = (int) $stmt->fetchColumn();

    $db->commit();

    jsonResponse(true, 'Payment successful. Your room is booked!', [
        'loyalty_points_awarded' => $pointsAwarded
    ]);

} catch (PDOException $e) {
    if (isset($db) && $db->inTransaction()) {
        $db->rollBack();
    }
    jsonResponse(false, 'Database error');
}
