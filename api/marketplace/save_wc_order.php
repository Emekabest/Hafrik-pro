<?php
/**
 * save_wc_order.php — Mirror a successful WooCommerce (Paystack) order into Hafrik DB
 * Called by MarketplacePaymentScreen after detecting Paystack success.
 * POST /api/v1/marketplace/save_wc_order.php
 * Body: { wc_order_id, items[], address{} }
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

$wc_order_id = trim((string) ($body['wc_order_id'] ?? ''));
$items       = $body['items']   ?? [];
$address     = $body['address'] ?? [];
$total       = (float) ($body['total']    ?? 0);
$currency    = (string) ($body['currency'] ?? 'USD');

if (!$wc_order_id) {
    http_response_code(400);
    echo json_encode(['status' => 'error', 'message' => 'wc_order_id required']);
    exit;
}

// Avoid duplicate saves
$dup = $pdo->prepare("SELECT id FROM marketplace_orders WHERE wc_order_id = ?");
$dup->execute([$wc_order_id]);
if ($dup->fetch()) {
    echo json_encode(['status' => 'success', 'message' => 'Already saved']);
    exit;
}

$order_ref = 'WCO-' . $wc_order_id;

$pdo->beginTransaction();
try {
    $ins = $pdo->prepare("
        INSERT INTO marketplace_orders
            (order_ref, buyer_id, status, total, currency, payment_method, items_json, shipping_json, wc_order_id)
        VALUES (?, ?, 'processing', ?, ?, 'paystack', ?, ?, ?)
    ");
    $ins->execute([
        $order_ref, $viewer_id, $total, $currency,
        json_encode($items), json_encode($address), $wc_order_id,
    ]);
    $order_id = (int) $pdo->lastInsertId();

    $itemIns = $pdo->prepare("
        INSERT INTO marketplace_order_items
            (order_id, product_id, title, price, quantity, variations_json, thumbnail)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    ");
    foreach ($items as $item) {
        $itemIns->execute([
            $order_id,
            (int)    ($item['post_id']   ?? 0),
            (string) ($item['title']     ?? ''),
            (float)  ($item['price']     ?? 0),
            (int)    ($item['quantity']  ?? 1),
            json_encode($item['variations'] ?? []),
            (string) ($item['thumbnail'] ?? ''),
        ]);
    }

    $pdo->prepare(
        "INSERT INTO marketplace_order_status_history (order_id, status, note) VALUES (?, 'processing', 'Order paid via Paystack')"
    )->execute([$order_id]);

    $pdo->commit();
    echo json_encode(['status' => 'success', 'order_ref' => $order_ref, 'order_id' => $order_id]);
} catch (Exception $e) {
    $pdo->rollBack();
    http_response_code(500);
    echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
}
