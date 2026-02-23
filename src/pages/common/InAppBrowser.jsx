import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Share,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import AppDetails from '../../helpers/appdetails';

const BRAND  = '#0C3F44';
const ACCENT = '#13C296';
const MUTED  = '#7A9198';

export default function InAppBrowser() {
  const navigation = useNavigation();
  const route      = useRoute();
  const { top }    = useSafeAreaInsets();

  const { title = 'Hafrik', url = 'https://hafrik.com' } = route.params ?? {};

  const webRef      = useRef(null);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState(false);
  const [canGoBack, setCanGoBack] = useState(false);
  const [progress,  setProgress]  = useState(0);

  const handleShare = async () => {
    try {
      await Share.share({ message: `${title} — ${url}`, url });
    } catch {}
  };

  const handleBack = () => {
    if (canGoBack) webRef.current?.goBack();
    else navigation.goBack();
  };

  return (
    <View style={[styles.root, { paddingTop: top }]}>
      {/* ── Header ── */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerBtn} onPress={handleBack} activeOpacity={0.8}>
          <Ionicons name="arrow-back" size={21} color="#fff" />
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle} numberOfLines={1}>{title}</Text>
          <Text style={styles.headerUrl} numberOfLines={1}>{url.replace(/^https?:\/\//, '')}</Text>
        </View>

        <TouchableOpacity style={styles.headerBtn} onPress={handleShare} activeOpacity={0.8}>
          <Ionicons name="share-outline" size={21} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* ── Progress bar ── */}
      {loading && (
        <View style={styles.progressTrack}>
          <View style={[styles.progressBar, { width: `${Math.round(progress * 100)}%` }]} />
        </View>
      )}

      {/* ── WebView ── */}
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
            <Ionicons name="refresh" size={16} color="#fff" />
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <WebView
          ref={webRef}
          source={{ uri: url }}
          style={styles.webview}
          onLoadStart={() => { setLoading(true); setError(false); }}
          onLoadEnd={() => setLoading(false)}
          onError={() => { setLoading(false); setError(true); }}
          onLoadProgress={({ nativeEvent }) => setProgress(nativeEvent.progress)}
          onNavigationStateChange={(state) => setCanGoBack(state.canGoBack)}
          javaScriptEnabled
          domStorageEnabled
          startInLoadingState
          renderLoading={() => (
            <View style={styles.loadingOverlay}>
              <ActivityIndicator size="large" color={ACCENT} />
            </View>
          )}
          // Security
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
    backgroundColor: 'rgba(255,255,255,0.13)',
    alignItems: 'center', justifyContent: 'center',
  },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerTitle: {
    fontSize: 15, fontWeight: '800', color: '#fff',
    fontFamily: AppDetails?.fontFamily?.redex?.bold ?? 'System',
  },
  headerUrl: {
    fontSize: 10, color: 'rgba(255,255,255,0.5)',
    fontFamily: AppDetails?.fontFamily?.inter?.regular ?? 'System',
    marginTop: 1,
  },

  progressTrack: {
    height: 2.5,
    backgroundColor: 'rgba(19,194,150,0.2)',
  },
  progressBar: {
    height: '100%',
    backgroundColor: ACCENT,
  },

  webview: { flex: 1, backgroundColor: '#fff' },

  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },

  errorWrap: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    gap: 10,
  },
  errorTitle: {
    fontSize: 17, fontWeight: '800', color: '#222',
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
    shadowColor: BRAND, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25, shadowRadius: 8, elevation: 4,
  },
  retryText: {
    color: '#fff', fontSize: 14, fontWeight: '800',
    fontFamily: AppDetails?.fontFamily?.redex?.bold ?? 'System',
  },
});
