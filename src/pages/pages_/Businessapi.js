import axios from "axios";

const BASE_URL = "https://hafrik.com/api/v1";

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 10000,
});

export const getBusinessList = async (page = 1, limit = 10, filters = {}) => {
  try {
    const response = await api.get("/business/list.php", { params: { page, limit, ...filters } });
    return response.data;
  } catch (error) {
    console.log("BUSINESS API ERROR (getBusinessList):", error?.response?.data || error);
    throw error;
  }
};

export const getBusinessDetails = async (pageId) => {
  try {
    const response = await api.get("/business/view.php", { params: { page_id: pageId } });
    return response.data;
  } catch (error) {
    console.log("BUSINESS API ERROR (getBusinessDetails):", error?.response?.data || error);
    throw error;
  }
};

export const getBusinessFeed = async (pageId, page = 1, limit = 10) => {
  try {
    const response = await api.get("/business/pages_feed.php", { params: { page_id: pageId, page, limit } });
    return response.data;
  } catch (error) {
    console.log("BUSINESS API ERROR (getBusinessFeed):", error?.response?.data || error);
    throw error;
  }
};

export const followBusiness = async (pageId) => {
  try {
    const response = await api.post("/business/follow.php", { page_id: pageId });
    return response.data;
  } catch (error) {
    console.log("BUSINESS API ERROR (followBusiness):", error?.response?.data || error);
    throw error;
  }
};

export const unfollowBusiness = async (pageId) => {
  try {
    const response = await api.post("/business/unfollow.php", { page_id: pageId });
    return response.data;
  } catch (error) {
    console.log("BUSINESS API ERROR (unfollowBusiness):", error?.response?.data || error);
    throw error;
  }
};