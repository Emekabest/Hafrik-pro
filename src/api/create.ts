import axios from 'axios';

const BASE = 'https://hafrik.com/api/v1';
const authHeader = (token: string) => ({ Authorization: `Bearer ${token}` });

const isFormData = (v: unknown): v is FormData =>
  typeof FormData !== 'undefined' && v instanceof FormData;

export const createCommunity = async (
  payload: Record<string, unknown> | FormData,
  token: string,
) => {
  const headers: Record<string, string> = {
    ...authHeader(token),
    ...(isFormData(payload) ? { 'Content-Type': 'multipart/form-data' } : {}),
  };
  const { data } = await axios.post(
    `${BASE}/communities/create.php`,
    payload,
    { headers, timeout: 15000 },
  );
  return data;
};

export const createBusiness = async (
  payload: Record<string, unknown> | FormData,
  token: string,
) => {
  const headers: Record<string, string> = {
    ...authHeader(token),
    ...(isFormData(payload) ? { 'Content-Type': 'multipart/form-data' } : {}),
  };
  const { data } = await axios.post(
    `${BASE}/business/create.php`,
    payload,
    { headers, timeout: 15000 },
  );
  return data;
};
