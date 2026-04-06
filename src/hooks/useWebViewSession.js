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
 * CSS injected into every WebView page to suppress the website's
 * own header navigation and footer menu so they don't show inside
 * the app (the app provides its own navigation chrome).
 */
export const HIDE_SITE_CHROME = `
(function(){
  var CSS_ID = '_hfk_app_chrome';

  var RULES = [
    /* ── semantic ── */
    'header','footer','nav',
    /* ── roles ── */
    '[role="banner"]','[role="navigation"]','[role="contentinfo"]',
    /* ── IDs ── */
    '#header','#site-header','#main-header','#page-header','#top-header',
    '#navbar','#nav','#navigation','#top-nav','#topnav',
    '#footer','#site-footer','#page-footer','#bottom-nav','#bottomnav',
    '#bottom-bar','#bottombar','#tab-bar','#tabbar',
    /* ── class wildcards via attribute selector ── */
    '[class*="site-header"]','[class*="siteheader"]','[class*="main-header"]',
    '[class*="app-header"]','[class*="page-header"]','[class*="top-header"]',
    '[class*="navbar"]','[class*="nav-bar"]','[class*="topnav"]',
    '[class*="top-nav"]','[class*="topbar"]','[class*="top-bar"]',
    '[class*="header-wrap"]','[class*="headerwrap"]','[class*="header-container"]',
    '[class*="site-footer"]','[class*="sitefooter"]','[class*="page-footer"]',
    '[class*="footer-wrap"]','[class*="footerwrap"]','[class*="footer-container"]',
    '[class*="bottom-nav"]','[class*="bottomnav"]','[class*="bottom-bar"]',
    '[class*="bottombar"]','[class*="tab-bar"]','[class*="tabbar"]',
    '[class*="bottom-tab"]','[class*="mobile-nav"]','[class*="mobilenav"]',
    '[class*="sticky-header"]','[class*="fixed-header"]',
    '[class*="sticky-footer"]','[class*="fixed-footer"]',
    '[class*="fixed-bottom"]','[class*="sticky-bottom"]',
  ].map(function(sel){ return sel + '{display:none!important;visibility:hidden!important;}'; }).join('');

  function inject(){
    if(document.getElementById(CSS_ID)) return;
    var s = document.createElement('style');
    s.id = CSS_ID;
    s.textContent = RULES;
    var target = document.head || document.documentElement;
    if(target) target.appendChild(s);
  }

  /* Inject immediately */
  inject();

  /* Re-inject on DOMContentLoaded (catches pages that clear head) */
  document.addEventListener('DOMContentLoaded', inject, {once:false});

  /* Re-inject on every load event */
  window.addEventListener('load', inject, {once:false});

  /* Watch for dynamic DOM changes (SPA navigation) */
  if(window.MutationObserver){
    new MutationObserver(inject).observe(
      document.documentElement,
      {childList:true, subtree:true}
    );
  }

  /* Poll every 400ms for 8 seconds as final safety net for iOS WKWebView */
  var ticks = 0;
  var poll = setInterval(function(){
    inject();
    if(++ticks > 20) clearInterval(poll);
  }, 400);

})();true;
`;

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
