import React, { useRef, useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Share,
} from 'react-native';
import BrandLoader from '../../components/BrandLoader';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useAuth } from '../../AuthContext';
import { buildWebViewUrl, REDIRECT_GUARD } from '../../hooks/useWebViewSession';
import AuthenticatedWebView from '../../components/AuthenticatedWebView';
import AppDetails from '../../helpers/appdetails';
import { Colors } from '../../theme/colors';

const withOpacity = (hex, opacity) => {
  const normalized = (hex || "").replace("#", "");
  const alpha = Math.round(Math.max(0, Math.min(1, opacity)) * 255).toString(16).padStart(2, "0");
  return `#${normalized}${alpha}`;
};

const BRAND  = Colors.primaryDark;
const ACCENT = Colors.primary;
const MUTED  = Colors.secondaryText;

export default function InAppBrowser() {
  const navigation = useNavigation();
  const route      = useRoute();
  const { top }    = useSafeAreaInsets();
  const { token } = useAuth();

  const { title = 'Hafrik', url = 'https://hafrik.com' } = route.params ?? {};

  const authUrl = buildWebViewUrl(token, url);

  const webRef = useRef(null);

  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState(false);
  const [canGoBack, setCanGoBack] = useState(false);
  const [progress,  setProgress]  = useState(0);

  const handleShare = async () => {
    try { await Share.share({ message: `${title} — ${url}`, url }); } catch {}
  };

  const handleBack = () => {
    if (canGoBack) webRef.current?.goBack();
    else navigation.goBack();
  };

  return (
    <View style={[styles.root, { paddingTop: top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerBtn} onPress={handleBack} activeOpacity={0.8}>
          <Ionicons name="arrow-back" size={21} color={Colors.white} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle} numberOfLines={1}>{title}</Text>
          <Text style={styles.headerUrl} numberOfLines={1}>{url.replace(/^https?:\/\//, '')}</Text>
        </View>
        <TouchableOpacity style={styles.headerBtn} onPress={handleShare} activeOpacity={0.8}>
          <Ionicons name="share-outline" size={21} color={Colors.white} />
        </TouchableOpacity>
      </View>

      {/* Progress bar */}
      {loading && (
        <View style={styles.progressTrack}>
          <View style={[styles.progressBar, { width: `${Math.round(progress * 100)}%` }]} />
        </View>
      )}

      {/* WebView or error */}
      {error ? (
        <View style={styles.errorWrap}>
          <Ionicons name="cloud-offline-outline" size={52} color={MUTED} />
          <Text style={styles.errorTitle}>Could not load page</Text>
          <Text style={styles.errorSub}>{url}</Text>
          <TouchableOpacity
            style={styles.retryBtn}
            activeOpacity={0.85}
            onPress={() => { setError(false); setLoading(true); webRef.current?.reload(); }}
          >
            <Ionicons name="refresh" size={16} color={Colors.white} />
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <AuthenticatedWebView
          ref={webRef}
          source={{ uri: authUrl }}
          style={styles.webview}
          injectedJavaScript={REDIRECT_GUARD}
          onLoadStart={() => { setLoading(true); setError(false); }}
          onLoadEnd={() => setLoading(false)}
          onError={() => { setLoading(false); setError(true); }}
          onLoadProgress={({ nativeEvent }) => setProgress(nativeEvent.progress)}
          onNavigationStateChange={(state) => setCanGoBack(state.canGoBack)}
          startInLoadingState
          renderLoading={() => (
            <View style={styles.loadingOverlay}>
              <BrandLoader inline size="medium" />
            </View>
          )}
          allowsInlineMediaPlayback
          mediaPlaybackRequiresUserAction={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: BRAND },

  header: {
    backgroundColor: BRAND,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingBottom: 12,
    paddingTop: 8,
    gap: 8,
    shadowColor: BRAND,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 8,
  },
  headerBtn: {
    width: 38, height: 38, borderRadius: 12,
    backgroundColor: withOpacity(Colors.white, 0.13),
    alignItems: 'center', justifyContent: 'center',
  },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerTitle: {
    fontSize: 15, fontWeight: '800', color: Colors.white,
    fontFamily: AppDetails?.fontFamily?.redex?.bold ?? 'System',
  },
  headerUrl: {
    fontSize: 10, color: withOpacity(Colors.white, 0.5),
    fontFamily: AppDetails?.fontFamily?.inter?.regular ?? 'System',
    marginTop: 1,
  },

  progressTrack: { height: 2.5, backgroundColor: withOpacity(Colors.tealAccent, 0.2) },
  progressBar: { height: '100%', backgroundColor: ACCENT },

  webview: { flex: 1, backgroundColor: Colors.white },

  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },

  authWait: {
    flex: 1,
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  authWaitText: {
    fontSize: 15, color: MUTED,
    fontFamily: AppDetails?.fontFamily?.inter?.regular ?? 'System',
  },

  errorWrap: {
    flex: 1,
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    gap: 10,
  },
  errorTitle: {
    fontSize: 17, fontWeight: '800', color: Colors.neutral750,
    fontFamily: AppDetails?.fontFamily?.redex?.bold ?? 'System',
  },
  errorSub: {
    fontSize: 12, color: MUTED, textAlign: 'center',
    fontFamily: AppDetails?.fontFamily?.inter?.regular ?? 'System',
  },
  retryBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: BRAND, borderRadius: 12,
    paddingHorizontal: 22, paddingVertical: 11,
    marginTop: 8,
  },
  retryText: {
    color: Colors.white, fontSize: 14, fontWeight: '800',
    fontFamily: AppDetails?.fontFamily?.redex?.bold ?? 'System',
  },
});
