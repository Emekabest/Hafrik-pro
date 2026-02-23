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
// ─────────────────────────────────────────────
export async function fetchReels(
  { page = 1, limit = 10, mode = 'for_you', seed },
  token,
  signal
) {
  const url = new URL(`${BASE}/list.php`);

  url.searchParams.append('page', String(page));
  url.searchParams.append('limit', String(limit));
  url.searchParams.append('mode', mode);
  url.searchParams.append('seed', String(seed ?? 0));

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

  // Backend returns:
  // { status, data: { page, limit, seed, data: [...] } }

  return Array.isArray(json.data?.data)
    ? json.data.data
    : [];
}

// ─────────────────────────────────────────────
// ENGAGEMENT
// ─────────────────────────────────────────────

export async function toggleLike(postId, token) {
  return authPost('toggle_like.php', { post_id: postId }, token);
}

export async function toggleSave(postId, token) {
  return authPost('toggle_save.php', { post_id: postId }, token);
}

export async function followUser(userId, token) {
  return authPost('follow.php', { user_id: userId }, token);
}

export async function addComment(postId, text, token) {
  return authPost('comment_add.php', { post_id: postId, text }, token);
}

export async function fetchComments(postId) {
  const res = await fetch(`${BASE}/comments_list.php?post_id=${postId}`);
  const json = await safeJson(res);

  if (!json || json.status !== 'success') {
    return [];
  }

  return json.data ?? [];
}

export async function shareReel(postId, userId, token) {
  return authPost('share.php', { post_id: postId, user_id: userId }, token);
}

// ─────────────────────────────────────────────
// WATCH TRACKING
// ─────────────────────────────────────────────
export async function recordWatch(postId, watchMs, durationMs, token) {
  console.log('[Reels] Recording view for post:', postId, '| watch_ms:', Math.round(watchMs));
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