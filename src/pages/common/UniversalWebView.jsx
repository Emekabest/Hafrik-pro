/**
 * UniversalWebView — single WebView screen for all in-app web content.
 *
 * Route params (all optional):
 *   url    {string}  — page to load (default: https://hafrik.com)
 *   title  {string}  — header title shown to the user
 *
 * Auto-login:
 *   If the URL is on hafrik.com the bridge endpoint is called with the
 *   user's Bearer token.  The returned PHP session credentials are injected
 *   as cookies so the user is already logged in when the page loads.
 *   User data is also exposed as window.hafrikNativeUser so the web app can
 *   personalise the page immediately without an extra round-trip.
 */

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  BackHandler,
  Platform,
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ActivityIndicator,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useAuth } from '../../AuthContext';
import AppDetails from '../../helpers/appdetails';
import { Colors } from '../../theme/colors';

const withOpacity = (hex, opacity) => {
  const normalized = (hex || "").replace("#", "");
  const alpha = Math.round(Math.max(0, Math.min(1, opacity)) * 255).toString(16).padStart(2, "0");
  return `#${normalized}${alpha}`;
};


// ─────────────────────────────────────────────────────────────────────────────
const BRIDGE_URL  = 'https://hafrik.com/api/v1/auth/webview-login.php';
const HAFRIK_HOST = 'hafrik.com';
const BRAND       = Colors.primaryDark;
const ACCENT      = Colors.primary;
const MUTED       = Colors.secondaryText;

const USER_AGENT = Platform.select({
  ios:     'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 HafrikApp/1.0',
  android: 'Mozilla/5.0 (Linux; Android 12; Mobile) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.0.0 Mobile Safari/537.36 HafrikApp/1.0',
  default: 'HafrikApp/1.0',
});

/** True if the URL lives on hafrik.com (needs auto-login). */
const isHafrikUrl = (url = '') => {
  try { return new URL(url).hostname.endsWith(HAFRIK_HOST); }
  catch { return false; }
};

