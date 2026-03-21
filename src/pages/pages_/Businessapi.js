import apiClient from '../../api/apiClient';

/* =========================
   LIST BUSINESSES
========================= */
export const getBusinessList = async (page = 1, filters = {}) => {
  try {
    const response = await apiClient.get('/business/list.php', {
      params: { page, limit: 20, ...filters },
    });
    return response.data; // { status, data: { page, limit, data: [...businesses] } }
  } catch (error) {
    console.log('BUSINESS API ERROR (getBusinessList):', error?.response?.data || error);
    throw error;
  }
};

/* =========================
   BUSINESS DETAILS
========================= */
export const getBusinessDetails = async (pageId) => {
  try {
    const response = await apiClient.get('/business/view.php', {
      params: { page_id: pageId },
    });
    // Response: { status, data: { page: {...} } }
    return response.data?.data?.page ?? response.data?.data ?? null;
  } catch (error) {
    console.log('BUSINESS API ERROR (getBusinessDetails):', error?.response?.data || error);
    throw error;
  }
};

/* =========================
   BUSINESS FEED (🔥 FIXED)
========================= */
export const getBusinessFeed = async (pageId, page = 1, limit = 10, filter = '') => {
  try {
    const params = { get: 'posts_page', id: pageId, page, limit };
    if (filter && filter !== 'all') params.type = filter;
    const response = await apiClient.get('/feed/list.php', { params });
    return response.data;
  } catch (error) {
    console.log('BUSINESS API ERROR (getBusinessFeed):', error?.response?.data || error);
    throw error;
  }
};

/* =========================
   FOLLOW / UNFOLLOW
========================= */
export const followBusiness = async (businessId) => {
  try {
    const response = await apiClient.post('/business/follow.php', { page_id: parseInt(businessId, 10) });
    return response.data;
  } catch (error) {
    console.log('BUSINESS API ERROR (followBusiness):', error?.response?.data || error);
    throw error;
  }
};

export const unfollowBusiness = async (businessId) => {
  try {
    const response = await apiClient.post('/business/unfollow.php', { page_id: parseInt(businessId, 10) });
    return response.data;
  } catch (error) {
    console.log('BUSINESS API ERROR (unfollowBusiness):', error?.response?.data || error);
    throw error;
  }
};

// Kept for callers that still use the toggle pattern
export const toggleFollowBusiness = (businessId, action = 'like') =>
  action === 'unlike' ? unfollowBusiness(businessId) : followBusiness(businessId);

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
   UPDATE PAGE
========================= */
export const updatePage = async (payload) => {
  try {
    const response = await apiClient.post('/business/update.php', payload);
    return response.data;
  } catch (error) {
    console.log('UPDATE PAGE ERROR:', error?.response?.data || error);
    throw error;
  }
};

/* =========================
   CREATE POST (PAGE/BUSINESS)
========================= */
export const createPagePost = async (payload) => {
  try {
    const response = await apiClient.post('/business/create_page_post.php', payload);
    return response.data;
  } catch (error) {
    console.log('CREATE PAGE POST ERROR:', error?.response?.data || error);
    throw error;
  }
};