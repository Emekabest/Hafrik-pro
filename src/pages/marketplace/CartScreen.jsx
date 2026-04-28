// src/pages/marketplace/CartScreen.jsx
import React, { useCallback, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  Image, ActivityIndicator, Alert, StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';

import { useAuth } from '../../AuthContext';
import { Colors } from '../../theme';
import AppDetails from '../../helpers/appdetails';
import useStore from '../../repository/store';
import { getCart, updateCartItem, removeCartItem } from './marketplaceApi';

const BRAND  = Colors.primaryDark;
const ACCENT = Colors.primary;
const WHITE  = '#ffffff';
const BG     = '#F4F6F9';
const DARK   = '#0F1923';
const MUTED  = '#8A96A3';
const DANGER = '#ef4444';
const GREEN  = '#22c55e';
const BORDER = '#EAECF0';

const FONT_B = AppDetails?.fontFamily?.redex?.bold    ?? 'System';
const FONT_M = AppDetails?.fontFamily?.inter?.medium  ?? 'System';
const FONT_R = AppDetails?.fontFamily?.inter?.regular ?? 'System';

const a = (hex, op) => {
  const h = (hex || '').replace('#', '');
  return `#${h}${Math.round(op * 255).toString(16).padStart(2, '0')}`;
};
const fmtMoney = (currency, amount) =>
  `${currency ?? ''} ${Number(amount ?? 0).toLocaleString()}`.trim();
const lineTotal = (item) =>
  Number(item.total ?? item.subtotal ?? 0) ||
  Number(item.price ?? 0) * Number(item.quantity ?? 1);

function CartItemCard({ item, onQtyChange, onRemove, busy }) {
  const [qty, setQty] = useState(item.quantity);
  const changeQty = (delta) => {
    const next = qty + delta;
    if (next < 1) return;
    setQty(next);
    onQtyChange(item.cart_id, next);
  };
  const total = lineTotal(item);

  return (
    <View style={s.card}>
      <View style={s.thumb}>
        {item.thumbnail ? (
          <Image source={{ uri: item.thumbnail }} style={s.thumbImg} resizeMode="cover" />
        ) : (
          <View style={s.thumbFallback}>
            <Ionicons name="image-outline" size={26} color={a(MUTED, 0.4)} />
          </View>
        )}
      </View>

      <View style={s.cardBody}>
        <Text style={s.cardTitle} numberOfLines={2}>{item.title}</Text>

        {Array.isArray(item.variations) && item.variations.length > 0 && (
          <View style={s.varRow}>
            {item.variations.map((v, i) => (
              <View key={i} style={s.varChip}>
                <Text style={s.varTxt}>{v.variation_name}: {v.option_value}</Text>
              </View>
            ))}
          </View>
        )}

        <Text style={s.cardPrice}>{fmtMoney(item.currency, total)}</Text>
        <Text style={s.cardUnit}>{fmtMoney(item.currency, item.price)} each</Text>

        <View style={s.cardFooter}>
          <View style={s.stepper}>
            <TouchableOpacity
              style={[s.stepBtn, qty <= 1 && s.stepBtnDim]}
              onPress={() => changeQty(-1)}
              disabled={busy || qty <= 1}
            >
              <Ionicons name="remove" size={15} color={qty <= 1 ? a(DARK, 0.25) : BRAND} />
            </TouchableOpacity>
            <Text style={s.stepVal}>{qty}</Text>
            <TouchableOpacity style={s.stepBtn} onPress={() => changeQty(1)} disabled={busy}>
              <Ionicons name="add" size={15} color={BRAND} />
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={s.removeBtn} onPress={() => onRemove(item.cart_id)} disabled={busy}>
            <Ionicons name="trash-outline" size={14} color={DANGER} />
            <Text style={s.removeTxt}>Remove</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

export default function CartScreen({ navigation }) {
  const { token }    = useAuth();
  const insets       = useSafeAreaInsets();
  const setCartCount = useStore(st => st.setCartCount);
  const showToast    = useStore(st => st.showToast);

  const [cart,    setCart]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy,    setBusy]    = useState(false);
  const [error,   setError]   = useState('');

  const loadCart = useCallback(async () => {
    setLoading(true);
    try {
      const c = await getCart(token);
      setCart(c);
      setCartCount(c.count);
      setError('');
    } catch {
      setError('Could not load your cart.');
    }
    setLoading(false);
  }, [token, setCartCount]);

  useFocusEffect(useCallback(() => { loadCart(); }, [loadCart]));

  const handleQtyChange = useCallback(async (cartId, quantity) => {
    setBusy(true);
    try {
      await updateCartItem(token, cartId, quantity);
      const c = await getCart(token);
      setCart(c);
      setCartCount(c.count);
    } catch (e) {
      showToast(e.message ?? 'Could not update quantity', '⚠️');
      loadCart();
    }
    setBusy(false);
  }, [token, setCartCount, showToast, loadCart]);

  const handleRemove = useCallback((cartId) => {
    Alert.alert('Remove Item', 'Remove this item from your cart?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove', style: 'destructive',
        onPress: async () => {
          setBusy(true);
          try {
            await removeCartItem(token, cartId);
            const c = await getCart(token);
            setCart(c);
            setCartCount(c.count);
            showToast('Item removed', '🗑️');
          } catch (e) {
            showToast(e.message ?? 'Could not remove item', '⚠️');
          }
          setBusy(false);
        },
      },
    ]);
  }, [token, setCartCount, showToast]);

  const items      = cart?.items ?? [];
  const grandTotal = Number(cart?.total ?? 0) || items.reduce((sum, i) => sum + lineTotal(i), 0);
  const currency   = items[0]?.currency ?? '';

  return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" backgroundColor={BRAND} />

      <SafeAreaView edges={['top']} style={s.header}>
        <View style={s.headerInner}>
          <TouchableOpacity style={s.iconBtn} onPress={() => navigation.goBack()} activeOpacity={0.8}>
            <Ionicons name="arrow-back" size={20} color={WHITE} />
          </TouchableOpacity>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text style={s.headerTitle}>My Cart</Text>
            {items.length > 0 && (
              <View style={s.badge}><Text style={s.badgeTxt}>{items.length}</Text></View>
            )}
          </View>
          <View style={{ width: 34 }} />
        </View>
        <View style={s.headerLine} />
      </SafeAreaView>

      {loading ? (
        <View style={s.center}>
          <ActivityIndicator size="large" color={BRAND} />
          <Text style={s.centerTxt}>Loading your cart…</Text>
        </View>
      ) : error ? (
        <View style={s.center}>
          <View style={s.emptyIcon}><Ionicons name="cloud-offline-outline" size={38} color={a(MUTED, 0.5)} /></View>
          <Text style={s.emptyTitle}>Something went wrong</Text>
          <Text style={s.emptySub}>{error}</Text>
          <TouchableOpacity style={s.emptyBtn} onPress={loadCart}>
            <Ionicons name="refresh" size={14} color={WHITE} />
            <Text style={s.emptyBtnTxt}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : items.length === 0 ? (
        <View style={s.center}>
          <View style={s.emptyIcon}><Ionicons name="bag-outline" size={46} color={a(BRAND, 0.35)} /></View>
          <Text style={s.emptyTitle}>Your bag is empty</Text>
          <Text style={s.emptySub}>Add some products and they'll appear here.</Text>
          <TouchableOpacity style={s.emptyBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="storefront-outline" size={14} color={WHITE} />
            <Text style={s.emptyBtnTxt}>Browse Products</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={item => String(item.cart_id)}
          renderItem={({ item }) => (
            <CartItemCard item={item} onQtyChange={handleQtyChange} onRemove={handleRemove} busy={busy} />
          )}
          contentContainerStyle={[s.list, { paddingBottom: insets.bottom + 130 }]}
          showsVerticalScrollIndicator={false}
          ListFooterComponent={() => (
            <View style={s.summary}>
              <Text style={s.summaryHead}>Order Summary</Text>
              <View style={s.summaryRow}>
                <Text style={s.summaryKey}>Items ({items.length})</Text>
                <Text style={s.summaryVal}>{fmtMoney(currency, items.reduce((sum, i) => sum + lineTotal(i), 0))}</Text>
              </View>
              <View style={s.summaryRow}>
                <Text style={s.summaryKey}>Shipping</Text>
                <Text style={[s.summaryVal, { color: GREEN, fontFamily: FONT_B }]}>Calculated at checkout</Text>
              </View>
              <View style={s.summaryDiv} />
              <View style={s.summaryRow}>
                <Text style={s.summaryTotalKey}>Total</Text>
                <Text style={s.summaryTotalVal}>{fmtMoney(currency, grandTotal)}</Text>
              </View>
            </View>
          )}
        />
      )}

      {items.length > 0 && (
        <View style={[s.bar, { paddingBottom: insets.bottom + 10 }]}>
          <View style={s.barLeft}>
            <Text style={s.barLabel}>Total</Text>
            <Text style={s.barTotal}>{fmtMoney(currency, grandTotal)}</Text>
          </View>
          <TouchableOpacity
            style={[s.barBtn, busy && { opacity: 0.6 }]}
            onPress={() => navigation.navigate('CheckoutScreen', { cart })}
            disabled={busy}
            activeOpacity={0.85}
          >
            {busy ? <ActivityIndicator color={WHITE} /> : (
              <>
                <Text style={s.barBtnTxt}>Checkout</Text>
                <Ionicons name="arrow-forward" size={16} color={WHITE} />
              </>
            )}
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },

  header:      { backgroundColor: BRAND },
  headerInner: { height: 44, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerLine:  { height: 1, backgroundColor: `${ACCENT}33` },
  headerTitle: { fontSize: 17, fontWeight: '900', color: WHITE, fontFamily: FONT_B, letterSpacing: 0.2 },
  iconBtn: {
    width: 34, height: 34, borderRadius: 10,
    backgroundColor: `${WHITE}1A`, borderWidth: 1, borderColor: `${WHITE}24`,
    alignItems: 'center', justifyContent: 'center',
  },
  badge:    { backgroundColor: `${WHITE}22`, borderRadius: 100, paddingHorizontal: 8, paddingVertical: 2 },
  badgeTxt: { fontSize: 12, fontWeight: '800', color: WHITE, fontFamily: FONT_B },

  center:    { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, paddingHorizontal: 40 },
  centerTxt: { fontSize: 13, color: MUTED, fontFamily: FONT_R, marginTop: 8 },
  emptyIcon: {
    width: 96, height: 96, borderRadius: 30,
    backgroundColor: a(BRAND, 0.07),
    alignItems: 'center', justifyContent: 'center', marginBottom: 4,
  },
  emptyTitle: { fontSize: 20, fontWeight: '900', color: DARK, fontFamily: FONT_B, textAlign: 'center' },
  emptySub:   { fontSize: 14, color: MUTED, fontFamily: FONT_R, textAlign: 'center', lineHeight: 21 },
  emptyBtn:   { flexDirection: 'row', alignItems: 'center', gap: 7, backgroundColor: BRAND, borderRadius: 100, paddingHorizontal: 26, paddingVertical: 13, marginTop: 8 },
  emptyBtnTxt:{ fontSize: 14, fontWeight: '800', color: WHITE, fontFamily: FONT_B },

  list: { paddingHorizontal: 14, paddingTop: 14, gap: 10 },

  card: {
    flexDirection: 'row', gap: 12,
    backgroundColor: WHITE, borderRadius: 18, padding: 14,
    shadowColor: BRAND, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 8, elevation: 2,
  },
  thumb:        { borderRadius: 14, overflow: 'hidden' },
  thumbImg:     { width: 90, height: 90, borderRadius: 14, backgroundColor: BG },
  thumbFallback:{ width: 90, height: 90, borderRadius: 14, backgroundColor: BG, alignItems: 'center', justifyContent: 'center' },
  cardBody:     { flex: 1, gap: 3 },
  cardTitle:    { fontSize: 13.5, fontWeight: '700', color: DARK, lineHeight: 19, fontFamily: FONT_M },
  varRow:       { flexDirection: 'row', flexWrap: 'wrap', gap: 5, marginTop: 2 },
  varChip:      { backgroundColor: a(BRAND, 0.07), borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  varTxt:       { fontSize: 10.5, color: BRAND, fontWeight: '600', fontFamily: FONT_M },
  cardPrice:    { fontSize: 18, fontWeight: '900', color: ACCENT, fontFamily: FONT_B, marginTop: 3 },
  cardUnit:     { fontSize: 11, color: MUTED, fontFamily: FONT_R },
  cardFooter:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 },

  stepper:    { flexDirection: 'row', alignItems: 'center', borderRadius: 10, borderWidth: 1.5, borderColor: BORDER, backgroundColor: WHITE, overflow: 'hidden' },
  stepBtn:    { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  stepBtnDim: { opacity: 0.3 },
  stepVal:    { minWidth: 28, textAlign: 'center', fontSize: 14, fontWeight: '900', color: DARK, fontFamily: FONT_B },

  removeBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  removeTxt: { fontSize: 12, color: DANGER, fontWeight: '700', fontFamily: FONT_M },

  summary:      { backgroundColor: WHITE, borderRadius: 18, padding: 18, marginTop: 10, gap: 12, shadowColor: BRAND, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  summaryHead:  { fontSize: 15, fontWeight: '900', color: DARK, fontFamily: FONT_B, marginBottom: 2 },
  summaryRow:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  summaryKey:   { fontSize: 13.5, color: MUTED, fontFamily: FONT_R },
  summaryVal:   { fontSize: 13.5, fontWeight: '700', color: DARK, fontFamily: FONT_M },
  summaryDiv:   { height: 1, backgroundColor: BORDER, marginVertical: 4 },
  summaryTotalKey: { fontSize: 16, fontWeight: '900', color: DARK, fontFamily: FONT_B },
  summaryTotalVal: { fontSize: 20, fontWeight: '900', color: ACCENT, fontFamily: FONT_B },

  bar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: WHITE, paddingHorizontal: 16, paddingTop: 14,
    borderTopWidth: 1, borderTopColor: BORDER,
    shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.07, shadowRadius: 12, elevation: 18,
  },
  barLeft:  { flex: 1 },
  barLabel: { fontSize: 11, color: MUTED, fontFamily: FONT_R, textTransform: 'uppercase', letterSpacing: 0.5 },
  barTotal: { fontSize: 22, fontWeight: '900', color: DARK, fontFamily: FONT_B },
  barBtn: {
    flex: 1.4, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: BRAND, borderRadius: 16, paddingVertical: 15,
    shadowColor: BRAND, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 10, elevation: 6,
  },
  barBtnTxt: { fontSize: 15, fontWeight: '900', color: WHITE, fontFamily: FONT_B },
});
