/**
 * pointsApi.js — Hafrik Points System API helpers
 */

import axios from 'axios';

const api = axios.create({
  baseURL: 'https://hafrik.com/api/v1',
});

const authHeader = (token) => ({ Authorization: `Bearer ${token}` });

export const getPointsBalance = async (token) => {
  const res = await api.get('/points/balance.php', {
    headers: authHeader(token),
  });
  return res.data;
};

export const getRemainingPoints = async (token) => {
  const res = await api.get('/points/remaining.php', {
    headers: authHeader(token),
  });
  return res.data;
};

export const getPointsTransactions = async (token, page = 1, limit = 20) => {
  const res = await api.get(`/points/transactions.php?page=${page}&limit=${limit}`, {
    headers: authHeader(token),
  });
  return res.data;
};

export const getLeaderboard = async (token, range = 'today') => {
  const res = await api.get(`/points/leaderboard.php?range=${range}`, {
    headers: authHeader(token),
  });
  return res.data;
};

export const getMyRank = async (token, range = 'today') => {
  const res = await api.get(`/points/rank_me.php?range=${range}`, {
    headers: authHeader(token),
  });
  return res.data;
};
