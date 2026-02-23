import React, { useRef, useState, useEffect, useCallback } from 'react';
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
import { WebView } from 'react-native-webview';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../AuthContext';

const BRAND = '#0C3F44';

export default function MarketplaceWebviewScreen({ navigation, route }) {
  const { url, title } = route.params || {};
  const { token, user } = useAuth();

  const webViewRef  = useRef(null);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState(false);
  const [canGoBack, setCanGoBack] = useState(false);
  const [currentUrl, setCurrentUrl] = useState(url || 'https://hafrik.com/marketplace');

  const getAuthScript = useCallback(() => {
    if (!token || !user) return '';
    const safeUser = JSON.stringify(user).replace(/'/g, "\\'");
    return `
      (function() {
        try {
          localStorage.setItem('hafrik_token', '${token}');
          localStorage.setItem('access_token', '${token}');
          localStorage.setItem('app_user', '${safeUser}');
          localStorage.setItem('is_mobile_app', 'true');
          document.cookie = 'hafrik_token=${token}; path=/; domain=hafrik.com; max-age=31536000';
          if (window.ReactNativeWebView) {
            window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'auth_ok' }));
          }
        } catch(e) {}
      })();
      true;
    `;
  }, [token, user]);

  const handleBack = () => {
    if (canGoBack && webViewRef.current) {
      webViewRef.current.goBack();
    } else {
      navigation.goBack();
    }
  };

  const handleReload = () => {
    setError(false);
    setLoading(true);
    webViewRef.current?.reload();
  };

  useEffect(() => {
    const handler = BackHandler.addEventListener('hardwareBackPress', () => {
      if (canGoBack && webViewRef.current) {
        webViewRef.current.goBack();
        return true;
      }
      return false;
    });
    return () => handler.remove();
  }, [canGoBack]);

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

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
      <StatusBar barStyle="dark-content" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerBtn} onPress={handleBack}>
          <Ionicons name="arrow-back" size={22} color={BRAND} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {title || 'Marketplace'}
        </Text>
        <TouchableOpacity style={styles.headerBtn} onPress={handleReload}>
          <Ionicons name="refresh" size={22} color={BRAND} />
        </TouchableOpacity>
      </View>

      {/* WebView */}
      <WebView
        ref={webViewRef}
        source={{
          uri: currentUrl,
          headers: {
            Authorization: `Bearer ${token}`,
            'X-Is-Mobile-App': 'true',
          },
        }}
        style={{ flex: 1 }}
        javaScriptEnabled
        domStorageEnabled
        sharedCookiesEnabled
        cacheEnabled
        originWhitelist={['*']}
        injectedJavaScript={getAuthScript()}
        onLoadStart={() => { setLoading(true); setError(false); }}
        onLoadEnd={() => {
          setLoading(false);
          if (token && user) {
            setTimeout(() => webViewRef.current?.injectJavaScript(getAuthScript()), 400);
          }
        }}
        onError={() => { setLoading(false); setError(true); }}
        onNavigationStateChange={(nav) => {
          setCanGoBack(nav.canGoBack);
          setCurrentUrl(nav.url);
        }}
        userAgent={`Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) HafrikApp/${Platform.OS}`}
      />

      {/* Loading overlay */}
      {loading && (
        <View style={styles.overlay}>
          <ActivityIndicator size="large" color={BRAND} />
          <Text style={styles.loadingText}>Loading…</Text>
        </View>
      )}

      {/* Error overlay */}
      {error && (
        <View style={styles.overlay}>
          <Ionicons name="wifi-outline" size={48} color="#ff6b6b" />
          <Text style={styles.errorTitle}>Connection Error</Text>
          <Text style={styles.errorSub}>Check your connection and try again.</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={handleReload}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1, justifyContent: 'center', alignItems: 'center',
    backgroundColor: '#fff', gap: 10, padding: 24,
  },
  lockTitle: { fontSize: 20, fontWeight: '800', color: '#0D1B1E', marginTop: 8 },
  lockSub: { fontSize: 14, color: '#7A9198', textAlign: 'center' },
  goBack: {
    marginTop: 8, backgroundColor: BRAND,
    paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12,
  },
  goBackText: { color: '#fff', fontWeight: '700', fontSize: 14 },

  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 12, paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: 'rgba(12,63,68,0.09)',
    backgroundColor: '#fff',
  },
  headerBtn: {
    width: 38, height: 38, borderRadius: 19,
    justifyContent: 'center', alignItems: 'center',
  },
  headerTitle: {
    flex: 1, fontSize: 15, fontWeight: '700',
    color: '#0D1B1E', textAlign: 'center', marginHorizontal: 8,
  },

  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center',
    zIndex: 10, gap: 10,
  },
  loadingText: { fontSize: 14, color: '#7A9198' },
  errorTitle: { fontSize: 18, fontWeight: '800', color: '#0D1B1E', marginTop: 8 },
  errorSub: { fontSize: 13, color: '#7A9198', textAlign: 'center' },
  retryBtn: {
    marginTop: 8, backgroundColor: BRAND,
    paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12,
  },
  retryText: { color: '#fff', fontWeight: '700', fontSize: 14 },
});
