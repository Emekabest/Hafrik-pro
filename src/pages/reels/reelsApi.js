// src/pages/reels/reelsApi.js

const REELS_BASE  = 'https://hafrik.com/api/v1/reels';
const REELS_LIST  = `${REELS_BASE}/list.php`;
const FEED_BASE = 'https://hafrik.com/api/v1/feed';
const FEED_LIST = `${FEED_BASE}/list.php`;

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
// ─────────────────────────────────────────────
async function firePost(endpoint, bodyObj, token) {
  const form = new FormData();
  Object.entries(bodyObj).forEach(([k, v]) => {
    if (v !== undefined && v !== null) form.append(k, String(v));
  });
  try {
    await fetch(`${REELS_BASE}/${endpoint}`, {
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

  const res = await fetch(`${REELS_BASE}/${endpoint}`, {
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
// Latest / For You:
//   GET /api/v1/feed/list.php?get=reels&page={page}&limit=10
//   Response shape: data.data = posts
//
// Discover:
//   GET /api/v1/reels/list.php?mode=discover&page={page}&limit=10&session_id={sessionId}
//   Response shape: data.reels = reels
//
// Both are normalized to the same ReelItem shape for ReelCard.
// ─────────────────────────────────────────────
function normalizeUser(raw = {}, fallback = {}) {
  const user = raw || {};
  const displayName =
    user.display_name ||
    user.page_title ||
    user.page_name ||
    user.business_name ||
    user.name ||
    user.full_name ||
    [user.first_name, user.last_name].filter(Boolean).join(' ') ||
    user.username ||
    fallback.name ||
    fallback.username ||
    '';

  return {
    ...user,
    id: user.id ?? user.user_id ?? user.page_id ?? user.business_id ?? fallback.id,
    display_name: displayName,
    name: user.name || displayName,
    username: user.username || fallback.username || '',
    avatar: user.avatar || user.profile_picture || user.image || fallback.avatar || null,
    verified: !!(user.verified ?? user.is_verified ?? user.verified_value ?? fallback.verified),
    entity: user.entity || user.type || fallback.entity,
    page_id: user.page_id ?? fallback.page_id,
    business_id: user.business_id ?? fallback.business_id,
  };
}

function normalizeMedia(rawMedia, post = {}) {
  const media = Array.isArray(rawMedia) ? (rawMedia[0] ?? null) : rawMedia;
  const payload = post.payload || {};
  return media
    ? {
        ...media,
        video_url:
          media.video_url ||
          media.video ||
          media.url ||
          media.src ||
          media.video_path ||
          payload.video_url ||
          payload.video,
        thumbnail_url:
          media.thumbnail_url ||
          media.thumbnail ||
          media.image ||
          media.cover ||
          media.poster ||
          media.thumbnail_path ||
          payload.thumbnail ||
          payload.cover,
      }
    : {
        video_url: payload.video_url || payload.video || post.video_url || null,
        thumbnail_url: payload.thumbnail || payload.cover || post.thumbnail || post.image || null,
      };
}

function normalizeForYouPost(post) {
  const author = post.author || post.user || {};
  const reactions = post.reactions || {};
  return {
    ...post,
    id: post.post_id ?? post.id,
    post_id: post.post_id ?? post.id,
    text: post.text ?? post.caption ?? '',
    user: normalizeUser(author),
    media: normalizeMedia(post.media, post),
    likes_count: Number(reactions.like ?? post.likes_count ?? post.likes ?? 0),
    comments_count: Number(post.comments ?? post.comments_count ?? post.comment_count ?? 0),
    views: Number(post.views ?? post.views_count ?? 0),
    is_liked: !!(post.is_liked ?? post.viewer?.is_liked ?? post.user_liked),
    is_saved: !!(post.is_saved ?? post.viewer?.is_saved ?? post.user_saved),
    is_following: !!(post.is_following ?? post.viewer?.is_following),
    has_seen: !!post.viewer?.has_seen,
  };
}

function normalizeDiscoverReel(reel) {
  const rawUser = reel.user || reel.author || reel.owner || reel.page || reel.business || {};
  const postId = reel.post_id ?? reel.post?.id ?? reel.feed_post_id ?? reel.feed_id ?? reel.id;
  const reelId = reel.reel_id ?? reel.id;
  const pageId = rawUser.page_id ?? reel.page?.id ?? reel.business?.id ?? (
    String(rawUser.type || rawUser.entity || '').toLowerCase() === 'page' ? rawUser.id : null
  );
  return {
    ...reel,
    id: postId,
    post_id: postId,
    reel_id: reelId,
    text: reel.text ?? reel.caption ?? '',
    user: normalizeUser(rawUser, {
      entity: reel.page || reel.business ? 'page' : rawUser.entity,
      page_id: pageId,
      business_id: reel.business?.id ?? pageId,
    }),
    media: normalizeMedia(reel.media, reel),
    likes_count: Number(reel.stats?.likes ?? reel.likes_count ?? reel.likes ?? 0),
    comments_count: Number(reel.stats?.comments ?? reel.comments_count ?? reel.comments ?? 0),
    views: Number(reel.stats?.views ?? reel.views ?? 0),
    is_liked: !!(reel.viewer?.is_liked ?? reel.is_liked),
    is_saved: !!(reel.viewer?.is_saved ?? reel.is_saved),
    is_following: !!(reel.viewer?.is_following ?? reel.is_following),
    has_seen: !!(reel.viewer?.has_seen ?? reel.has_seen),
  };
}

function authHeaders(token) {
  return token
    ? { Authorization: `Bearer ${token}`, Accept: 'application/json' }
    : { Accept: 'application/json' };
}

function extractFeedPost(json) {
  const data = json?.data;
  return data?.post || data?.feed || data?.item || data?.data || data || null;
}

function extractBusinessPage(json) {
  const data = json?.data;
  return data?.page || data?.business || data?.data || data || null;
}

async function fetchFeedPost(postId, token) {
  if (!postId) return null;
  const url = `${FEED_BASE}/view.php?id=${encodeURIComponent(postId)}`;
  const res = await fetch(url, { headers: authHeaders(token) });
  const json = await safeJson(res);
  if (!json || json.status !== 'success') return null;
  return extractFeedPost(json);
}

async function fetchBusinessPage(pageId, token) {
  if (!pageId) return null;
  const url = `https://hafrik.com/api/v1/business/view.php?page_id=${encodeURIComponent(pageId)}`;
  const res = await fetch(url, { headers: authHeaders(token) });
  const json = await safeJson(res);
  if (!json || json.status !== 'success') return null;
  return extractBusinessPage(json);
}

function mergeDiscoverWithFeed(discoverReel, feedPost) {
  if (!feedPost || typeof feedPost !== 'object') return discoverReel;
  const normalizedPost = normalizeForYouPost(feedPost);
  return {
    ...discoverReel,
    ...normalizedPost,
    id: discoverReel.post_id ?? normalizedPost.post_id ?? discoverReel.id,
    post_id: discoverReel.post_id ?? normalizedPost.post_id ?? discoverReel.id,
    reel_id: discoverReel.reel_id ?? normalizedPost.reel_id,
    text: normalizedPost.text || discoverReel.text,
    media: discoverReel.media?.video_url ? discoverReel.media : normalizedPost.media,
    user: normalizeUser(normalizedPost.user || discoverReel.user, discoverReel.user),
  };
}

function mergePageUser(user, page) {
  if (!page || typeof page !== 'object') return user;
  const pageName = page.title || page.name || page.page_title || page.page_name || page.business_name || '';
  return normalizeUser(
    {
      ...user,
      ...page,
      id: page.id ?? page.page_id ?? page.business_id ?? user?.id,
      type: 'page',
      entity: 'page',
      page_id: page.id ?? page.page_id ?? page.business_id ?? user?.page_id ?? user?.id,
      business_id: page.id ?? page.page_id ?? page.business_id ?? user?.business_id ?? user?.id,
      name: pageName || user?.name,
      display_name: pageName || user?.display_name,
      page_name: pageName || user?.page_name,
      avatar: page.avatar || page.logo || page.image || page.cover || user?.avatar,
      verified: page.verified ?? page.is_verified ?? user?.verified,
    },
    user,
  );
}

async function hydrateDiscoverReel(reel, token) {
  const postId = reel.post_id ?? reel.id;
  let hydrated = reel;

  try {
    const feedPost = await fetchFeedPost(postId, token);
    hydrated = mergeDiscoverWithFeed(hydrated, feedPost);
  } catch (e) {
    console.warn('[reelsApi] Discover post hydrate failed:', postId, e?.message);
  }

  const userType = String(hydrated.user?.type || hydrated.user?.entity || '').toLowerCase();
  const pageId = hydrated.user?.page_id ?? hydrated.user?.business_id ?? (userType === 'page' ? hydrated.user?.id : null);
  const hasPageName = !!(hydrated.user?.display_name || hydrated.user?.name || hydrated.user?.page_name || hydrated.user?.business_name);

  if (userType === 'page' && pageId && !hasPageName) {
    try {
      const page = await fetchBusinessPage(pageId, token);
      hydrated = { ...hydrated, user: mergePageUser(hydrated.user, page) };
    } catch (e) {
      console.warn('[reelsApi] Discover page hydrate failed:', pageId, e?.message);
    }
  }

  return hydrated;
}

export async function fetchReels(
  { page = 1, limit = 10, mode = 'for_you', session_id },
  token,
  signal
) {
  const isDiscover = mode === 'discover';
  const url = new URL(isDiscover ? REELS_LIST : FEED_LIST);
  url.searchParams.set('page', String(page));
  url.searchParams.set('limit', String(Math.min(limit, 20)));
  if (isDiscover) {
    url.searchParams.set('mode', 'discover');
    if (session_id) url.searchParams.set('session_id', session_id);
  } else {
    url.searchParams.set('get', 'reels');
  }

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
    return { reels: [], hasMore: false };
  }

  const raw = isDiscover
    ? (Array.isArray(json.data?.reels) ? json.data.reels : [])
    : (
        Array.isArray(json.data?.data)
          ? json.data.data
          : Array.isArray(json.data)
            ? json.data
            : []
      );

  const reels = isDiscover
    ? await Promise.all(raw.map((item) => hydrateDiscoverReel(normalizeDiscoverReel(item), token)))
    : raw.map(normalizeForYouPost);

  const hasMore = json.data?.has_more != null
    ? !!json.data.has_more
    : raw.length >= Math.min(limit, 20);

  return { reels, hasMore };
}

// ─────────────────────────────────────────────
// ENGAGEMENT  (unified feed endpoints)
// ─────────────────────────────────────────────
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
  return Array.isArray(raw?.comments)
    ? raw.comments
    : Array.isArray(raw?.data)
      ? raw.data
      : Array.isArray(raw)
        ? raw
        : [];
}

export async function shareReel(postId, token, text = '', privacy = 'public') {
  return feedJsonPost('share.php', { post_id: postId, text, privacy }, token);
}

// ─────────────────────────────────────────────
// WATCH TRACKING
// Called once per playback session after at least 2 seconds watched.
// ─────────────────────────────────────────────
export async function recordWatch(postId, watchMs, token) {
  return firePost(
    'view.php',
    {
      post_id: postId,
      watch_ms: Math.round(watchMs),
    },
    token
  );
}
