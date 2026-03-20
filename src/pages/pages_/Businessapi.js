import apiClient from '../../api/apiClient';

/* =========================
   LIST BUSINESSES
========================= */
export const getBusinessList = async (page = 1, limit = 10, filters = {}) => {
  try {
    const response = await apiClient.get('/business/list.php', {
      params: { page, limit, ...filters },
    });
    return response.data;
  } catch (error) {
    console.log('BUSINESS API ERROR (getBusinessList):', error?.response?.data || error);
    throw error;
  }
};

/* =========================
   BUSINESS DETAILS
========================= */
export const getBusinessDetails = async (businessId) => {
  try {
    const response = await apiClient.get('/business/view.php', {
      params: { page_id: businessId }, // backend uses page_id
    });
    return response.data;
  } catch (error) {
    console.log('BUSINESS API ERROR (getBusinessDetails):', error?.response?.data || error);
    throw error;
  }
};

/* =========================
   BUSINESS FEED (🔥 FIXED)
========================= */
export const getBusinessFeed = async (pageId, page = 1, limit = 10) => {
  try {
    const response = await apiClient.get('/feed/list.php', {
      params: {
        get: 'posts_page',   // 🔥 IMPORTANT
        id: pageId,          // page_id
        page,
        limit,
      },
    });
    return response.data;
  } catch (error) {
    console.log('BUSINESS API ERROR (getBusinessFeed):', error?.response?.data || error);
    throw error;
  }
};

/* =========================
   FOLLOW / UNFOLLOW
========================= */
export const toggleFollowBusiness = async (businessId, action = 'like') => {
  try {
    const response = await apiClient.post('/business/like.php', {
      page_id: parseInt(businessId, 10),
      action,
    });
    return response.data;
  } catch (error) {
    console.log('BUSINESS API ERROR (toggleFollowBusiness):', error?.response?.data || error);
    throw error;
  }
};

export const followBusiness   = (businessId) => toggleFollowBusiness(businessId, 'like');
export const unfollowBusiness = (businessId) => toggleFollowBusiness(businessId, 'unlike');

/* =========================
   CATEGORIES
========================= */
export const getBusinessCategories = async () => {
  try {
    const response = await apiClient.get('/business/categories.php');
    return response.data;
  } catch (error) {
    console.log('BUSINESS API ERROR (getBusinessCategories):', error?.response?.data || error);
    throw error;
  }
};

/* =========================
   CREATE POST (PAGE/BUSINESS)
========================= */
export const createPagePost = async (payload) => {
  try {
    const response = await apiClient.post('/feed/create.php', payload);
    return response.data;
  } catch (error) {
    console.log('BUSINESS API ERROR (createPagePost):', error?.response?.data || error);
    throw error;
  }
};