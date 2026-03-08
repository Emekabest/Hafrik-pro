/**
 * UniversalWebView — single WebView screen for all in-app web content.
 *
 * Route params (all optional):
 *   url    {string}  — page to load (default: https://hafrik.com)
 *   title  {string}  — header title shown to the user
 *
 * Auto-login:
 *   If the URL is on hafrik.com the bridge endpoint is called with the
 *   user's Bearer token. PHPSESSID and session_token are set via
 *   CookieManager at the native level so the user is already logged in
 *   when the page loads — no reload needed.
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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useAuth } from '../../AuthContext';
import useWebViewSession, { REDIRECT_GUARD } from '../../hooks/useWebViewSession';
import AuthenticatedWebView from '../../components/AuthenticatedWebView';
import AppDetails from '../../helpers/appdetails';
import { Colors } from '../../theme/colors';

const withOpacity = (hex, opacity) => {
  const normalized = (hex || "").replace("#", "");
  const alpha = Math.round(Math.max(0, Math.min(1, opacity)) * 255).toString(16).padStart(2, "0");
  return `#${normalized}${alpha}`;
};

// ─────────────────────────────────────────────────────────────────────────────
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
  const navigation      = useNavigation();
  const route           = useRoute();
  const { top }         = useSafeAreaInsets();
  const { token, user } = useAuth();

  const {
    url   = 'https://hafrik.com',
    title = 'Hafrik',
  } = route.params ?? {};

  // Only run the bridge if the URL belongs to hafrik.com and we have a token
  const needsAuth = !!token && isHafrikUrl(url);

  const webRef = useRef(null);

  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState(false);
  const [progress,  setProgress]  = useState(0);
  const [canGoBack, setCanGoBack] = useState(false);

  const { ready, bridgeError, initSession, cookieJS } = useWebViewSession(token, { skip: !needsAuth });

  // ── JS injected BEFORE page content loads ─────────────────────────────────
  const injectedBeforeContent = useMemo(() => {
    const userPayload = user ? (() => {
      const payload = JSON.stringify({
        id:       user.id        ?? null,
        username: user.username  ?? null,
        email:    user.email     ?? null,
        name:     user.name ?? user.full_name ?? user.username ?? null,
        avatar:   user.avatar ?? user.profile_picture ?? null,
        token:    token ?? null,
      });
      return `window.hafrikNativeUser=${payload};window.hafrikNativeApp=true;`;
    })() : '';
    return `${cookieJS}${userPayload}true;`;
  }, [user, token, cookieJS]);

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
        <BrowserHeader title={title} url={url} onBack={() => navigation.goBack()} onShare={null} />
        <CenterState icon="key-outline" iconColor={ACCENT} sub="Signing you in…" />
      </View>
    );
  }

  // ── Render: bridge / auth error ────────────────────────────────────────────
  if (bridgeError) {
    return (
      <View style={[s.root, { paddingTop: top }]}>
        <BrowserHeader title={title} url={url} onBack={() => navigation.goBack()} onShare={null} />
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
      <BrowserHeader title={title} url={url} onBack={handleBack} onShare={handleShare} />

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
        <AuthenticatedWebView
          ref={webRef}
          source={{ uri: url }}
          style={s.webview}
          injectedJavaScriptBeforeContentLoaded={injectedBeforeContent}
          injectedJavaScript={REDIRECT_GUARD}
          onLoadStart={() => { setLoading(true); setError(false); }}
          onLoadEnd={() => setLoading(false)}
          onError={() => { setLoading(false); setError(true); }}
          onLoadProgress={({ nativeEvent }) => setProgress(nativeEvent.progress)}
          onNavigationStateChange={(state) => setCanGoBack(state.canGoBack)}
          onContentProcessDidTerminate={handleReload}
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

  progressTrack: { height: 2.5, backgroundColor: withOpacity(Colors.tealAccent, 0.18) },
  progressBar:   { height: '100%', backgroundColor: ACCENT },

  webview: { flex: 1, backgroundColor: Colors.white },

  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },

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
