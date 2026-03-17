/**
 * walletApi.js — Hafrik Wallet API helpers
 * All requests authenticated via Authorization: Bearer <token>
 */

const API_BASE = 'https://hafrik.com';

// ─── Balance ──────────────────────────────────────────────────────────────────
export const getWalletBalance = async (token) => {
  const res = await fetch(`${API_BASE}/api/v1/wallet/balance.php`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json?.error || 'Failed to fetch balance');
  return json;
};

// ─── Transactions (paginated) ─────────────────────────────────────────────────
export const getWalletTransactions = async (token, page = 1, limit = 20) => {
  const res = await fetch(
    `${API_BASE}/api/v1/wallet/transactions.php?page=${page}&limit=${limit}`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json?.error || 'Failed to fetch transactions');
  return json;
};

// ─── Transfer money to another user ──────────────────────────────────────────
export const transferMoney = async (token, userId, amount) => {
  const res = await fetch(`${API_BASE}/api/v1/wallet/transfer.php`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ user_id: Number(userId), amount: Number(amount) }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json?.error || json?.message || 'Transfer failed');
  return json;
};

// ─── Tip a creator ────────────────────────────────────────────────────────────
export const sendTip = async (token, userId, amount) => {
  const res = await fetch(`${API_BASE}/api/v1/wallet/tip.php`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ user_id: Number(userId), amount: Number(amount) }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json?.error || json?.message || 'Tip failed');
  return json;
};

// ─── Convert points → wallet ──────────────────────────────────────────────────
export const withdrawPoints = async (token, amount) => {
  const res = await fetch(`${API_BASE}/api/v1/wallet/withdraw_points.php`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ amount: Number(amount) }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json?.error || json?.message || 'Conversion failed');
  return json;
};

// ─── Move affiliate earnings → wallet ─────────────────────────────────────────
export const withdrawAffiliates = async (token, amount) => {
  const res = await fetch(`${API_BASE}/api/v1/wallet/withdraw_affiliates.php`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ amount: Number(amount) }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json?.error || json?.message || 'Withdrawal failed');
  return json;
};
