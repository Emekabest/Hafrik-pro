import React, { useRef, useState, useCallback } from 'react';
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
import { buildWebViewUrl, REDIRECT_GUARD } from '../../hooks/useWebViewSession';
import AuthenticatedWebView from '../../components/AuthenticatedWebView';
import { Colors } from '../../theme/colors';

const withOpacity = (hex, opacity) => {
  const normalized = (hex || "").replace("#", "");
  const alpha = Math.round(Math.max(0, Math.min(1, opacity)) * 255).toString(16).padStart(2, "0");
  return `#${normalized}${alpha}`;
};


const BRAND = Colors.primaryDark;

export default function MarketplaceWebviewScreen({ navigation, route }) {
  const { url, title } = route.params || {};
  const { token } = useAuth();

  const webViewRef = useRef(null);

  const authUrl = buildWebViewUrl(token, url || 'https://hafrik.com/marketplace');

  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState(false);
  const [canGoBack,  setCanGoBack]  = useState(false);
  const [currentUrl, setCurrentUrl] = useState(authUrl);

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
        injectedJavaScript={REDIRECT_GUARD}
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
