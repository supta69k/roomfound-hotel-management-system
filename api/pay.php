<?php
// Payment endpoint.
// demo gateway  -> marks the reservation paid instantly (offline demos).
// stripe gateway-> creates a Stripe Checkout Session and returns its URL;
//                  the reservation flips to paid in payment_confirm.php after
//                  the guest returns and the session is verified server-side.
require_once 'config.php';
require_once __DIR__ . '/stripe.php';

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
    $stmt = $db->prepare('SELECT id, user_id, total_price, status, hotel_name FROM reservations WHERE id = ? AND user_id = ? FOR UPDATE');
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

    if (paymentGateway() === 'stripe') {
        // Release the row lock before network I/O - holding it across an HTTP
        // call to Stripe would stall admin actions on the same reservation.
        $db->commit();

        try {
            $session = stripeRequest('POST', 'checkout/sessions', [
                'mode' => 'payment',
                'success_url' => paymentPageUrl('profile.html') . '?payment=success&session_id={CHECKOUT_SESSION_ID}',
                'cancel_url' => paymentPageUrl('profile.html') . '?payment=cancelled',
                'client_reference_id' => $reservationId,
                'metadata[reservation_id]' => $reservationId,
                'metadata[user_id]' => $_SESSION['user_id'],
                'line_items[0][quantity]' => 1,
                'line_items[0][price_data][currency]' => STRIPE_CURRENCY,
                'line_items[0][price_data][unit_amount]' => (int) round(((float) $reservation['total_price']) * 100),
                'line_items[0][price_data][product_data][name]' => $reservation['hotel_name'],
                'line_items[0][price_data][product_data][description]' => 'Reservation #' . $reservationId . ' - RoomFound',
            ]);
        } catch (Exception $e) {
            jsonResponse(false, 'Could not start the payment: ' . $e->getMessage());
        }

        jsonResponse(true, 'Redirecting to the secure payment page.', [
            'checkout_url' => $session['url'],
        ]);
    }

    // Demo gateway: award loyalty points and flip the status through the shared
    // transition handler so points stay consistent with admin status changes.
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
