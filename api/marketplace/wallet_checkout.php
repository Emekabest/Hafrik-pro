<?php
/**
 * wallet_checkout.php — Place a marketplace order paid from wallet balance
 * POST /api/v1/marketplace/wallet_checkout.php
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

$amount   = (float)  ($body['amount']   ?? 0);
$currency = (string) ($body['currency'] ?? 'CNY');
$items    = $body['items']   ?? [];
$address  = $body['address'] ?? [];
$note     = (string) ($body['note'] ?? '');

if ($amount <= 0 || empty($items)) {
    http_response_code(400);
    echo json_encode(['status' => 'error', 'message' => 'Invalid order data']);
    exit;
}

// Check wallet balance
$balStmt = $pdo->prepare("SELECT balance FROM wallets WHERE user_id = ?");
$balStmt->execute([$viewer_id]);
$wallet  = $balStmt->fetch(PDO::FETCH_ASSOC);
$balance = (float) ($wallet['balance'] ?? 0);

if ($balance < $amount) {
    http_response_code(402);
    echo json_encode([
        'status'   => 'error',
        'message'  => 'Insufficient wallet balance',
        'balance'  => $balance,
        'required' => $amount,
    ]);
    exit;
}

$pdo->beginTransaction();
try {
    // Atomic deduct — also re-checks balance
    $deduct = $pdo->prepare(
        "UPDATE wallets SET balance = balance - ? WHERE user_id = ? AND balance >= ?"
    );
    $deduct->execute([$amount, $viewer_id, $amount]);
    if ($deduct->rowCount() === 0) throw new Exception('Balance changed — please retry');

    // Wallet transaction log
    $pdo->prepare(
        "INSERT INTO wallet_transactions (user_id, amount, type, node_type, description) VALUES (?, ?, 'out', 'marketplace', 'Marketplace order payment')"
    )->execute([$viewer_id, $amount]);

    // Unique order reference
    $order_ref = 'HMO-' . strtoupper(bin2hex(random_bytes(6)));

    // Create order record
    $ins = $pdo->prepare("
        INSERT INTO marketplace_orders
            (order_ref, buyer_id, status, total, currency, payment_method, items_json, shipping_json, notes)
        VALUES (?, ?, 'processing', ?, ?, 'wallet', ?, ?, ?)
    ");
    $ins->execute([
        $order_ref, $viewer_id, $amount, $currency,
        json_encode($items), json_encode($address), $note,
    ]);
    $order_id = (int) $pdo->lastInsertId();

    // Order items
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

    // Initial status history entry
    $pdo->prepare(
        "INSERT INTO marketplace_order_status_history (order_id, status, note) VALUES (?, 'processing', 'Order placed — paid from Hafrik wallet')"
    )->execute([$order_id]);

    $pdo->commit();

    echo json_encode([
        'status'    => 'success',
        'message'   => 'Order placed successfully',
        'order_ref' => $order_ref,
        'order_id'  => $order_id,
    ]);
} catch (Exception $e) {
    $pdo->rollBack();
    http_response_code(500);
    echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
}
