<?php
require_once __DIR__ . '/config.php';

if (!isset($_SESSION['user_id'])) {
    http_response_code(401);
    jsonResponse(false, 'Please log in first.');
}
requireUserRole();

$db = getDB();
$userId = (int) $_SESSION['user_id'];

function getTierFromEarned($earned)
{
    $earned = (int) $earned;
    if ($earned >= 1500) return 'Platinum';
    if ($earned >= 600) return 'Gold';
    return 'Silver';
}

function getTierBenefitOffer($tier)
{
    if ($tier === 'Platinum') {
        return 'Get 25% off on all meals + priority table service.';
    }
    if ($tier === 'Gold') {
        return 'Get 12% off on all meals.';
    }
    return 'None';
}

function ensureTierBenefitInOffers($offers, $tier)
{
    $offers = is_array($offers) ? array_values($offers) : [];
    while (count($offers) < 3) {
        $offers[] = 'None';
    }

    $benefit = getTierBenefitOffer($tier);
    if ($benefit !== 'None' && (empty($offers[2]) || strtolower(trim($offers[2])) === 'none')) {
        $offers[2] = $benefit;
    }
    return $offers;
}

function subscriptionCatalog($tier = 'Silver')
{
    $tierBenefit = getTierBenefitOffer($tier);

    return [
        'crystal_cup' => [
            'brand_key' => 'crystal_cup',
            'brand_name' => 'The Crystal Cup',
            'brand_logo' => './img/loyalty/crytal-cup.png',
            'duration_label' => '1 Month',
            'points_cost' => 600,
            'monthly_price' => 45,
            'offers' => [
                'Get 30% off on all drinks from 3-6 PM only!',
                'Get free water with every meal you purchase.',
                $tierBenefit
            ]
        ],
        'coffee_house' => [
            'brand_key' => 'coffee_house',
            'brand_name' => 'The Coffee House',
            'brand_logo' => './img/loyalty/coffee-house.png',
            'duration_label' => '1 Month',
            'points_cost' => 600,
            'monthly_price' => 45,
            'offers' => [
                'Get 30% off on all drinks from 3-6 PM only!',
                'Get free water with every meal you purchase.',
                $tierBenefit
            ]
        ],
        'java_cafe' => [
            'brand_key' => 'java_cafe',
            'brand_name' => 'The Java Cafe',
            'brand_logo' => './img/loyalty/java-cafe.png',
            'duration_label' => '1 Month',
            'points_cost' => 600,
            'monthly_price' => 45,
            'offers' => [
                'Get 25% off on all drinks between 4-7 PM.',
                'Free pastry on Fridays.',
                $tierBenefit
            ]
        ]
    ];
}

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $stmt = $db->prepare("SELECT loyalty_points_balance, loyalty_points_earned FROM users WHERE id = ? LIMIT 1");
    $stmt->execute([$userId]);
    $user = $stmt->fetch();

    $pointsBalance = (int) ($user['loyalty_points_balance'] ?? 0);
    $pointsEarned = (int) ($user['loyalty_points_earned'] ?? 0);
    $tierPlan = getTierFromEarned($pointsEarned);

    $catalog = array_values(subscriptionCatalog($tierPlan));

    $db->exec("UPDATE loyalty_subscriptions SET status = 'expired' WHERE status = 'active' AND expires_at < NOW()");

    $stmt = $db->prepare("
        SELECT id, brand_key, brand_name, brand_logo, tier_plan, duration_label, points_cost, monthly_price, offers_json, auto_renew, status, expires_at, created_at
        FROM loyalty_subscriptions
        WHERE user_id = ? AND status = 'active' AND expires_at >= NOW()
        ORDER BY created_at DESC
    ");
    $stmt->execute([$userId]);
    $activeSubscriptions = $stmt->fetchAll();

    foreach ($activeSubscriptions as &$row) {
        $decoded = json_decode($row['offers_json'] ?? '[]', true);
        $row['offers'] = ensureTierBenefitInOffers($decoded, $row['tier_plan'] ?? 'Silver');
        unset($row['offers_json']);
    }
    unset($row);

    jsonResponse(true, 'Subscriptions loaded.', [
        'catalog' => $catalog,
        'active_subscriptions' => $activeSubscriptions,
        'loyalty' => [
            'points_balance' => $pointsBalance,
            'points_earned' => $pointsEarned,
            'tier' => $tierPlan
        ]
    ]);
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $input = json_decode(file_get_contents('php://input'), true);
    $action = $input['action'] ?? '';

    if ($action === 'cancel') {
        $subscriptionId = (int) ($input['subscription_id'] ?? 0);
        if ($subscriptionId < 1) {
            http_response_code(400);
            jsonResponse(false, 'Invalid subscription selected.');
        }

        $stmt = $db->prepare("UPDATE loyalty_subscriptions SET status = 'cancelled', auto_renew = 0, updated_at = NOW() WHERE id = ? AND user_id = ? AND status = 'active'");
        $stmt->execute([$subscriptionId, $userId]);

        if ($stmt->rowCount() < 1) {
            jsonResponse(false, 'Active subscription not found.');
        }

        jsonResponse(true, 'Subscription cancelled successfully.');
    }

    if ($action !== 'redeem') {
        http_response_code(400);
        jsonResponse(false, 'Invalid action.');
    }

    $brandKey = trim($input['brand_key'] ?? '');
    $catalogMap = subscriptionCatalog('Silver');
    if (!isset($catalogMap[$brandKey])) {
        http_response_code(400);
        jsonResponse(false, 'Unknown subscription selected.');
    }

    try {
        $db->beginTransaction();

        $stmt = $db->prepare("SELECT loyalty_points_balance, loyalty_points_earned FROM users WHERE id = ? FOR UPDATE");
        $stmt->execute([$userId]);
        $user = $stmt->fetch();

        if (!$user) {
            $db->rollBack();
            http_response_code(404);
            jsonResponse(false, 'User not found.');
        }

        $balance = (int) ($user['loyalty_points_balance'] ?? 0);
        $earned = (int) ($user['loyalty_points_earned'] ?? 0);
            $tierPlan = getTierFromEarned($earned);
            $item = subscriptionCatalog($tierPlan)[$brandKey];

        if ($balance < (int) $item['points_cost']) {
            $db->rollBack();
            jsonResponse(false, 'Not enough points to redeem this subscription.');
        }

        $stmt = $db->prepare("
            SELECT id
            FROM loyalty_subscriptions
            WHERE user_id = ? AND brand_key = ? AND status = 'active' AND expires_at >= NOW()
            LIMIT 1
        ");
        $stmt->execute([$userId, $brandKey]);
        if ($stmt->fetch()) {
            $db->rollBack();
            jsonResponse(false, 'You already have an active subscription for this cafe.');
        }

        $stmt = $db->prepare("UPDATE users SET loyalty_points_balance = loyalty_points_balance - ? WHERE id = ?");
        $stmt->execute([(int) $item['points_cost'], $userId]);

        $stmt = $db->prepare("
            INSERT INTO loyalty_subscriptions
            (user_id, brand_key, brand_name, brand_logo, tier_plan, duration_label, points_cost, monthly_price, offers_json, auto_renew, status, expires_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 'active', DATE_ADD(NOW(), INTERVAL 1 MONTH))
        ");
        $stmt->execute([
            $userId,
            $item['brand_key'],
            $item['brand_name'],
            $item['brand_logo'],
            $tierPlan,
            $item['duration_label'],
            (int) $item['points_cost'],
            (float) $item['monthly_price'],
            json_encode($item['offers'])
        ]);

        $subscriptionId = (int) $db->lastInsertId();

        $stmt = $db->prepare("
            SELECT id, brand_key, brand_name, brand_logo, tier_plan, duration_label, points_cost, monthly_price, auto_renew, status, expires_at, created_at
            FROM loyalty_subscriptions
            WHERE id = ? AND user_id = ?
            LIMIT 1
        ");
        $stmt->execute([$subscriptionId, $userId]);
        $subscription = $stmt->fetch();
        $subscription['offers'] = $item['offers'];

        $updatedBalance = $balance - (int) $item['points_cost'];

        $db->commit();

        jsonResponse(true, 'Subscription redeemed successfully.', [
            'subscription' => $subscription,
            'loyalty' => [
                'points_balance' => $updatedBalance,
                'points_earned' => $earned,
                'tier' => $tierPlan
            ]
        ]);
    } catch (PDOException $e) {
        if ($db->inTransaction()) {
            $db->rollBack();
        }
        error_log('Subscription redeem failed: ' . $e->getMessage());
        http_response_code(500);
        jsonResponse(false, 'Database error while redeeming subscription.');
    }
}

http_response_code(405);
jsonResponse(false, 'Method not allowed.');
