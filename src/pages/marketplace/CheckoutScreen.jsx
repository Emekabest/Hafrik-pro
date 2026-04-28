// src/pages/marketplace/CheckoutScreen.jsx
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, ActivityIndicator, KeyboardAvoidingView,
  Platform, Modal, FlatList, StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAuth }   from '../../AuthContext';
import { Colors }    from '../../theme';
import AppDetails    from '../../helpers/appdetails';
import useStore      from '../../repository/store';
import { checkout, getCountries, ensureCartToken, walletCheckout, initWalletTopup } from './marketplaceApi';
import { getWalletBalance } from '../../api/walletApi';
import { Linking } from 'react-native';

// ─── Brand tokens ─────────────────────────────────────────────────────────────
const BRAND     = '#0c3f44';
const ACCENT    = '#1f8e93';
const ACCENT_LT = '#27adb5';
const BG        = '#F4F6F9';
const WHITE     = '#ffffff';
const DARK      = '#0F1923';
const MUTED     = '#8A96A3';
const DANGER    = '#ef4444';
const GREEN     = '#22c55e';

const FONT_B = AppDetails?.fontFamily?.redex?.bold    ?? 'System';
const FONT_M = AppDetails?.fontFamily?.inter?.medium  ?? 'System';
const FONT_R = AppDetails?.fontFamily?.inter?.regular ?? 'System';

// Alpha helper
const a = (hex, op) => {
  const h = (hex || '').replace('#', '');
  return '#' + h + Math.round(op * 255).toString(16).padStart(2, '0');
};

const fmtMoney = (currency, amount) =>
  `${currency ?? ''} ${Number(amount ?? 0).toLocaleString()}`.trim();

const lineTotal = (item) =>
  Number(item.total ?? item.subtotal ?? 0) ||
  Number(item.price ?? 0) * Number(item.quantity ?? 1);

// ─── Step Indicator ───────────────────────────────────────────────────────────
function StepIndicator() {
  const steps = [
    { n: '1', label: 'Contact' },
    { n: '2', label: 'Address' },
    { n: '3', label: 'Review'  },
  ];
  return (
    <View style={ch.stepsRow}>
      {steps.map((step, idx) => (
        <React.Fragment key={step.n}>
          <View style={ch.stepItem}>
            <View style={[ch.stepCircle, idx < 2 && ch.stepCircleActive]}>
              <Text style={[ch.stepNum, idx < 2 && ch.stepNumActive]}>{step.n}</Text>
            </View>
            <Text style={[ch.stepLabel, idx < 2 && ch.stepLabelActive]}>{step.label}</Text>
          </View>
          {idx < steps.length - 1 && (
            <View style={[ch.stepConnector, idx === 0 && ch.stepConnectorActive]} />
          )}
        </React.Fragment>
      ))}
    </View>
  );
}

