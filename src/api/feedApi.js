/**
 * feedApi.js — Hafrik Feed API helpers
 * All requests are authenticated automatically via apiClient interceptor.
 */

import apiClient from './apiClient';

// ─── Edit Post ────────────────────────────────────────────────────────────────
export const editPost = async (postId, text, token) => {
  const form = new FormData();
  form.append('post_id', String(postId));
  form.append('text',    text);

  const res = await apiClient.post('/feed/edit.php', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data;
};

// ─── Delete Post ──────────────────────────────────────────────────────────────
export const deletePost = async (postId, token) => {
  const form = new FormData();
  form.append('post_id', String(postId));

  const res = await apiClient.post('/feed/delete.php', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data;
};

// ─── Get Saved Posts ──────────────────────────────────────────────────────────
export const getSavedPosts = async (token, page = 1, limit = 10) => {
  const res = await apiClient.get('/feed/saved.php', {
    params: { page, limit },
  });
  return res.data;
};
