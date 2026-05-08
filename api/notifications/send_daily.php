<?php
/**
 * Hafrik daily push notification cron.
 *
 * Runs around:
 * - 10:00 Asia/Shanghai -> morning templates
 * - 20:00 Asia/Shanghai -> evening templates
 *
 * Cron examples:
 * 0 10 * * * /usr/bin/php /path/to/api/v1/notifications/send_daily.php morning >> /path/to/logs/hafrik_daily_push.log 2>&1
 * 0 20 * * * /usr/bin/php /path/to/api/v1/notifications/send_daily.php evening >> /path/to/logs/hafrik_daily_push.log 2>&1
 *
 * Optional HTTP trigger:
 * /api/v1/notifications/send_daily.php?slot=morning&secret=YOUR_SECRET
 */

ini_set('display_errors', 0);
error_reporting(E_ALL);
date_default_timezone_set('Asia/Shanghai');

if (PHP_SAPI !== 'cli') {
    header('Content-Type: application/json; charset=utf-8');
}

/* =========================
   CONFIG
========================= */
$CRON_SECRET = getenv('HAFRIK_DAILY_PUSH_SECRET');
if (!$CRON_SECRET && defined('HAFRIK_DAILY_PUSH_SECRET')) {
    $CRON_SECRET = HAFRIK_DAILY_PUSH_SECRET;
}

// If your register_push.php stores tokens in a custom table, set these env vars:
// HAFRIK_PUSH_TABLE=users_push_tokens
// HAFRIK_PUSH_TOKEN_COLUMN=expo_push_token
// HAFRIK_PUSH_USER_COLUMN=user_id
$PUSH_TABLE = getenv('HAFRIK_PUSH_TABLE') ?: '';
$TOKEN_COLUMN = getenv('HAFRIK_PUSH_TOKEN_COLUMN') ?: '';
$USER_COLUMN = getenv('HAFRIK_PUSH_USER_COLUMN') ?: 'user_id';
$BATCH_SIZE = 100;

