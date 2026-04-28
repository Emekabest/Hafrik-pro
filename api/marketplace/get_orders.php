<?php
/**
 * get_orders.php — Buyer's marketplace orders
 * GET /api/v1/marketplace/get_orders.php
 */
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Headers: Authorization, Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit; }

require_once '../init.php';
require_once __DIR__ . '/jwt_auth.php';

$viewer_id = (int) $user->_data->user_id;
$page   = max(1, (int) ($_GET['page']  ?? 1));
$limit  = min(50, max(1, (int) ($_GET['limit'] ?? 20)));
$offset = ($page - 1) * $limit;

$stmt = $pdo->prepare("
    SELECT o.*,
           (SELECT COUNT(*) FROM marketplace_order_items WHERE order_id = o.id) AS items_count
    FROM marketplace_orders o
    WHERE o.buyer_id = ?
    ORDER BY o.created_at DESC
    LIMIT ? OFFSET ?
");
$stmt->execute([$viewer_id, $limit, $offset]);
$orders = $stmt->fetchAll(PDO::FETCH_ASSOC);

foreach ($orders as &$o) {
    $o['items_count'] = (int) $o['items_count'];
    $o['total']       = (float) $o['total'];
}

echo json_encode(['status' => 'success', 'data' => $orders, 'page' => $page, 'limit' => $limit]);
