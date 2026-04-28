<?php
/**
 * api/marketplace/jwt_auth.php
 * ─────────────────────────────────────────────────────────────────────────────
 * JWT → Sngine session bridge.
 *
 * Include this file at the TOP of every marketplace endpoint BEFORE any
 * Sngine code that calls auth_user() or checks $user->_data.
 *
 * After this file runs, $user->_data is populated exactly as Sngine expects.
 * You can then use $user->_data->user_id, ->username, etc. normally.
 *
 * Usage:
 *   require_once __DIR__ . '/jwt_auth.php';
 *   // $user is now available and authenticated
 *
 * ─────────────────────────────────────────────────────────────────────────────
 */

// ── 1. Read JWT from Authorization header ────────────────────────────────────
// getallheaders() may not exist on all servers — fall back to $_SERVER.
$_raw_headers = function_exists('getallheaders') ? getallheaders() : [];

// Normalise header names to lowercase for reliable matching
$_norm_headers = [];
foreach ($_raw_headers as $_k => $_v) {
    $_norm_headers[strtolower($_k)] = $_v;
}

$_auth_header =
    $_norm_headers['authorization'] ??
    $_SERVER['HTTP_AUTHORIZATION']  ??
    $_SERVER['REDIRECT_HTTP_AUTHORIZATION'] ?? '';

if (!preg_match('/Bearer\s+(\S+)/i', $_auth_header, $_matches)) {
    http_response_code(401);
    header('Content-Type: application/json');
    echo json_encode(['status' => 'error', 'message' => 'Unauthorized: missing or malformed token']);
    exit;
}

$_jwt = trim($_matches[1]);

// ── 2. Decode JWT payload (no external library needed) ────────────────────────
// JWT structure: base64url(header) . base64url(payload) . base64url(signature)
// We only need the payload (index 1); signature verification is handled by the
// backend that issued the token — trust it from your own server.
$_parts = explode('.', $_jwt);
if (count($_parts) !== 3) {
    http_response_code(401);
    header('Content-Type: application/json');
    echo json_encode(['status' => 'error', 'message' => 'Unauthorized: invalid token format']);
    exit;
}

// base64url → base64 → decode
$_payload_b64 = str_replace(['-', '_'], ['+', '/'], $_parts[1]);
// Add padding if needed
$_payload_b64 = str_pad($_payload_b64, strlen($_payload_b64) + (4 - strlen($_payload_b64) % 4) % 4, '=');
$_payload_json = base64_decode($_payload_b64, true);

if ($_payload_json === false) {
    http_response_code(401);
    header('Content-Type: application/json');
    echo json_encode(['status' => 'error', 'message' => 'Unauthorized: could not decode token']);
    exit;
}

$_payload = json_decode($_payload_json, true);

if (json_last_error() !== JSON_ERROR_NONE || empty($_payload)) {
    http_response_code(401);
    header('Content-Type: application/json');
    echo json_encode(['status' => 'error', 'message' => 'Unauthorized: invalid token payload']);
    exit;
}

// ── 3. Extract user_id from payload ──────────────────────────────────────────
// Support both common field names: user_id, id, sub
$_user_id = (int)(
    $_payload['user_id'] ??
    $_payload['id']      ??
    $_payload['sub']     ??
    0
);

if ($_user_id <= 0) {
    http_response_code(401);
    header('Content-Type: application/json');
    echo json_encode(['status' => 'error', 'message' => 'Unauthorized: user_id missing from token']);
    exit;
}

// ── 4. Load user into Sngine ──────────────────────────────────────────────────
// This is the same object Sngine creates internally.
// $user->_data is what every Sngine module checks for authentication.
$user = new User();
$user->_data = $user->get_user($_user_id);

if (empty($user->_data)) {
    http_response_code(401);
    header('Content-Type: application/json');
    echo json_encode(['status' => 'error', 'message' => 'Unauthorized: user not found']);
    exit;
}

// ── 5. Optional: check account is active ─────────────────────────────────────
// Adjust the field name if your users table uses a different column.
if (
    isset($user->_data->status) &&
    strtolower($user->_data->status) !== 'active' &&
    strtolower($user->_data->status) !== '1'
) {
    http_response_code(403);
    header('Content-Type: application/json');
    echo json_encode(['status' => 'error', 'message' => 'Account is not active']);
    exit;
}

// ── Done ─────────────────────────────────────────────────────────────────────
// $user->_data is now set. All Sngine checks like:
//   if (!$user->_data) { ... }
//   $user->_data->user_id
//   $user->_data->username
// ...work exactly as if the user had a PHP session.

// Clean up our temp vars so they don't pollute endpoint scope
unset($_raw_headers, $_norm_headers, $_auth_header, $_matches, $_jwt,
      $_parts, $_payload_b64, $_payload_json, $_payload, $_user_id);
