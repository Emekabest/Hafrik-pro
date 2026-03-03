/**
 * AuthenticatedWebView
 *
 * Thin WebView wrapper with the cookie flags pre-set.
 * Session initialisation (bridge call + CookieManager) is handled
 * by each screen before this component is rendered.
 */

import React, { forwardRef } from 'react';
import { WebView } from 'react-native-webview';

const AuthenticatedWebView = forwardRef(({ style, ...props }, ref) => (
  <WebView
    ref={ref}
    style={style}
    sharedCookiesEnabled={true}
    thirdPartyCookiesEnabled={true}
    javaScriptEnabled={true}
    domStorageEnabled={true}
    {...props}
  />
));

export default AuthenticatedWebView;
