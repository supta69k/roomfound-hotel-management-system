<?php
require_once __DIR__ . '/config.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    jsonResponse(false, 'Method not allowed.');
}

if (!isset($_SESSION['user_id'])) {
    http_response_code(401);
    jsonResponse(false, 'Not logged in.');
}
requireUserRole();

$db = getDB();
$stmt = $db->prepare('SELECT id, full_name, loyalty_points_balance, loyalty_points_earned FROM users WHERE id = ? LIMIT 1');
$stmt->execute([$_SESSION['user_id']]);
$user = $stmt->fetch();

if (!$user) {
    http_response_code(404);
    jsonResponse(false, 'User not found.');
}

$balance = max(0, (int) ($user['loyalty_points_balance'] ?? 0));
$earned = max(0, (int) ($user['loyalty_points_earned'] ?? 0));

$tier = 'Silver';
if ($earned >= 1500) {
    $tier = 'Platinum';
} elseif ($earned >= 600) {
    $tier = 'Gold';
}

$silverProgress = min(100, (int) round(($earned / 600) * 100));
$goldProgress = 0;
if ($earned >= 600) {
    $goldProgress = min(100, (int) round((($earned - 600) / 900) * 100));
}
$platinumProgress = $earned >= 1500 ? 100 : (int) round(($earned / 1500) * 100);

$toGold = max(0, 600 - $earned);
$toPlatinum = max(0, 1500 - $earned);

$historyEntries = [];
$earnedHistoryTotal = 0;
$usedHistoryTotal = 0;

$reservationStmt = $db->prepare('SELECT id, hotel_name, total_price, loyalty_points_awarded, updated_at FROM reservations WHERE user_id = ? AND status = ? AND loyalty_points_awarded > 0 ORDER BY updated_at DESC LIMIT 100');
$reservationStmt->execute([$_SESSION['user_id'], 'paid']);
$paidReservations = $reservationStmt->fetchAll();

foreach ($paidReservations as $row) {
    $points = max(0, (int) ($row['loyalty_points_awarded'] ?? 0));
    if ($points < 1) {
        continue;
    }

    $earnedHistoryTotal += $points;
    $historyEntries[] = [
        'type' => 'earned',
        'points' => $points,
        'title' => 'Reservation paid',
        'subtitle' => (string) ($row['hotel_name'] ?? 'Hotel booking'),
        'reference' => 'Reservation #' . (int) ($row['id'] ?? 0),
        'meta' => 'Bill: $' . number_format((float) ($row['total_price'] ?? 0), 2),
        'occurred_at' => $row['updated_at'] ?? null
    ];
}

$subscriptionStmt = $db->prepare('SELECT id, brand_name, points_cost, status, created_at FROM loyalty_subscriptions WHERE user_id = ? AND points_cost > 0 ORDER BY created_at DESC LIMIT 100');
$subscriptionStmt->execute([$_SESSION['user_id']]);
$subscriptionHistory = $subscriptionStmt->fetchAll();

foreach ($subscriptionHistory as $row) {
    $points = max(0, (int) ($row['points_cost'] ?? 0));
    if ($points < 1) {
        continue;
    }

    $usedHistoryTotal += $points;
    $historyEntries[] = [
        'type' => 'used',
        'points' => $points,
        'title' => 'Subscription redeemed',
        'subtitle' => (string) ($row['brand_name'] ?? 'Loyalty partner'),
        'reference' => 'Subscription #' . (int) ($row['id'] ?? 0),
        'meta' => 'Status: ' . ucfirst((string) ($row['status'] ?? 'active')),
        'occurred_at' => $row['created_at'] ?? null
    ];
}

usort($historyEntries, function ($a, $b) {
    $aTs = strtotime((string) ($a['occurred_at'] ?? '')) ?: 0;
    $bTs = strtotime((string) ($b['occurred_at'] ?? '')) ?: 0;
    if ($aTs === $bTs) {
        return 0;
    }
    return $aTs > $bTs ? -1 : 1;
});

$historyEntries = array_slice($historyEntries, 0, 80);

jsonResponse(true, 'Loyalty data loaded.', [
    'loyalty' => [
        'points_balance' => $balance,
        'total_earned' => $earned,
        'tier' => $tier,
        'thresholds' => [
            'gold' => 600,
            'platinum' => 1500
        ],
        'progress' => [
            'silver' => $silverProgress,
            'gold' => $goldProgress,
            'platinum' => $platinumProgress
        ],
        'points_to_next' => [
            'gold' => $toGold,
            'platinum' => $toPlatinum
        ],
        'rule' => [
            'spend_usd' => 100,
            'earn_points' => 50
        ],
        'history' => [
            'totals' => [
                'earned' => $earnedHistoryTotal,
                'used' => $usedHistoryTotal,
                'balance' => $balance,
                'count' => count($historyEntries)
            ],
            'entries' => $historyEntries
        ]
    ]
]);
