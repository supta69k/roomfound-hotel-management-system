<?php
require_once __DIR__ . '/config.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    jsonResponse(false, 'Method not allowed.');
}

$input = json_decode(file_get_contents('php://input'), true);

$email = trim($input['email'] ?? '');
$password = $input['password'] ?? '';

if (empty($email) || empty($password)) {
    jsonResponse(false, 'Email and password are required.');
}

if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    jsonResponse(false, 'Please enter a valid email address.');
}

// Basic brute-force throttle: max 10 failed attempts per 5 minutes per session.
if (!isset($_SESSION['login_failures'])) {
    $_SESSION['login_failures'] = [];
}
$_SESSION['login_failures'] = array_values(array_filter($_SESSION['login_failures'], function ($ts) {
    return $ts > time() - 300;
}));
if (count($_SESSION['login_failures']) >= 10) {
    jsonResponse(false, 'Too many failed attempts. Please try again in a few minutes.');
}

$db = getDB();

// Check admins table first (separate admin table)
try {
    $stmt = $db->prepare('SELECT id, full_name, email, password_hash FROM admins WHERE email = ?');
    $stmt->execute([$email]);
    $admin = $stmt->fetch();

    if ($admin && password_verify($password, $admin['password_hash'])) {
        session_regenerate_id(true);
        unset($_SESSION['login_failures']);
        $_SESSION['user_id'] = $admin['id'];
        $_SESSION['user_name'] = $admin['full_name'];
        $_SESSION['user_email'] = $admin['email'];
        $_SESSION['user_role'] = 'admin';

        jsonResponse(true, 'Login successful.', [
            'user' => [
                'name' => $admin['full_name'],
                'email' => $admin['email'],
                'role' => 'admin'
            ]
        ]);
    }
} catch (PDOException $e) {
    // admins table may not exist yet — fall through to employees table
}

// Check employees table (manager / waiter)
try {
    $stmt = $db->prepare('SELECT e.id, e.full_name, e.email, e.password_hash, e.role, e.is_active, e.hotel_id, rm.name AS hotel_name FROM employees e LEFT JOIN rooms rm ON rm.id = e.hotel_id WHERE e.email = ?');
    $stmt->execute([$email]);
    $emp = $stmt->fetch();

    if ($emp && password_verify($password, $emp['password_hash'])) {
        if (!$emp['is_active']) {
            jsonResponse(false, 'Your account has been deactivated. Please contact admin.');
        }
        if (in_array($emp['role'], ['manager', 'waiter']) && intval($emp['hotel_id'] ?? 0) < 1) {
            jsonResponse(false, 'Your account is not assigned to a hotel yet. Please contact admin.');
        }
        session_regenerate_id(true);
        unset($_SESSION['login_failures']);
        $_SESSION['user_id'] = $emp['id'];
        $_SESSION['user_name'] = $emp['full_name'];
        $_SESSION['user_email'] = $emp['email'];
        $_SESSION['user_role'] = $emp['role']; // 'manager' or 'waiter'
        $_SESSION['user_hotel_id'] = intval($emp['hotel_id'] ?? 0);
        $_SESSION['user_hotel_name'] = $emp['hotel_name'] ?? null;

        jsonResponse(true, 'Login successful.', [
            'user' => [
                'name' => $emp['full_name'],
                'email' => $emp['email'],
                'role' => $emp['role'],
                'hotel_id' => intval($emp['hotel_id'] ?? 0),
                'hotel_name' => $emp['hotel_name']
            ]
        ]);
    }
} catch (PDOException $e) {
    // employees table may not exist yet — fall through to users table
}

// Regular user login (also handles legacy admin-in-users fallback)
$stmt = $db->prepare('SELECT id, full_name, email, password_hash, is_verified FROM users WHERE email = ?');
$stmt->execute([$email]);
$user = $stmt->fetch();

if (!$user) {
    // Last resort: check old-style admin in users table (role column may still exist)
    try {
        $stmt = $db->prepare("SELECT id, full_name, email, password_hash FROM users WHERE email = ? AND role = 'admin'");
        $stmt->execute([$email]);
        $legacyAdmin = $stmt->fetch();
        if ($legacyAdmin && password_verify($password, $legacyAdmin['password_hash'])) {
            session_regenerate_id(true);
            unset($_SESSION['login_failures']);
            $_SESSION['user_id'] = $legacyAdmin['id'];
            $_SESSION['user_name'] = $legacyAdmin['full_name'];
            $_SESSION['user_email'] = $legacyAdmin['email'];
            $_SESSION['user_role'] = 'admin';
            jsonResponse(true, 'Login successful.', [
                'user' => ['name' => $legacyAdmin['full_name'], 'email' => $legacyAdmin['email'], 'role' => 'admin']
            ]);
        }
    } catch (PDOException $e) {
        // role column already dropped — ignore
    }
    jsonResponse(false, 'Invalid email or password.');
}

if (!password_verify($password, $user['password_hash'])) {
    $_SESSION['login_failures'][] = time();
    jsonResponse(false, 'Invalid email or password.');
}

if (!$user['is_verified']) {
    jsonResponse(false, 'Please verify your email first.', ['needs_verification' => true]);
}

// Set session
session_regenerate_id(true);
unset($_SESSION['login_failures']);
$_SESSION['user_id'] = $user['id'];
$_SESSION['user_name'] = $user['full_name'];
$_SESSION['user_email'] = $user['email'];
$_SESSION['user_role'] = 'user';

jsonResponse(true, 'Login successful.', [
    'user' => [
        'name' => $user['full_name'],
        'email' => $user['email'],
        'role' => 'user'
    ]
]);