// ─── Country Picker ───────────────────────────────────────────────────────────
function CountryPicker({ countries, selected, onSelect, loading }) {
  const [open,  setOpen]  = useState(false);
  const [query, setQuery] = useState('');
  const insets = useSafeAreaInsets();

  const filtered = useMemo(() => {
    if (!query.trim()) return countries;
    const q = query.toLowerCase();
    return countries.filter(c => c.name?.toLowerCase().includes(q));
  }, [countries, query]);

  const handleSelect = (country) => {
    onSelect(country);
    setOpen(false);
    setQuery('');
  };

  return (
    <>
      <TouchableOpacity
        style={[
          ch.input,
          ch.dropdownTrigger,
          selected ? { borderColor: a(ACCENT, 0.6) } : { borderColor: a(BRAND, 0.2) },
        ]}
        onPress={() => setOpen(true)}
        activeOpacity={0.75}
      >
        {loading ? (
          <ActivityIndicator size="small" color={MUTED} />
        ) : (
          <>
            <Text style={[ch.dropdownTxt, !selected && { color: MUTED }]} numberOfLines={1}>
              {selected?.name || 'Select country'}
            </Text>
            <Ionicons name="chevron-down" size={16} color={selected ? ACCENT : MUTED} />
          </>
        )}
      </TouchableOpacity>

      <Modal
        visible={open}
        animationType="slide"
        transparent
        onRequestClose={() => setOpen(false)}
      >
        <View style={ch.modalOverlay}>
          <View style={[ch.modalSheet, { paddingBottom: insets.bottom + 8 }]}>
            {/* Drag pill */}
            <View style={ch.modalDragPill} />

            {/* Modal header */}
            <View style={ch.modalHeader}>
              <Text style={ch.modalTitle}>Select Country</Text>
              <TouchableOpacity
                onPress={() => { setOpen(false); setQuery(''); }}
                style={ch.modalCloseBtn}
              >
                <Ionicons name="close" size={18} color={DARK} />
              </TouchableOpacity>
            </View>

            {/* Search */}
            <View style={ch.modalSearchBar}>
              <Ionicons name="search-outline" size={16} color={MUTED} />
              <TextInput
                style={ch.modalSearchInput}
                placeholder="Search country…"
                placeholderTextColor={MUTED}
                value={query}
                onChangeText={setQuery}
                autoFocus
                autoCorrect={false}
              />
              {query.length > 0 && (
                <TouchableOpacity onPress={() => setQuery('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Ionicons name="close-circle" size={16} color={MUTED} />
                </TouchableOpacity>
              )}
            </View>

            {/* Country list */}
            <FlatList
              data={filtered}
              keyExtractor={item => String(item.id ?? item.name)}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => {
                const isSelected = item.code === selected?.code;
                return (
                  <TouchableOpacity
                    style={[ch.countryRow, isSelected && ch.countryRowActive]}
                    onPress={() => handleSelect(item)}
                    activeOpacity={0.7}
                  >
                    <View style={ch.countryRowLeft}>
                      <View style={[ch.countryCodeBadge, isSelected && ch.countryCodeBadgeActive]}>
                        <Text style={[ch.countryCodeTxt, isSelected && { color: WHITE }]}>
                          {item.code}
                        </Text>
                      </View>
                      <Text style={[ch.countryName, isSelected && { color: BRAND, fontFamily: FONT_B }]}>
                        {item.name}
                      </Text>
                    </View>
                    {isSelected && (
                      <Ionicons name="checkmark-circle" size={18} color={BRAND} />
                    )}
                  </TouchableOpacity>
                );
              }}
              ListEmptyComponent={
                <View style={{ alignItems: 'center', paddingVertical: 40 }}>
                  <Text style={{ color: MUTED, fontFamily: FONT_R, fontSize: 13 }}>
                    No countries found
                  </Text>
                </View>
              }
            />
          </View>
        </View>
      </Modal>
    </>
  );
}

// ─── Input Field Helper ───────────────────────────────────────────────────────
function Field({ label, required, optional, children }) {
  return (
    <View style={ch.fieldGroup}>
      <Text style={ch.fieldLabel}>
        {label}
        {required && <Text style={ch.req}> *</Text>}
        {optional && <Text style={ch.opt}> (optional)</Text>}
      </Text>
      {children}
    </View>
  );
}

// ─── Section Card Header ──────────────────────────────────────────────────────
function SectionHeader({ icon, title }) {
  return (
    <View style={ch.sectionHeaderRow}>
      <View style={ch.sectionIconWrap}>
        <Ionicons name={icon} size={14} color={WHITE} />
      </View>
      <Text style={ch.sectionTitle}>{title}</Text>
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function CheckoutScreen({ navigation, route }) {
  const { token, user } = useAuth();
  const insets          = useSafeAreaInsets();
  const showToast       = useStore(s => s.showToast);
  const setCartCount    = useStore(s => s.setCartCount);

  const cart     = route.params?.cart ?? { items: [], total: 0, count: 0 };
  const items    = cart.items ?? [];
  const currency = items[0]?.currency ?? '';
  const grandTotal = Number(cart.total ?? 0) || items.reduce((s, i) => s + lineTotal(i), 0);

  // ── Form state ────────────────────────────────────────────────────────────
  const [firstName, setFirstName] = useState(user?.first_name ?? '');
  const [lastName,  setLastName]  = useState(user?.last_name  ?? '');
  const [email,     setEmail]     = useState(user?.email      ?? '');
  const [street,    setStreet]    = useState('');
  const [city,      setCity]      = useState('');
  const [state,     setState]     = useState('');
  const [postcode,  setPostcode]  = useState('');
  const [country,   setCountry]   = useState(null);  // { id, name, code }
  const [phone,     setPhone]     = useState('');
  const [note,      setNote]      = useState('');

  // ── Sync user data if loaded after mount ─────────────────────────────────
  useEffect(() => {
    if (!user) return;
    if (user.first_name && !firstName) setFirstName(user.first_name);
    if (user.last_name  && !lastName)  setLastName(user.last_name);
    if (user.email      && !email)     setEmail(user.email);
  }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Payment method ────────────────────────────────────────────────────────
  const [payMethod,       setPayMethod]       = useState('paystack'); // 'paystack' | 'wallet'
  const [walletBalance,   setWalletBalance]   = useState(null);       // null = loading
  const [loadingWallet,   setLoadingWallet]   = useState(true);
  const [toppingUp,       setToppingUp]       = useState(false);
  const [topupAmount,     setTopupAmount]      = useState('');
  const [showTopupSheet,  setShowTopupSheet]  = useState(false);

  // WalletScreen pattern: response is { status: 'success', data: <balance_number> }
  const parseBalance = (d) => d?.status === 'success' ? Number(d.data ?? 0) : Number(d?.data ?? d?.balance ?? 0);

  useEffect(() => {
    getWalletBalance(token)
      .then(d => setWalletBalance(parseBalance(d)))
      .catch(() => setWalletBalance(0))
      .finally(() => setLoadingWallet(false));
  }, [token]);

  const refreshWalletBalance = useCallback(async () => {
    try {
      const d = await getWalletBalance(token);
      setWalletBalance(parseBalance(d));
    } catch { /* silent */ }
  }, [token]);

  const handleTopup = useCallback(async () => {
    const amt = parseFloat(topupAmount);
    if (!amt || amt < 1) { showToast('Enter a valid amount', '⚠️'); return; }
    setToppingUp(true);
    try {
      const { payment_url } = await initWalletTopup(token, amt);
      setShowTopupSheet(false);
      await Linking.openURL(payment_url);
      // Re-fetch balance after user returns from browser
      setTimeout(() => refreshWalletBalance(), 3000);
    } catch (e) {
      showToast(e.message ?? 'Top-up failed', '⚠️');
    }
    setToppingUp(false);
  }, [token, topupAmount, showToast, refreshWalletBalance]);

  // ── Countries + cart token init ───────────────────────────────────────────
  const [countries,        setCountries]        = useState([]);
  const [loadingCountries, setLoadingCountries] = useState(true);

  useEffect(() => {
    ensureCartToken().catch(() => {});
    getCountries(token)
      .then(list => setCountries(list))
      .catch(() => {})
      .finally(() => setLoadingCountries(false));
  }, [token]);

  // ── Submit ────────────────────────────────────────────────────────────────
  const [placing, setPlacing] = useState(false);
  const [error,   setError]   = useState('');

  const isFormValid =
    !!firstName.trim() && !!lastName.trim() &&
    !!email.trim()     && !!street.trim()   &&
    !!city.trim()      && !!country         && !!phone.trim();
  const walletOk = payMethod === 'wallet' && walletBalance !== null && walletBalance >= grandTotal;
  const canSubmit = isFormValid && !placing && (payMethod === 'paystack' || walletOk);

  const handlePlaceOrder = useCallback(async () => {
    if (!firstName.trim() || !lastName.trim() || !email.trim() ||
        !street.trim()    || !city.trim()      || !country      || !phone.trim()) {
      setError('Please fill all required fields.');
      return;
    }

    setPlacing(true);
    setError('');

    // ── Wallet payment path ────────────────────────────────────────────────
    if (payMethod === 'wallet') {
      try {
        const fields = {
          firstName: firstName.trim(), lastName: lastName.trim(),
          email: email.trim(), street: street.trim(), city: city.trim(),
          country: country.code, countryName: country.name,
          phone: phone.trim(), note: note.trim(),
          ...(state.trim()    ? { state: state.trim() }       : {}),
          ...(postcode.trim() ? { postcode: postcode.trim() } : {}),
        };
        await walletCheckout(token, fields, items);
        setCartCount(0);
        showToast('Order placed from wallet!', '✅');
        navigation.replace('MarketplaceOrdersScreen');
      } catch (e) {
        setError(e.message ?? 'Wallet payment failed. Please try again.');
      }
      setPlacing(false);
      return;
    }

    // ── Paystack payment path ─────────────────────────────────────────────
    try {
      const result = await checkout(token, {
        firstName:   firstName.trim(),
        lastName:    lastName.trim(),
        email:       email.trim(),
        street:      street.trim(),
        city:        city.trim(),
        country:     country.code,
        countryName: country.name,
        phone:       phone.trim(),
        note:        note.trim(),
        ...(state.trim()    ? { state:    state.trim()    } : {}),
        ...(postcode.trim() ? { postcode: postcode.trim() } : {}),
      });

      if (!result.paid) {
        navigation.replace('MarketplacePaymentScreen', {
          order_id:             result.order_id,
          orders_collection_id: result.orders_collection_id,
          amount:               result.amount,
          currency:             result.currency || currency,
          message:              result.message,
          redirect_url:         result.redirect_url,
        });
      } else {
        setCartCount(0);
        showToast('Order placed successfully!', null);
        navigation.replace('MarketplaceOrdersScreen');
      }
    } catch (e) {
      setError(e.message ?? 'Checkout failed. Please try again.');
    }

    setPlacing(false);
  }, [firstName, lastName, email, street, city, state, postcode, country, phone, note,
      token, currency, setCartCount, showToast, navigation]);

  // ── Input style helper ────────────────────────────────────────────────────
  const inputStyle = (val) => [
    ch.input,
    val.trim() ? { borderColor: a(ACCENT, 0.6) } : { borderColor: a(BRAND, 0.2) },
  ];

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={ch.root}>
        <StatusBar barStyle="light-content" backgroundColor={BRAND} />

        {/* ── Brand Header ── */}
        <SafeAreaView edges={['top']} style={{ backgroundColor: BRAND }}>
          <View style={ch.headerRow}>
            <TouchableOpacity
              style={ch.headerIconBtn}
              onPress={() => navigation.goBack()}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="arrow-back" size={20} color={WHITE} />
            </TouchableOpacity>
            <Text style={ch.headerTitle}>Checkout</Text>
            <View style={{ width: 34 }} />
          </View>
          <View style={ch.headerUnderline} />
        </SafeAreaView>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[ch.body, { paddingBottom: insets.bottom + 130 }]}
          keyboardShouldPersistTaps="handled"
        >
          {/* ── Step Indicator ── */}
          <StepIndicator />

          {/* ── Order Summary Card (dark BRAND bg) ── */}
          <View style={ch.summaryCard}>
            <View style={ch.summaryCardTop}>
              <Ionicons name="bag-check-outline" size={16} color={a(WHITE, 0.85)} />
              <Text style={ch.summaryCardTitle}>Order Summary</Text>
            </View>

            {items.map(item => (
              <View key={String(item.cart_id)} style={ch.summaryItem}>
                <View style={ch.summaryDot} />
                <Text style={ch.summaryItemName} numberOfLines={1}>{item.title}</Text>
                <Text style={ch.summaryItemQty}>×{item.quantity}</Text>
                <Text style={ch.summaryItemPrice}>
                  {fmtMoney(item.currency, lineTotal(item))}
                </Text>
              </View>
            ))}

            <View style={ch.summaryDividerWhite} />

            <View style={ch.summaryTotalRow}>
              <Text style={ch.summaryTotalLabel}>Total</Text>
              <Text style={ch.summaryTotalAmount}>{fmtMoney(currency, grandTotal)}</Text>
            </View>
          </View>

          {/* ── Contact Info ── */}
          <View style={ch.sectionCard}>
            <SectionHeader icon="person-outline" title="Contact Info" />

            <View style={ch.rowInputs}>
              <Field label="First Name" required>
                <View style={{ flex: 1 }}>
                  <TextInput
                    style={inputStyle(firstName)}
                    placeholder="John"
                    placeholderTextColor={MUTED}
                    value={firstName}
                    onChangeText={v => { setFirstName(v); setError(''); }}
                    autoCapitalize="words"
                  />
                </View>
              </Field>
              <Field label="Last Name" required>
                <View style={{ flex: 1 }}>
                  <TextInput
                    style={inputStyle(lastName)}
                    placeholder="Doe"
                    placeholderTextColor={MUTED}
                    value={lastName}
                    onChangeText={v => { setLastName(v); setError(''); }}
                    autoCapitalize="words"
                  />
                </View>
              </Field>
            </View>

            <Field label="Email Address" required>
              <TextInput
                style={inputStyle(email)}
                placeholder="john@example.com"
                placeholderTextColor={MUTED}
                value={email}
                onChangeText={v => { setEmail(v); setError(''); }}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </Field>
          </View>

          {/* ── Delivery Address ── */}
          <View style={ch.sectionCard}>
            <SectionHeader icon="location-outline" title="Delivery Address" />

            <Field label="Street Address" required>
              <TextInput
                style={inputStyle(street)}
                placeholder="e.g. 12 Main Street, Flat 4"
                placeholderTextColor={MUTED}
                value={street}
                onChangeText={v => { setStreet(v); setError(''); }}
              />
            </Field>

            <Field label="City" required>
              <TextInput
                style={inputStyle(city)}
                placeholder="City"
                placeholderTextColor={MUTED}
                value={city}
                onChangeText={v => { setCity(v); setError(''); }}
              />
            </Field>

            <View style={ch.rowInputs}>
              <Field label="State / Province" optional>
                <View style={{ flex: 1 }}>
                  <TextInput
                    style={inputStyle(state)}
                    placeholder="State"
                    placeholderTextColor={MUTED}
                    value={state}
                    onChangeText={setState}
                  />
                </View>
              </Field>
              <Field label="Postcode" optional>
                <View style={{ flex: 1 }}>
                  <TextInput
                    style={inputStyle(postcode)}
                    placeholder="000000"
                    placeholderTextColor={MUTED}
                    value={postcode}
                    onChangeText={setPostcode}
                    keyboardType="number-pad"
                  />
                </View>
              </Field>
            </View>

            <Field label="Country" required>
              <CountryPicker
                countries={countries}
                selected={country}
                onSelect={c => { setCountry(c); setError(''); }}
                loading={loadingCountries}
              />
            </Field>

            <Field label="Phone Number" required>
              <TextInput
                style={inputStyle(phone)}
                placeholder="+234 000 000 0000"
                placeholderTextColor={MUTED}
                value={phone}
                onChangeText={v => { setPhone(v); setError(''); }}
                keyboardType="phone-pad"
              />
            </Field>
          </View>

          {/* ── Order Note ── */}
          <View style={ch.sectionCard}>
            <SectionHeader icon="chatbubble-ellipses-outline" title="Order Note" />
            <Field label="Special Instructions" optional>
              <TextInput
                style={[inputStyle(note), ch.inputMultiline]}
                placeholder="Any delivery instructions or special requests…"
                placeholderTextColor={MUTED}
                value={note}
                onChangeText={setNote}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />
            </Field>
          </View>

          {/* ── Payment Method ── */}
          <View style={ch.sectionCard}>
            <SectionHeader icon="card-outline" title="Payment Method" />

            {/* Paystack option */}
            <TouchableOpacity
              style={[ch.payOption, payMethod === 'paystack' && ch.payOptionActive]}
              onPress={() => setPayMethod('paystack')}
              activeOpacity={0.8}
            >
              <View style={[ch.payRadio, payMethod === 'paystack' && ch.payRadioActive]}>
                {payMethod === 'paystack' && <View style={ch.payRadioDot} />}
              </View>
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={[ch.payOptionLabel, payMethod === 'paystack' && ch.payOptionLabelActive]}>
                  Pay with Paystack
                </Text>
                <Text style={ch.payOptionSub}>Card · Bank Transfer · USSD</Text>
              </View>
              <Ionicons name="card-outline" size={22} color={payMethod === 'paystack' ? ACCENT : MUTED} />
            </TouchableOpacity>

            {/* Wallet option */}
            <TouchableOpacity
              style={[ch.payOption, payMethod === 'wallet' && ch.payOptionActive]}
              onPress={() => setPayMethod('wallet')}
              activeOpacity={0.8}
            >
              <View style={[ch.payRadio, payMethod === 'wallet' && ch.payRadioActive]}>
                {payMethod === 'wallet' && <View style={ch.payRadioDot} />}
              </View>
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={[ch.payOptionLabel, payMethod === 'wallet' && ch.payOptionLabelActive]}>
                  Hafrik Wallet
                </Text>
                {loadingWallet ? (
                  <ActivityIndicator size="small" color={MUTED} style={{ alignSelf: 'flex-start' }} />
                ) : (
                  <Text style={[ch.payOptionSub, walletBalance !== null && walletBalance >= grandTotal && { color: '#22c55e' }]}>
                    Balance: ¥{Number(walletBalance ?? 0).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    {walletBalance !== null && walletBalance < grandTotal ? ' — not enough' : ' — sufficient'}
                  </Text>
                )}
              </View>
              <Ionicons name="wallet-outline" size={22} color={payMethod === 'wallet' ? ACCENT : MUTED} />
            </TouchableOpacity>

            {/* Top-up prompt if wallet selected but balance low */}
            {payMethod === 'wallet' && walletBalance !== null && walletBalance < grandTotal && (
              <View style={ch.topupRow}>
                <Ionicons name="information-circle-outline" size={14} color={DANGER} />
                <Text style={ch.topupHint}>
                  Need ¥{Number(grandTotal - (walletBalance ?? 0)).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} more.
                </Text>
                <TouchableOpacity
                  style={ch.topupBtn}
                  onPress={() => setShowTopupSheet(true)}
                  activeOpacity={0.8}
                >
                  <Text style={ch.topupBtnTxt}>Top Up</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* ── Top-up sheet (inline) ── */}
          {showTopupSheet && (
            <View style={ch.topupSheet}>
              <View style={ch.topupSheetHeader}>
                <Text style={ch.topupSheetTitle}>Top Up Wallet</Text>
                <TouchableOpacity onPress={() => setShowTopupSheet(false)}>
                  <Ionicons name="close-circle" size={22} color={MUTED} />
                </TouchableOpacity>
              </View>
              <Text style={ch.topupSheetSub}>Enter amount in CNY (¥) to add to your Hafrik wallet</Text>
              <TextInput
                style={[ch.input, { borderColor: a(ACCENT, 0.5) }]}
                placeholder="e.g. 100"
                placeholderTextColor={MUTED}
                value={topupAmount}
                onChangeText={setTopupAmount}
                keyboardType="decimal-pad"
              />
              <TouchableOpacity
                style={[ch.topupConfirmBtn, toppingUp && { opacity: 0.65 }]}
                onPress={handleTopup}
                disabled={toppingUp}
                activeOpacity={0.86}
              >
                {toppingUp ? (
                  <ActivityIndicator size="small" color={WHITE} />
                ) : (
                  <>
                    <Ionicons name="arrow-up-circle-outline" size={17} color={WHITE} />
                    <Text style={ch.topupConfirmTxt}>Continue to Payment</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          )}

          {/* ── Security card ── */}
          <View style={ch.securityCard}>
            <View style={ch.securityIconWrap}>
              <Ionicons name="shield-checkmark" size={20} color={ACCENT} />
            </View>
            <Text style={ch.securityTxt}>
              Your payment is processed securely by Paystack. We never store your card details.
            </Text>
          </View>

          {/* ── Validation hint ── */}
          {!isFormValid && !error && (
            <View style={ch.hintRow}>
              <Ionicons name="information-circle-outline" size={14} color={MUTED} />
              <Text style={ch.hintTxt}>
                Name, email, street, city, country and phone are required.
              </Text>
            </View>
          )}

          {/* ── Error banner ── */}
          {!!error && (
            <View style={ch.errorBanner}>
              <Ionicons name="alert-circle-outline" size={16} color={DANGER} />
              <Text style={ch.errorBannerTxt}>{error}</Text>
            </View>
          )}
        </ScrollView>

        {/* ── Place Order Bar ── */}
        <View style={[ch.footer, { paddingBottom: insets.bottom + 10 }]}>
          <View style={ch.footerLeft}>
            <Text style={ch.footerLabel}>TOTAL</Text>
            <Text style={ch.footerAmount}>{fmtMoney(currency, grandTotal)}</Text>
          </View>
          <TouchableOpacity
            style={[ch.placeBtn, !canSubmit && ch.placeBtnDisabled]}
            onPress={handlePlaceOrder}
            disabled={!canSubmit}
            activeOpacity={0.86}
          >
            {placing ? (
              <ActivityIndicator size="small" color={WHITE} />
            ) : (
              <>
                <Ionicons name="checkmark-circle-outline" size={18} color={WHITE} />
                <Text style={ch.placeBtnTxt}>Place Order</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const ch = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },

  // ── Header ─────────────────────────────────────────────────────────────────
  headerRow: {
    height: 44, flexDirection: 'row',
    alignItems: 'center', paddingHorizontal: 14,
  },
  headerIconBtn: {
    width: 34, height: 34, borderRadius: 10,
    backgroundColor: a(WHITE, 0.1),
    borderWidth: 1, borderColor: a(WHITE, 0.14),
    alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: {
    flex: 1, textAlign: 'center',
    fontSize: 17, fontWeight: '900', color: WHITE, fontFamily: FONT_B,
  },
  headerUnderline: { height: 1, backgroundColor: a(ACCENT, 0.33) },

  // ── Body ───────────────────────────────────────────────────────────────────
  body: { paddingHorizontal: 14, paddingTop: 16, gap: 14 },

  // ── Step indicator ─────────────────────────────────────────────────────────
  stepsRow: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', paddingVertical: 6,
  },
  stepItem: { alignItems: 'center', gap: 5 },
  stepCircle: {
    width: 32, height: 32, borderRadius: 16,
    borderWidth: 2, borderColor: a(BRAND, 0.2),
    backgroundColor: BG,
    alignItems: 'center', justifyContent: 'center',
  },
  stepCircleActive: {
    backgroundColor: BRAND, borderColor: BRAND,
  },
  stepNum: {
    fontSize: 13, fontWeight: '900', color: MUTED, fontFamily: FONT_B,
  },
  stepNumActive: { color: WHITE },
  stepLabel: {
    fontSize: 10.5, color: MUTED, fontFamily: FONT_R,
    textAlign: 'center',
  },
  stepLabelActive: { color: BRAND, fontFamily: FONT_M, fontWeight: '700' },
  stepConnector: {
    flex: 1, height: 2,
    backgroundColor: a(BRAND, 0.15),
    marginBottom: 16, marginHorizontal: 4,
  },
  stepConnectorActive: { backgroundColor: BRAND },

  // ── Order summary card (dark BRAND bg) ─────────────────────────────────────
  summaryCard: {
    backgroundColor: BRAND, borderRadius: 18,
    padding: 18, gap: 10,
    shadowColor: BRAND, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18, shadowRadius: 12, elevation: 6,
  },
  summaryCardTop: {
    flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4,
  },
  summaryCardTitle: {
    fontSize: 14, fontWeight: '900', color: WHITE, fontFamily: FONT_B,
  },
  summaryItem: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
  },
  summaryDot: {
    width: 5, height: 5, borderRadius: 2.5,
    backgroundColor: ACCENT_LT, flexShrink: 0,
  },
  summaryItemName: {
    flex: 1, fontSize: 13, color: a(WHITE, 0.88), fontFamily: FONT_M,
  },
  summaryItemQty: { fontSize: 12, color: a(WHITE, 0.55), fontFamily: FONT_R },
  summaryItemPrice: {
    fontSize: 13, fontWeight: '700', color: ACCENT_LT, fontFamily: FONT_B,
    minWidth: 80, textAlign: 'right',
  },
  summaryDividerWhite: {
    height: 1, backgroundColor: a(WHITE, 0.12), marginVertical: 2,
  },
  summaryTotalRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  summaryTotalLabel: {
    fontSize: 14, fontWeight: '900', color: a(WHITE, 0.75), fontFamily: FONT_B,
  },
  summaryTotalAmount: {
    fontSize: 20, fontWeight: '900', color: WHITE, fontFamily: FONT_B,
  },

  // ── Section card ───────────────────────────────────────────────────────────
  sectionCard: {
    backgroundColor: WHITE, borderRadius: 18, padding: 16, gap: 14,
    shadowColor: BRAND, shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
  },
  sectionHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  sectionIconWrap: {
    width: 30, height: 30, borderRadius: 9,
    backgroundColor: BRAND,
    alignItems: 'center', justifyContent: 'center',
  },
  sectionTitle: {
    fontSize: 15, fontWeight: '900', color: DARK, fontFamily: FONT_B,
  },

  // ── Row inputs (side by side) ───────────────────────────────────────────────
  rowInputs: { flexDirection: 'row', gap: 10 },

  // ── Field group ────────────────────────────────────────────────────────────
  fieldGroup: { flex: 1, gap: 6 },
  fieldLabel: {
    fontSize: 11.5, fontWeight: '700', color: MUTED, fontFamily: FONT_M,
    textTransform: 'uppercase', letterSpacing: 0.4,
  },
  req: { color: DANGER },
  opt: { color: MUTED, fontWeight: '400', textTransform: 'none', letterSpacing: 0 },

  // ── Input ──────────────────────────────────────────────────────────────────
  input: {
    backgroundColor: BG, borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 13,
    fontSize: 14, color: DARK, fontFamily: FONT_R,
    borderWidth: 1.5, borderColor: a(BRAND, 0.2),
  },
  inputMultiline: { height: 88, paddingTop: 12 },

  // Dropdown trigger
  dropdownTrigger: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  dropdownTxt: { flex: 1, fontSize: 14, color: DARK, fontFamily: FONT_R },

  // ── Security card ──────────────────────────────────────────────────────────
  securityCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: a(ACCENT, 0.07), borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: a(ACCENT, 0.15),
  },
  securityIconWrap: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: a(ACCENT, 0.12),
    alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },
  securityTxt: {
    flex: 1, fontSize: 12.5, color: DARK, lineHeight: 18, fontFamily: FONT_R,
  },

  // ── Hint row ───────────────────────────────────────────────────────────────
  hintRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  hintTxt: { flex: 1, fontSize: 12, color: MUTED, fontFamily: FONT_R, lineHeight: 17 },

  // ── Error banner ───────────────────────────────────────────────────────────
  errorBanner: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
    backgroundColor: a(DANGER, 0.08), borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 12,
    borderWidth: 1, borderColor: a(DANGER, 0.18),
  },
  errorBannerTxt: { flex: 1, fontSize: 13, color: DANGER, fontFamily: FONT_R, lineHeight: 18 },

  // ── Footer bar ─────────────────────────────────────────────────────────────
  footer: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: WHITE, paddingHorizontal: 16, paddingTop: 14,
    borderTopWidth: 1, borderTopColor: a(BRAND, 0.08),
    shadowColor: '#000', shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08, shadowRadius: 16, elevation: 18,
  },
  footerLeft: { flex: 1 },
  footerLabel: {
    fontSize: 10, color: MUTED, fontFamily: FONT_R,
    letterSpacing: 0.8, textTransform: 'uppercase',
  },
  footerAmount: {
    fontSize: 21, fontWeight: '900', color: BRAND, fontFamily: FONT_B, marginTop: 1,
  },
  placeBtn: {
    flex: 1.3,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, backgroundColor: BRAND, borderRadius: 16, paddingVertical: 16,
  },
  placeBtnDisabled: { backgroundColor: a(MUTED, 0.5) },
  placeBtnTxt: {
    fontSize: 15, fontWeight: '900', color: WHITE, fontFamily: FONT_B,
  },

  // ── Payment method options ─────────────────────────────────────────────────
  payOption: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    borderWidth: 1.5, borderColor: a(BRAND, 0.14),
    borderRadius: 14, padding: 14,
    backgroundColor: BG,
  },
  payOptionActive: {
    borderColor: ACCENT, backgroundColor: a(ACCENT, 0.05),
  },
  payRadio: {
    width: 20, height: 20, borderRadius: 10,
    borderWidth: 2, borderColor: a(BRAND, 0.3),
    alignItems: 'center', justifyContent: 'center',
  },
  payRadioActive: { borderColor: ACCENT },
  payRadioDot:    { width: 10, height: 10, borderRadius: 5, backgroundColor: ACCENT },
  payOptionLabel: { fontSize: 14, fontWeight: '700', color: DARK, fontFamily: FONT_M },
  payOptionLabelActive: { color: BRAND, fontFamily: FONT_B },
  payOptionSub:   { fontSize: 12, color: MUTED, fontFamily: FONT_R },

  topupRow: {
    flexDirection: 'row', alignItems: 'center', gap: 7,
    backgroundColor: a(DANGER, 0.06), borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 10,
    borderWidth: 1, borderColor: a(DANGER, 0.15),
  },
  topupHint:   { flex: 1, fontSize: 12.5, color: DANGER, fontFamily: FONT_R },
  topupBtn:    { backgroundColor: DANGER, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6 },
  topupBtnTxt: { fontSize: 12.5, fontWeight: '800', color: WHITE, fontFamily: FONT_B },

  topupSheet: {
    backgroundColor: WHITE, borderRadius: 18, padding: 18, gap: 12,
    borderWidth: 1.5, borderColor: a(ACCENT, 0.25),
    shadowColor: BRAND, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 10, elevation: 4,
  },
  topupSheetHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  topupSheetTitle:  { fontSize: 15, fontWeight: '900', color: DARK, fontFamily: FONT_B },
  topupSheetSub:    { fontSize: 12.5, color: MUTED, fontFamily: FONT_R, lineHeight: 18 },
  topupConfirmBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: BRAND, borderRadius: 14, paddingVertical: 14,
  },
  topupConfirmTxt: { fontSize: 14, fontWeight: '900', color: WHITE, fontFamily: FONT_B },

  // ── Country modal ──────────────────────────────────────────────────────────
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: WHITE,
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    maxHeight: '82%', paddingTop: 6,
  },
  modalDragPill: {
    width: 38, height: 4, borderRadius: 2,
    backgroundColor: a(BRAND, 0.15),
    alignSelf: 'center', marginBottom: 4,
  },
  modalHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 18, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: a(BRAND, 0.07),
  },
  modalTitle: { fontSize: 17, fontWeight: '900', color: DARK, fontFamily: FONT_B },
  modalCloseBtn: {
    width: 32, height: 32, borderRadius: 10,
    backgroundColor: a(MUTED, 0.12),
    alignItems: 'center', justifyContent: 'center',
  },
  modalSearchBar: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    marginHorizontal: 14, marginVertical: 10,
    backgroundColor: BG, borderRadius: 12,
    paddingHorizontal: 12, paddingVertical: 10,
    borderWidth: 1.5, borderColor: a(BRAND, 0.12),
  },
  modalSearchInput: {
    flex: 1, fontSize: 14, color: DARK, fontFamily: FONT_R,
  },
  countryRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 18, paddingVertical: 13,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: a(BRAND, 0.06),
  },
  countryRowActive: { backgroundColor: a(BRAND, 0.05) },
  countryRowLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  countryCodeBadge: {
    width: 36, height: 24, borderRadius: 6,
    backgroundColor: a(BRAND, 0.08),
    alignItems: 'center', justifyContent: 'center',
  },
  countryCodeBadgeActive: { backgroundColor: BRAND },
  countryCodeTxt: {
    fontSize: 10.5, fontWeight: '800', color: BRAND, fontFamily: FONT_B,
  },
  countryName: { fontSize: 14, color: DARK, fontFamily: FONT_R },
});
