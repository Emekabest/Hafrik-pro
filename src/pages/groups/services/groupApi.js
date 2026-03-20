import apiClient from '../../../api/apiClient';

const BASE = 'https://hafrik.com/api/v1/communities';

// ── List groups (explore / joined / suggested / search) ───────────────────────
// filters: { joined: 1 } | { suggested: 1 } | { search: "..." } | { category: id }
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
// Correct endpoint: /communities/group_feed.php (NOT /feed/list.php)
export const getGroupFeed = async (groupId, page = 1, limit = 10) => {
  const response = await apiClient.get(`${BASE}/group_feed.php`, {
    params: { group_id: groupId, page, limit },
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
// Single endpoint with action: "join" | "leave"
// Response: { group_id, is_joined, members }
export const toggleGroupMembership = async (groupId, action = 'join') => {
  const response = await apiClient.post(`${BASE}/join.php`, {
    group_id: groupId,
    action,
  });
  return response.data;
};

// Convenience aliases
export const joinGroup  = (groupId) => toggleGroupMembership(groupId, 'join');
export const leaveGroup = (groupId) => toggleGroupMembership(groupId, 'leave');

// ── Create ────────────────────────────────────────────────────────────────────
export const createGroup = async (payload) => {
  const response = await apiClient.post(`${BASE}/create.php`, payload);
  return response.data;
};
