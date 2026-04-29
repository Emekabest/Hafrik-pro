<?php
/**
 * get_orders.php — Buyer's marketplace orders
 * GET /api/v1/marketplace/get_orders.php
 *
 * Reads directly from the Hafrik (Sngine) native `orders` and `orders_items`
 * tables. Does NOT use $user->get_orders() and has no WooCommerce dependency.
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

// ── Query ─────────────────────────────────────────────────────────────────────
try {
    $stmt = $pdo->prepare("
        SELECT
            o.order_id,
            o.order_hash,
            o.sub_total,
            o.status,
            o.insert_time,
            COUNT(oi.id) AS items_count
        FROM orders o
        LEFT JOIN orders_items oi ON oi.order_id = o.order_id
        WHERE o.buyer_id = ?
        GROUP BY o.order_id
        ORDER BY o.order_id DESC
    ");
    $stmt->execute([$buyer_id]);
    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['status' => 'error', 'message' => 'Failed to fetch orders']);
    exit;
}

// ── Normalise & return ────────────────────────────────────────────────────────
$data = [];
foreach ($rows as $row) {
    $data[] = [
        'order_id'    => (int)    $row['order_id'],
        'order_hash'  => (string) ($row['order_hash']  ?? ''),
        'total'       => (float)  ($row['sub_total']   ?? 0),
        'status'      => (string) ($row['status']      ?? 'placed'),
        'created_at'  => (string) ($row['insert_time'] ?? ''),
        'items_count' => (int)    ($row['items_count'] ?? 0),
    ];
}

echo json_encode(['status' => 'success', 'data' => $data]);
