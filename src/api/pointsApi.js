/**
 * pointsApi.js — Hafrik Points System API helpers
 */

import apiClient from './apiClient';

export const getPointsBalance = async (token) => {
  const res = await apiClient.get('/points/balance.php');
  return res.data;
};

export const getRemainingPoints = async (token) => {
  const res = await apiClient.get('/points/remaining.php');
  return res.data;
};

export const getPointsTransactions = async (token, page = 1, limit = 20) => {
  const res = await apiClient.get('/points/transactions.php', {
    params: { page, limit },
  });
  return res.data;
};

export const getLeaderboard = async (token, range = 'today') => {
  const res = await apiClient.get('/points/leaderboard.php', {
    params: { range },
  });
  return res.data;
};

export const getMyRank = async (token, range = 'today') => {
  const res = await apiClient.get('/points/rank_me.php', {
    params: { range },
  });
  return res.data;
};
