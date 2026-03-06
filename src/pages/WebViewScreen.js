// src/pages/WebViewScreen.js
import React, { useRef, useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  TouchableOpacity,
  ActivityIndicator,
  BackHandler,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../AuthContext';
import AuthenticatedWebView from '../components/AuthenticatedWebView';
import { Colors } from '../theme';

const BRAND = Colors.primaryDark;
const WHITE = Colors.white;
const DARK = Colors.black;
const MUTED = Colors.secondaryText;
const BORDER = Colors.border;
const WARNING = Colors.warning;

const BRIDGE_URL = 'https://hafrik.com/api/v1/auth/webview-login.php';

const WebViewScreen = ({ navigation, route }) => {
  const { url, title } = route.params || {};
  const { token, user } = useAuth();
  const webViewRef = useRef(null);

  const [ready,       setReady]       = useState(false);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState(false);
  const [bridgeError, setBridgeError] = useState(null);
  const [canGoBack,    setCanGoBack]    = useState(false);
  const [currentUrl,   setCurrentUrl]   = useState(url || 'https://hafrik.com');
  const [sessionCreds, setSessionCreds] = useState(null);

  // ─── 1. Bridge + Cookie injection ─────────────────────────────────────────
  const initSession = useCallback(async () => {
    setBridgeError(null);
    try {
      const res = await fetch(BRIDGE_URL, {
        method: 'GET',
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json();
      console.log('Bridge response:', data);

      if (data.status !== 'success') {
        setBridgeError('Bridge error: ' + (data.message || 'unknown'));
        return;
      }

      setSessionCreds({ phpsessid: data.phpsessid, session_token: data.session_token });
      console.log('✅ Session ready, PHPSESSID:', data.phpsessid);
      setReady(true);
    } catch (e) {
      console.error('Bridge error:', e);
      setBridgeError(e.message);
    }
  }, [token]);

  useEffect(() => {
    if (token) initSession();
  }, [token]);

  // ─── 2a. Inject user data before page content loads ────────────────────
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

  // ─── 2b. Cookie injection + redirect away from auth pages ─────────────────
  const injectedScript = useMemo(() => {
    const cookiePart = sessionCreds
      ? `(function(){if(document.cookie.indexOf('PHPSESSID=')!==-1)return;var e=new Date();e.setDate(e.getDate()+30);var x=e.toUTCString();document.cookie='PHPSESSID=${sessionCreds.phpsessid};path=/;domain=.hafrik.com;expires='+x;document.cookie='session_token=${sessionCreds.session_token};path=/;domain=.hafrik.com;expires='+x;window.location.reload();})();`
      : '';
    return cookiePart + `(function(){var p=window.location.pathname.toLowerCase();var a=['/login','/signin','/register','/signup'];if(a.some(function(x){return p.includes(x);})){window.location.replace('/');}})();true;`;
  }, [sessionCreds]);

  // ─── 3. Navigation handlers ───────────────────────────────────────────────
  const handleLoadStart = () => { setLoading(true);  setError(false); };
  const handleLoadEnd   = () =>   setLoading(false);
  const handleError     = () => { setLoading(false);  setError(true); };

  const handleNavigationStateChange = (navState) => {
    setCanGoBack(navState.canGoBack);
    setCurrentUrl(navState.url);
  };

  const handleReload = () => {
    setError(false);
    setLoading(true);
    webViewRef.current?.reload();
  };

  const handleBack = () => {
    if (canGoBack && webViewRef.current) webViewRef.current.goBack();
    else navigation.goBack();
  };

  useEffect(() => {
    const handler = BackHandler.addEventListener('hardwareBackPress', () => {
      if (canGoBack && webViewRef.current) { webViewRef.current.goBack(); return true; }
      return false;
    });
    return () => handler.remove();
  }, [canGoBack]);

  // ─── 4. Guard: no token ───────────────────────────────────────────────────
  if (!token || !user) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" />
        <View style={styles.centeredContainer}>
          <Ionicons name="lock-closed-outline" size={64} color={BRAND} />
          <Text style={styles.titleText}>Authentication Required</Text>
          <Text style={styles.subText}>Please log in to access this content</Text>
          <TouchableOpacity style={styles.primaryBtn} onPress={() => navigation.navigate('Auth')}>
            <Text style={styles.primaryBtnText}>Go to Login</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ─── 5. Guard: bridge failed ──────────────────────────────────────────────
  if (bridgeError) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" />
        <View style={styles.centeredContainer}>
          <Ionicons name="warning-outline" size={64} color={WARNING} />
          <Text style={styles.titleText}>Session Error</Text>
          <Text style={styles.subText}>{bridgeError}</Text>
          <TouchableOpacity style={styles.primaryBtn} onPress={initSession}>
            <Text style={styles.primaryBtnText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ─── 6. Guard: waiting for cookies ────────────────────────────────────────
  if (!ready) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" />
        <View style={styles.centeredContainer}>
          <ActivityIndicator size="large" color={BRAND} />
          <Text style={styles.subText}>Authenticating…</Text>
        </View>
      </SafeAreaView>
    );
  }

  // ─── 7. Main WebView ──────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />

      <View style={styles.header}>
        <TouchableOpacity style={styles.iconBtn} onPress={handleBack}>
          <Ionicons name="arrow-back" size={24} color={BRAND} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{title || 'Hafrik'}</Text>
        <TouchableOpacity style={styles.iconBtn} onPress={handleReload}>
          <Ionicons name="refresh" size={24} color={BRAND} />
        </TouchableOpacity>
      </View>

      <AuthenticatedWebView
        ref={webViewRef}
        source={{ uri: currentUrl }}
        style={styles.webview}
        injectedJavaScriptBeforeContentLoaded={injectedBeforeContent}
        injectedJavaScript={injectedScript}
        onLoadStart={handleLoadStart}
        onLoadEnd={handleLoadEnd}
        onError={handleError}
        onNavigationStateChange={handleNavigationStateChange}
        onContentProcessDidTerminate={handleReload}
        cacheEnabled={true}
        originWhitelist={['*']}
        userAgent={`Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 HafrikApp/${Platform.OS}`}
      />

      {loading && (
        <View style={styles.overlay}>
          <ActivityIndicator size="large" color={BRAND} />
          <Text style={styles.subText}>Loading…</Text>
        </View>
      )}

      {error && (
        <View style={styles.overlay}>
          <Ionicons name="warning-outline" size={64} color={WARNING} />
          <Text style={styles.titleText}>Connection Error</Text>
          <Text style={styles.subText}>Check your connection and try again.</Text>
          <TouchableOpacity style={styles.primaryBtn} onPress={handleReload}>
            <Text style={styles.primaryBtnText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      )}

      {__DEV__ && (
        <View style={styles.debugBar}>
          <Text style={styles.debugText}>
            {user?.username} | {currentUrl?.substring(0, 40)}
          </Text>
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: WHITE },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
    backgroundColor: WHITE,
  },
  iconBtn: { padding: 5 },
  headerTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: DARK,
    textAlign: 'center',
    marginHorizontal: 10,
  },
  webview: { flex: 1 },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: WHITE,
    zIndex: 10,
    padding: 20,
  },
  centeredContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  titleText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: DARK,
    marginTop: 16,
    marginBottom: 8,
  },
  subText: {
    fontSize: 15,
    color: MUTED,
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 20,
  },
  primaryBtn: {
    backgroundColor: BRAND,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 10,
  },
  primaryBtnText: { color: WHITE, fontSize: 16, fontWeight: '600' },
  debugBar: { backgroundColor: BRAND, padding: 5 },
  debugText: { color: WHITE, fontSize: 10 },
});

export default WebViewScreen;