// ─────────────────────────────────────────────────────────────────────────────
// Reusable header
// ─────────────────────────────────────────────────────────────────────────────
function BrowserHeader({ title, url, onBack, onShare }) {
  const displayUrl = url ? url.replace(/^https?:\/\//, '') : '';
  return (
    <View style={s.header}>
      <TouchableOpacity style={s.headerBtn} onPress={onBack} activeOpacity={0.8}>
        <Ionicons name="arrow-back" size={21} color={Colors.white} />
      </TouchableOpacity>

      <View style={s.headerCenter}>
        <Text style={s.headerTitle} numberOfLines={1}>{title || 'Hafrik'}</Text>
        {!!displayUrl && (
          <Text style={s.headerUrl} numberOfLines={1}>{displayUrl}</Text>
        )}
      </View>

      {onShare ? (
        <TouchableOpacity style={s.headerBtn} onPress={onShare} activeOpacity={0.8}>
          <Ionicons name="share-outline" size={21} color={Colors.white} />
        </TouchableOpacity>
      ) : (
        <View style={s.headerBtn} />
      )}
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Centre state screens (loading / error)
// ─────────────────────────────────────────────────────────────────────────────
function CenterState({ icon, iconColor, title, sub, btnLabel, onBtn }) {
  return (
    <View style={s.centerBox}>
      <Ionicons name={icon} size={52} color={iconColor ?? MUTED} />
      {!!title && <Text style={s.centerTitle}>{title}</Text>}
      {!!sub   && <Text style={s.centerSub}>{sub}</Text>}
      {!!btnLabel && (
        <TouchableOpacity style={s.retryBtn} activeOpacity={0.85} onPress={onBtn}>
          <Ionicons name="refresh" size={16} color={Colors.white} />
          <Text style={s.retryText}>{btnLabel}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN SCREEN
// ─────────────────────────────────────────────────────────────────────────────
export default function UniversalWebView() {
  const navigation        = useNavigation();
  const route             = useRoute();
  const { top }           = useSafeAreaInsets();
  const { token, user }   = useAuth();

  const {
    url   = 'https://hafrik.com',
    title = 'Hafrik',
  } = route.params ?? {};

  // Only run the bridge if the URL belongs to hafrik.com and we have a token
  const needsAuth = !!token && isHafrikUrl(url);

  const webRef = useRef(null);

  const [ready,        setReady]        = useState(!needsAuth);
  const [sessionCreds, setSessionCreds] = useState(null);
  const [bridgeError,  setBridgeError]  = useState(null);
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState(false);
  const [progress,     setProgress]     = useState(0);
  const [canGoBack,    setCanGoBack]    = useState(false);

  // ── Bridge: exchange Bearer token for PHP session credentials ──────────────
  const initSession = useCallback(async () => {
    setBridgeError(null);
    try {
      const res  = await fetch(BRIDGE_URL, {
        method:  'GET',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();

      if (data.status !== 'success') {
        setBridgeError(data.message || 'Authentication failed. Please try again.');
        return;
      }

      setSessionCreds({ phpsessid: data.phpsessid, session_token: data.session_token });
      setReady(true);
    } catch (e) {
      setBridgeError(e.message ?? 'Network error. Check your connection.');
    }
  }, [token]);

  useEffect(() => {
    if (needsAuth) initSession();
  }, [needsAuth, initSession]);

  // ── JS injected BEFORE page content loads ─────────────────────────────────
  // Exposes user data so the web app can personalise UI without extra requests.
  const injectedBeforeContent = useMemo(() => {
    if (!user) return 'true;';
    const payload = JSON.stringify({
      id:       user.id        ?? null,
      username: user.username  ?? null,
      email:    user.email     ?? null,
      name:     user.name ?? user.full_name ?? user.username ?? null,
      avatar:   user.avatar ?? user.profile_picture ?? null,
      token:    token ?? null,
    });
    return `window.hafrikNativeUser=${payload};window.hafrikNativeApp=true;true;`;
  }, [user, token]);

  // ── JS injected AFTER page loads ──────────────────────────────────────────
  // Sets cookies if not already present (triggers one reload, then stops).
  // Also redirects away from login/register pages.
  const injectedAfterLoad = useMemo(() => {
    const cookiePart = sessionCreds
      ? `(function(){` +
          `if(document.cookie.indexOf('PHPSESSID=')!==-1)return;` +
          `var e=new Date();e.setDate(e.getDate()+30);var x=e.toUTCString();` +
          `document.cookie='PHPSESSID=${sessionCreds.phpsessid};path=/;domain=.hafrik.com;expires='+x;` +
          `document.cookie='session_token=${sessionCreds.session_token};path=/;domain=.hafrik.com;expires='+x;` +
          `window.location.reload();` +
        `})();`
      : '';

    const redirectPart =
      `(function(){` +
        `var p=window.location.pathname.toLowerCase();` +
        `var auth=['/login','/signin','/register','/signup'];` +
        `if(auth.some(function(x){return p.includes(x);})){window.location.replace('/');}` +
      `})();`;

    return `${cookiePart}${redirectPart}true;`;
  }, [sessionCreds]);

  // ── Android hardware back button ───────────────────────────────────────────
  const handleBack = useCallback(() => {
    if (canGoBack) { webRef.current?.goBack(); return true; }
    navigation.goBack();
    return false;
  }, [canGoBack, navigation]);

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', handleBack);
    return () => sub.remove();
  }, [handleBack]);

  // ── Share ──────────────────────────────────────────────────────────────────
  const handleShare = useCallback(async () => {
    try { await Share.share({ message: `${title} — ${url}`, url }); } catch {}
  }, [title, url]);

  // ── Reload ─────────────────────────────────────────────────────────────────
  const handleReload = useCallback(() => {
    setError(false);
    setLoading(true);
    webRef.current?.reload();
  }, []);

  // ── Render: waiting for session credentials ────────────────────────────────
  if (needsAuth && !ready && !bridgeError) {
    return (
      <View style={[s.root, { paddingTop: top }]}>
        <BrowserHeader
          title={title}
          url={url}
          onBack={() => navigation.goBack()}
          onShare={null}
        />
        <CenterState
          icon="key-outline"
          iconColor={ACCENT}
          title={null}
          sub="Signing you in…"
        />
      </View>
    );
  }

  // ── Render: bridge / auth error ────────────────────────────────────────────
  if (bridgeError) {
    return (
      <View style={[s.root, { paddingTop: top }]}>
        <BrowserHeader
          title={title}
          url={url}
          onBack={() => navigation.goBack()}
          onShare={null}
        />
        <CenterState
          icon="warning-outline"
          title="Session Error"
          sub={bridgeError}
          btnLabel="Retry"
          onBtn={initSession}
        />
      </View>
    );
  }

  // ── Render: main browser ───────────────────────────────────────────────────
  return (
    <View style={[s.root, { paddingTop: top }]}>
      <BrowserHeader
        title={title}
        url={url}
        onBack={handleBack}
        onShare={handleShare}
      />

      {/* Thin teal progress bar */}
      <View style={s.progressTrack}>
        {loading && (
          <View style={[s.progressBar, { width: `${Math.round(progress * 100)}%` }]} />
        )}
      </View>

      {error ? (
        <CenterState
          icon="cloud-offline-outline"
          title="Could not load page"
          sub={url}
          btnLabel="Retry"
          onBtn={handleReload}
        />
      ) : (
        <WebView
          ref={webRef}
          source={{ uri: url }}
          style={s.webview}

          // Inject user data before the page paints (no reload needed)
          injectedJavaScriptBeforeContentLoaded={injectedBeforeContent}

          // Set cookies + redirect guard after page loads
          injectedJavaScript={injectedAfterLoad}

          onLoadStart={() => { setLoading(true); setError(false); }}
          onLoadEnd={() => setLoading(false)}
          onError={() => { setLoading(false); setError(true); }}
          onLoadProgress={({ nativeEvent }) => setProgress(nativeEvent.progress)}
          onNavigationStateChange={(state) => setCanGoBack(state.canGoBack)}
          onContentProcessDidTerminate={handleReload}

          sharedCookiesEnabled
          thirdPartyCookiesEnabled
          javaScriptEnabled
          domStorageEnabled
          allowsInlineMediaPlayback
          mediaPlaybackRequiresUserAction={false}
          cacheEnabled
          originWhitelist={['*']}
          userAgent={USER_AGENT}

          startInLoadingState
          renderLoading={() => (
            <View style={s.loadingOverlay}>
              <ActivityIndicator size="large" color={ACCENT} />
            </View>
          )}
        />
      )}
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: BRAND },

  // ── Header ──────────────────────────────────────────────────────────────────
  header: {
    backgroundColor: BRAND,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingBottom: 12,
    paddingTop: 8,
    gap: 8,
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
    elevation: 8,
  },
  headerBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: withOpacity(Colors.white, 0.14),
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: Colors.white,
    fontFamily: AppDetails?.fontFamily?.redex?.bold ?? 'System',
  },
  headerUrl: {
    fontSize: 10,
    color: withOpacity(Colors.white, 0.48),
    fontFamily: AppDetails?.fontFamily?.inter?.regular ?? 'System',
    marginTop: 1,
  },

  // ── Progress bar ────────────────────────────────────────────────────────────
  progressTrack: { height: 2.5, backgroundColor: withOpacity(Colors.tealAccent, 0.18) },
  progressBar:   { height: '100%', backgroundColor: ACCENT },

  // ── WebView ─────────────────────────────────────────────────────────────────
  webview: { flex: 1, backgroundColor: Colors.white },

  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ── Centre state (auth wait / error / offline) ──────────────────────────────
  centerBox: {
    flex: 1,
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    gap: 10,
  },
  centerTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: Colors.neutral750,
    fontFamily: AppDetails?.fontFamily?.redex?.bold ?? 'System',
  },
  centerSub: {
    fontSize: 13,
    color: MUTED,
    textAlign: 'center',
    fontFamily: AppDetails?.fontFamily?.inter?.regular ?? 'System',
  },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: BRAND,
    borderRadius: 12,
    paddingHorizontal: 22,
    paddingVertical: 11,
    marginTop: 8,
  },
  retryText: {
    color: Colors.white,
    fontSize: 14,
    fontWeight: '800',
    fontFamily: AppDetails?.fontFamily?.redex?.bold ?? 'System',
  },
});
