<?php
// Database configuration
define('DB_HOST', 'localhost');
define('DB_NAME', 'hotel_management');
define('DB_USER', 'root');
define('DB_PASS', '');

// SMTP / Email config
define('SMTP_FROM_EMAIL', 'noreply@hotelmanagement.com');
define('SMTP_FROM_NAME', 'Hotel Management');

// App config
define('VERIFICATION_CODE_EXPIRY_MINUTES', 10);

// Enterprise Security Headers
header('Content-Type: application/json');
header('X-Content-Type-Options: nosniff');
header('X-Frame-Options: SAMEORIGIN');
header('Referrer-Policy: strict-origin-when-cross-origin');
header('Permissions-Policy: geolocation=(), camera=(), microphone=()');

// Secure session cookie settings (must be set before session_start)
if (session_status() === PHP_SESSION_NONE) {
    session_set_cookie_params([
        'lifetime' => 0,
        'path' => '/',
        'httponly' => true,
        'samesite' => 'Lax',
    ]);
    session_start();
}

// Generate & distribute CSRF token for this session
if (empty($_SESSION['csrf_token'])) {
    $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
}

// Refresh client-side accessible CSRF cookie on each request (Double Submit Cookie Defense)
if (!headers_sent()) {
    setcookie('rf_csrf_token', $_SESSION['csrf_token'], [
        'expires' => 0,
        'path' => '/',
        'samesite' => 'Lax',
        'httponly' => false,
    ]);
}

// Database connection
function getDB() {
    static $pdo = null;
    if ($pdo === null) {
        try {
            $dsn = 'mysql:host=' . DB_HOST . ';dbname=' . DB_NAME . ';charset=utf8mb4';
            $pdo = new PDO($dsn, DB_USER, DB_PASS, [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES => false,
            ]);
        } catch (PDOException $e) {
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => 'Database connection failed.']);
            exit;
        }
    }
    return $pdo;
}

// Generate a 6-digit verification code
function generateVerificationCode() {
    return str_pad(random_int(100000, 999999), 6, '0', STR_PAD_LEFT);
}

// Send JSON response
function jsonResponse($success, $message, $data = []) {
    echo json_encode(array_merge(['success' => $success, 'message' => $message], $data));
    exit;
}

// Guard endpoints that operate on the `users` table. Admins and employees live
// in their own tables with separate id sequences, so their session ids must
// never be used against users.id (would read/mutate an unrelated account).
function requireUserRole() {
    if (($_SESSION['user_role'] ?? '') !== 'user') {
        http_response_code(403);
        jsonResponse(false, 'This area is for guest accounts only.');
    }
}

// Verify CSRF token from header or body
function verifyCSRFToken() {
    $token = $_SERVER['HTTP_X_CSRF_TOKEN'] ?? null;
    if (!$token && isset($_POST['csrf_token'])) {
        $token = $_POST['csrf_token'];
    }
    if (!$token) {
        $raw = file_get_contents('php://input');
        if (!empty($raw)) {
            $parsed = json_decode($raw, true);
            if (is_array($parsed) && !empty($parsed['csrf_token'])) {
                $token = $parsed['csrf_token'];
            }
        }
    }
    $sessionToken = $_SESSION['csrf_token'] ?? '';
    if (empty($token) || empty($sessionToken)) {
        return false;
    }
    return hash_equals($sessionToken, (string) $token);
}

// Enforce CSRF check on state-changing requests
function requireCSRF() {
    $method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
    if ($method === 'GET' || $method === 'HEAD' || $method === 'OPTIONS') {
        return;
    }
    if (!verifyCSRFToken()) {
        http_response_code(403);
        jsonResponse(false, 'Security verification failed: invalid or missing CSRF token. Please refresh the page and try again.');
    }
}

