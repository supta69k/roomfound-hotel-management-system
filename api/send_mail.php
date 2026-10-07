<?php
require_once __DIR__ . '/../vendor/autoload.php';
require_once __DIR__ . '/mail_config.php';

use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\SMTP;

function sendVerificationEmail($toEmail, $toName, $code) {
    $mail = new PHPMailer(true);

    try {
        $mail->isSMTP();
        $mail->Host       = 'smtp.gmail.com';
        $mail->SMTPAuth   = true;
        $mail->Username   = GMAIL_ADDRESS;
        $mail->Password   = GMAIL_APP_PASSWORD;
        $mail->SMTPSecure = PHPMailer::ENCRYPTION_STARTTLS;
        $mail->Port       = 587;

        $mail->setFrom(GMAIL_ADDRESS, SMTP_FROM_NAME);
        $mail->addAddress($toEmail, $toName);

        $mail->isHTML(true);
        $mail->Subject = 'Your Verification Code - Hotel Management';
        $mail->Body = '
        <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 40px 30px; background: #f7f6f4; border-radius: 20px;">
            <h2 style="text-align: center; color: #1e2e37; font-size: 24px; margin-bottom: 10px;">Verify Your Email</h2>
            <p style="text-align: center; color: #666; font-size: 15px; margin-bottom: 30px;">Hi ' . htmlspecialchars($toName, ENT_QUOTES, 'UTF-8') . ', use the code below to verify your email address.</p>
            <div style="text-align: center; background: #1e2e37; border-radius: 16px; padding: 20px; margin-bottom: 30px;">
                <span style="font-size: 36px; font-weight: bold; letter-spacing: 12px; color: #ffffff;">' . htmlspecialchars($code, ENT_QUOTES, 'UTF-8') . '</span>
            </div>
            <p style="text-align: center; color: #999; font-size: 13px;">This code expires in ' . VERIFICATION_CODE_EXPIRY_MINUTES . ' minutes.</p>
            <p style="text-align: center; color: #999; font-size: 13px;">If you didn\'t request this, please ignore this email.</p>
        </div>';
        $mail->AltBody = 'Your verification code is: ' . $code . '. It expires in ' . VERIFICATION_CODE_EXPIRY_MINUTES . ' minutes.';

        $mail->send();
        return true;
    } catch (\Exception $e) {
        return false;
    }
}

function sendResetEmail($toEmail, $toName, $code) {
    $mail = new PHPMailer(true);

    try {
        $mail->isSMTP();
        $mail->Host       = 'smtp.gmail.com';
        $mail->SMTPAuth   = true;
        $mail->Username   = GMAIL_ADDRESS;
        $mail->Password   = GMAIL_APP_PASSWORD;
        $mail->SMTPSecure = PHPMailer::ENCRYPTION_STARTTLS;
        $mail->Port       = 587;

        $mail->setFrom(GMAIL_ADDRESS, SMTP_FROM_NAME);
        $mail->addAddress($toEmail, $toName);

        $mail->isHTML(true);
        $mail->Subject = 'Your Password Reset Code - Hotel Management';
        $mail->Body = '
        <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 40px 30px; background: #f7f6f4; border-radius: 20px;">
            <h2 style="text-align: center; color: #1e2e37; font-size: 24px; margin-bottom: 10px;">Reset Your Password</h2>
            <p style="text-align: center; color: #666; font-size: 15px; margin-bottom: 30px;">Hi ' . htmlspecialchars($toName, ENT_QUOTES, 'UTF-8') . ', use the code below to reset your password. If you didn\'t request this, you can safely ignore this email.</p>
            <div style="text-align: center; background: #1e2e37; border-radius: 16px; padding: 20px; margin-bottom: 30px;">
                <span style="font-size: 36px; font-weight: bold; letter-spacing: 12px; color: #ffffff;">' . htmlspecialchars($code, ENT_QUOTES, 'UTF-8') . '</span>
            </div>
            <p style="text-align: center; color: #999; font-size: 13px;">This code expires in ' . VERIFICATION_CODE_EXPIRY_MINUTES . ' minutes.</p>
        </div>';
        $mail->AltBody = 'Your password reset code is: ' . $code . '. It expires in ' . VERIFICATION_CODE_EXPIRY_MINUTES . ' minutes.';

        $mail->send();
        return true;
    } catch (\Exception $e) {
        return false;
    }
}

