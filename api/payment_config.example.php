<?php
// EXAMPLE payment configuration - copy to api/payment_config.php and fill in
// your own keys. api/payment_config.php is git-ignored (like mail_config.php).
//
// PAYMENT_GATEWAY options:
//   'demo'   - no real gateway; pay.php marks the reservation paid instantly
//              (current behaviour, works offline for demos).
//   'stripe' - Stripe Checkout (test mode works with sk_test_... keys).
//              The guest is redirected to Stripe's hosted payment page, pays
//              with a test card (4242 4242 4242 4242, any future expiry/CVC),
//              and comes back to profile.html where the server verifies the
//              session and flips the reservation to paid. No webhook needed.

define('PAYMENT_GATEWAY', 'demo');

// Stripe test secret key (sk_test_...) - required only for the stripe gateway.
define('STRIPE_SECRET_KEY', '');
define('STRIPE_CURRENCY', 'usd');
