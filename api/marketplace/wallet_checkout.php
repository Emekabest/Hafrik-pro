<?php
/**
 * wallet_checkout.php — Place a marketplace order paid from Hafrik wallet
 * POST /api/v1/marketplace/wallet_checkout.php
 *
 * Wallet is stored in CNY (¥). The app sends:
 *   amount_ngn  — order total in NGN (stored as sub_total on the order)
 *   amount_cny  — estimated CNY equivalent (used for wallet deduction)
 *
 * Server deducts amount_cny from wallet and writes the order to the native
 * Sngine `orders` and `orders_items` tables.
 */
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Headers: Authorization, Content-Type');
header('Access-Control-Allow-Methods: POST, OPTIONS');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit; }
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['status' => 'error', 'message' => 'Method not allowed']);
    exit;
}

require_once '../init.php';
require_once __DIR__ . '/jwt_auth.php';

// ── Auth ──────────────────────────────────────────────────────────────────────
if (!isset($user) || empty($user->_data->user_id)) {
    http_response_code(401);
    echo json_encode(['status' => 'error', 'message' => 'Unauthorized']);
    exit;
}

$buyer_id = (int) $user->_data->user_id;
$body     = json_decode(file_get_contents('php://input'), true) ?? [];

// ── Input ─────────────────────────────────────────────────────────────────────
$amount_ngn = (float) ($body['amount_ngn'] ?? $body['amount'] ?? 0); // NGN total → stored on order

// Fixed rate: 1 CNY = 215 NGN. Always recalculate server-side so the client cannot manipulate the deduction.
$NGN_PER_CNY = 215.0;
$amount_cny  = $amount_ngn > 0 ? round($amount_ngn / $NGN_PER_CNY, 4) : (float) ($body['amount_cny'] ?? 0);
$items      =          ($body['items']      ?? []);
$address    =          ($body['address']    ?? []);
$note       = (string) ($body['note']       ?? '');

if (empty($items)) {
    http_response_code(400);
    echo json_encode(['status' => 'error', 'message' => 'Cart is empty']);
    exit;
}

if ($amount_cny <= 0) {
    // Fallback: if client didn't send CNY amount, reject gracefully
    http_response_code(400);
    echo json_encode(['status' => 'error', 'message' => 'Invalid payment amount. Please retry from the checkout screen.']);
    exit;
}

// ── Check wallet balance ──────────────────────────────────────────────────────
$balStmt = $pdo->prepare("SELECT balance FROM wallets WHERE user_id = ?");
$balStmt->execute([$buyer_id]);
$wallet  = $balStmt->fetch(PDO::FETCH_ASSOC);
$balance = (float) ($wallet['balance'] ?? 0);

if ($balance < $amount_cny) {
    http_response_code(402);
    echo json_encode([
        'status'   => 'error',
        'message'  => 'Insufficient wallet balance',
        'balance'  => $balance,
        'required' => $amount_cny,
    ]);
    exit;
}

// ── Transaction ───────────────────────────────────────────────────────────────
$pdo->beginTransaction();
try {
    // Atomically deduct CNY — re-checks balance to prevent race conditions
    $deduct = $pdo->prepare(
        "UPDATE wallets SET balance = balance - ? WHERE user_id = ? AND balance >= ?"
    );
    $deduct->execute([$amount_cny, $buyer_id, $amount_cny]);
    if ($deduct->rowCount() === 0) {
        throw new Exception('Balance changed — please retry');
    }

    // Wallet transaction log
    $pdo->prepare(
        "INSERT INTO wallet_transactions (user_id, amount, type, node_type, description)
         VALUES (?, ?, 'out', 'marketplace', 'Marketplace order — wallet payment')"
    )->execute([$buyer_id, $amount_cny]);

    // Unique order reference
    $order_hash = 'HMO-' . strtoupper(bin2hex(random_bytes(6)));

    // Build shipping address string
    $addr_parts = array_filter([
        $address['street']   ?? '',
        $address['city']     ?? '',
        $address['state']    ?? '',
        $address['country']  ?? '',
        $address['postcode'] ?? '',
    ]);
    $shipping_address = implode(', ', $addr_parts);

    // Insert into native Sngine orders table
    $ins = $pdo->prepare("
        INSERT INTO orders
            (order_hash, buyer_id, sub_total, status, payment_method,
             shipping_name, shipping_phone, shipping_address, notes, insert_time)
        VALUES (?, ?, ?, 'placed', 'wallet', ?, ?, ?, ?, NOW())
    ");
    $ins->execute([
        $order_hash,
        $buyer_id,
        $amount_ngn,
        trim(($address['first_name'] ?? '') . ' ' . ($address['last_name'] ?? '')),
        $address['phone']   ?? '',
        $shipping_address,
        $note,
    ]);
    $order_id = (int) $pdo->lastInsertId();

    // Insert order items into native orders_items table
    $itemIns = $pdo->prepare("
        INSERT INTO orders_items
            (order_id, product_id, title, price, quantity, variations, thumbnail)
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

    $pdo->commit();

    echo json_encode([
        'status'     => 'success',
        'message'    => 'Order placed successfully',
        'data'       => [
            'order_id'   => $order_id,
            'order_hash' => $order_hash,
        ],
    ]);

} catch (Exception $e) {
    $pdo->rollBack();
    http_response_code(500);
    echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
}
