// src/pages/WebViewScreen.js
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
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../AuthContext';
import { buildWebViewUrl, REDIRECT_GUARD } from '../hooks/useWebViewSession';
import AuthenticatedWebView from '../components/AuthenticatedWebView';
import { Colors } from '../theme';

const BRAND  = Colors.primaryDark;
const WHITE  = Colors.white;
const DARK   = Colors.black;
const MUTED  = Colors.secondaryText;
const BORDER = Colors.border;

const WebViewScreen = ({ navigation, route }) => {
  const { url, title } = route.params || {};
  const { token } = useAuth();
  const webViewRef = useRef(null);

  const authUrl = buildWebViewUrl(token, url || 'https://hafrik.com');

  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState(false);
  const [canGoBack,  setCanGoBack]  = useState(false);
  const [currentUrl, setCurrentUrl] = useState(authUrl);

  // ─── Navigation handlers ──────────────────────────────────────────────────
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

  // ─── Main WebView ─────────────────────────────────────────────────────────
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
        injectedJavaScript={REDIRECT_GUARD}
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
          <Ionicons name="warning-outline" size={64} color={MUTED} />
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
