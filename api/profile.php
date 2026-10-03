<?php
require_once __DIR__ . '/config.php';

if (!isset($_SESSION['user_id'])) {
    http_response_code(401);
    jsonResponse(false, 'Not logged in.');
}
requireUserRole();

$db = getDB();
$userId = $_SESSION['user_id'];

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $stmt = $db->prepare('SELECT full_name, email, phone, location FROM users WHERE id = ?');
    $stmt->execute([$userId]);
    $user = $stmt->fetch();

    if (!$user) {
        jsonResponse(false, 'User not found.');
    }

    $names = explode(' ', $user['full_name'], 2);
    jsonResponse(true, 'Profile loaded.', [
        'user' => [
            'first_name' => $names[0],
            'last_name' => isset($names[1]) ? $names[1] : '',
            'email' => $user['email'],
            'phone' => $user['phone'] ?? '',
            'location' => $user['location'] ?? ''
        ]
    ]);
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $input = json_decode(file_get_contents('php://input'), true);

    $firstName = trim($input['first_name'] ?? '');
    $lastName = trim($input['last_name'] ?? '');
    $phone = trim($input['phone'] ?? '');
    $location = trim($input['location'] ?? '');

    if (empty($firstName)) {
        jsonResponse(false, 'First name is required.');
    }

    if (mb_strlen($firstName) > 50 || mb_strlen($lastName) > 50) {
        jsonResponse(false, 'Name is too long.');
    }

    if (mb_strlen($phone) > 20) {
        jsonResponse(false, 'Phone number is too long.');
    }

    if (mb_strlen($location) > 100) {
        jsonResponse(false, 'Location is too long.');
    }

    $fullName = trim($firstName . ($lastName ? ' ' . $lastName : ''));

    $stmt = $db->prepare('UPDATE users SET full_name = ?, phone = ?, location = ? WHERE id = ?');
    $stmt->execute([$fullName, $phone, $location, $userId]);

    $_SESSION['user_name'] = $fullName;

    jsonResponse(true, 'Profile updated successfully.', [
        'user' => [
            'first_name' => $firstName,
            'last_name' => $lastName,
            'email' => $_SESSION['user_email'],
            'phone' => $phone,
            'location' => $location
        ]
    ]);
}

http_response_code(405);
jsonResponse(false, 'Method not allowed.');
