<?php
// api/v1/reels/list.php

// Never let PHP errors bleed into the JSON response as HTML
ini_set('display_errors', 0);
error_reporting(E_ALL);

require_once __DIR__ . '/../db.php';
require_once __DIR__ . '/../helpers.php';

$db        = get_db_connection();
$viewer    = auth_viewer($db);
$viewer_id = (int)($viewer['user_id'] ?? 0);

/* ── Inputs ─────────────────────────────────────────────────────────────── */
$page   = max(1, (int)($_GET['page']  ?? 1));
$limit  = min(20, max(1, (int)($_GET['limit'] ?? 10)));
$mode   = $_GET['mode'] ?? 'for_you';
$offset = ($page - 1) * $limit;
$seed   = isset($_GET['seed']) ? (int)$_GET['seed'] : time();

$base = 'https://s3.ap-northeast-1.wasabisys.com/hafriksocial/uploads/';

/* ── Exclude recently viewed reels (last 2 days) ────────────────────────── */
$exclude_sql = '';
if ($viewer_id) {
    $exclude_sql = "AND p.post_id NOT IN (
        SELECT post_id FROM posts_views
        WHERE  user_id = {$viewer_id}
          AND  last_view_at >= DATE_SUB(NOW(), INTERVAL 2 DAY)
    )";
}

/* ── is_liked / is_saved per viewer ─────────────────────────────────────── */
if ($viewer_id) {
    $is_liked_col = "(SELECT COUNT(*) FROM posts_reactions
                      WHERE post_id = p.post_id AND user_id = {$viewer_id} LIMIT 1)";
    $is_saved_col = "(SELECT COUNT(*) FROM posts_saves
                      WHERE post_id = p.post_id AND user_id = {$viewer_id} LIMIT 1)";
} else {
    $is_liked_col = '0';
    $is_saved_col = '0';
}

/* ── Score formula ───────────────────────────────────────────────────────── */
// Built as a PHP string to keep each SQL branch clean — no trailing commas.
// Uses only fields that definitely exist on posts_reels (r.*).
// Subquery counts for reactions/comments so the formula does not depend
// on denormalized columns like p.reaction_like_count or p.comments.
$score_formula = "(
    (LEAST(r.views, 500000) * 0.15)
    + (COALESCE(r.avg_watch_ms,  0) * 0.004)
    + (COALESCE(r.completions,   0) * 0.8)
    + ((SELECT COUNT(*) FROM posts_reactions WHERE post_id = p.post_id) * 2.5)
    + ((SELECT COUNT(*) FROM posts_comments  WHERE node_id = p.post_id AND node_type = 'post') * 3.5)
    + (CASE WHEN p.time >= DATE_SUB(NOW(), INTERVAL 24 HOUR) THEN 30 ELSE 0 END)
    - (TIMESTAMPDIFF(HOUR, p.time, NOW()) * 0.12)
)";

/* ── Shared SELECT column list ───────────────────────────────────────────── */
// NOTE: Every column ends with a comma EXCEPT the last one (score).
// This is the most common source of "near 'FROM'" syntax errors —
// a trailing comma after the last SELECT column.
$select = "
    p.post_id                                                              AS id,
    p.text,
    p.time,
    r.views,
    COALESCE(r.avg_watch_ms, 0)                                           AS avg_watch_ms,
    COALESCE(r.completions,  0)                                           AS completions,
    r.thumbnail,
    COALESCE(r.source_720p, r.source_1080p, r.source_480p, r.source)     AS video,
    u.user_id,
    u.user_name,
    u.user_picture,
    u.user_verified,
    (SELECT COUNT(*) FROM posts_reactions WHERE post_id = p.post_id)      AS likes_count,
    (SELECT COUNT(*) FROM posts_comments
     WHERE node_id = p.post_id AND node_type = 'post')                    AS comments_count,
    ({$is_liked_col})                                                      AS is_liked,
    ({$is_saved_col})                                                      AS is_saved,
    {$score_formula}                                                       AS score";
// ↑ No trailing comma — 'score' is the last column.

/* ── Build query per mode ───────────────────────────────────────────────── */
if ($mode === 'following' && $viewer_id) {

    $sql = "SELECT {$select}
            FROM   posts p
            JOIN   posts_reels    r ON r.post_id     = p.post_id
            JOIN   users          u ON u.user_id     = p.user_id
            JOIN   users_followers f ON f.following_id = p.user_id
            WHERE  p.post_type = 'reel'
              AND  f.user_id   = {$viewer_id}
              {$exclude_sql}
            ORDER BY score DESC, RAND({$seed})
            LIMIT {$limit} OFFSET {$offset}";

} else {

    $sql = "SELECT {$select}
            FROM   posts p
            JOIN   posts_reels r ON r.post_id = p.post_id
            JOIN   users       u ON u.user_id = p.user_id
            WHERE  p.post_type = 'reel'
              {$exclude_sql}
            ORDER BY score DESC, RAND({$seed})
            LIMIT {$limit} OFFSET {$offset}";
}

/* ── Execute ─────────────────────────────────────────────────────────────── */
$res = $db->query($sql);

if (!$res) {
    // Return a JSON error — never HTML — so the app can decode it cleanly
    json_response('error', null, 'Query failed: ' . $db->error);
    exit;
}

/* ── Format response ─────────────────────────────────────────────────────── */
$data = [];

while ($row = $res->fetch_assoc()) {

    // Build full URLs (handle both relative paths and already-absolute URLs)
    $make_url = function (string $path) use ($base): ?string {
        if (!$path) return null;
        return str_starts_with($path, 'http') ? $path : $base . ltrim($path, '/');
    };

    $avatar = $make_url($row['user_picture'] ?? '')
           ?? 'https://hafrik.com/default-avatar.png';

    $data[] = [
        'id'             => (int)$row['id'],
        'type'           => 'reel',
        'text'           => $row['text']    ?? '',
        'created'        => date('Y-m-d H:i:s', strtotime($row['time'])),
        'likes_count'    => (int)$row['likes_count'],
        'comments_count' => (int)$row['comments_count'],
        'is_liked'       => (bool)(int)$row['is_liked'],
        'is_saved'       => (bool)(int)$row['is_saved'],
        'views'          => (int)$row['views'],
        'avg_watch_ms'   => (int)$row['avg_watch_ms'],
        'completions'    => (int)$row['completions'],
        'media'          => [
            'type'      => 'reel',
            'video_url' => $make_url($row['video']     ?? ''),
            'thumbnail' => $make_url($row['thumbnail'] ?? ''),
        ],
        'user'           => [
            'id'       => (int)$row['user_id'],
            'username' => $row['user_name']     ?? '',
            'verified' => (bool)$row['user_verified'],
            'avatar'   => $avatar,
        ],
    ];
}

json_response('success', [
    'mode'  => $mode,
    'page'  => $page,
    'limit' => $limit,
    'seed'  => $seed,
    'data'  => $data,
]);
