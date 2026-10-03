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
