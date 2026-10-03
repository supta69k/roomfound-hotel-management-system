<?php
require_once __DIR__ . '/config.php';
require_once __DIR__ . '/send_mail.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    jsonResponse(false, 'Method not allowed.');
}

$input = json_decode(file_get_contents('php://input'), true);

$fullName = trim($input['full_name'] ?? '');
$email = trim($input['email'] ?? '');
$password = $input['password'] ?? '';
$confirmPassword = $input['confirm_password'] ?? '';

// Validation
if (empty($fullName) || empty($email) || empty($password) || empty($confirmPassword)) {
    jsonResponse(false, 'All fields are required.');
}

if (mb_strlen($fullName) > 100) {
    jsonResponse(false, 'Name is too long.');
}

if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    jsonResponse(false, 'Please enter a valid email address.');
}

if (mb_strlen($password) < 8) {
    jsonResponse(false, 'Password must be at least 8 characters.');
}

if ($password !== $confirmPassword) {
    jsonResponse(false, 'Passwords do not match.');
}

$db = getDB();

// Check if email already exists
$stmt = $db->prepare('SELECT id, is_verified FROM users WHERE email = ?');
$stmt->execute([$email]);
$existingUser = $stmt->fetch();

if ($existingUser) {
    if ($existingUser['is_verified']) {
        jsonResponse(false, 'An account with this email already exists.');
    }
    // Unverified account — update and resend code
    $passwordHash = password_hash($password, PASSWORD_BCRYPT);
    $stmt = $db->prepare('UPDATE users SET full_name = ?, password_hash = ?, updated_at = NOW() WHERE id = ?');
    $stmt->execute([$fullName, $passwordHash, $existingUser['id']]);
    $userId = $existingUser['id'];
} else {
    // Create new user
    $passwordHash = password_hash($password, PASSWORD_BCRYPT);
    $stmt = $db->prepare('INSERT INTO users (full_name, email, password_hash) VALUES (?, ?, ?)');
    $stmt->execute([$fullName, $email, $passwordHash]);
    $userId = $db->lastInsertId();
}

// Invalidate old codes
$stmt = $db->prepare('UPDATE verification_codes SET used = 1 WHERE user_id = ? AND used = 0');
$stmt->execute([$userId]);

// Generate and save new code
$code = generateVerificationCode();
$expiresAt = date('Y-m-d H:i:s', strtotime('+' . VERIFICATION_CODE_EXPIRY_MINUTES . ' minutes'));
$stmt = $db->prepare('INSERT INTO verification_codes (user_id, code, expires_at, purpose) VALUES (?, ?, ?, "verify")');
$stmt->execute([$userId, $code, $expiresAt]);

// Send verification email
$emailSent = sendVerificationEmail($email, $fullName, $code);

if (!$emailSent) {
    if (defined('DEV_FALLBACK_SHOW_CODE') && DEV_FALLBACK_SHOW_CODE) {
        // Offline demo fallback: surface the code so the flow can continue.
        $_SESSION['pending_verification_user_id'] = $userId;
        $_SESSION['pending_verification_email'] = $email;
        jsonResponse(true, 'Email could not be sent (offline demo mode). Your verification code: ' . $code, [
            'email' => maskEmail($email),
            'dev_code' => $code
        ]);
    }
    jsonResponse(false, 'Failed to send verification email. Please try again.');
}

// Store in session for verification
$_SESSION['pending_verification_user_id'] = $userId;
$_SESSION['pending_verification_email'] = $email;

jsonResponse(true, 'Verification code sent to your email.', ['email' => maskEmail($email)]);

function maskEmail($email) {
    $parts = explode('@', $email);
    $name = $parts[0];
    $domain = $parts[1];
    $maskedName = substr($name, 0, 2) . str_repeat('*', max(mb_strlen($name) - 2, 0));
    return $maskedName . '@' . $domain;
}
