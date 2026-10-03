<?php
/**
 * Mail configuration template.
 *
 * Copy this file to `api/mail_config.php` and fill in your real values.
 * The real mail_config.php is git-ignored so credentials never reach the repo.
 */

// Your Gmail address + App Password (Google Account → Security → 2-Step
// Verification → App passwords).
define('GMAIL_ADDRESS', 'your_email@gmail.com');
define('GMAIL_APP_PASSWORD', 'your sixteen character app password');

// Demo safety valve: when SMTP is unreachable (no internet at a demo, for
// example), signup still succeeds and the verification code is returned in
// the response so the flow can be completed offline. Set to false for any
// real deployment.
define('DEV_FALLBACK_SHOW_CODE', true);
