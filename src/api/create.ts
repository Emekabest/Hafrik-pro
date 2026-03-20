import apiClient from './apiClient';

const isFormData = (v: unknown): v is FormData =>
  typeof FormData !== 'undefined' && v instanceof FormData;

export const createCommunity = async (
  payload: Record<string, unknown> | FormData,
  token: string,
) => {
  const headers: Record<string, string> = isFormData(payload)
    ? { 'Content-Type': 'multipart/form-data' }
    : {};
  const { data } = await apiClient.post(
    '/communities/create.php',
    payload,
    { headers },
  );
  return data;
};

export const createBusiness = async (
  payload: Record<string, unknown> | FormData,
  token: string,
) => {
  const headers: Record<string, string> = isFormData(payload)
    ? { 'Content-Type': 'multipart/form-data' }
    : {};
  const { data } = await apiClient.post(
    '/business/create.php',
    payload,
    { headers },
  );
  return data;
};
