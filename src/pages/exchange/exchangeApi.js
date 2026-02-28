import axios from 'axios';

const BASE = 'https://hafrik.com/api/v1/exchange';

const make = (token) =>
  axios.create({
    baseURL: BASE,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    timeout: 15000,
  });

export const getRates = (token) =>
  make(token).get('/rates_get.php');

export const getBanks = (token) =>
  make(token).get('/banks_list.php');

export const createOrder = (token, data) =>
  make(token).post('/order_create.php', data);

export const getMyOrders = (token, page = 1) =>
  make(token).get(`/orders_my.php?page=${page}`);

export const getAdminOrders = (token, status = '', page = 1) =>
  make(token).get(`/orders_admin.php?status=${encodeURIComponent(status)}&page=${page}`);

export const orderAction = (token, data) =>
  make(token).post('/order_action.php', data);
