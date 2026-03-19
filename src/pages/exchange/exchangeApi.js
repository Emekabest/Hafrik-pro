import apiClient from '../../api/apiClient';

const BASE = '/exchange';

export const getRates = (token) =>
  apiClient.get(`${BASE}/rates_get.php`);

export const getBanks = (token) =>
  apiClient.get(`${BASE}/banks_list.php`);

export const createOrder = (token, data) =>
  apiClient.post(`${BASE}/order_create.php`, data);

export const getMyOrders = (token, page = 1) =>
  apiClient.get(`${BASE}/orders_my.php`, { params: { page } });

export const getAdminOrders = (token, status = '', page = 1) =>
  apiClient.get(`${BASE}/orders_admin.php`, { params: { status, page } });

export const orderAction = (token, data) =>
  apiClient.post(`${BASE}/order_action.php`, data);