// Booking confirmation: fired by setReservationStatus() when a reservation
// reaches "paid". Never throws - callers rely on mail being best-effort.
function sendBookingConfirmationEmail($toEmail, $toName, array $booking) {
    $mail = new PHPMailer(true);

    try {
        $mail->isSMTP();
        $mail->Host       = 'smtp.gmail.com';
        $mail->SMTPAuth   = true;
        $mail->Username   = GMAIL_ADDRESS;
        $mail->Password   = GMAIL_APP_PASSWORD;
        $mail->SMTPSecure = PHPMailer::ENCRYPTION_STARTTLS;
        $mail->Port       = 587;

        $mail->setFrom(GMAIL_ADDRESS, SMTP_FROM_NAME);
        $mail->addAddress($toEmail, $toName);

        $name  = htmlspecialchars($toName, ENT_QUOTES, 'UTF-8');
        $hotel = htmlspecialchars($booking['hotel_name'], ENT_QUOTES, 'UTF-8');
        $in    = htmlspecialchars(date('M j, Y', strtotime($booking['check_in'])), ENT_QUOTES, 'UTF-8');
        $out   = htmlspecialchars(date('M j, Y', strtotime($booking['check_out'])), ENT_QUOTES, 'UTF-8');
        $nights = (int) $booking['nights'];
        $rooms  = (int) $booking['rooms_count'];
        $guests = (int) $booking['guests'];
        $total  = number_format((float) $booking['total_price'], 2);

        $row = function ($label, $value) {
            $l = htmlspecialchars($label, ENT_QUOTES, 'UTF-8');
            return '<tr>'
                . '<td style="padding:8px 0;color:#666;font-size:14px;">' . $l . '</td>'
                . '<td style="padding:8px 0;color:#1e2e37;font-size:14px;font-weight:bold;text-align:right;">' . $value . '</td>'
                . '</tr>';
        };

        $mail->isHTML(true);
        $mail->Subject = 'Booking Confirmed - ' . $hotel . ' | RoomFound';
        $mail->Body = '
        <div style="font-family: Arial, sans-serif; max-width: 520px; margin: 0 auto; padding: 40px 30px; background: #f7f6f4; border-radius: 20px;">
            <h2 style="text-align: center; color: #1e2e37; font-size: 24px; margin-bottom: 10px;">Booking Confirmed!</h2>
            <p style="text-align: center; color: #666; font-size: 15px; margin-bottom: 30px;">Hi ' . $name . ', your stay at <strong>' . $hotel . '</strong> is booked and paid. See you soon!</p>
            <div style="background: #ffffff; border-radius: 16px; padding: 20px 24px; margin-bottom: 30px;">
                <table style="width: 100%; border-collapse: collapse;">'
                . $row('Hotel', $hotel)
                . $row('Check-in', $in)
                . $row('Check-out', $out)
                . $row('Nights', $nights)
                . $row('Rooms', $rooms)
                . $row('Guests', $guests)
                . $row('Total paid', '$' . $total)
                . '</table>
            </div>
            <p style="text-align: center; color: #999; font-size: 13px;">Need to change something? Contact our support team any time.</p>
        </div>';
        $mail->AltBody = 'Booking confirmed: ' . $hotel . ', ' . $in . ' to ' . $out
            . ' (' . $nights . ' nights, ' . $rooms . ' room(s), ' . $guests . ' guest(s)). Total paid: $' . $total . '.';

        $mail->send();
        return true;
    } catch (\Exception $e) {
        return false;
    }
}
