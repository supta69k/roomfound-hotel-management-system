<?php
require_once __DIR__ . '/config.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    jsonResponse(false, 'Method not allowed.');
}

if (!isset($_SESSION['user_id'])) {
    http_response_code(401);
    jsonResponse(false, 'Not logged in.');
}
requireUserRole();

$input = json_decode(file_get_contents('php://input'), true);

$currentPassword = $input['current_password'] ?? '';
$newPassword = $input['new_password'] ?? '';

if (empty($currentPassword) || empty($newPassword)) {
    jsonResponse(false, 'All fields are required.');
}

if (mb_strlen($newPassword) < 8) {
    jsonResponse(false, 'New password must be at least 8 characters.');
}

$db = getDB();
$userId = $_SESSION['user_id'];

$stmt = $db->prepare('SELECT password_hash FROM users WHERE id = ?');
$stmt->execute([$userId]);
$user = $stmt->fetch();

if (!$user || !password_verify($currentPassword, $user['password_hash'])) {
    jsonResponse(false, 'Current password is incorrect.');
}

$newHash = password_hash($newPassword, PASSWORD_BCRYPT);
$stmt = $db->prepare('UPDATE users SET password_hash = ? WHERE id = ?');
$stmt->execute([$newHash, $userId]);

jsonResponse(true, 'Password changed successfully.');
