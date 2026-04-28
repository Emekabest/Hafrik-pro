<?php
/**
 * seller_orders.php — Orders received by a seller
 * GET /api/v1/marketplace/seller_orders.php[?status=processing]
 */
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Headers: Authorization, Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit; }

require_once '../init.php';
require_once __DIR__ . '/jwt_auth.php';

$viewer_id = (int) $user->_data->user_id;
$status    = $_GET['status'] ?? null;
$page      = max(1, (int) ($_GET['page']  ?? 1));
$limit     = min(50, max(1, (int) ($_GET['limit'] ?? 20)));
$offset    = ($page - 1) * $limit;

$where  = "WHERE o.seller_id = ?";
$params = [$viewer_id];

if ($status && $status !== 'all') {
    $where   .= " AND o.status = ?";
    $params[] = $status;
}

$params[] = $limit;
$params[] = $offset;

$stmt = $pdo->prepare("
    SELECT o.*,
           u.username AS buyer_username,
           u.avatar   AS buyer_avatar,
           (SELECT COUNT(*) FROM marketplace_order_items WHERE order_id = o.id) AS items_count
    FROM marketplace_orders o
    LEFT JOIN users u ON u.user_id = o.buyer_id
    $where
    ORDER BY o.created_at DESC
    LIMIT ? OFFSET ?
");
$stmt->execute($params);
$orders = $stmt->fetchAll(PDO::FETCH_ASSOC);

foreach ($orders as &$o) {
    $o['items_count'] = (int)   $o['items_count'];
    $o['total']       = (float) $o['total'];
}

// Status counts for badge tabs
$counts = [];
foreach (['pending','processing','shipped','delivered','cancelled'] as $s) {
    $cs = $pdo->prepare("SELECT COUNT(*) FROM marketplace_orders WHERE seller_id = ? AND status = ?");
    $cs->execute([$viewer_id, $s]);
    $counts[$s] = (int) $cs->fetchColumn();
}
$counts['all'] = array_sum($counts);

echo json_encode(['status' => 'success', 'data' => $orders, 'counts' => $counts, 'page' => $page]);
