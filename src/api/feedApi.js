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

// ─── Block User ───────────────────────────────────────────────────────────────
export const blockUser = async (userId) => {
  const form = new FormData();
  form.append('user_id', String(userId));

  const res = await apiClient.post('/users/block.php', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data;
};

// ─── Unblock User ─────────────────────────────────────────────────────────────
export const unblockUser = async (userId) => {
  const form = new FormData();
  form.append('user_id', String(userId));

  const res = await apiClient.post('/users/unblock.php', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data;
};

// ─── Report Post ──────────────────────────────────────────────────────────────
export const reportPost = async (postId, reason = '') => {
  const form = new FormData();
  form.append('post_id', String(postId));
  if (reason) form.append('reason', reason);

  const res = await apiClient.post('/feed/report.php', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data;
};
