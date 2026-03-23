<?php
/**
 * GET /api/v1/people/list.php
 * People You May Know — smart recommendation endpoint
 *
 * Priority order:
 *  1. Mutual connections (users followed by people I follow that I don't follow yet)
 *  2. Same-country users
 *  3. Verified users
 *  4. Recently joined users
 *  5. Random activated users not yet followed
 *
 * Returns only:
 *  - Activated accounts
 *  - Not the logged-in user
 *  - Not already followed by the logged-in user
 *
 * Response fields per user:
 *  id, username, image, country, verified, followers_count, mutual_count, is_follow
 *
 * Query params:
 *  page  (default 1)
 *  limit (default 10, max 50)
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Headers: Authorization, Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

// ── Auth ─────────────────────────────────────────────────────────────────────
$authHeader = $_SERVER['HTTP_AUTHORIZATION'] ?? '';
if (!preg_match('/Bearer\s+(.+)/i', $authHeader, $matches)) {
    http_response_code(401);
    echo json_encode(['status' => 'error', 'message' => 'Unauthorized']);
    exit;
}
$token = trim($matches[1]);

// ── DB connection — adjust to match your config ───────────────────────────────
require_once __DIR__ . '/../../config/database.php'; // $pdo or $conn
// Expects a PDO instance named $pdo.
// If you use mysqli, swap $pdo->prepare() / execute() with mysqli equivalents.

// ── Resolve logged-in user from token ────────────────────────────────────────
$stmt = $pdo->prepare(
    "SELECT id, country FROM users WHERE token = ? AND status = 'active' LIMIT 1"
);
$stmt->execute([$token]);
$me = $stmt->fetch(PDO::FETCH_ASSOC);

if (!$me) {
    http_response_code(401);
    echo json_encode(['status' => 'error', 'message' => 'Invalid or expired token']);
    exit;
}

$myId      = (int) $me['id'];
$myCountry = $me['country'] ?? '';

// ── Pagination ────────────────────────────────────────────────────────────────
$page  = max(1, (int) ($_GET['page']  ?? 1));
$limit = min(50, max(1, (int) ($_GET['limit'] ?? 10)));
$offset = ($page - 1) * $limit;

// ── Small randomisation seed (changes per refresh, stable within a page) ─────
// Clients pass no seed → server uses current minute so results rotate every 60 s
$seed = (int) floor(time() / 60);

// ── Base exclusion sub-query ──────────────────────────────────────────────────
// Exclude: myself, already-followed users, deactivated accounts
$excludeSql = "
    u.id != :myId
    AND u.status = 'active'
    AND u.id NOT IN (
        SELECT following_id FROM follows WHERE follower_id = :myId2
    )
";

// ─────────────────────────────────────────────────────────────────────────────
// STEP 1 — Mutual connections
// People that are followed by at least one person I follow, but I don't follow yet
// ─────────────────────────────────────────────────────────────────────────────
$mutualSql = "
    SELECT
        u.id,
        u.username,
        u.avatar         AS image,
        u.country,
        u.verified,
        u.followers_count,
        COUNT(DISTINCT f2.follower_id) AS mutual_count,
        0                              AS is_follow,
        1                              AS priority_group,
        (RAND(:seed1) * 0.15)          AS rand_jitter
    FROM users u
    JOIN follows f2
        ON f2.following_id = u.id
        AND f2.follower_id IN (
            SELECT following_id FROM follows WHERE follower_id = :myId3
        )
    WHERE {$excludeSql}
    GROUP BY u.id
    ORDER BY
        mutual_count      DESC,
        u.followers_count DESC,
        rand_jitter       ASC
    LIMIT :limit1
";

$stmtMutual = $pdo->prepare($mutualSql);
$stmtMutual->bindValue(':myId',   $myId, PDO::PARAM_INT);
$stmtMutual->bindValue(':myId2',  $myId, PDO::PARAM_INT);
$stmtMutual->bindValue(':myId3',  $myId, PDO::PARAM_INT);
$stmtMutual->bindValue(':seed1',  $seed + 1);
$stmtMutual->bindValue(':limit1', $limit, PDO::PARAM_INT);
$stmtMutual->execute();
$mutualRows = $stmtMutual->fetchAll(PDO::FETCH_ASSOC);

$collectedIds = array_column($mutualRows, 'id');
$results      = $mutualRows;

// ─────────────────────────────────────────────────────────────────────────────
// STEP 2 — Fill with same-country, verified, recently joined, random
// ─────────────────────────────────────────────────────────────────────────────
$needed = $limit - count($results);

if ($needed > 0) {
    // Build exclusion list of IDs already collected
    $excludeIds = array_merge([$myId], $collectedIds ?: [0]);
    $placeholders = implode(',', array_fill(0, count($excludeIds), '?'));

    $fillSql = "
        SELECT
            u.id,
            u.username,
            u.avatar         AS image,
            u.country,
            u.verified,
            u.followers_count,
            0                AS mutual_count,
            0                AS is_follow,
            CASE
                WHEN u.country = ?               THEN 2
                WHEN u.verified = 1              THEN 3
                WHEN u.created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY) THEN 4
                ELSE 5
            END              AS priority_group,
            (RAND(?) * 0.3)  AS rand_jitter
        FROM users u
        WHERE
            u.status    = 'active'
            AND u.id NOT IN (
                SELECT following_id FROM follows WHERE follower_id = ?
            )
            AND u.id NOT IN ({$placeholders})
        ORDER BY
            priority_group    ASC,
            u.followers_count DESC,
            rand_jitter       ASC
        LIMIT ?
    ";

    $fillParams = array_merge(
        [$myCountry, $seed + 2, $myId],
        $excludeIds,
        [$needed]
    );

    $stmtFill = $pdo->prepare($fillSql);
    $stmtFill->execute($fillParams);
    $fillRows = $stmtFill->fetchAll(PDO::FETCH_ASSOC);

    $results = array_merge($results, $fillRows);
}

// ─────────────────────────────────────────────────────────────────────────────
// Format & respond
// ─────────────────────────────────────────────────────────────────────────────
$formatted = array_map(function ($row) {
    return [
        'id'              => (int)  $row['id'],
        'username'        =>        $row['username'],
        'image'           =>        $row['image']    ?? null,
        'avatar'          =>        $row['image']    ?? null, // alias for client compat
        'country'         =>        $row['country']  ?? null,
        'verified'        => (bool) $row['verified'],
        'followers_count' => (int)  $row['followers_count'],
        'mutual_count'    => (int)  $row['mutual_count'],
        'is_follow'       => 0,
    ];
}, $results);

echo json_encode([
    'status'  => 'success',
    'message' => 'People you may know',
    'data'    => $formatted,
    'meta'    => [
        'page'  => $page,
        'limit' => $limit,
        'count' => count($formatted),
    ],
]);
