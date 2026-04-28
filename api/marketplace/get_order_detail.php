<?php
/**
 * get_order_detail.php — Single order + items + status history
 * GET /api/v1/marketplace/get_order_detail.php?order_ref=HMO-xxxx
 */
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Headers: Authorization, Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit; }

require_once '../init.php';
require_once __DIR__ . '/jwt_auth.php';

$viewer_id = (int) $user->_data->user_id;
$order_ref = trim($_GET['order_ref'] ?? '');

if (!$order_ref) {
    http_response_code(400);
    echo json_encode(['status' => 'error', 'message' => 'order_ref is required']);
    exit;
}

// Buyer OR seller can view
$stmt = $pdo->prepare("
    SELECT * FROM marketplace_orders
    WHERE order_ref = ? AND (buyer_id = ? OR seller_id = ?)
");
$stmt->execute([$order_ref, $viewer_id, $viewer_id]);
$order = $stmt->fetch(PDO::FETCH_ASSOC);

if (!$order) {
    http_response_code(404);
    echo json_encode(['status' => 'error', 'message' => 'Order not found']);
    exit;
}

$order_id = (int) $order['id'];
$order['total'] = (float) $order['total'];

// Items
$is = $pdo->prepare("SELECT * FROM marketplace_order_items WHERE order_id = ?");
$is->execute([$order_id]);
$items = $is->fetchAll(PDO::FETCH_ASSOC);
foreach ($items as &$item) {
    $item['price']    = (float) $item['price'];
    $item['quantity'] = (int)   $item['quantity'];
    $item['variations'] = json_decode($item['variations_json'] ?? '[]', true);
}
$order['items'] = $items;

// Status history (oldest first → timeline)
$hs = $pdo->prepare("
    SELECT * FROM marketplace_order_status_history
    WHERE order_id = ? ORDER BY created_at ASC
");
$hs->execute([$order_id]);
$order['history'] = $hs->fetchAll(PDO::FETCH_ASSOC);

// Buyer info
$bs = $pdo->prepare("SELECT username, avatar FROM users WHERE user_id = ?");
$bs->execute([(int) $order['buyer_id']]);
$buyer = $bs->fetch(PDO::FETCH_ASSOC);
$order['buyer_username'] = $buyer['username'] ?? null;
$order['buyer_avatar']   = $buyer['avatar']   ?? null;

echo json_encode(['status' => 'success', 'data' => $order]);
