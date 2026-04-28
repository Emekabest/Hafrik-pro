/**
 * walletApi.js — Hafrik Wallet API helpers
 * All requests authenticated automatically via apiClient interceptor.
 */

import apiClient from './apiClient';

// ─── Balance ──────────────────────────────────────────────────────────────────
export const getWalletBalance = async (token) => {
  const res = await apiClient.get('/wallet/balance.php');
  return res.data;
};

// ─── Transactions (paginated) ─────────────────────────────────────────────────
export const getWalletTransactions = async (token, page = 1, limit = 20) => {
  const res = await apiClient.get('/wallet/transactions.php', {
    params: { page, limit },
  });
  return res.data;
};

// ─── Transfer money to another user ──────────────────────────────────────────
export const transferMoney = async (token, userId, amount) => {
  const res = await apiClient.post('/wallet/transfer.php', {
    user_id: Number(userId),
    amount:  Number(amount),
  });
  return res.data;
};

// ─── Tip a creator ────────────────────────────────────────────────────────────
export const sendTip = async (token, userId, amount) => {
  const res = await apiClient.post('/wallet/tip.php', {
    user_id: Number(userId),
    amount:  Number(amount),
  });
  return res.data;
};

// ─── Convert points → wallet ──────────────────────────────────────────────────
export const withdrawPoints = async (token, amount) => {
  const res = await apiClient.post('/wallet/withdraw_points.php', {
    amount: Number(amount),
  });
  return res.data;
};

// ─── Move affiliate earnings → wallet ─────────────────────────────────────────
export const withdrawAffiliates = async (token, amount) => {
  const res = await apiClient.post('/wallet/withdraw_affiliates.php', {
    amount: Number(amount),
  });
  return res.data;
};

// ─── Initiate wallet top-up via Paystack ──────────────────────────────────────
// Returns { payment_url, reference }
export const initTopup = async (token, amount) => {
  const res = await apiClient.post('/marketplace/topup_init.php', {
    amount: Number(amount),
  });
  return res.data;
};
