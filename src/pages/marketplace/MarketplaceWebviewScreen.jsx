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
import { useAuth } from '../../AuthContext';
import AuthenticatedWebView from '../../components/AuthenticatedWebView';
import { Colors } from '../../theme/colors';

const withOpacity = (hex, opacity) => {
  const normalized = (hex || "").replace("#", "");
  const alpha = Math.round(Math.max(0, Math.min(1, opacity)) * 255).toString(16).padStart(2, "0");
  return `#${normalized}${alpha}`;
};


const BRIDGE_URL = 'https://hafrik.com/api/v1/auth/webview-login.php';
const BRAND = Colors.primaryDark;

export default function MarketplaceWebviewScreen({ navigation, route }) {
  const { url, title } = route.params || {};
  const { token, user } = useAuth();

  const webViewRef = useRef(null);

  const [ready,       setReady]       = useState(false);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState(false);
  const [bridgeError, setBridgeError] = useState(null);
  const [canGoBack,    setCanGoBack]    = useState(false);
  const [currentUrl,   setCurrentUrl]   = useState(url || 'https://hafrik.com/marketplace');
  const [sessionCreds, setSessionCreds] = useState(null);

  // ─── Bridge + Cookie injection ─────────────────────────────────────────────
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

  const injectedScript = useMemo(() => {
    const cookiePart = sessionCreds
      ? `(function(){if(document.cookie.indexOf('PHPSESSID=')!==-1)return;var e=new Date();e.setDate(e.getDate()+30);var x=e.toUTCString();document.cookie='PHPSESSID=${sessionCreds.phpsessid};path=/;domain=.hafrik.com;expires='+x;document.cookie='session_token=${sessionCreds.session_token};path=/;domain=.hafrik.com;expires='+x;window.location.reload();})();`
      : '';
    return cookiePart + `(function(){var p=window.location.pathname.toLowerCase();var a=['/login','/signin','/register','/signup'];if(a.some(function(x){return p.includes(x);})){window.location.replace('/');}})();true;`;
  }, [sessionCreds]);

  const handleBack = () => {
    if (canGoBack && webViewRef.current) webViewRef.current.goBack();
    else navigation.goBack();
  };

  const handleReload = () => {
    setError(false);
    setLoading(true);
    webViewRef.current?.reload();
  };

  useEffect(() => {
    const handler = BackHandler.addEventListener('hardwareBackPress', () => {
      if (canGoBack && webViewRef.current) { webViewRef.current.goBack(); return true; }
      return false;
    });
    return () => handler.remove();
  }, [canGoBack]);

  // Guards
  if (!token || !user) {
    return (
      <SafeAreaView style={styles.center}>
        <Ionicons name="lock-closed-outline" size={48} color={BRAND} />
        <Text style={styles.lockTitle}>Login Required</Text>
        <Text style={styles.lockSub}>Please log in to view this listing.</Text>
        <TouchableOpacity style={styles.goBack} onPress={() => navigation.goBack()}>
          <Text style={styles.goBackText}>Go Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  if (bridgeError) {
    return (
      <SafeAreaView style={styles.center}>
        <Ionicons name="warning-outline" size={48} color={Colors.warningCoral} />
        <Text style={styles.lockTitle}>Session Error</Text>
        <Text style={styles.lockSub}>{bridgeError}</Text>
        <TouchableOpacity style={styles.goBack} onPress={initSession}>
          <Text style={styles.goBackText}>Retry</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  if (!ready) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator size="large" color={BRAND} />
        <Text style={styles.lockSub}>Authenticating…</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.white }}>
      <StatusBar barStyle="dark-content" />

      <View style={styles.header}>
        <TouchableOpacity style={styles.headerBtn} onPress={handleBack}>
          <Ionicons name="arrow-back" size={22} color={BRAND} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{title || 'Marketplace'}</Text>
        <TouchableOpacity style={styles.headerBtn} onPress={handleReload}>
          <Ionicons name="refresh" size={22} color={BRAND} />
        </TouchableOpacity>
      </View>

      <AuthenticatedWebView
        ref={webViewRef}
        source={{ uri: currentUrl }}
        style={{ flex: 1 }}
        injectedJavaScript={injectedScript}
        onLoadStart={() => { setLoading(true); setError(false); }}
        onLoadEnd={() => setLoading(false)}
        onError={() => { setLoading(false); setError(true); }}
        onNavigationStateChange={(nav) => {
          setCanGoBack(nav.canGoBack);
          setCurrentUrl(nav.url);
        }}
        onContentProcessDidTerminate={handleReload}
        cacheEnabled={true}
        originWhitelist={['*']}
        userAgent={`Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) HafrikApp/${Platform.OS}`}
      />

      {loading && (
        <View style={styles.overlay}>
          <ActivityIndicator size="large" color={BRAND} />
          <Text style={styles.lockSub}>Loading…</Text>
        </View>
      )}

      {error && (
        <View style={styles.overlay}>
          <Ionicons name="wifi-outline" size={48} color={Colors.warningCoral} />
          <Text style={styles.lockTitle}>Connection Error</Text>
          <Text style={styles.lockSub}>Check your connection and try again.</Text>
          <TouchableOpacity style={styles.goBack} onPress={handleReload}>
            <Text style={styles.goBackText}>Retry</Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1, justifyContent: 'center', alignItems: 'center',
    backgroundColor: Colors.white, gap: 10, padding: 24,
  },
  lockTitle: { fontSize: 20, fontWeight: '800', color: Colors.deepSlate, marginTop: 8 },
  lockSub: { fontSize: 14, color: Colors.mutedBlueGray, textAlign: 'center', marginTop: 4 },
  goBack: {
    marginTop: 8, backgroundColor: Colors.primaryDark,
    paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12,
  },
  goBackText: { color: Colors.white, fontWeight: '700', fontSize: 14 },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 12, paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: withOpacity(Colors.primaryDark, 0.09),
    backgroundColor: Colors.white,
  },
  headerBtn: {
    width: 38, height: 38, borderRadius: 19,
    justifyContent: 'center', alignItems: 'center',
  },
  headerTitle: {
    flex: 1, fontSize: 15, fontWeight: '700',
    color: Colors.deepSlate, textAlign: 'center', marginHorizontal: 8,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: Colors.white, justifyContent: 'center', alignItems: 'center',
    zIndex: 10, gap: 10,
  },
});
