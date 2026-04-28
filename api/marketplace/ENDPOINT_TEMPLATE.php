<?php
/**
 * TEMPLATE — apply this pattern to every marketplace endpoint.
 *
 * Files to update on the server:
 *   get_marketplace.php
 *   get_product.php
 *   add_to_cart.php
 *   get_cart.php
 *   update_cart.php
 *   remove_from_cart.php
 *   checkout.php
 *   get_categories.php
 *   get_countries.php
 *   get_orders.php
 *   verify_payment.php
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * BEFORE (session-based — breaks with mobile JWT)
 * ─────────────────────────────────────────────────────────────────────────────

header('Content-Type: application/json');
require_once '../init.php';       // Sngine bootstrap

// ❌ This checks PHP session — will always fail from mobile
$viewer = auth_user($db);
if (!$viewer) {
    echo json_encode(['status' => 'error', 'message' => 'You are not authorized to do this action']);
    exit;
}

$user_id = $viewer->user_id;

 * ─────────────────────────────────────────────────────────────────────────────
 * AFTER (JWT-based — works with mobile app)
 * ─────────────────────────────────────────────────────────────────────────────
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Headers: Authorization, Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

require_once '../init.php';              // Sngine bootstrap (loads User class, DB, etc.)
require_once __DIR__ . '/jwt_auth.php'; // ✅ JWT bridge — sets $user->_data

// From here on, use $user->_data exactly as Sngine expects.
// Example usages:
$viewer_id = (int) $user->_data->user_id;   // the authenticated user's ID
// $user->_data->username
// $user->_data->email
// etc.

// ─── Your endpoint logic below ────────────────────────────────────────────────

// Example: get_cart.php
// $stmt = $pdo->prepare("SELECT * FROM marketplace_cart WHERE user_id = ? AND status = 'active'");
// $stmt->execute([$viewer_id]);
// $items = $stmt->fetchAll(PDO::FETCH_ASSOC);
// echo json_encode(['status' => 'success', 'data' => ['items' => $items]]);
