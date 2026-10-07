<?php
// Payment gateway helper.
// Loads api/payment_config.php when present (git-ignored, real keys); without
// it everything falls back to the offline 'demo' gateway so nothing breaks.

if (file_exists(__DIR__ . '/payment_config.php')) {
    require_once __DIR__ . '/payment_config.php';
}

if (!defined('PAYMENT_GATEWAY')) {
    define('PAYMENT_GATEWAY', 'demo');
}
if (!defined('STRIPE_SECRET_KEY')) {
    define('STRIPE_SECRET_KEY', '');
}
if (!defined('STRIPE_CURRENCY')) {
    define('STRIPE_CURRENCY', 'usd');
}

function paymentGateway() {
    // Stripe only counts as configured when a secret key is present.
    if (PAYMENT_GATEWAY === 'stripe' && defined('STRIPE_SECRET_KEY') && STRIPE_SECRET_KEY !== '') {
        return 'stripe';
    }
    return 'demo';
}

// Absolute URL back to a page under /src (Stripe redirects the guest there).
function paymentPageUrl($page) {
    $scheme = (!empty($_SERVER['REQUEST_SCHEME'])) ? $_SERVER['REQUEST_SCHEME']
        : ((($_SERVER['HTTPS'] ?? '') === 'on') ? 'https' : 'http');
    // SCRIPT_NAME is already URL-encoded (e.g. "/Hotel%20Management/api/pay.php").
    $root = rtrim(dirname(dirname($_SERVER['SCRIPT_NAME'])), '/');
    return $scheme . '://' . $_SERVER['HTTP_HOST'] . $root . '/src/' . $page;
}

// Minimal Stripe REST client (no SDK dependency). Throws on transport/API error.
function stripeRequest($method, $path, array $params = []) {
    $ch = curl_init('https://api.stripe.com/v1/' . ltrim($path, '/'));
    $opts = [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT        => 30,
        CURLOPT_HTTPHEADER     => [
            'Authorization: Bearer ' . STRIPE_SECRET_KEY,
        ],
    ];
    if ($method === 'POST') {
        $opts[CURLOPT_POST] = true;
        $opts[CURLOPT_POSTFIELDS] = http_build_query($params);
    }
    curl_setopt_array($ch, $opts);
    $body = curl_exec($ch);
    $err  = curl_error($ch);
    curl_close($ch);

    if ($body === false) {
        throw new Exception('Stripe request failed: ' . $err);
    }
    $data = json_decode($body, true);
    if (!is_array($data)) {
        throw new Exception('Unexpected Stripe response.');
    }
    if (isset($data['error'])) {
        throw new Exception($data['error']['message'] ?? 'Stripe error.');
    }
    return $data;
}
