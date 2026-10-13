<?php
// Invoice API - Itemized receipt and billing data for reservations
require_once __DIR__ . '/config.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    jsonResponse(false, 'Method not allowed.');
}

if (!isset($_SESSION['user_id'])) {
    http_response_code(401);
    jsonResponse(false, 'Please log in first.');
}
requireUserRole();

$reservationId = filter_input(INPUT_GET, 'id', FILTER_VALIDATE_INT);
if (!$reservationId || $reservationId < 1) {
    http_response_code(400);
    jsonResponse(false, 'Invalid reservation ID.');
}

$db = getDB();
$userId = $_SESSION['user_id'];

// Fetch reservation + hotel + guest info
$stmt = $db->prepare('
    SELECT r.*, 
           rm.location AS hotel_location, rm.image AS hotel_image,
           u.full_name AS guest_name, u.email AS guest_email, u.phone AS guest_phone
    FROM reservations r
    LEFT JOIN rooms rm ON rm.id = r.room_id
    INNER JOIN users u ON u.id = r.user_id
    WHERE r.id = ? AND r.user_id = ?
');
$stmt->execute([$reservationId, $userId]);
$res = $stmt->fetch();

if (!$res) {
    http_response_code(404);
    jsonResponse(false, 'Reservation not found or access denied.');
}

// Parse services & room upgrades
$servicesList = [];
try {
    $decoded = json_decode($res['services'] ?? '[]', true);
    if (is_array($decoded)) {
        foreach ($decoded as $item) {
            if (is_array($item) && isset($item['label'])) {
                $servicesList[] = [
                    'label' => $item['label'],
                    'price' => floatval($item['price'] ?? 0)
                ];
            } elseif (is_string($item)) {
                $servicesList[] = [
                    'label' => ucwords(str_replace('_', ' ', $item)),
                    'price' => 0
                ];
            }
        }
    }
} catch (\Throwable $e) {
    $servicesList = [];
}

$invoiceNumber = 'RF-INV-' . date('Y', strtotime($res['created_at'])) . '-' . str_pad($res['id'], 5, '0', STR_PAD_LEFT);
$pointsEarned = (int) ($res['loyalty_points_awarded'] > 0 
    ? $res['loyalty_points_awarded'] 
    : floor(floatval($res['total_price']) * 0.5));

$invoice = [
    'invoice_number' => $invoiceNumber,
    'date_issued' => date('F j, Y', strtotime($res['created_at'])),
    'booking_status' => $res['status'],
    'hotel' => [
        'name' => $res['hotel_name'],
        'location' => $res['hotel_location'] ?? 'Bangladesh',
        'image' => $res['hotel_image'] ?? 'img/rooms/room1.jpg'
    ],
    'stay' => [
        'check_in' => date('M j, Y', strtotime($res['check_in'])),
        'check_out' => date('M j, Y', strtotime($res['check_out'])),
        'nights' => intval($res['nights']),
        'rooms_count' => intval($res['rooms_count']),
        'guests' => intval($res['guests']),
    ],
    'guest' => [
        'name' => $res['guest_name'],
        'email' => $res['guest_email'],
        'phone' => !empty($res['guest_phone']) ? $res['guest_phone'] : 'Not provided'
    ],
    'line_items' => [
        'base_price' => floatval($res['base_price']),
        'services_price' => floatval($res['services_price']),
        'services_details' => $servicesList,
        'taxes' => floatval($res['taxes']),
        'total_price' => floatval($res['total_price']),
    ],
    'loyalty_points' => $pointsEarned,
    'company' => [
        'name' => 'RoomFound Hospitality Platforms Ltd.',
        'tagline' => 'Luxury & Boutique Hotel Management',
        'address' => 'Marine Drive & Gulshan Diplomatic Zone, Bangladesh',
        'email' => 'billing@roomfound.com'
    ]
];

jsonResponse(true, 'Invoice loaded.', ['invoice' => $invoice]);
