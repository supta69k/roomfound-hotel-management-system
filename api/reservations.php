<?php
// Reservation API - Create and list user reservations
require_once __DIR__ . '/config.php';

if (!isset($_SESSION['user_id'])) {
    http_response_code(401);
    jsonResponse(false, 'Please log in first.');
}
requireUserRole();

$db = getDB();
$userId = $_SESSION['user_id'];

// GET - List user's reservations
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $stmt = $db->prepare('
        SELECT id, room_id, hotel_name, check_in, check_out, nights, guests, rooms_count,
               services, base_price, services_price, taxes, total_price, status, admin_note, created_at
        FROM reservations
        WHERE user_id = ?
        ORDER BY created_at DESC
    ');
    $stmt->execute([$userId]);
    $reservations = $stmt->fetchAll();

    jsonResponse(true, 'Reservations loaded.', ['reservations' => $reservations]);
}

// POST - Create new reservation
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $input = json_decode(file_get_contents('php://input'), true);

    $roomId = intval($input['room_id'] ?? 0);
    $checkIn = trim($input['check_in'] ?? '');
    $checkOut = trim($input['check_out'] ?? '');
    $guests = intval($input['guests'] ?? 1);
    $roomsCount = intval($input['rooms_count'] ?? 1);
    $services = $input['services'] ?? [];

    // Validation
    if ($roomId < 1) {
        jsonResponse(false, 'Missing required reservation details.');
    }

    if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $checkIn) || !preg_match('/^\d{4}-\d{2}-\d{2}$/', $checkOut)) {
        jsonResponse(false, 'Invalid date format.');
    }

    try {
        $ciDate = new DateTime($checkIn);
        $coDate = new DateTime($checkOut);
    } catch (Exception $e) {
        jsonResponse(false, 'Invalid date.');
    }
    $today = new DateTime('today');
    $maxAhead = (clone $today)->modify('+1 year');

    if ($ciDate < $today) {
        jsonResponse(false, 'Check-in date cannot be in the past.');
    }
    if ($ciDate > $maxAhead) {
        jsonResponse(false, 'Check-in date cannot be more than a year ahead.');
    }
    if ($coDate <= $ciDate) {
        jsonResponse(false, 'Check-out must be after check-in.');
    }
    if ($guests < 1 || $guests > 20) {
        jsonResponse(false, 'Guests must be between 1 and 20.');
    }
    if ($roomsCount < 1 || $roomsCount > 5) {
        jsonResponse(false, 'Rooms must be between 1 and 5.');
    }

    $nights = (int) $ciDate->diff($coDate)->format('%a');
    if ($nights < 1 || $nights > 30) {
        jsonResponse(false, 'Stays are limited to 1-30 nights.');
    }

    // Service & room-option pricing is defined server-side so clients can
    // never set their own price. Mirrors the options shown on hotel.html.
    $serviceCatalog = [
        'spa'      => ['label' => 'Spa Session', 'price' => 45],
        'pool'     => ['label' => 'Pool Access', 'price' => 30],
        'airport'  => ['label' => 'Airport Pickup', 'price' => 25],
        'breakfast' => ['label' => 'Breakfast', 'price' => 20],
        'gym'      => ['label' => 'Gym Access', 'price' => 15],
        'laundry'  => ['label' => 'Laundry Service', 'price' => 18],
    ];
    $roomOptionCatalog = [
        'single_twin'  => ['label' => 'Single / Twin Beds', 'price' => 0],
        'king'         => ['label' => 'King Bed Room', 'price' => 35],
        'deluxe_suite' => ['label' => 'Deluxe Suite', 'price' => 65],
        'luxury_suite' => ['label' => 'Luxury Suite', 'price' => 120],
    ];

    if (!is_array($services)) {
        $services = [];
    }
    $selectedServices = [];
    $servicesPrice = 0.0;
    foreach ($services as $key) {
        $key = trim((string) $key);
        if (!isset($serviceCatalog[$key])) {
            continue;
        }
        $selectedServices[] = $serviceCatalog[$key];
        $servicesPrice += $serviceCatalog[$key]['price'];
    }

    $roomOptionKey = trim((string) ($input['room_option'] ?? 'single_twin'));
    if (!isset($roomOptionCatalog[$roomOptionKey])) {
        $roomOptionKey = 'single_twin';
    }
    $roomOption = $roomOptionCatalog[$roomOptionKey];

    try {
        $db->beginTransaction();

        // Lock the hotel row so two simultaneous bookings cannot oversell.
        $stmt = $db->prepare('SELECT id, name, price_per_night, total_rooms FROM rooms WHERE id = ? FOR UPDATE');
        $stmt->execute([$roomId]);
        $room = $stmt->fetch();
        if (!$room) {
            $db->rollBack();
            jsonResponse(false, 'Hotel not found.');
        }

        $booked = getBookedRooms($db, $roomId, $checkIn, $checkOut);
        $available = intval($room['total_rooms']) - $booked;
        if ($roomsCount > $available) {
            $db->rollBack();
            jsonResponse(false, $available > 0
                ? "Only {$available} room(s) left for those dates."
                : 'No rooms available for those dates.');
        }

        // Prices are computed from the database, never from client input.
        // Room upgrades are per room per night; services are flat per stay.
        $basePrice = round(floatval($room['price_per_night']) * $roomsCount * $nights, 2);
        $roomOptionCost = round($roomOption['price'] * $roomsCount * $nights, 2);
        $servicesPrice = round($servicesPrice + $roomOptionCost, 2);
        $taxes = round(($basePrice + $servicesPrice) * 0.05, 2);
        $totalPrice = round($basePrice + $servicesPrice + $taxes, 2);

        $servicesSummary = array_merge(
            [['label' => 'Room type: ' . $roomOption['label'], 'price' => 0]],
            $selectedServices
        );

        $stmt = $db->prepare('
            INSERT INTO reservations (user_id, room_id, hotel_name, check_in, check_out, nights, guests, rooms_count, services, base_price, services_price, taxes, total_price, status)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, "pending")
        ');
        $stmt->execute([
            $userId,
            $roomId,
            $room['name'],
            $checkIn,
            $checkOut,
            $nights,
            $guests,
            $roomsCount,
            json_encode($servicesSummary),
            $basePrice,
            $servicesPrice,
            $taxes,
            $totalPrice
        ]);

        $reservationId = $db->lastInsertId();
        $db->commit();
    } catch (PDOException $e) {
        if ($db->inTransaction()) {
            $db->rollBack();
        }
        error_log('Reservation insert failed: ' . $e->getMessage());
        jsonResponse(false, 'Could not save the reservation. Please try again.');
    }

    jsonResponse(true, 'Reservation submitted! Status: Pending admin approval.', [
        'reservation_id' => $reservationId,
        'total_price' => $totalPrice
    ]);
}

http_response_code(405);
jsonResponse(false, 'Method not allowed.');
