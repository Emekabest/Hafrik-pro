/**
 * useWebViewSession
 *
 * Exchanges the app Bearer token for a PHP session (PHPSESSID + session_token)
 * via the bridge endpoint. Returns a ready-to-use JS snippet (`cookieJS`) that
 * each WebView screen prepends to its injectedJavaScriptBeforeContentLoaded —
 * this sets document.cookie before any page content parses, so the server
 * receives the session on every subsequent navigation.
 *
 * No native CookieManager is needed: WKWebView / Android WebView persist
 * cookies set by document.cookie just like a real browser would.
 *
 * Usage:
 *   const { ready, bridgeError, initSession, cookieJS } = useWebViewSession(token);
 *   // skip=true for non-Hafrik URLs:
 *   const { ready, cookieJS } = useWebViewSession(token, { skip: true });
 */

import { useState, useCallback, useEffect } from 'react';

const BRIDGE_URL = 'https://hafrik.com/api/v1/auth/webview_session.php';

/**
 * JS injected after each page load.
 * Redirects away from login/register pages as a safety net.
 */
export const REDIRECT_GUARD =
  `(function(){var p=window.location.pathname.toLowerCase();` +
  `var a=['/login','/signin','/register','/signup'];` +
  `if(a.some(function(x){return p.includes(x);})){window.location.replace('/');}` +
  `})();true;`;

/** Build a JS snippet that sets PHPSESSID + session_token via document.cookie. */
function buildCookieJS(phpsessid, session_token) {
  const safe = (v) => String(v ?? '').replace(/'/g, "\\'");
  return (
    `document.cookie='PHPSESSID=${safe(phpsessid)};path=/;domain=.hafrik.com;SameSite=Lax';` +
    `document.cookie='session_token=${safe(session_token)};path=/;domain=.hafrik.com;SameSite=Lax';`
  );
}

export default function useWebViewSession(token, { skip = false } = {}) {
  const [ready,       setReady]       = useState(skip || !token);
  const [bridgeError, setBridgeError] = useState(null);
  const [cookieJS,    setCookieJS]    = useState('');

  const initSession = useCallback(async () => {
    setBridgeError(null);
    try {
      const res  = await fetch(BRIDGE_URL, {
        method:  'POST',
        headers: { Authorization: `Bearer ${token}` },
      });

      // Read raw text first — server may return PHP errors or HTML instead of JSON
      const text = await res.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch {
        // Non-JSON response — log the first 200 chars for debugging, skip auth gracefully
        console.warn('WebView bridge non-JSON response:', text.slice(0, 200));
        // Treat as a soft failure: skip cookie injection but still open the WebView
        setReady(true);
        return;
      }

      if (data.status !== 'success') {
        setBridgeError(data.message || 'Authentication failed');
        return;
      }

      const { phpsessid, session_token } = data.session ?? {};
      if (phpsessid && session_token) {
        setCookieJS(buildCookieJS(phpsessid, session_token));
      }
      setReady(true);
    } catch (e) {
      console.warn('WebView bridge error:', e.message);
      // Network failure — open WebView anyway without session cookies
      setReady(true);
    }
  }, [token]);

  useEffect(() => {
    if (token && !skip) initSession();
  }, [token, skip]);

  return { ready, bridgeError, initSession, cookieJS };
}
