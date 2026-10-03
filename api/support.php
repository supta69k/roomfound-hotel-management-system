<?php
require_once __DIR__ . '/config.php';
require_once __DIR__ . '/send_mail.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    jsonResponse(false, 'Method not allowed.');
}

$input = json_decode(file_get_contents('php://input'), true);

$firstName = trim($input['first_name'] ?? '');
$lastName = trim($input['last_name'] ?? '');
$country = trim($input['country'] ?? '');
$phone = trim($input['phone'] ?? '');
$email = trim($input['email'] ?? '');
$message = trim($input['message'] ?? '');

// Validation
if (empty($firstName) || empty($lastName) || empty($email) || empty($message)) {
    jsonResponse(false, 'First name, last name, email, and message are required.');
}

if (mb_strlen($firstName) > 100 || mb_strlen($lastName) > 100) {
    jsonResponse(false, 'Name is too long.');
}

if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    jsonResponse(false, 'Please enter a valid email address.');
}

if (mb_strlen($message) > 5000) {
    jsonResponse(false, 'Message is too long (max 5000 characters).');
}

if (!empty($phone) && !preg_match('/^[\d\s\+\-\(\)]{5,20}$/', $phone)) {
    jsonResponse(false, 'Please enter a valid phone number.');
}

if (!empty($country) && mb_strlen($country) > 100) {
    jsonResponse(false, 'Invalid country.');
}

$db = getDB();

// Basic spam throttle: max 5 inquiries per 10 minutes per session.
if (!isset($_SESSION['inquiry_timestamps'])) {
    $_SESSION['inquiry_timestamps'] = [];
}
$_SESSION['inquiry_timestamps'] = array_values(array_filter($_SESSION['inquiry_timestamps'], function ($ts) {
    return $ts > time() - 600;
}));
if (count($_SESSION['inquiry_timestamps']) >= 5) {
    jsonResponse(false, 'Too many inquiries submitted. Please try again later.');
}

// Insert inquiry
$stmt = $db->prepare('INSERT INTO support_inquiries (first_name, last_name, country, phone, email, message) VALUES (?, ?, ?, ?, ?, ?)');
$stmt->execute([
    $firstName,
    $lastName,
    $country ?: null,
    $phone ?: null,
    $email,
    $message
]);
$_SESSION['inquiry_timestamps'][] = time();

// Send notification email to support team
$fullName = $firstName . ' ' . $lastName;
$notifyBody = '
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 30px; background: #f7f6f4; border-radius: 20px;">
    <h2 style="text-align: center; color: #1e2e37; font-size: 24px; margin-bottom: 20px;">New Support Inquiry</h2>
    <table style="width: 100%; border-collapse: collapse; font-size: 15px; color: #333;">
        <tr><td style="padding: 8px 0; font-weight: bold; width: 120px;">Name:</td><td style="padding: 8px 0;">' . htmlspecialchars($fullName, ENT_QUOTES, 'UTF-8') . '</td></tr>
        <tr><td style="padding: 8px 0; font-weight: bold;">Email:</td><td style="padding: 8px 0;">' . htmlspecialchars($email, ENT_QUOTES, 'UTF-8') . '</td></tr>
        <tr><td style="padding: 8px 0; font-weight: bold;">Country:</td><td style="padding: 8px 0;">' . htmlspecialchars($country ?: 'N/A', ENT_QUOTES, 'UTF-8') . '</td></tr>
        <tr><td style="padding: 8px 0; font-weight: bold;">Phone:</td><td style="padding: 8px 0;">' . htmlspecialchars($phone ?: 'N/A', ENT_QUOTES, 'UTF-8') . '</td></tr>
    </table>
    <div style="margin-top: 20px; padding: 20px; background: white; border-radius: 12px;">
        <p style="font-weight: bold; margin: 0 0 10px 0; color: #1e2e37;">Message:</p>
        <p style="margin: 0; color: #555; line-height: 1.6;">' . nl2br(htmlspecialchars($message, ENT_QUOTES, 'UTF-8')) . '</p>
    </div>
</div>';

$mail = new \PHPMailer\PHPMailer\PHPMailer(true);
try {
    $mail->isSMTP();
    $mail->Host       = 'smtp.gmail.com';
    $mail->SMTPAuth   = true;
    $mail->Username   = GMAIL_ADDRESS;
    $mail->Password   = GMAIL_APP_PASSWORD;
    $mail->SMTPSecure = \PHPMailer\PHPMailer\PHPMailer::ENCRYPTION_STARTTLS;
    $mail->Port       = 587;

    $mail->setFrom(GMAIL_ADDRESS, SMTP_FROM_NAME);
    $mail->addAddress(GMAIL_ADDRESS, 'Support Team');

    $mail->isHTML(true);
    $mail->Subject = 'New Support Inquiry from ' . htmlspecialchars($fullName, ENT_QUOTES, 'UTF-8');
    $mail->Body = $notifyBody;
    $mail->AltBody = "New support inquiry from $fullName ($email): $message";

    $mail->send();
} catch (\Exception $e) {
    // Email failed but inquiry is saved — don't block the user
}

jsonResponse(true, 'Your inquiry has been submitted successfully.');
