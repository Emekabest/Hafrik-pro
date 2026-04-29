<?php
/**
 * get_order_detail.php — Single order + items
 * GET /api/v1/marketplace/get_order_detail.php?order_id=29
 *
 * Reads from native Sngine `orders` and `orders_items` tables only.
 * Does NOT use WooCommerce or $user->get_orders().
 */
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Headers: Authorization, Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit; }

require_once '../init.php';
require_once __DIR__ . '/jwt_auth.php';

// ── Auth ──────────────────────────────────────────────────────────────────────
if (!isset($user) || empty($user->_data->user_id)) {
    http_response_code(401);
    echo json_encode(['status' => 'error', 'message' => 'Unauthorized']);
    exit;
}

$buyer_id = (int) $user->_data->user_id;

// ── Input validation ──────────────────────────────────────────────────────────
$order_id = (int) ($_GET['order_id'] ?? 0);

if ($order_id <= 0) {
    http_response_code(400);
    echo json_encode(['status' => 'error', 'message' => 'Invalid order_id']);
    exit;
}

// ── Fetch order (must belong to this buyer) ───────────────────────────────────
try {
    $stmt = $pdo->prepare("
        SELECT
            order_id,
            order_hash,
            sub_total,
            status,
            insert_time
        FROM orders
        WHERE order_id = ? AND buyer_id = ?
        LIMIT 1
    ");
    $stmt->execute([$order_id, $buyer_id]);
    $order = $stmt->fetch(PDO::FETCH_ASSOC);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['status' => 'error', 'message' => 'Failed to fetch order']);
    exit;
}

if (!$order) {
    http_response_code(404);
    echo json_encode(['status' => 'error', 'message' => 'Order not found']);
    exit;
}

// ── Fetch order items ─────────────────────────────────────────────────────────
try {
    $is = $pdo->prepare("
        SELECT
            id,
            product_post_id,
            quantity,
            price,
            selected_variations
        FROM orders_items
        WHERE order_id = ?
    ");
    $is->execute([$order_id]);
    $rows = $is->fetchAll(PDO::FETCH_ASSOC);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['status' => 'error', 'message' => 'Failed to fetch order items']);
    exit;
}

$items = [];
foreach ($rows as $row) {
    $items[] = [
        'item_id'    => (int)   $row['id'],
        'product_id' => (int)   ($row['product_post_id'] ?? 0),
        'quantity'   => (int)   $row['quantity'],
        'price'      => (float) $row['price'],
        'variations' => json_decode($row['selected_variations'] ?? '[]', true) ?? [],
    ];
}

// ── Response ──────────────────────────────────────────────────────────────────
echo json_encode([
    'status' => 'success',
    'data'   => [
        'order_id'   => (int)    $order['order_id'],
        'order_hash' => (string) ($order['order_hash']  ?? ''),
        'total'      => (float)  ($order['sub_total']   ?? 0),
        'status'     => (string) ($order['status']      ?? 'placed'),
        'created_at' => (string) ($order['insert_time'] ?? ''),
        'items'      => $items,
    ],
]);
