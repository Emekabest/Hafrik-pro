/**
 * useWebViewSession
 *
 * Builds an authenticated WebView URL using the Hafrik webview-login endpoint.
 * The endpoint validates the JWT token, creates a PHP session, and redirects
 * the user to the Hafrik website already logged in.
 *
 * Usage:
 *   import { buildWebViewUrl } from '../../hooks/useWebViewSession';
 *   <WebView source={{ uri: buildWebViewUrl(token, 'https://hafrik.com/marketplace') }} />
 */

const WEBVIEW_LOGIN_URL = 'https://hafrik.com/api/v1/auth/webview-login.php';

/**
 * Returns an authenticated WebView URL that logs the user in and redirects
 * to the target URL.
 *
 * @param {string} token     - JWT Bearer token from the mobile app
 * @param {string} targetUrl - The Hafrik page to open after authentication
 */
export const buildWebViewUrl = (token, targetUrl = 'https://hafrik.com') => {
  if (!token) return targetUrl;
  return `${WEBVIEW_LOGIN_URL}?token=${encodeURIComponent(token)}&redirect=${encodeURIComponent(targetUrl)}`;
};

/**
 * JS injected after each page load.
 * Redirects away from login/register pages as a safety net.
 */
export const REDIRECT_GUARD =
  `(function(){var p=window.location.pathname.toLowerCase();` +
  `var a=['/login','/signin','/register','/signup'];` +
  `if(a.some(function(x){return p.includes(x);})){window.location.replace('/');}` +
  `})();true;`;

/**
 * Kept for backward compatibility with screens that import this hook.
 * Authentication now happens via URL redirect — no async bridge call needed.
 */
export default function useWebViewSession(_token, _opts = {}) {
  return { ready: true, bridgeError: null, initSession: () => {}, cookieJS: '' };
}
