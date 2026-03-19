import apiClient from '../../api/apiClient';

export const getBusinessList = async (page = 1, limit = 10, filters = {}, token) => {
  try {
    const response = await apiClient.get('/business/list.php', { params: { page, limit, ...filters } });
    return response.data;
  } catch (error) {
    console.log('BUSINESS API ERROR (getBusinessList):', error?.response?.data || error);
    throw error;
  }
};

export const getBusinessDetails = async (businessId, token) => {
  try {
    const response = await apiClient.get('/business/view.php', { params: { page_id: businessId } });
    return response.data;
  } catch (error) {
    console.log('BUSINESS API ERROR (getBusinessDetails):', error?.response?.data || error);
    throw error;
  }
};

export const getBusinessFeed = async (pageId, page = 1, limit = 10, token) => {
  try {
    const response = await apiClient.get('/feed/list.php', {
      params: { get: 'posts_page', id: pageId, page, limit },
    });
    return response.data;
  } catch (error) {
    console.log('BUSINESS API ERROR (getBusinessFeed):', error?.response?.data || error);
    throw error;
  }
};

// POST /business/like.php  { page_id, action: "like" | "unlike" }
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

// Convenience aliases
export const followBusiness   = (businessId) => toggleFollowBusiness(businessId, 'like');
export const unfollowBusiness = (businessId) => toggleFollowBusiness(businessId, 'unlike');

export const getBusinessCategories = async (token) => {
  try {
    const response = await apiClient.get('/business/categories.php');
    return response.data;
  } catch (error) {
    console.log('BUSINESS API ERROR (getBusinessCategories):', error?.response?.data || error);
    throw error;
  }
};

export const createPagePost = async (payload, token) => {
  try {
    const response = await apiClient.post('/feed/create.php', payload);
    return response.data;
  } catch (error) {
    console.log('BUSINESS API ERROR (createPagePost):', error?.response?.data || error);
    throw error;
  }
};
