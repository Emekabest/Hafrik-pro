import React, { useRef, useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Share,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useAuth } from '../../AuthContext';
import AuthenticatedWebView from '../../components/AuthenticatedWebView';
import AppDetails from '../../helpers/appdetails';
import { Colors } from '../../theme/colors';

const withOpacity = (hex, opacity) => {
  const normalized = (hex || "").replace("#", "");
  const alpha = Math.round(Math.max(0, Math.min(1, opacity)) * 255).toString(16).padStart(2, "0");
  return `#${normalized}${alpha}`;
};


const BRIDGE_URL = 'https://hafrik.com/api/v1/auth/webview-login.php';
const BRAND  = Colors.primaryDark;
const ACCENT = Colors.primary;
const MUTED  = Colors.secondaryText;

export default function InAppBrowser() {
  const navigation = useNavigation();
  const route      = useRoute();
  const { top }    = useSafeAreaInsets();
  const { token }  = useAuth();

  const { title = 'Hafrik', url = 'https://hafrik.com' } = route.params ?? {};

  const webRef = useRef(null);

  const [ready,        setReady]        = useState(false);
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState(false);
  const [bridgeError,  setBridgeError]  = useState(null);
  const [canGoBack,    setCanGoBack]    = useState(false);
  const [progress,     setProgress]     = useState(0);
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
    else setReady(true); // no token — open without auth
  }, [token]);

  const injectedScript = useMemo(() => {
    const cookiePart = sessionCreds
      ? `(function(){if(document.cookie.indexOf('PHPSESSID=')!==-1)return;var e=new Date();e.setDate(e.getDate()+30);var x=e.toUTCString();document.cookie='PHPSESSID=${sessionCreds.phpsessid};path=/;domain=.hafrik.com;expires='+x;document.cookie='session_token=${sessionCreds.session_token};path=/;domain=.hafrik.com;expires='+x;window.location.reload();})();`
      : '';
    return cookiePart + `(function(){var p=window.location.pathname.toLowerCase();var a=['/login','/signin','/register','/signup'];if(a.some(function(x){return p.includes(x);})){window.location.replace('/');}})();true;`;
  }, [sessionCreds]);

  const handleShare = async () => {
    try { await Share.share({ message: `${title} — ${url}`, url }); } catch {}
  };

  const handleBack = () => {
    if (canGoBack) webRef.current?.goBack();
    else navigation.goBack();
  };

  // Waiting screen
  if (!ready && !bridgeError) {
    return (
      <View style={[styles.root, { paddingTop: top }]}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.headerBtn} onPress={() => navigation.goBack()} activeOpacity={0.8}>
            <Ionicons name="arrow-back" size={21} color={Colors.white} />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle} numberOfLines={1}>{title}</Text>
            <Text style={styles.headerUrl} numberOfLines={1}>{url.replace(/^https?:\/\//, '')}</Text>
          </View>
          <View style={styles.headerBtn} />
        </View>
        <View style={styles.authWait}>
          <ActivityIndicator size="large" color={ACCENT} />
          <Text style={styles.authWaitText}>Authenticating…</Text>
        </View>
      </View>
    );
  }

  // Bridge error screen
  if (bridgeError) {
    return (
      <View style={[styles.root, { paddingTop: top }]}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.headerBtn} onPress={() => navigation.goBack()} activeOpacity={0.8}>
            <Ionicons name="arrow-back" size={21} color={Colors.white} />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle} numberOfLines={1}>{title}</Text>
          </View>
          <View style={styles.headerBtn} />
        </View>
        <View style={styles.errorWrap}>
          <Ionicons name="warning-outline" size={52} color={MUTED} />
          <Text style={styles.errorTitle}>Session Error</Text>
          <Text style={styles.errorSub}>{bridgeError}</Text>
          <TouchableOpacity style={styles.retryBtn} activeOpacity={0.85} onPress={initSession}>
            <Ionicons name="refresh" size={16} color={Colors.white} />
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

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
          source={{ uri: url }}
          style={styles.webview}
          injectedJavaScript={injectedScript}
          onLoadStart={() => { setLoading(true); setError(false); }}
          onLoadEnd={() => setLoading(false)}
          onError={() => { setLoading(false); setError(true); }}
          onLoadProgress={({ nativeEvent }) => setProgress(nativeEvent.progress)}
          onNavigationStateChange={(state) => setCanGoBack(state.canGoBack)}
          startInLoadingState
          renderLoading={() => (
            <View style={styles.loadingOverlay}>
              <ActivityIndicator size="large" color={ACCENT} />
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
