// src/pages/marketplace/MarketplacePaymentScreen.jsx
// Handles Paystack payment via WebView after WooCommerce checkout creates the order.
//
// Flow:
//  1. CheckoutScreen POSTs to WC /checkout → gets back redirect_url (Paystack page)
//  2. This screen opens that URL in a WebView
//  3. Paystack processes payment and redirects back to the WC order-received page
//  4. We detect "order-received" in the URL → success → clear cart → Orders screen
//  5. If user goes back / cancels → stay on screen with retry option

import React, { useCallback, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ActivityIndicator, Alert, BackHandler,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';

import { Colors } from '../../theme';
import AppDetails from '../../helpers/appdetails';
import useStore from '../../repository/store';

// ─── Constants ────────────────────────────────────────────────────────────────
const BRAND  = Colors.primaryDark;
const ACCENT = Colors.primary;
const WHITE  = Colors.white;
const BG     = '#F4F6F9';
const MUTED  = Colors.secondaryText;
const DARK   = Colors.deepSlate ?? Colors.black;
const GREEN  = '#22c55e';
const DANGER = '#ef4444';

const FONT_B = AppDetails?.fontFamily?.redex?.bold    ?? 'System';
const FONT_M = AppDetails?.fontFamily?.inter?.medium  ?? 'System';
const FONT_R = AppDetails?.fontFamily?.inter?.regular ?? 'System';

const hex2 = (hex, op) => {
  const h = (hex || '').replace('#', '');
  const a = Math.round(Math.max(0, Math.min(1, op)) * 255).toString(16).padStart(2, '0');
  return `#${h}${a}`;
};

// URL patterns that indicate a completed / failed payment
const SUCCESS_PATTERNS = ['order-received', 'order_received', 'payment-confirmed', 'payment_confirmed'];
const CANCEL_PATTERNS  = ['cancel_order', 'cancelled', 'payment-cancelled', 'checkout?'];

const urlMatches = (url = '', patterns) =>
  patterns.some(p => url.toLowerCase().includes(p));

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function MarketplacePaymentScreen({ navigation, route }) {
  const insets       = useSafeAreaInsets();
  const showToast    = useStore(s => s.showToast);
  const setCartCount = useStore(s => s.setCartCount);

  const {
    order_id             = '',
    orders_collection_id = '',
    redirect_url         = '',
  } = route.params ?? {};

  const webRef     = useRef(null);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState(false);
  const [canGoBack, setCanGoBack] = useState(false);
  const [done,     setDone]     = useState(false);   // true once success detected

  // ── Android hardware back button ──────────────────────────────────────────
  useFocusEffect(
    useCallback(() => {
      const sub = BackHandler.addEventListener('hardwareBackPress', () => {
        if (canGoBack && webRef.current) {
          webRef.current.goBack();
          return true;
        }
        handleCancel();
        return true;
      });
      return () => sub.remove();
    }, [canGoBack]),
  );

  // ── Navigation state change → detect success / cancel ─────────────────────
  const onNavigationStateChange = useCallback((state) => {
    setCanGoBack(state.canGoBack);
    const url = state.url ?? '';

    if (urlMatches(url, SUCCESS_PATTERNS) && !done) {
      setDone(true);
      setCartCount(0);
      showToast('Payment successful!', '🎉');
      // Short delay so WebView can finish rendering the order-received page
      setTimeout(() => navigation.replace('MarketplaceOrdersScreen'), 1200);
    }
  }, [done, setCartCount, showToast, navigation]);

  const handleCancel = () => {
    Alert.alert(
      'Cancel Payment',
      'Are you sure you want to go back? Your order is still pending payment.',
      [
        { text: 'Continue Paying', style: 'cancel' },
        { text: 'Go Back', style: 'destructive', onPress: () => navigation.goBack() },
      ],
    );
  };

  // ── No redirect URL — show error ──────────────────────────────────────────
  if (!redirect_url) {
    return (
      <View style={[p.root, { paddingTop: insets.top }]}>
        <LinearGradient colors={[BRAND, '#1a8a92']} style={p.header} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
          <TouchableOpacity style={p.headerBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={20} color={WHITE} />
          </TouchableOpacity>
          <Text style={p.headerTitle}>Payment</Text>
          <View style={{ width: 38 }} />
        </LinearGradient>

        <View style={p.centered}>
          <View style={p.errorIcon}>
            <Ionicons name="alert-circle-outline" size={42} color={DANGER} />
          </View>
          <Text style={p.errorTitle}>Payment link unavailable</Text>
          <Text style={p.errorSub}>
            We could not start secure checkout right now.{'\n'}
            Please go back and try again, or contact Hafrik support.
          </Text>
          <TouchableOpacity style={p.backBtn} onPress={() => navigation.goBack()}>
            <Text style={p.backBtnTxt}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // ── Success overlay ────────────────────────────────────────────────────────
  if (done) {
    return (
      <View style={[p.root, p.centered, { paddingTop: insets.top }]}>
        <View style={p.successIcon}>
          <Ionicons name="checkmark-circle" size={64} color={GREEN} />
        </View>
        <Text style={p.successTitle}>Payment Confirmed!</Text>
        <Text style={p.successSub}>Redirecting to your orders…</Text>
        <ActivityIndicator color={BRAND} style={{ marginTop: 14 }} />
      </View>
    );
  }

  // ── Main WebView ──────────────────────────────────────────────────────────
  return (
    <View style={[p.root, { paddingTop: insets.top }]}>

      {/* Header */}
      <LinearGradient
        colors={[BRAND, '#1a8a92']}
        style={p.header}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
      >
        <TouchableOpacity
          style={p.headerBtn}
          onPress={() => {
            if (canGoBack && webRef.current) {
              webRef.current.goBack();
            } else {
              handleCancel();
            }
          }}
        >
          <Ionicons name="arrow-back" size={20} color={WHITE} />
        </TouchableOpacity>

        <View style={p.headerCenter}>
          <Ionicons name="lock-closed" size={12} color={hex2(WHITE, 0.75)} />
          <Text style={p.headerTitle}>Secure Payment</Text>
        </View>

        {/* Paystack badge */}
        <View style={p.paystackBadge}>
          <Text style={p.paystackBadgeTxt}>Paystack</Text>
        </View>
      </LinearGradient>

      {/* WebView */}
      <View style={{ flex: 1 }}>
        <WebView
          ref={webRef}
          source={{ uri: redirect_url }}
          style={{ flex: 1, backgroundColor: BG }}
          onNavigationStateChange={onNavigationStateChange}
          onLoadStart={() => setLoading(true)}
          onLoadEnd={() => setLoading(false)}
          onError={() => { setLoading(false); setError(true); }}
          javaScriptEnabled
          domStorageEnabled
          startInLoadingState={false}
          userAgent="Mozilla/5.0 (Linux; Android 12; Mobile) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36"
          setSupportMultipleWindows={false}
          allowsBackForwardNavigationGestures
        />

        {/* Loading overlay */}
        {loading && (
          <View style={p.loadingOverlay}>
            <ActivityIndicator size="large" color={BRAND} />
            <Text style={p.loadingTxt}>Loading payment page…</Text>
          </View>
        )}

        {/* Error overlay */}
        {error && !loading && (
          <View style={p.loadingOverlay}>
            <Ionicons name="cloud-offline-outline" size={44} color={MUTED} />
            <Text style={p.errorTitle}>Connection error</Text>
            <Text style={p.errorSub}>Could not load the payment page. Check your connection.</Text>
            <TouchableOpacity
              style={p.retryBtn}
              onPress={() => { setError(false); webRef.current?.reload(); }}
            >
              <Ionicons name="refresh" size={14} color={WHITE} />
              <Text style={p.retryBtnTxt}>Retry</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Bottom cancel bar */}
      <View style={[p.footer, { paddingBottom: insets.bottom + 4 }]}>
        <Ionicons name="shield-checkmark-outline" size={14} color={MUTED} />
        <Text style={p.securityTxt}>Secured by Paystack — your details are encrypted</Text>
        <TouchableOpacity onPress={handleCancel} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text style={p.cancelTxt}>Cancel</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const p = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 12 },

  // Header
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 12, paddingVertical: 12,
  },
  headerBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: hex2(WHITE, 0.18),
    alignItems: 'center', justifyContent: 'center',
  },
  headerCenter: {
    flex: 1, flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', gap: 5,
  },
  headerTitle: {
    fontSize: 15, fontWeight: '900', color: WHITE,
    fontFamily: FONT_B, textAlign: 'center',
  },
  paystackBadge: {
    backgroundColor: hex2(WHITE, 0.2), borderRadius: 8,
    paddingHorizontal: 8, paddingVertical: 4,
    borderWidth: 1, borderColor: hex2(WHITE, 0.25),
  },
  paystackBadgeTxt: {
    fontSize: 10, fontWeight: '800', color: WHITE,
    fontFamily: FONT_B, letterSpacing: 0.3,
  },

  // Loading / error overlay
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: BG,
    alignItems: 'center', justifyContent: 'center', gap: 12,
  },
  loadingTxt:   { fontSize: 13, color: MUTED, fontFamily: FONT_R },
  errorIcon:    { width: 72, height: 72, borderRadius: 22, backgroundColor: hex2(DANGER, 0.1), alignItems: 'center', justifyContent: 'center' },
  errorTitle:   { fontSize: 17, fontWeight: '900', color: DARK, fontFamily: FONT_B, textAlign: 'center' },
  errorSub:     { fontSize: 13, color: MUTED, fontFamily: FONT_R, textAlign: 'center', lineHeight: 20 },
  retryBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: BRAND, borderRadius: 12,
    paddingHorizontal: 22, paddingVertical: 11, marginTop: 6,
  },
  retryBtnTxt: { fontSize: 14, fontWeight: '700', color: WHITE, fontFamily: FONT_M },
  backBtn: {
    backgroundColor: DARK, borderRadius: 14,
    paddingHorizontal: 28, paddingVertical: 13, marginTop: 6,
  },
  backBtnTxt: { fontSize: 14, fontWeight: '700', color: WHITE, fontFamily: FONT_M },

  // Success
  successIcon:  { marginBottom: 6 },
  successTitle: { fontSize: 22, fontWeight: '900', color: DARK, fontFamily: FONT_B },
  successSub:   { fontSize: 14, color: MUTED, fontFamily: FONT_R },

  // Footer
  footer: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 14, paddingTop: 10,
    backgroundColor: WHITE,
    borderTopWidth: 1, borderTopColor: hex2(BRAND, 0.07),
  },
  securityTxt: { flex: 1, fontSize: 11, color: MUTED, fontFamily: FONT_R },
  cancelTxt:   { fontSize: 13, fontWeight: '700', color: DANGER, fontFamily: FONT_M },
});
