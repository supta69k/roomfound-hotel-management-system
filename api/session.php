<?php
require_once __DIR__ . '/config.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    jsonResponse(false, 'Method not allowed.');
}

if (isset($_SESSION['user_id'])) {
    $userData = [
        'name' => $_SESSION['user_name'],
        'email' => $_SESSION['user_email'],
        'role' => $_SESSION['user_role'] ?? 'user'
    ];

    if (in_array($userData['role'], ['manager', 'waiter'])) {
        $userData['hotel_id'] = intval($_SESSION['user_hotel_id'] ?? 0);
        $userData['hotel_name'] = $_SESSION['user_hotel_name'] ?? null;
    }

    if (($userData['role'] ?? 'user') === 'user') {
        $db = getDB();
        $stmt = $db->prepare('SELECT loyalty_points_balance, loyalty_points_earned FROM users WHERE id = ? LIMIT 1');
        $stmt->execute([$_SESSION['user_id']]);
        $row = $stmt->fetch();
        if ($row) {
            $userData['loyalty'] = [
                'points_balance' => (int) ($row['loyalty_points_balance'] ?? 0),
                'total_earned' => (int) ($row['loyalty_points_earned'] ?? 0)
            ];
        }
    }

    jsonResponse(true, 'Logged in.', [
        'user' => $userData
    ]);
} else {
    jsonResponse(false, 'Not logged in.');
}
