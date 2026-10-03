<?php
require_once __DIR__ . '/config.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    jsonResponse(false, 'Method not allowed.');
}

$input = json_decode(file_get_contents('php://input'), true);

$code = trim($input['code'] ?? '');
$action = $input['action'] ?? 'verify'; // 'verify' or 'resend'

$userId = $_SESSION['pending_verification_user_id'] ?? null;
$email = $_SESSION['pending_verification_email'] ?? null;

if (!$userId || !$email) {
    jsonResponse(false, 'No pending verification. Please sign up again.');
}

$db = getDB();

// Resend code
if ($action === 'resend') {
    // Rate limit: one resend per 60 seconds
    $stmt = $db->prepare('SELECT created_at FROM verification_codes WHERE user_id = ? ORDER BY created_at DESC LIMIT 1');
    $stmt->execute([$userId]);
    $last = $stmt->fetch();
    if ($last && (time() - strtotime($last['created_at'])) < 60) {
        $wait = 60 - (time() - strtotime($last['created_at']));
        jsonResponse(false, "Please wait {$wait} seconds before requesting a new code.");
    }

    // Invalidate old codes
    $stmt = $db->prepare('UPDATE verification_codes SET used = 1 WHERE user_id = ? AND used = 0');
    $stmt->execute([$userId]);

    $newCode = generateVerificationCode();
    $expiresAt = date('Y-m-d H:i:s', strtotime('+' . VERIFICATION_CODE_EXPIRY_MINUTES . ' minutes'));
    $stmt = $db->prepare('INSERT INTO verification_codes (user_id, code, expires_at, purpose) VALUES (?, ?, ?, "verify")');
    $stmt->execute([$userId, $newCode, $expiresAt]);

    require_once __DIR__ . '/send_mail.php';
    $stmt = $db->prepare('SELECT full_name FROM users WHERE id = ?');
    $stmt->execute([$userId]);
    $user = $stmt->fetch();
    sendVerificationEmail($email, $user['full_name'], $newCode);

    jsonResponse(true, 'New verification code sent.');
}

// Verify code
if (empty($code) || strlen($code) !== 6) {
    jsonResponse(false, 'Please enter the 6-digit verification code.');
}

$stmt = $db->prepare('SELECT id, code, expires_at FROM verification_codes WHERE user_id = ? AND used = 0 AND purpose = "verify" ORDER BY created_at DESC LIMIT 1');
$stmt->execute([$userId]);
$record = $stmt->fetch();

if (!$record) {
    jsonResponse(false, 'No valid code found. Please request a new one.');
}

if (strtotime($record['expires_at']) < time()) {
    jsonResponse(false, 'Verification code has expired. Please request a new one.');
}

if (!hash_equals($record['code'], $code)) {
    // Limit guessing: too many wrong tries invalidates the current code.
    $_SESSION['verify_attempts'] = ($_SESSION['verify_attempts'] ?? 0) + 1;
    if ($_SESSION['verify_attempts'] >= 6) {
        $stmt = $db->prepare('UPDATE verification_codes SET used = 1 WHERE id = ?');
        $stmt->execute([$record['id']]);
        unset($_SESSION['verify_attempts']);
        jsonResponse(false, 'Too many incorrect attempts. Please request a new code.');
    }
    jsonResponse(false, 'Incorrect verification code.');
}
unset($_SESSION['verify_attempts']);

// Mark code as used
$stmt = $db->prepare('UPDATE verification_codes SET used = 1 WHERE id = ?');
$stmt->execute([$record['id']]);

// Mark user as verified
$stmt = $db->prepare('UPDATE users SET is_verified = 1 WHERE id = ?');
$stmt->execute([$userId]);

// Log the user in
$stmt = $db->prepare('SELECT full_name, email FROM users WHERE id = ?');
$stmt->execute([$userId]);
$user = $stmt->fetch();

session_regenerate_id(true);
$_SESSION['user_id'] = $userId;
$_SESSION['user_name'] = $user['full_name'];
$_SESSION['user_email'] = $user['email'];

// Clear pending verification
unset($_SESSION['pending_verification_user_id']);
unset($_SESSION['pending_verification_email']);

jsonResponse(true, 'Email verified successfully!', [
    'user' => [
        'name' => $user['full_name'],
        'email' => $user['email']
    ]
]);
