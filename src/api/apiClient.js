/**
 * src/api/apiClient.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Single axios instance used by every API call in the app.
 *
 * What it does automatically:
 *  1. Prepends the Hafrik base URL to every relative path.
 *  2. Reads the JWT from AsyncStorage and attaches it as
 *     Authorization: Bearer <token> on every outgoing request.
 *  3. On a 401 response (Unauthorized / Invalid session):
 *     - Clears hafrik_token + hafrik_user from AsyncStorage.
 *     - Resets the navigation stack to the Login screen.
 *
 * Usage:
 *   import apiClient from '../api/apiClient';
 *
 *   // GET
 *   const res = await apiClient.get('/feed/list.php', { params: { page: 1 } });
 *
 *   // POST JSON
 *   const res = await apiClient.post('/feed/react.php', { post_id: 42, reaction: 'like' });
 *
 *   // POST FormData (e.g. file upload)
 *   const res = await apiClient.post('/uploads/media.php', formData, {
 *     headers: { 'Content-Type': 'multipart/form-data' },
 *   });
 *
 * Rules:
 *   - Do NOT add Authorization headers in individual controllers/api files.
 *   - Only pass user_id when targeting ANOTHER user (follow, view profile, etc.).
 *   - Never send auth_user_id or manually pass the logged-in user id.
 */

import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { navigationRef } from '../helpers/navigationRef';

// ── Constants ─────────────────────────────────────────────────────────────────
export const BASE_URL  = 'https://hafrik.com/api/v1';
const TOKEN_KEY = 'hafrik_token';
const USER_KEY  = 'hafrik_user';

// ── Axios instance ─────────────────────────────────────────────────────────────
const apiClient = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,   // default for normal API calls
  headers: {
    'Content-Type': 'application/json',
    'Accept':        'application/json',
  },
});

// ── Upload-specific axios instance — NO timeout ────────────────────────────────
// axios treats timeout:0 inconsistently across versions, so we use a separate
// instance with no timeout key at all for large file uploads.
export const uploadClient = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    'Accept':        'application/json',
  },
});

// ── Shared request interceptor — attach JWT ───────────────────────────────────
const authRequestInterceptor = async (config) => {
  const isPublicRoute = config.url?.includes('/auth/verify.php');
  if (isPublicRoute) return config;
  if (config.headers.Authorization) return config;
  const token = await AsyncStorage.getItem(TOKEN_KEY);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
};

apiClient.interceptors.request.use(authRequestInterceptor, (error) => Promise.reject(error));
uploadClient.interceptors.request.use(authRequestInterceptor, (error) => Promise.reject(error));

// ── Response interceptor — handle 401 globally ────────────────────────────────
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const status  = error.response?.status;
    const message = error.response?.data?.message ?? '';

    const isUnauthorized =
      status === 401 ||
      message === 'Unauthorized' ||
      message === 'Invalid session';

    // Don't wipe session for onboarding routes — a wrong verify code
    // returns 401 but the session itself is still valid.
    const url = error.config?.url ?? '';
    const isOnboardingRoute =
      url.includes('/profile/avatar.php') ||
      url.includes('/profile/city.php') ||
      url.includes('/onboarding/');

    if (isUnauthorized && !isOnboardingRoute) {
      // Wipe credentials
      await AsyncStorage.multiRemove([TOKEN_KEY, USER_KEY]);

      // Navigate to Login — reset stack so the user can't go back
      if (navigationRef.isReady()) {
        navigationRef.reset({ index: 0, routes: [{ name: 'Login' }] });
      }
    }

    return Promise.reject(error);
  },
);

export default apiClient;
