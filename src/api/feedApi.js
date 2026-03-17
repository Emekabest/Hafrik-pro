/**
 * feedApi.js — Hafrik Feed API helpers
 * All requests are authenticated via Authorization: Bearer <token>
 */

const API_BASE = 'https://hafrik.com';

// ─── Edit Post ────────────────────────────────────────────────────────────────
export const editPost = async (postId, text, token) => {
  const form = new FormData();
  form.append('post_id', String(postId));
  form.append('text',    text);

  const res = await fetch(`${API_BASE}/api/v1/feed/edit.php`, {
    method:  'POST',
    headers: { Authorization: `Bearer ${token}` },
    body:    form,
  });

  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json?.error || 'Failed to edit post');
  return json;
};

// ─── Delete Post ──────────────────────────────────────────────────────────────
export const deletePost = async (postId, token) => {
  const form = new FormData();
  form.append('post_id', String(postId));

  const res = await fetch(`${API_BASE}/api/v1/feed/delete.php`, {
    method:  'POST',
    headers: { Authorization: `Bearer ${token}` },
    body:    form,
  });

  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json?.error || 'Failed to delete post');
  return json;
};

// ─── Get Saved Posts ──────────────────────────────────────────────────────────
export const getSavedPosts = async (token, page = 1, limit = 10) => {
  const res = await fetch(
    `${API_BASE}/api/v1/feed/saved.php?page=${page}&limit=${limit}`,
    { headers: { Authorization: `Bearer ${token}` } }
  );

  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json?.error || 'Failed to fetch saved posts');
  return json;
};
