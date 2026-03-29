// src/pages/reels/reelsApi.js

const BASE = 'https://hafrik.com/api/v1/reels';

// ─────────────────────────────────────────────
// Safe JSON parser
// ─────────────────────────────────────────────
async function safeJson(res) {
  const contentType = res.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    console.warn(
      `[reelsApi] ${res.url} → HTTP ${res.status} – unexpected content-type: ${contentType}`
    );
    return null;
  }

  const text = await res.text();

  try {
    return JSON.parse(text);
  } catch {
    console.warn(
      `[reelsApi] ${res.url} → HTTP ${res.status} – non-JSON response:\n`,
      text.slice(0, 300)
    );
    return null;
  }
}

// ─────────────────────────────────────────────
// Fire-and-forget POST — for analytics/tracking
// endpoints that return non-JSON (e.g. view.php)
// ─────────────────────────────────────────────
async function firePost(endpoint, bodyObj, token) {
  const form = new FormData();
  Object.entries(bodyObj).forEach(([k, v]) => {
    if (v !== undefined && v !== null) form.append(k, String(v));
  });
  try {
    await fetch(`${BASE}/${endpoint}`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: form,
    });
  } catch (e) {
    console.warn('[reelsApi] firePost error:', e?.message);
  }
}

// ─────────────────────────────────────────────
// Generic Auth POST
// ─────────────────────────────────────────────
async function authPost(endpoint, bodyObj, token) {
  const form = new FormData();

  Object.entries(bodyObj).forEach(([k, v]) => {
    if (v !== undefined && v !== null) {
      form.append(k, String(v));
    }
  });

  const res = await fetch(`${BASE}/${endpoint}`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: form,
  });

  const json = await safeJson(res);
  if (!json || json.status !== 'success') {
    console.warn('[reelsApi] API error:', json);
    return null;
  }

  return json.data ?? null;
}

// ─────────────────────────────────────────────
// FEED
// Response shape from reels/list.php:
// {
//   status: 'success',
//   data: {
//     mode, page, limit, count,
//     reels: [
//       {
//         id, text, created,
//         media:  { video_url, thumbnail },
//         stats:  { likes, comments, views },
//         viewer: { is_liked, is_saved, is_following },
//         user:   { id, username, verified, avatar }
//       }
//     ]
//   }
// }
// ─────────────────────────────────────────────
export async function fetchReels(
  { page = 1, limit = 10, mode = 'for_you', seed },
  token,
  signal
) {
  const url = new URL(`${BASE}/list.php`);
  url.searchParams.set('page',  String(page));
  url.searchParams.set('limit', String(limit));
  url.searchParams.set('mode',  mode);
  if (seed != null) url.searchParams.set('seed', String(seed));

  const res = await fetch(url.toString(), {
    method: 'GET',
    signal,
    headers: token
      ? { Authorization: `Bearer ${token}`, Accept: 'application/json' }
      : { Accept: 'application/json' },
  });

  const json = await safeJson(res);

  if (!json || json.status !== 'success') {
    console.warn('[reelsApi] Feed error:', json);
    return [];
  }

  const raw = Array.isArray(json.data?.reels) ? json.data.reels : [];

  // Normalize to the flat shape expected by ReelInteractionContainer / ReelCard
  return raw.map((r) => ({
    ...r,
    // media: keep as object; alias thumbnail → thumbnail_url for ReelCard
    media: r.media
      ? { ...r.media, thumbnail_url: r.media.thumbnail ?? null }
      : null,
    // flatten stats
    likes_count:    Number(r.stats?.likes    ?? 0),
    comments_count: Number(r.stats?.comments ?? 0),
    views:          Number(r.stats?.views    ?? 0),
    // flatten viewer
    is_liked:    !!r.viewer?.is_liked,
    is_saved:    !!r.viewer?.is_saved,
    is_following: !!r.viewer?.is_following,
  }));
}

// ─────────────────────────────────────────────
// ENGAGEMENT  (unified feed endpoints)
// ─────────────────────────────────────────────
const FEED_BASE = 'https://hafrik.com/api/v1/feed';

async function feedJsonPost(endpoint, bodyObj, token) {
  const res = await fetch(`${FEED_BASE}/${endpoint}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(bodyObj),
  });
  const json = await safeJson(res);
  if (!json || json.status !== 'success') {
    console.warn('[reelsApi] Feed endpoint error:', json);
    return null;
  }
  return json.data ?? null;
}

export async function toggleLike(postId, token, reaction = 'like') {
  return feedJsonPost('react.php', { post_id: postId, reaction }, token);
}

export async function toggleSave(postId, token) {
  return feedJsonPost('save.php', { post_id: postId }, token);
}

export async function followUser(userId, token) {
  return authPost('follow.php', { user_id: userId }, token);
}

export async function addComment(postId, text, token) {
  return feedJsonPost('comments.php', { action: 'comment', post_id: postId, text }, token);
}

export async function fetchComments(postId, token, page = 1, limit = 10) {
  const url = `${FEED_BASE}/comments.php?post_id=${postId}&page=${page}&limit=${limit}`;
  const res = await fetch(url, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  const json = await safeJson(res);
  if (!json || json.status !== 'success') return [];
  const raw = json.data;
  return Array.isArray(raw?.data) ? raw.data : Array.isArray(raw) ? raw : [];
}

export async function shareReel(postId, token, text = '', privacy = 'public') {
  return feedJsonPost('share.php', { post_id: postId, text, privacy }, token);
}

// ─────────────────────────────────────────────
// WATCH TRACKING
// ─────────────────────────────────────────────
export async function recordWatch(postId, watchMs, durationMs, token) {
  return firePost(
    'view.php',
    {
      post_id: postId,
      watch_ms: Math.round(watchMs),
      ...(durationMs ? { duration_ms: Math.round(durationMs) } : {}),
    },
    token
  );
}