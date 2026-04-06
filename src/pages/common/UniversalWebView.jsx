/**
 * UniversalWebView — single WebView screen for all in-app web content.
 *
 * Route params (all optional):
 *   url    {string}  — page to load (default: https://hafrik.com)
 *   title  {string}  — header title shown to the user
 *
 * Auto-login:
 *   All URLs are routed through the webview-login endpoint which validates
 *   the JWT token, creates a PHP session, and redirects to the target page.
 */

import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import {
  BackHandler,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ActivityIndicator,
  StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useAuth } from '../../AuthContext';
import { buildWebViewUrl, REDIRECT_GUARD, HIDE_SITE_CHROME } from '../../hooks/useWebViewSession';
import AuthenticatedWebView from '../../components/AuthenticatedWebView';
import AppDetails from '../../helpers/appdetails';
import { Colors } from '../../theme/colors';

const BRAND  = Colors.primaryDark;
const ACCENT = Colors.primary;
const MUTED  = Colors.secondaryText;

const USER_AGENT = Platform.select({
  ios:     'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 HafrikApp/1.0',
  android: 'Mozilla/5.0 (Linux; Android 12; Mobile) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.0.0 Mobile Safari/537.36 HafrikApp/1.0',
  default: 'HafrikApp/1.0',
});

// ─────────────────────────────────────────────────────────────────────────────
// Centre state screens (error)
// ─────────────────────────────────────────────────────────────────────────────
function CenterState({ icon, iconColor, title, sub, btnLabel, onBtn, onBack }) {
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
  const navigation = useNavigation();
  const route      = useRoute();
  const insets     = useSafeAreaInsets();
  const { token }  = useAuth();

  const {
    url   = 'https://hafrik.com',
    title = 'Hafrik',
  } = route.params ?? {};

  const appUrl  = url.includes('?') ? `${url}&app=true` : `${url}?app=true`;
  const authUrl = buildWebViewUrl(token, appUrl);

  const webRef = useRef(null);

  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState(false);
  const [progress,  setProgress]  = useState(0);
  const [canGoBack, setCanGoBack] = useState(false);

  // ── Android hardware back ──────────────────────────────────────────────────
  const handleBack = useCallback(() => {
    if (canGoBack) { webRef.current?.goBack(); return true; }
    navigation.goBack();
    return false;
  }, [canGoBack, navigation]);

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', handleBack);
    return () => sub.remove();
  }, [handleBack]);

  const handleReload = useCallback(() => {
    setError(false);
    setLoading(true);
    webRef.current?.reload();
  }, []);

  return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      {/* ── App header — covers website's own header ── */}
      <View style={[s.header, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity onPress={handleBack} style={s.headerBtn} activeOpacity={0.8}>
          <Ionicons name="arrow-back" size={20} color={Colors.white} />
        </TouchableOpacity>
        <Text style={s.headerTitle} numberOfLines={1}>{title || 'Hafrik'}</Text>
        <View style={s.headerBtn} />
      </View>

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
          source={{ uri: authUrl }}
          style={s.webview}
          injectedJavaScript={HIDE_SITE_CHROME + REDIRECT_GUARD}
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

      {/* ── Floating back button ── */}
      <View style={[s.fabWrap, { paddingBottom: insets.bottom + 16 }]}>
        <TouchableOpacity
          onPress={handleBack}
          activeOpacity={0.9}
          style={s.fab}
        >
          <LinearGradient
            colors={[BRAND, '#0f5060']}
            style={s.fabGrad}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Ionicons name="arrow-back" size={20} color={Colors.white} />
            <Text style={s.fabText}>Back</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
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
    gap: 8,
  },
  headerBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.14)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 15,
    fontWeight: '800',
    color: Colors.white,
    fontFamily: AppDetails?.fontFamily?.redex?.bold ?? 'System',
  },

  progressTrack: { height: 2.5, backgroundColor: ACCENT + '28' },
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
    color: Colors.neutral750 ?? '#374151',
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

  // ── FAB ──
  fabWrap: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    pointerEvents: 'box-none',
  },
  fab: {
    borderRadius: 32,
    overflow: 'hidden',
    shadowColor: BRAND,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.45,
    shadowRadius: 16,
    elevation: 14,
  },
  fabGrad: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 32,
  },
  fabText: {
    color: Colors.white,
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: -0.2,
    fontFamily: AppDetails?.fontFamily?.redex?.bold ?? 'System',
  },
});
