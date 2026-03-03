import axios from "axios";

const BASE_URL = "https://hafrik.com/api/v1";

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 10000,
});

const authHeaders = (token) =>
  token ? { headers: { Authorization: `Bearer ${token}` } } : {};

export const getBusinessList = async (page = 1, limit = 10, filters = {}, token) => {
  try {
    const response = await api.get("/business/list.php", { params: { page, limit, ...filters }, ...authHeaders(token) });
    return response.data;
  } catch (error) {
    console.log("BUSINESS API ERROR (getBusinessList):", error?.response?.data || error);
    throw error;
  }
};

export const getBusinessDetails = async (pageId, token) => {
  try {
    const response = await api.get("/business/view.php", { params: { page_id: pageId }, ...authHeaders(token) });
    return response.data;
  } catch (error) {
    console.log("BUSINESS API ERROR (getBusinessDetails):", error?.response?.data || error);
    throw error;
  }
};

export const getBusinessFeed = async (pageId, page = 1, limit = 10, token) => {
  try {
    const response = await api.get("/business/pages_feed.php", { params: { page_id: pageId, page, limit }, ...authHeaders(token) });
    return response.data;
  } catch (error) {
    console.log("BUSINESS API ERROR (getBusinessFeed):", error?.response?.data || error);
    throw error;
  }
};

// Single toggle - backend decides follow or unfollow. page_id must be integer.
export const toggleFollowBusiness = async (pageId, token) => {
  try {
    const response = await api.post("/business/toggle_follow.php", { page_id: parseInt(pageId, 10) }, authHeaders(token));
    return response.data;
  } catch (error) {
    console.log("BUSINESS API ERROR (toggleFollowBusiness):", error?.response?.data || error);
    throw error;
  }
};

// Dedicated unfollow endpoint.
export const unfollowBusiness = async (pageId, token) => {
  try {
    const response = await api.post("/business/unfollow.php", { page_id: parseInt(pageId, 10) }, authHeaders(token));
    return response.data;
  } catch (error) {
    console.log("BUSINESS API ERROR (unfollowBusiness):", error?.response?.data || error);
    throw error;
  }
};

// followBusiness keeps the single-toggle endpoint (server-side decides).
export const followBusiness = (pageId, token) => toggleFollowBusiness(pageId, token);

// Fetch all business categories.
export const getBusinessCategories = async (token) => {
  try {
    const response = await api.get("/business/categories.php", authHeaders(token));
    return response.data;
  } catch (error) {
    console.log("BUSINESS API ERROR (getBusinessCategories):", error?.response?.data || error);
    throw error;
  }
};

// Create a post on a business page (page-owner only).
export const createPagePost = async (payload, token) => {
  try {
    const response = await api.post("/business/create_page_post.php", payload, authHeaders(token));
    return response.data;
  } catch (error) {
    console.log("BUSINESS API ERROR (createPagePost):", error?.response?.data || error);
    throw error;
  }
};