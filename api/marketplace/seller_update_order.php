<?php
/**
 * seller_update_order.php — Seller updates an order status
 * POST /api/v1/marketplace/seller_update_order.php
 * Body: { order_ref, status, note? }
 */
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Headers: Authorization, Content-Type');
header('Access-Control-Allow-Methods: POST, OPTIONS');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit; }
if ($_SERVER['REQUEST_METHOD'] !== 'POST') { http_response_code(405); echo json_encode(['status'=>'error','message'=>'Method not allowed']); exit; }

require_once '../init.php';
require_once __DIR__ . '/jwt_auth.php';

$viewer_id = (int) $user->_data->user_id;
$body      = json_decode(file_get_contents('php://input'), true) ?? [];

$order_ref  = trim((string) ($body['order_ref'] ?? ''));
$new_status = trim((string) ($body['status']    ?? ''));
$note       = trim((string) ($body['note']      ?? ''));

$allowed = ['processing', 'shipped', 'delivered', 'cancelled'];
if (!$order_ref || !in_array($new_status, $allowed)) {
    http_response_code(400);
    echo json_encode(['status' => 'error', 'message' => 'Invalid request. Allowed statuses: ' . implode(', ', $allowed)]);
    exit;
}

// Verify seller ownership
$check = $pdo->prepare("SELECT id FROM marketplace_orders WHERE order_ref = ? AND seller_id = ?");
$check->execute([$order_ref, $viewer_id]);
$order = $check->fetch();

if (!$order) {
    http_response_code(403);
    echo json_encode(['status' => 'error', 'message' => 'Order not found or not authorized']);
    exit;
}

$order_id = (int) $order['id'];

$pdo->prepare("UPDATE marketplace_orders SET status = ?, updated_at = NOW() WHERE id = ?")
    ->execute([$new_status, $order_id]);

$pdo->prepare("INSERT INTO marketplace_order_status_history (order_id, status, note) VALUES (?, ?, ?)")
    ->execute([$order_id, $new_status, $note ?: "Status updated to $new_status"]);

// Notify buyer (if notification system available)
// You can add push notification logic here

echo json_encode(['status' => 'success', 'message' => 'Order status updated to ' . $new_status]);
