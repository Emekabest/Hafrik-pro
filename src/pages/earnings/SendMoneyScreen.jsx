// src/pages/earnings/SendMoneyScreen.jsx — Send money via user search
import React, { useCallback, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  ActivityIndicator, FlatList, Alert, KeyboardAvoidingView,
  Platform, ScrollView, Animated,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Image as ExpoImage } from 'expo-image';
import { useNavigation } from '@react-navigation/native';

import { useAuth } from '../../AuthContext';
import { Colors } from '../../theme';
import AppDetails from '../../helpers/appdetails';
import SearchSuggestionController from '../../controllers/searchsuggestioncontroller';
import { transferMoney, getWalletBalance } from '../../api/walletApi';

const BRAND  = Colors.primaryDark;
const ACCENT = Colors.primary;
const BG     = Colors.background ?? '#F7F8FA';
const CARD   = Colors.white;
const BORDER = Colors.borderSoft ?? Colors.border;
const TEXT_H = Colors.black;
const TEXT_M = Colors.secondaryText;
const WHITE  = Colors.white;
const GREEN  = Colors.success ?? '#22c55e';
const RED    = Colors.destructive ?? '#d32f2f';

const FONT_B = AppDetails?.fontFamily?.redex?.bold    ?? 'System';
const FONT_R = AppDetails?.fontFamily?.inter?.regular ?? 'System';
const FONT_M = AppDetails?.fontFamily?.inter?.medium  ?? 'System';

