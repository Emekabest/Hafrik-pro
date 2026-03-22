import apiClient from '../../../api/apiClient';

const BASE = 'https://hafrik.com/api/v1/communities';

// ── List groups (explore / joined / suggested / search) ───────────────────────
// filters: { joined: 1 } | { suggested: 1 } | { search: "..." } | { category_id: id }
export const getGroups = async (page = 1, limit = 15, filters = {}) => {
  const response = await apiClient.get(`${BASE}/list.php`, {
    params: { page, limit, ...filters },
  });
  return response.data;
};

// ── Categories ────────────────────────────────────────────────────────────────
export const getCategories = async () => {
  const response = await apiClient.get(`${BASE}/categories.php`);
  return response.data;
};

// ── Group details ─────────────────────────────────────────────────────────────
export const getGroupDetails = async (groupId) => {
  const response = await apiClient.get(`${BASE}/view.php`, {
    params: { group_id: groupId },
  });
  return response.data;
};

// ── Group feed ────────────────────────────────────────────────────────────────
export const getGroupFeed = async (groupId, page = 1, limit = 10) => {
  const response = await apiClient.get('https://hafrik.com/api/v1/feed/list.php', {
    params: { get: 'posts_group', id: groupId, page, limit },
  });
  return response.data;
};

// ── Members ───────────────────────────────────────────────────────────────────
export const getGroupMembers = async (groupId, page = 1, limit = 20) => {
  const response = await apiClient.get(`${BASE}/members.php`, {
    params: { group_id: groupId, page, limit },
  });
  return response.data;
};

// ── Media ─────────────────────────────────────────────────────────────────────
export const getGroupMedia = async (groupId, type = 'all', page = 1, limit = 24) => {
  const response = await apiClient.get(`${BASE}/group_media.php`, {
    params: { group_id: groupId, type, page, limit },
  });
  return response.data;
};

// ── Join / Leave ──────────────────────────────────────────────────────────────
export const joinGroup = async (groupId) => {
  const response = await apiClient.post(`${BASE}/join.php`, { group_id: groupId });
  return response.data;
};

export const leaveGroup = async (groupId) => {
  const response = await apiClient.post(`${BASE}/leave.php`, { group_id: groupId });
  return response.data;
};

// Kept for any legacy callers
export const toggleGroupMembership = (groupId, action = 'join') =>
  action === 'join' ? joinGroup(groupId) : leaveGroup(groupId);

// ── Create ────────────────────────────────────────────────────────────────────
export const createGroup = async (payload) => {
  const response = await apiClient.post(`${BASE}/create.php`, payload);
  return response.data;
};
