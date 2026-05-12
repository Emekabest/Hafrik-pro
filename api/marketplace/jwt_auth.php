<?php
/**
 * JWT / bearer-token auth bridge for marketplace endpoints.
 *
 * This file must be included after ../init.php so $pdo and User are available.
 * It accepts only tokens that are either:
 *  - a valid HMAC-signed JWT using a configured server secret, or
 *  - an exact active token currently stored for the user in the database.
 */

if (!isset($pdo)) {
    http_response_code(500);
    header('Content-Type: application/json');
    echo json_encode(['status' => 'error', 'message' => 'Auth bootstrap missing database connection']);
    exit;
}

function marketplace_auth_fail($message, $status = 401) {
    http_response_code($status);
    header('Content-Type: application/json');
    echo json_encode(['status' => 'error', 'message' => $message]);
    exit;
}

function marketplace_base64url_decode($value) {
    $base64 = str_replace(['-', '_'], ['+', '/'], $value);
    $base64 = str_pad($base64, strlen($base64) + (4 - strlen($base64) % 4) % 4, '=');
    return base64_decode($base64, true);
}

function marketplace_jwt_secret() {
    foreach (['JWT_SECRET', 'JWT_SECRET_KEY', 'APP_JWT_SECRET', 'APP_SECRET'] as $name) {
        if (defined($name) && constant($name)) return (string) constant($name);
        $env = getenv($name);
        if ($env) return (string) $env;
    }
    return '';
}

function marketplace_verify_jwt_signature($jwt, $header, $secret) {
    if (!$secret) return false;

    $alg = $header['alg'] ?? '';
    $allowed = [
        'HS256' => 'sha256',
        'HS384' => 'sha384',
        'HS512' => 'sha512',
    ];

    if (!isset($allowed[$alg])) return false;

    $parts = explode('.', $jwt);
    if (count($parts) !== 3) return false;

    $signed = $parts[0] . '.' . $parts[1];
    $expected = rtrim(strtr(base64_encode(hash_hmac($allowed[$alg], $signed, $secret, true)), '+/', '-_'), '=');

    return hash_equals($expected, $parts[2]);
}

$_raw_headers = function_exists('getallheaders') ? getallheaders() : [];
$_norm_headers = [];
foreach ($_raw_headers as $_k => $_v) {
    $_norm_headers[strtolower($_k)] = $_v;
}

$_auth_header =
    $_norm_headers['authorization'] ??
    $_SERVER['HTTP_AUTHORIZATION'] ??
    $_SERVER['REDIRECT_HTTP_AUTHORIZATION'] ??
    '';

if (!preg_match('/Bearer\s+(\S+)/i', $_auth_header, $_matches)) {
    marketplace_auth_fail('Unauthorized: missing or malformed token');
}

$_token = trim($_matches[1]);
$_parts = explode('.', $_token);
$_payload = null;
$_verified_by_signature = false;

if (count($_parts) === 3) {
    $_header_json = marketplace_base64url_decode($_parts[0]);
    $_payload_json = marketplace_base64url_decode($_parts[1]);

    if ($_header_json !== false && $_payload_json !== false) {
        $_header = json_decode($_header_json, true);
        $_decoded_payload = json_decode($_payload_json, true);

        if (json_last_error() === JSON_ERROR_NONE && is_array($_header) && is_array($_decoded_payload)) {
            $_secret = marketplace_jwt_secret();
            $_verified_by_signature = marketplace_verify_jwt_signature($_token, $_header, $_secret);

            if ($_verified_by_signature) {
                if (!empty($_decoded_payload['exp']) && time() >= (int) $_decoded_payload['exp']) {
                    marketplace_auth_fail('Unauthorized: token expired');
                }
                if (!empty($_decoded_payload['nbf']) && time() < (int) $_decoded_payload['nbf']) {
                    marketplace_auth_fail('Unauthorized: token not active');
                }
                $_payload = $_decoded_payload;
            }
        }
    }
}

$_user_id = (int) (
    $_payload['user_id'] ??
    $_payload['id'] ??
    $_payload['sub'] ??
    0
);

if ($_user_id > 0 && $_verified_by_signature) {
    $_stmt = $pdo->prepare("SELECT id FROM users WHERE id = ? AND status = 'active' LIMIT 1");
    $_stmt->execute([$_user_id]);
} else {
    // Secure fallback for deployments where the issued bearer token is stored server-side.
    $_stmt = $pdo->prepare("SELECT id FROM users WHERE token = ? AND status = 'active' LIMIT 1");
    $_stmt->execute([$_token]);
    $_row = $_stmt->fetch(PDO::FETCH_ASSOC);
    $_user_id = (int) ($_row['id'] ?? 0);
    $_stmt = null;
}

if ($_user_id <= 0) {
    marketplace_auth_fail('Unauthorized: invalid or expired token');
}

if (!isset($_row)) {
    $_row = $_stmt ? $_stmt->fetch(PDO::FETCH_ASSOC) : null;
}

if (empty($_row)) {
    marketplace_auth_fail('Unauthorized: user not found');
}

$user = new User();
$user->_data = $user->get_user($_user_id);

if (empty($user->_data)) {
    marketplace_auth_fail('Unauthorized: user not found');
}

if (
    isset($user->_data->status) &&
    strtolower((string) $user->_data->status) !== 'active' &&
    strtolower((string) $user->_data->status) !== '1'
) {
    marketplace_auth_fail('Account is not active', 403);
}

unset($_raw_headers, $_norm_headers, $_auth_header, $_matches, $_token, $_parts,
      $_payload, $_verified_by_signature, $_user_id, $_stmt, $_row);
