<?php
// Stripe return handler.
// After Stripe redirects back to profile.html?payment=success&session_id=cs_...,
// the frontend posts the session id here. The server re-retrieves the session
// with the secret key (never trusting the browser), checks it really is paid,
// and only then flips the reservation to paid through the shared transition.
require_once 'config.php';
require_once __DIR__ . '/stripe.php';

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
$sessionId = trim($data['session_id'] ?? '');

// Demo gateway has no hosted sessions to verify - fail cleanly instead of
// calling Stripe with an empty key.
if (paymentGateway() !== 'stripe') {
    jsonResponse(false, 'Hosted payment is not enabled on this server.');
}

if (!preg_match('/^cs_[A-Za-z0-9_-]{10,200}$/', $sessionId)) {
    jsonResponse(false, 'Invalid payment session.');
}

try {
    $session = stripeRequest('GET', 'checkout/sessions/' . urlencode($sessionId));
} catch (Exception $e) {
    jsonResponse(false, 'Could not verify the payment: ' . $e->getMessage());
}

if (($session['payment_status'] ?? '') !== 'paid') {
    jsonResponse(false, 'The payment has not completed yet. Status: ' . ($session['payment_status'] ?? 'unknown'));
}

$meta = $session['metadata'] ?? [];
$reservationId = intval($meta['reservation_id'] ?? 0);
$sessionUserId = intval($meta['user_id'] ?? 0);

if ($reservationId <= 0 || $sessionUserId !== intval($_SESSION['user_id'])) {
    http_response_code(403);
    jsonResponse(false, 'This payment does not belong to your account.');
}

try {
    $db = getDB();
    $db->beginTransaction();

    $stmt = $db->prepare('SELECT id, user_id, status FROM reservations WHERE id = ? AND user_id = ? FOR UPDATE');
    $stmt->execute([$reservationId, $_SESSION['user_id']]);
    $reservation = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$reservation) {
        $db->rollBack();
        jsonResponse(false, 'Reservation not found');
    }

    // Idempotent: coming back to the success URL twice must not double-award.
    if ($reservation['status'] === 'paid') {
        $db->rollBack();
        jsonResponse(true, 'Payment already confirmed. Your room is booked!', [
            'loyalty_points_awarded' => null
        ]);
    }

    if ($reservation['status'] !== 'approved') {
        $db->rollBack();
        jsonResponse(false, 'This reservation is not awaiting payment. Current status: ' . $reservation['status']);
    }

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
