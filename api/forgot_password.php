<?php
// Password reset: request a code by email, then reset with code + new password.
require_once __DIR__ . '/config.php';
require_once __DIR__ . '/send_mail.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    jsonResponse(false, 'Method not allowed.');
}

$input = json_decode(file_get_contents('php://input'), true);
$action = $input['action'] ?? 'request';
$email = trim($input['email'] ?? '');

if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    jsonResponse(false, 'Please enter a valid email address.');
}

$db = getDB();

// Look up the account. Guests only — admins/employees reset via admin.
$stmt = $db->prepare('SELECT id, full_name FROM users WHERE email = ?');
$stmt->execute([$email]);
$user = $stmt->fetch();

if ($action === 'request') {
    // Always answer the same way so the endpoint can't be used to probe
    // which emails are registered.
    if (!$user) {
        jsonResponse(true, 'If that email is registered, a reset code has been sent.');
    }

    // Rate limit: one code per 60 seconds per account.
    $stmt = $db->prepare('SELECT created_at FROM verification_codes WHERE user_id = ? AND purpose = "reset" ORDER BY created_at DESC LIMIT 1');
    $stmt->execute([$user['id']]);
    $last = $stmt->fetch();
    if ($last && (time() - strtotime($last['created_at'])) < 60) {
        $wait = 60 - (time() - strtotime($last['created_at']));
        jsonResponse(false, "Please wait {$wait} seconds before requesting a new code.");
    }

    // Invalidate older reset codes.
    $stmt = $db->prepare('UPDATE verification_codes SET used = 1 WHERE user_id = ? AND purpose = "reset" AND used = 0');
    $stmt->execute([$user['id']]);

    $code = generateVerificationCode();
    $expiresAt = date('Y-m-d H:i:s', strtotime('+' . VERIFICATION_CODE_EXPIRY_MINUTES . ' minutes'));
    $stmt = $db->prepare('INSERT INTO verification_codes (user_id, code, expires_at, purpose) VALUES (?, ?, ?, "reset")');
    $stmt->execute([$user['id'], $code, $expiresAt]);

    $sent = sendResetEmail($email, $user['full_name'], $code);

    if (!$sent && defined('DEV_FALLBACK_SHOW_CODE') && DEV_FALLBACK_SHOW_CODE) {
        jsonResponse(true, 'If that email is registered, a reset code has been sent. (Offline demo mode — your code: ' . $code . ')', [
            'dev_code' => $code
        ]);
    }

    jsonResponse(true, 'If that email is registered, a reset code has been sent.');
}

if ($action === 'reset') {
    $code = trim($input['code'] ?? '');
    $newPassword = $input['new_password'] ?? '';

    if (strlen($code) !== 6) {
        jsonResponse(false, 'Please enter the 6-digit reset code.');
    }
    if (strlen($newPassword) < 8) {
        jsonResponse(false, 'Password must be at least 8 characters.');
    }
    if (!$user) {
        jsonResponse(false, 'Invalid or expired reset code.');
    }

    // Brute-force guard: too many wrong tries invalidates the code.
    $_SESSION['reset_attempts'] = ($_SESSION['reset_attempts'] ?? 0) + 1;
    if ($_SESSION['reset_attempts'] > 10) {
        $stmt = $db->prepare('UPDATE verification_codes SET used = 1 WHERE user_id = ? AND purpose = "reset" AND used = 0');
        $stmt->execute([$user['id']]);
        jsonResponse(false, 'Too many attempts. Please request a new code.');
    }

    $stmt = $db->prepare('SELECT id, code, expires_at FROM verification_codes WHERE user_id = ? AND used = 0 AND purpose = "reset" ORDER BY created_at DESC LIMIT 1');
    $stmt->execute([$user['id']]);
    $record = $stmt->fetch();

    if (!$record || strtotime($record['expires_at']) < time() || !hash_equals($record['code'], $code)) {
        jsonResponse(false, 'Invalid or expired reset code.');
    }

    $stmt = $db->prepare('UPDATE verification_codes SET used = 1 WHERE id = ?');
    $stmt->execute([$record['id']]);
    $stmt = $db->prepare('UPDATE users SET password_hash = ? WHERE id = ?');
    $stmt->execute([password_hash($newPassword, PASSWORD_BCRYPT), $user['id']]);
    unset($_SESSION['reset_attempts']);

    jsonResponse(true, 'Password reset successfully. You can now log in with your new password.');
}

http_response_code(400);
jsonResponse(false, 'Invalid action.');