// Count rooms already booked for a hotel that overlap a given date range.
// A stay occupies the room from check-in (inclusive) to check-out (exclusive),
// so same-day turnover between two guests is allowed.
function getBookedRooms(PDO $db, $roomId, $checkIn, $checkOut) {
    $stmt = $db->prepare('
        SELECT COALESCE(SUM(rooms_count), 0) AS booked
        FROM reservations
        WHERE room_id = ?
          AND status IN ("pending", "approved", "paid")
          AND check_in < ?
          AND check_out > ?
    ');
    $stmt->execute([$roomId, $checkOut, $checkIn]);
    return intval($stmt->fetchColumn());
}

// Central reservation status transition handler. Keeps loyalty points in sync
// no matter which endpoint (pay.php or admin update_status) changes the state.
// Becoming "paid" awards points (0.5 per $1); leaving "paid" revokes them.
function setReservationStatus(PDO $db, $reservationId, $newStatus) {
    $stmt = $db->prepare('SELECT id, user_id, total_price, status, loyalty_points_awarded FROM reservations WHERE id = ? FOR UPDATE');
    $stmt->execute([$reservationId]);
    $reservation = $stmt->fetch();
    if (!$reservation) {
        return [false, 'Reservation not found.'];
    }

    $current = $reservation['status'];
    if ($current === $newStatus) {
        return [true, 'Status unchanged.'];
    }

    $awarded = (int) $reservation['loyalty_points_awarded'];
    $points = (int) floor(((float) $reservation['total_price']) * 0.5);

    // Leaving paid: revoke the points that were awarded for this booking.
    if ($current === 'paid' && $awarded > 0) {
        $stmt = $db->prepare('UPDATE users SET loyalty_points_earned = GREATEST(0, loyalty_points_earned - ?), loyalty_points_balance = GREATEST(0, loyalty_points_balance - ?) WHERE id = ?');
        $stmt->execute([$awarded, $awarded, $reservation['user_id']]);
        $stmt = $db->prepare('UPDATE reservations SET loyalty_points_awarded = 0 WHERE id = ?');
        $stmt->execute([$reservationId]);
    }

    // Becoming paid: award points once.
    if ($newStatus === 'paid') {
        $stmt = $db->prepare('UPDATE users SET loyalty_points_earned = loyalty_points_earned + ?, loyalty_points_balance = loyalty_points_balance + ? WHERE id = ?');
        $stmt->execute([$points, $points, $reservation['user_id']]);
        $stmt = $db->prepare('UPDATE reservations SET loyalty_points_awarded = ? WHERE id = ?');
        $stmt->execute([$points, $reservationId]);
    }

    $stmt = $db->prepare('UPDATE reservations SET status = ?, updated_at = NOW() WHERE id = ?');
    $stmt->execute([$newStatus, $reservationId]);

    // Becoming paid: email the guest their booking confirmation.
    // Mail is best-effort - a SMTP failure must never block the payment flow.
    if ($newStatus === 'paid') {
        try {
            require_once __DIR__ . '/send_mail.php';
            $info = $db->prepare('
                SELECT hotel_name, check_in, check_out, nights, rooms_count, guests, total_price,
                       (SELECT email FROM users WHERE id = r.user_id) AS user_email,
                       (SELECT full_name FROM users WHERE id = r.user_id) AS user_name
                FROM reservations r WHERE r.id = ?
            ');
            $info->execute([$reservationId]);
            $booking = $info->fetch();
            if ($booking && $booking['user_email']) {
                sendBookingConfirmationEmail($booking['user_email'], $booking['user_name'], [
                    'hotel_name'  => $booking['hotel_name'],
                    'check_in'    => $booking['check_in'],
                    'check_out'   => $booking['check_out'],
                    'nights'      => $booking['nights'],
                    'rooms_count' => $booking['rooms_count'],
                    'guests'      => $booking['guests'],
                    'total_price' => $booking['total_price'],
                ]);
            }
        } catch (\Throwable $e) {
            // Ignore: confirmation email is a side effect, not part of the transaction.
        }
    }

    return [true, 'Status updated to ' . $newStatus . '.'];
}