const fmtMoney = (n) =>
  `¥${Number(n ?? 0).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const AVA_FB = 'https://www.gravatar.com/avatar/00000000000000000000000000000000?d=mp&f=y';

// ─── Step indicator ────────────────────────────────────────────────────────────
const StepDot = ({ active, done, label }) => (
  <View style={sm.stepWrap}>
    <View style={[sm.stepDot, active && sm.stepDotActive, done && sm.stepDotDone]}>
      {done
        ? <Ionicons name="checkmark" size={12} color={WHITE} />
        : <Text style={sm.stepNum}>{label}</Text>}
    </View>
  </View>
);

// ─── User result row ───────────────────────────────────────────────────────────
const UserRow = ({ item, onSelect }) => (
  <TouchableOpacity style={sm.userRow} onPress={() => onSelect(item)} activeOpacity={0.8}>
    <ExpoImage
      source={{ uri: item.avatar || AVA_FB }}
      style={sm.userAva}
      contentFit="cover"
    />
    <View style={sm.userMid}>
      <Text style={sm.userName} numberOfLines={1}>{item.name ?? item.username}</Text>
      <Text style={sm.userHandle} numberOfLines={1}>@{item.username}</Text>
    </View>
    <View style={sm.selectBtn}>
      <Text style={sm.selectBtnText}>Select</Text>
    </View>
  </TouchableOpacity>
);

// ─────────────────────────────────────────────────────────────────────────────
const STEPS = { SEARCH: 'SEARCH', AMOUNT: 'AMOUNT', CONFIRM: 'CONFIRM' };

export default function SendMoneyScreen() {
  const navigation = useNavigation();
  const { token }  = useAuth();
  const insets     = useSafeAreaInsets();

  const [step,       setStep]       = useState(STEPS.SEARCH);
  const [query,      setQuery]      = useState('');
  const [results,    setResults]    = useState([]);
  const [searching,  setSearching]  = useState(false);
  const [recipient,  setRecipient]  = useState(null);
  const [amount,     setAmount]     = useState('');
  const [note,       setNote]       = useState('');
  const [balance,    setBalance]    = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error,      setError]      = useState('');

  const searchTimer = useRef(null);
  const amountRef   = useRef(null);

  // ── Search users ────────────────────────────────────────────────────────────
  const doSearch = useCallback(async (q) => {
    if (!q.trim()) { setResults([]); return; }
    setSearching(true);
    try {
      const res = await SearchSuggestionController(q.trim(), token);
      if (res.status === 200) {
        const raw = (res.data?.results ?? res.data ?? []).filter(
          (r) => r.type === 'user' || r.username || r.title
        );
        // Normalize: API returns thumbnail/title/subtitle instead of avatar/name/username
        const people = raw.map((r) => ({
          ...r,
          avatar:   r.thumbnail  ?? r.avatar        ?? r.user_picture ?? null,
          name:     r.title      ?? r.name          ?? r.full_name    ?? r.username ?? '',
          username: r.subtitle   ?? r.username      ?? r.handle       ?? '',
        }));
        setResults(people.slice(0, 8));
      } else {
        setResults([]);
      }
    } catch { setResults([]); }
    setSearching(false);
  }, [token]);

  const onQueryChange = useCallback((text) => {
    setQuery(text);
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => doSearch(text), 350);
  }, [doSearch]);

  // ── Select recipient → go to amount step ───────────────────────────────────
  const handleSelectUser = useCallback(async (user) => {
    setRecipient(user);
    setStep(STEPS.AMOUNT);
    // Fetch wallet balance to show available
    try {
      const json = await getWalletBalance(token);
      if (json?.status === 'success') setBalance(json.data?.wallet_balance ?? 0);
    } catch { /* silent */ }
    setTimeout(() => amountRef.current?.focus(), 200);
  }, [token]);

  // ── Proceed to confirm ──────────────────────────────────────────────────────
  const handleProceedToConfirm = useCallback(() => {
    const num = parseFloat(amount);
    if (isNaN(num) || num <= 0) { setError('Enter a valid amount.'); return; }
    if (balance !== null && num > balance) {
      setError(`Insufficient balance. Available: ${fmtMoney(balance)}`);
      return;
    }
    setError('');
    setStep(STEPS.CONFIRM);
  }, [amount, balance]);

  // ── Submit transfer ─────────────────────────────────────────────────────────
  const handleSend = useCallback(async () => {
    setSubmitting(true);
    setError('');
    try {
      const json = await transferMoney(token, recipient.id, parseFloat(amount));
      if (json?.status === 'success') {
        Alert.alert(
          'Sent!',
          json.message ?? `${fmtMoney(amount)} sent to ${recipient.name ?? recipient.username}.`,
          [{ text: 'Done', onPress: () => navigation.goBack() }]
        );
      } else {
        setError(json?.message ?? 'Transfer failed. Please try again.');
        setStep(STEPS.AMOUNT);
      }
    } catch (e) {
      setError(e?.message ?? 'Network error. Please try again.');
      setStep(STEPS.AMOUNT);
    }
    setSubmitting(false);
  }, [token, recipient, amount, navigation]);

  // ── Back within steps ────────────────────────────────────────────────────────
  const handleBack = useCallback(() => {
    if (step === STEPS.AMOUNT)  { setStep(STEPS.SEARCH); setError(''); return; }
    if (step === STEPS.CONFIRM) { setStep(STEPS.AMOUNT); setError(''); return; }
    navigation.goBack();
  }, [step, navigation]);

  // ─────────────────────────────────────────────────────────────────────────
  const renderStep = () => {
    // ── Step 1: Search ──────────────────────────────────────────────────────
    if (step === STEPS.SEARCH) {
      return (
        <View style={sm.stepContent}>
          <Text style={sm.stepLabel}>Who are you sending to?</Text>
          <View style={sm.searchBox}>
            <Ionicons name="search" size={18} color={TEXT_M} style={{ marginLeft: 12 }} />
            <TextInput
              style={sm.searchInput}
              value={query}
              onChangeText={onQueryChange}
              placeholder="Search by name or username…"
              placeholderTextColor={TEXT_M}
              autoFocus
              returnKeyType="search"
            />
            {searching && <ActivityIndicator size="small" color={ACCENT} style={{ marginRight: 12 }} />}
          </View>
          <FlatList
            data={results}
            keyExtractor={(item) => String(item.id)}
            renderItem={({ item }) => <UserRow item={item} onSelect={handleSelectUser} />}
            keyboardShouldPersistTaps="handled"
            scrollEnabled={false}
            ListEmptyComponent={
              !searching && query.trim().length > 1 ? (
                <View style={sm.emptySearch}>
                  <Ionicons name="person-outline" size={28} color={BORDER} />
                  <Text style={sm.emptyText}>No users found</Text>
                </View>
              ) : null
            }
          />
        </View>
      );
    }

    // ── Step 2: Amount ──────────────────────────────────────────────────────
    if (step === STEPS.AMOUNT) {
      return (
        <ScrollView keyboardShouldPersistTaps="handled" style={{ flex: 1 }}>
          <View style={sm.stepContent}>
            {/* Recipient preview */}
            <View style={sm.recipientCard}>
              <ExpoImage
                source={{ uri: recipient?.avatar || AVA_FB }}
                style={sm.recAva}
                contentFit="cover"
              />
              <View style={{ flex: 1 }}>
                <Text style={sm.recName}>{recipient?.name ?? recipient?.username}</Text>
                <Text style={sm.recHandle}>@{recipient?.username}</Text>
              </View>
              <TouchableOpacity
                onPress={() => { setRecipient(null); setStep(STEPS.SEARCH); }}
                style={sm.changeBtn}
                activeOpacity={0.75}
              >
                <Text style={sm.changeBtnText}>Change</Text>
              </TouchableOpacity>
            </View>

            {balance !== null && (
              <View style={sm.balancePill}>
                <Ionicons name="wallet-outline" size={13} color={ACCENT} />
                <Text style={sm.balanceText}>
                  Available: <Text style={sm.balanceBold}>{fmtMoney(balance)}</Text>
                </Text>
              </View>
            )}

            <Text style={sm.fieldLabel}>Amount</Text>
            <View style={sm.amountBox}>
              <Text style={sm.currencySymbol}>¥</Text>
              <TextInput
                ref={amountRef}
                style={sm.amountInput}
                value={amount}
                onChangeText={(t) => { setAmount(t); setError(''); }}
                placeholder="0.00"
                placeholderTextColor={TEXT_M}
                keyboardType="decimal-pad"
                returnKeyType="done"
              />
            </View>

            <Text style={sm.fieldLabel}>Note (optional)</Text>
            <TextInput
              style={sm.noteInput}
              value={note}
              onChangeText={setNote}
              placeholder="Add a message…"
              placeholderTextColor={TEXT_M}
              multiline
              numberOfLines={3}
              returnKeyType="done"
            />

            {!!error && <Text style={sm.errorText}>{error}</Text>}

            <TouchableOpacity
              style={sm.primaryBtn}
              onPress={handleProceedToConfirm}
              activeOpacity={0.87}
            >
              <LinearGradient
                colors={[ACCENT, BRAND]}
                style={sm.primaryBtnGrad}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              >
                <Text style={sm.primaryBtnText}>Review</Text>
                <Ionicons name="chevron-forward" size={18} color={WHITE} />
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </ScrollView>
      );
    }

    // ── Step 3: Confirm ─────────────────────────────────────────────────────
    if (step === STEPS.CONFIRM) {
      return (
        <View style={sm.stepContent}>
          <View style={sm.confirmCard}>
            <ExpoImage
              source={{ uri: recipient?.avatar || AVA_FB }}
              style={sm.confirmAva}
              contentFit="cover"
            />
            <Text style={sm.confirmName}>{recipient?.name ?? recipient?.username}</Text>
            <Text style={sm.confirmHandle}>@{recipient?.username}</Text>
            <Text style={sm.confirmAmount}>{fmtMoney(parseFloat(amount))}</Text>
            {!!note && <Text style={sm.confirmNote}>"{note}"</Text>}
          </View>

          {!!error && <Text style={sm.errorText}>{error}</Text>}

          <View style={sm.confirmActions}>
            <TouchableOpacity
              style={sm.cancelBtn}
              onPress={() => { setStep(STEPS.AMOUNT); setError(''); }}
              activeOpacity={0.75}
            >
              <Text style={sm.cancelBtnText}>Edit</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[sm.sendBtn, submitting && { opacity: 0.6 }]}
              onPress={handleSend}
              disabled={submitting}
              activeOpacity={0.87}
            >
              <LinearGradient
                colors={[GREEN, '#16a34a']}
                style={sm.sendBtnGrad}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              >
                {submitting
                  ? <ActivityIndicator color={WHITE} size="small" />
                  : <>
                      <Ionicons name="send" size={16} color={WHITE} />
                      <Text style={sm.sendBtnText}>Confirm & Send</Text>
                    </>
                }
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      );
    }
  };

  return (
    <KeyboardAvoidingView
      style={[sm.root, { paddingTop: insets.top }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* Top bar */}
      <View style={sm.topBar}>
        <TouchableOpacity onPress={handleBack} style={sm.backBtn} activeOpacity={0.85}>
          <Ionicons name="arrow-back" size={20} color={WHITE} />
        </TouchableOpacity>
        <Text style={sm.topTitle}>Send Money</Text>
        <View style={{ width: 38 }} />
      </View>

      {/* Step indicator */}
      <View style={sm.stepsBar}>
        <StepDot label="1" active={step === STEPS.SEARCH}  done={step !== STEPS.SEARCH} />
        <View style={sm.stepLine} />
        <StepDot label="2" active={step === STEPS.AMOUNT}  done={step === STEPS.CONFIRM} />
        <View style={sm.stepLine} />
        <StepDot label="3" active={step === STEPS.CONFIRM} done={false} />
      </View>
      <View style={sm.stepsLabelRow}>
        {['Recipient', 'Amount', 'Confirm'].map((l) => (
          <Text key={l} style={sm.stepsLabelText}>{l}</Text>
        ))}
      </View>

      {/* Content */}
      <View style={sm.body}>
        {renderStep()}
      </View>
    </KeyboardAvoidingView>
  );
}

const sm = StyleSheet.create({
  root:   { flex: 1, backgroundColor: BRAND },
  topBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 10,
  },
  backBtn: {
    width: 38, height: 38, borderRadius: 14,
    backgroundColor: WHITE + '1A', alignItems: 'center', justifyContent: 'center',
  },
  topTitle: { fontSize: 17, fontWeight: '900', color: WHITE, fontFamily: FONT_B },

  // Steps
  stepsBar:      { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 60, marginTop: 8, marginBottom: 4 },
  stepWrap:      { alignItems: 'center' },
  stepDot:       { width: 26, height: 26, borderRadius: 13, backgroundColor: WHITE + '30', alignItems: 'center', justifyContent: 'center' },
  stepDotActive: { backgroundColor: WHITE },
  stepDotDone:   { backgroundColor: GREEN },
  stepNum:       { fontSize: 11, fontWeight: '800', color: WHITE, fontFamily: FONT_B },
  stepLine:      { flex: 1, height: 2, backgroundColor: WHITE + '30', marginHorizontal: 4 },
  stepsLabelRow: { flexDirection: 'row', justifyContent: 'space-around', paddingHorizontal: 30, marginBottom: 12 },
  stepsLabelText:{ fontSize: 10, color: WHITE + 'AA', fontFamily: FONT_R },

  // Body
  body:        { flex: 1, backgroundColor: BG, borderTopLeftRadius: 26, borderTopRightRadius: 26 },
  stepContent: { paddingHorizontal: 16, paddingTop: 20 },
  stepLabel:   { fontSize: 18, fontWeight: '900', color: TEXT_H, fontFamily: FONT_B, marginBottom: 14 },

  // Search
  searchBox: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: CARD, borderRadius: 16, borderWidth: 1.5, borderColor: BORDER,
    marginBottom: 12,
  },
  searchInput: { flex: 1, paddingHorizontal: 10, paddingVertical: 13, fontSize: 14.5, color: TEXT_H, fontFamily: FONT_R },

  // User row
  userRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: CARD, borderRadius: 16, padding: 12,
    marginBottom: 8,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04, shadowRadius: 6, elevation: 1,
  },
  userAva:    { width: 44, height: 44, borderRadius: 22 },
  userMid:    { flex: 1 },
  userName:   { fontSize: 14, fontWeight: '700', color: TEXT_H, fontFamily: FONT_B },
  userHandle: { fontSize: 12, color: TEXT_M, marginTop: 2, fontFamily: FONT_R },
  selectBtn:  { backgroundColor: ACCENT + '14', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 7 },
  selectBtnText: { fontSize: 12, fontWeight: '700', color: ACCENT, fontFamily: FONT_M },

  // Empty search
  emptySearch: { alignItems: 'center', paddingVertical: 28, gap: 8 },
  emptyText:   { fontSize: 13, color: TEXT_M, fontFamily: FONT_R },

  // Recipient card
  recipientCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: CARD, borderRadius: 16, padding: 14,
    marginBottom: 14,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04, shadowRadius: 8, elevation: 1,
  },
  recAva:    { width: 46, height: 46, borderRadius: 23 },
  recName:   { fontSize: 14.5, fontWeight: '800', color: TEXT_H, fontFamily: FONT_B },
  recHandle: { fontSize: 12, color: TEXT_M, marginTop: 2, fontFamily: FONT_R },
  changeBtn: { backgroundColor: ACCENT + '12', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 7 },
  changeBtnText: { fontSize: 12, fontWeight: '700', color: ACCENT, fontFamily: FONT_M },

  // Balance pill
  balancePill: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: ACCENT + '0E', borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 8, marginBottom: 14, alignSelf: 'flex-start',
  },
  balanceText: { fontSize: 12, color: TEXT_M, fontFamily: FONT_R },
  balanceBold: { fontWeight: '800', color: BRAND, fontFamily: FONT_B },

  // Amount input
  fieldLabel: {
    fontSize: 11, fontWeight: '700', color: TEXT_M, fontFamily: FONT_M,
    textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6,
  },
  amountBox: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1.5, borderColor: BORDER, borderRadius: 16,
    backgroundColor: CARD, marginBottom: 14,
  },
  currencySymbol: { fontSize: 20, fontWeight: '900', color: TEXT_M, paddingLeft: 16, fontFamily: FONT_B },
  amountInput: {
    flex: 1, paddingHorizontal: 8, paddingVertical: 14,
    fontSize: 22, fontWeight: '900', color: TEXT_H, fontFamily: FONT_B,
  },
  noteInput: {
    borderWidth: 1.5, borderColor: BORDER, borderRadius: 16, backgroundColor: CARD,
    paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: TEXT_H, fontFamily: FONT_R,
    textAlignVertical: 'top', marginBottom: 14, minHeight: 80,
  },
  errorText:  { fontSize: 12.5, color: RED, marginBottom: 12, fontFamily: FONT_R },

  // Primary button
  primaryBtn: { borderRadius: 16, overflow: 'hidden', marginTop: 4 },
  primaryBtnGrad: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, paddingVertical: 15,
  },
  primaryBtnText: { fontSize: 15, fontWeight: '900', color: WHITE, fontFamily: FONT_B },

  // Confirm card
  confirmCard: {
    backgroundColor: CARD, borderRadius: 22, padding: 28,
    alignItems: 'center', marginBottom: 20,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06, shadowRadius: 12, elevation: 3,
  },
  confirmAva:    { width: 72, height: 72, borderRadius: 36, marginBottom: 14 },
  confirmName:   { fontSize: 18, fontWeight: '900', color: TEXT_H, fontFamily: FONT_B },
  confirmHandle: { fontSize: 13, color: TEXT_M, fontFamily: FONT_R, marginTop: 2 },
  confirmAmount: { fontSize: 40, fontWeight: '900', color: BRAND, fontFamily: FONT_B, marginTop: 18, letterSpacing: -1.5 },
  confirmNote:   { fontSize: 13, color: TEXT_M, fontFamily: FONT_R, marginTop: 10, fontStyle: 'italic', textAlign: 'center' },

  // Confirm actions
  confirmActions: { flexDirection: 'row', gap: 12 },
  cancelBtn: {
    flex: 1, paddingVertical: 14, borderRadius: 16,
    borderWidth: 1.5, borderColor: BORDER, alignItems: 'center',
  },
  cancelBtnText:  { fontSize: 14, fontWeight: '600', color: TEXT_M, fontFamily: FONT_M },
  sendBtn:        { flex: 2, borderRadius: 16, overflow: 'hidden' },
  sendBtnGrad:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14 },
  sendBtnText:    { fontSize: 14, fontWeight: '900', color: WHITE, fontFamily: FONT_B },
});