/* =========================
   RESPONSE HELPERS
========================= */
function daily_json($payload, $code = 200) {
    if (PHP_SAPI !== 'cli') {
        http_response_code($code);
        echo json_encode($payload, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
    } else {
        echo json_encode($payload, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE) . PHP_EOL;
    }
    exit;
}

function daily_log($message, $context = []) {
    $line = '[' . date('Y-m-d H:i:s') . '] ' . $message;
    if ($context) {
        $line .= ' ' . json_encode($context, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
    }
    error_log($line);
}

/* =========================
   AUTH FOR HTTP TRIGGER
========================= */
if (PHP_SAPI !== 'cli') {
    if (!$CRON_SECRET) {
        daily_json(['status' => 'error', 'message' => 'Cron secret is not configured'], 500);
    }
    $provided = (string)($_GET['secret'] ?? $_SERVER['HTTP_X_CRON_SECRET'] ?? '');
    if (!hash_equals((string)$CRON_SECRET, $provided)) {
        daily_json(['status' => 'error', 'message' => 'Unauthorized'], 401);
    }
}

/* =========================
   LOAD CORE
========================= */
$db = null;
foreach ([
    __DIR__ . '/../db.php',
    __DIR__ . '/../../db.php',
    dirname(__DIR__, 3) . '/bootstrap.php',
] as $file) {
    if (is_file($file)) {
        require_once $file;
    }
}

if (function_exists('get_db_connection')) {
    $db = get_db_connection();
} elseif (isset($GLOBALS['db'])) {
    $db = $GLOBALS['db'];
} elseif (isset($GLOBALS['conn'])) {
    $db = $GLOBALS['conn'];
}

if (!$db || !($db instanceof mysqli)) {
    daily_json([
        'status' => 'error',
        'message' => 'Database connection not found. Include your db.php or expose get_db_connection().'
    ], 500);
}

/* =========================
   SLOT
========================= */
$slot = PHP_SAPI === 'cli'
    ? strtolower((string)($argv[1] ?? ''))
    : strtolower((string)($_GET['slot'] ?? ''));

if (!$slot) {
    $hour = (int)date('G');
    $slot = ($hour >= 18 || $hour < 4) ? 'evening' : 'morning';
}

if (!in_array($slot, ['morning', 'evening'], true)) {
    daily_json(['status' => 'error', 'message' => 'Invalid slot. Use morning or evening.'], 400);
}

$templates = require __DIR__ . '/daily_templates.php';
$pool = $templates[$slot] ?? [];
if (!$pool) {
    daily_json(['status' => 'error', 'message' => 'No templates configured for this slot'], 500);
}

$template = $pool[array_rand($pool)];
$template['data']['slot'] = $slot;
$template['data']['sent_at_china'] = date('Y-m-d H:i:s');

/* =========================
   TABLE DISCOVERY
========================= */
function table_exists(mysqli $db, $table) {
    $safe = $db->real_escape_string($table);
    $res = $db->query("SHOW TABLES LIKE '{$safe}'");
    return $res && $res->num_rows > 0;
}

function column_exists(mysqli $db, $table, $column) {
    $safeTable = str_replace('`', '``', $table);
    $safeCol = $db->real_escape_string($column);
    $res = $db->query("SHOW COLUMNS FROM `{$safeTable}` LIKE '{$safeCol}'");
    return $res && $res->num_rows > 0;
}

function resolve_push_source(mysqli $db, $configuredTable, $configuredTokenColumn, $configuredUserColumn) {
    $tables = array_filter(array_unique([
        $configuredTable,
        'users_push_tokens',
        'user_push_tokens',
        'push_tokens',
        'notifications_push_tokens',
        'expo_push_tokens',
        'users_devices',
        'user_devices',
    ]));

    $tokenColumns = array_filter(array_unique([
        $configuredTokenColumn,
        'expo_push_token',
        'push_token',
        'token',
        'device_token',
    ]));

    $userColumns = array_filter(array_unique([
        $configuredUserColumn,
        'user_id',
        'uid',
    ]));

    foreach ($tables as $table) {
        if (!table_exists($db, $table)) continue;
        foreach ($tokenColumns as $tokenColumn) {
            if (!column_exists($db, $table, $tokenColumn)) continue;
            foreach ($userColumns as $userColumn) {
                if (column_exists($db, $table, $userColumn)) {
                    return compact('table', 'tokenColumn', 'userColumn');
                }
            }
            return ['table' => $table, 'tokenColumn' => $tokenColumn, 'userColumn' => null];
        }
    }

    return null;
}

$source = resolve_push_source($db, $PUSH_TABLE, $TOKEN_COLUMN, $USER_COLUMN);
if (!$source) {
    daily_json([
        'status' => 'error',
        'message' => 'Could not find push token table. Set HAFRIK_PUSH_TABLE and HAFRIK_PUSH_TOKEN_COLUMN.'
    ], 500);
}

/* =========================
   DEDUPE LOG
========================= */
$db->query("
    CREATE TABLE IF NOT EXISTS daily_push_log (
        id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        slot VARCHAR(20) NOT NULL,
        push_date DATE NOT NULL,
        template_category VARCHAR(60) NULL,
        title VARCHAR(180) NULL,
        total_tokens INT UNSIGNED NOT NULL DEFAULT 0,
        sent_count INT UNSIGNED NOT NULL DEFAULT 0,
        failed_count INT UNSIGNED NOT NULL DEFAULT 0,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY uniq_slot_date (slot, push_date)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
");

$today = date('Y-m-d');
$stmt = $db->prepare("SELECT id FROM daily_push_log WHERE slot = ? AND push_date = ? LIMIT 1");
$stmt->bind_param('ss', $slot, $today);
$stmt->execute();
$already = $stmt->get_result()->fetch_assoc();
$stmt->close();

if ($already) {
    daily_json([
        'status' => 'skipped',
        'message' => "Daily {$slot} push already sent for {$today}",
        'slot' => $slot,
        'date' => $today,
    ]);
}

/* =========================
   FETCH TOKENS
========================= */
$table = str_replace('`', '``', $source['table']);
$tokenColumn = str_replace('`', '``', $source['tokenColumn']);
$userColumn = $source['userColumn'] ? str_replace('`', '``', $source['userColumn']) : null;

$where = "`{$tokenColumn}` LIKE 'ExponentPushToken[%'";
if (column_exists($db, $source['table'], 'is_active')) {
    $where .= " AND is_active = 1";
}
if (column_exists($db, $source['table'], 'status')) {
    $where .= " AND (status = 'active' OR status = 1)";
}

$sql = "SELECT DISTINCT `{$tokenColumn}` AS token" . ($userColumn ? ", `{$userColumn}` AS user_id" : "") . " FROM `{$table}` WHERE {$where}";
$result = $db->query($sql);
if (!$result) {
    daily_json(['status' => 'error', 'message' => 'Token query failed', 'debug' => $db->error], 500);
}

$tokens = [];
while ($row = $result->fetch_assoc()) {
    $token = trim((string)($row['token'] ?? ''));
    if ($token && preg_match('/^ExponentPushToken\[[^\]]+\]$/', $token)) {
        $tokens[$token] = $token;
    }
}
$tokens = array_values($tokens);

if (!$tokens) {
    daily_json([
        'status' => 'success',
        'message' => 'No Expo push tokens found',
        'slot' => $slot,
        'source' => $source,
        'sent' => 0,
    ]);
}

/* =========================
   SEND EXPO PUSH
========================= */
function expo_send_batch(array $messages) {
    $ch = curl_init('https://exp.host/--/api/v2/push/send');
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_POST => true,
        CURLOPT_HTTPHEADER => [
            'Accept: application/json',
            'Accept-Encoding: gzip, deflate',
            'Content-Type: application/json',
        ],
        CURLOPT_POSTFIELDS => json_encode($messages, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE),
        CURLOPT_TIMEOUT => 30,
    ]);
    $raw = curl_exec($ch);
    $error = curl_error($ch);
    $status = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    return [
        'ok' => $raw !== false && $status >= 200 && $status < 300,
        'status' => $status,
        'error' => $error,
        'json' => $raw ? json_decode($raw, true) : null,
        'raw' => $raw,
    ];
}

$sent = 0;
$failed = 0;
$chunks = array_chunk($tokens, $BATCH_SIZE);

foreach ($chunks as $chunk) {
    $messages = array_map(function ($token) use ($template) {
        return [
            'to' => $token,
            'sound' => 'default',
            'title' => $template['title'],
            'body' => $template['body'],
            'data' => $template['data'],
            'priority' => 'normal',
            'channelId' => 'default',
        ];
    }, $chunk);

    $res = expo_send_batch($messages);
    $tickets = $res['json']['data'] ?? [];

    if (!$res['ok'] || !is_array($tickets)) {
        $failed += count($chunk);
        daily_log('Expo push batch failed', ['status' => $res['status'], 'error' => $res['error'], 'raw' => $res['raw']]);
        continue;
    }

    foreach ($tickets as $ticket) {
        if (($ticket['status'] ?? '') === 'ok') $sent++;
        else $failed++;
    }
}

/* =========================
   SAVE LOG
========================= */
$category = (string)($template['category'] ?? '');
$title = (string)($template['title'] ?? '');
$total = count($tokens);
$stmt = $db->prepare("
    INSERT INTO daily_push_log (slot, push_date, template_category, title, total_tokens, sent_count, failed_count)
    VALUES (?, ?, ?, ?, ?, ?, ?)
");
$stmt->bind_param('ssssiii', $slot, $today, $category, $title, $total, $sent, $failed);
$stmt->execute();
$stmt->close();

daily_json([
    'status' => 'success',
    'slot' => $slot,
    'date' => $today,
    'template' => [
        'category' => $category,
        'title' => $template['title'],
        'body' => $template['body'],
        'data' => $template['data'],
    ],
    'source' => $source,
    'total_tokens' => $total,
    'sent' => $sent,
    'failed' => $failed,
]);
