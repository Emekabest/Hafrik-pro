import axios from "axios";

const BASE_URL = "https://hafrik.com/api/v1/communities";

// ── Build per-request auth headers ───────────────────────────────────────────
const authHeaders = (token) =>
  token ? { Authorization: `Bearer ${token}` } : {};

/* =================================
   COMMUNITY LIST
   GET /communities/list.php
================================= */
export const getGroups = async (page = 1, limit = 15, filters = {}, token = null) => {
  try {
    const response = await axios.get(`${BASE_URL}/list.php`, {
      params: { page, limit, ...filters },
      headers: authHeaders(token),
      timeout: 12000,
    });
    return response.data;
  } catch (error) {
    console.log("COMMUNITIES API (getGroups):", error?.response?.data || error.message);
    throw error;
  }
};

/* =================================
   COMMUNITY CATEGORIES
   GET /communities/categories.php
================================= */
export const getCategories = async (token = null) => {
  try {
    const response = await axios.get(`${BASE_URL}/categories.php`, {
      headers: authHeaders(token),
      timeout: 10000,
    });
    return response.data;
  } catch (error) {
    console.log("COMMUNITIES API (getCategories):", error?.response?.data || error.message);
    throw error;
  }
};

/* =========================
   GROUP DETAILS
   GET /communities/view.php?group_id=
========================= */
export const getGroupDetails = async (groupId, token = null) => {
  try {
    const response = await axios.get(`${BASE_URL}/view.php`, {
      params: { group_id: groupId },
      headers: authHeaders(token),
      timeout: 10000,
    });
    return response.data;
  } catch (error) {
    console.log("COMMUNITIES API (getGroupDetails):", error?.response?.data || error.message);
    throw error;
  }
};

/* =================================
   GROUP MEDIA
   GET /communities/group_media.php
================================= */
export const getGroupMedia = async (groupId, type = 'all', page = 1, limit = 24, token = null) => {
  try {
    const response = await axios.get(`${BASE_URL}/group_media.php`, {
      params: { group_id: groupId, type, page, limit },
      headers: authHeaders(token),
      timeout: 12000,
    });
    return response.data;
  } catch (error) {
    console.log("COMMUNITIES API (getGroupMedia):", error?.response?.data || error.message);
    throw error;
  }
};

/* =========================
   GROUP FEED
   Uses the unified feed endpoint: GET /feed/list.php?get=posts_group&id=GROUP_ID
========================= */
export const getGroupFeed = async (groupId, page = 1, limit = 10, token = null) => {
  try {
    const response = await axios.get(`https://hafrik.com/api/v1/feed/list.php`, {
      params: { get: 'posts_group', id: groupId, page, limit },
      headers: authHeaders(token),
      timeout: 12000,
    });
    return response.data;
  } catch (error) {
    console.log(
      "COMMUNITIES API (getGroupFeed):",
      error?.response?.data || error.message
    );
    throw error;
  }
};

/* =================================
   GROUP MEMBERS
   GET /communities/members.php
================================= */
export const getGroupMembers = async (groupId, page = 1, limit = 20, token = null) => {
  try {
    const response = await axios.get(`${BASE_URL}/members.php`, {
      params: { group_id: groupId, page, limit },
      headers: authHeaders(token),
      timeout: 10000,
    });
    return response.data;
  } catch (error) {
    console.log("COMMUNITIES API (getGroupMembers):", error?.response?.data || error.message);
    throw error;
  }
};

/* =================================
   JOIN GROUP
   POST /communities/join.php
================================= */
export const joinGroup = async (groupId, token = null) => {
  try {
    const response = await axios.post(
      `${BASE_URL}/join.php`,
      { group_id: groupId },
      { headers: authHeaders(token), timeout: 10000 }
    );
    return response.data;
  } catch (error) {
    console.log("COMMUNITIES API (joinGroup):", error?.response?.data || error.message);
    throw error;
  }
};

/* =================================
   LEAVE GROUP
   POST /communities/leave.php
================================= */
export const leaveGroup = async (groupId, token = null) => {
  try {
    const response = await axios.post(
      `${BASE_URL}/leave.php`,
      { group_id: groupId },
      { headers: authHeaders(token), timeout: 10000 }
    );
    return response.data;
  } catch (error) {
    console.log("COMMUNITIES API (leaveGroup):", error?.response?.data || error.message);
    throw error;
  }
};

/* =================================
   CREATE GROUP
   POST /communities/create.php
================================= */
export const createGroup = async (payload, token = null) => {
  try {
    const response = await axios.post(
      `${BASE_URL}/create.php`,
      payload,
      { headers: authHeaders(token), timeout: 12000 }
    );
    return response.data;
  } catch (error) {
    console.log("COMMUNITIES API (createGroup):", error?.response?.data || error.message);
    throw error;
  }
};
