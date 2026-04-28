<?php
/**
 * topup_init.php — Initiate a Hafrik wallet top-up via Paystack
 * POST /api/v1/marketplace/topup_init.php
 * Body: { amount }   (amount in platform currency, e.g. CNY)
 */
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Headers: Authorization, Content-Type');
header('Access-Control-Allow-Methods: POST, OPTIONS');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit; }
if ($_SERVER['REQUEST_METHOD'] !== 'POST') { http_response_code(405); echo json_encode(['status'=>'error','message'=>'Method not allowed']); exit; }

require_once '../init.php';
require_once __DIR__ . '/jwt_auth.php';

$viewer_id = (int)    $user->_data->user_id;
$email     = (string) ($user->_data->email ?? '');
$body      = json_decode(file_get_contents('php://input'), true) ?? [];
$amount    = (float)  ($body['amount'] ?? 0);

if ($amount < 1) {
    http_response_code(400);
    echo json_encode(['status' => 'error', 'message' => 'Minimum top-up is ¥1']);
    exit;
}

// Convert CNY → NGN kobo (example rate: 1 CNY ≈ 200 NGN; adjust as needed)
// You should use a live rate from your exchange system or a fixed rate table
$cny_to_ngn  = defined('CNY_TO_NGN_RATE') ? (float) CNY_TO_NGN_RATE : 200.0;
$amount_ngn  = round($amount * $cny_to_ngn, 2);
$amount_kobo = (int) round($amount_ngn * 100);

$ref = 'HWT-' . $viewer_id . '-' . time() . '-' . rand(100, 999);

// Store pending top-up record
$ins = $pdo->prepare("
    INSERT INTO wallet_topups (user_id, amount_cny, amount_ngn, reference, status)
    VALUES (?, ?, ?, ?, 'pending')
");
$ins->execute([$viewer_id, $amount, $amount_ngn, $ref]);

// Call Paystack to create a transaction
$secret = defined('PAYSTACK_SECRET_KEY') ? PAYSTACK_SECRET_KEY : getenv('PAYSTACK_SECRET_KEY');
$payload = json_encode([
    'email'        => $email,
    'amount'       => $amount_kobo,
    'reference'    => $ref,
    'currency'     => 'NGN',
    'callback_url' => 'https://hafrik.com/api/v1/marketplace/topup_callback.php',
    'metadata'     => ['user_id' => $viewer_id, 'amount_cny' => $amount, 'purpose' => 'wallet_topup'],
]);

$ch = curl_init('https://api.paystack.co/transaction/initialize');
curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_POST           => true,
    CURLOPT_POSTFIELDS     => $payload,
    CURLOPT_HTTPHEADER     => [
        "Authorization: Bearer $secret",
        'Content-Type: application/json',
    ],
]);
$result = curl_exec($ch);
$err    = curl_error($ch);
curl_close($ch);

if ($err) {
    http_response_code(500);
    echo json_encode(['status' => 'error', 'message' => 'Network error: ' . $err]);
    exit;
}

$data = json_decode($result, true);
if (empty($data['status'])) {
    http_response_code(500);
    echo json_encode(['status' => 'error', 'message' => $data['message'] ?? 'Paystack error']);
    exit;
}

echo json_encode([
    'status'      => 'success',
    'payment_url' => $data['data']['authorization_url'],
    'reference'   => $ref,
    'amount_cny'  => $amount,
    'amount_ngn'  => $amount_ngn,
]);
