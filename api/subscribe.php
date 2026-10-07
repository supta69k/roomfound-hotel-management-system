<?php
// Newsletter subscribe API - backs the public homepage form.
// POST { email } -> upserts into subscribers (re-subscribing refreshes the row).
require_once __DIR__ . '/config.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    jsonResponse(false, 'Method not allowed.');
}

$raw = file_get_contents('php://input');
$input = json_decode($raw, true);
if (!is_array($input)) {
    // Also accept classic form-encoded posts.
    $input = $_POST;
}

$email = strtolower(trim($input['email'] ?? ''));
if ($email === '' || !filter_var($email, FILTER_VALIDATE_EMAIL) || strlen($email) > 255) {
    http_response_code(422);
    jsonResponse(false, 'Please enter a valid e-mail address.');
}

$db = getDB();

// Already subscribed? Refresh the timestamp instead of erroring, so the UX
// stays friendly ("Subscribed!") either way.
$stmt = $db->prepare('
    INSERT INTO subscribers (email) VALUES (:email)
    ON DUPLICATE KEY UPDATE created_at = CURRENT_TIMESTAMP
');
$stmt->execute([':email' => $email]);

jsonResponse(true, 'Subscribed! Watch your inbox for offers.');
