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
  var css = [
    /* semantic elements */
    'header { display:none!important; }',
    'footer { display:none!important; }',
    /* common class patterns */
    '[class*="navbar"]    { display:none!important; }',
    '[class*="top-nav"]   { display:none!important; }',
    '[class*="topnav"]    { display:none!important; }',
    '[class*="top-bar"]   { display:none!important; }',
    '[class*="topbar"]    { display:none!important; }',
    '[class*="site-header"]{ display:none!important; }',
    '[class*="siteheader"]{ display:none!important; }',
    '[class*="main-header"]{ display:none!important; }',
    '[class*="app-header"]{ display:none!important; }',
    '[class*="page-header"]{ display:none!important; }',
    '[class*="bottom-nav"]{ display:none!important; }',
    '[class*="bottomnav"] { display:none!important; }',
    '[class*="bottom-bar"]{ display:none!important; }',
    '[class*="bottombar"] { display:none!important; }',
    '[class*="bottom-tab"]{ display:none!important; }',
    '[class*="tab-bar"]   { display:none!important; }',
    '[class*="tabbar"]    { display:none!important; }',
    '[class*="footer"]    { display:none!important; }',
    '[class*="site-footer"]{ display:none!important; }',
    /* ARIA roles */
    '[role="banner"]      { display:none!important; }',
    '[role="navigation"]  { display:none!important; }',
    '[role="contentinfo"] { display:none!important; }',
    /* common IDs */
    '#header   { display:none!important; }',
    '#navbar   { display:none!important; }',
    '#nav      { display:none!important; }',
    '#footer   { display:none!important; }',
    '#bottom-nav{ display:none!important; }',
  ].join(' ');
  var s = document.createElement('style');
  s.textContent = css;
  (document.head || document.documentElement).appendChild(s);

  /* Re-apply after dynamic renders (React/Vue SPA navigation) */
  if(window.MutationObserver){
    var mo = new MutationObserver(function(){
      if(!document.getElementById('_hfk_chrome_style')){
        s.id = '_hfk_chrome_style';
        (document.head || document.documentElement).appendChild(s);
      }
    });
    mo.observe(document.documentElement,{childList:true,subtree:true});
    s.id = '_hfk_chrome_style';
  }
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
