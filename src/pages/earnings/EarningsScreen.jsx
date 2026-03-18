// src/pages/earnings/EarningsScreen.jsx
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ActivityIndicator,
  ScrollView, RefreshControl, Animated, Modal, TextInput,
  KeyboardAvoidingView, Platform, Image, Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import * as Clipboard from 'expo-clipboard';

import { useAuth } from '../../AuthContext';
import { Colors } from '../../theme';
import AppDetails from '../../helpers/appdetails';
import { getWalletBalance } from '../../api/walletApi';

// ─── Constants ────────────────────────────────────────────────────────────────
const BRAND  = Colors.primaryDark;
const ACCENT = Colors.primary;
const BG     = '#F7F8FA';
const WHITE  = Colors.white;
const TEXT_H = Colors.black;
const TEXT_M = Colors.secondaryText;
const CARD   = Colors.white;
const GOLD   = Colors.star  ?? '#f59e0b';
const ORANGE = Colors.warm  ?? '#f4a535';
const GREEN  = Colors.success ?? '#22c55e';
const PURPLE = Colors.purple  ?? '#9c27b0';
const VIOLET = '#6d28d9';
const DANGER = '#ef4444';

const FONT_B = AppDetails?.fontFamily?.redex?.bold    ?? 'System';
const FONT_R = AppDetails?.fontFamily?.inter?.regular ?? 'System';
const FONT_M = AppDetails?.fontFamily?.inter?.medium  ?? 'System';

const fmtMoney  = (n) => `¥${Number(n ?? 0).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const fmtPoints = (n) => Number(n ?? 0).toLocaleString(undefined, { maximumFractionDigits: 0 });

const STEPS = { AMOUNT: 0, INSTRUCTIONS: 1, RECEIPT: 2, SUCCESS: 3 };
const STEP_LABELS = ['Amount', 'Instructions', 'Proof'];

const PAYMENT_API  = 'https://hafrik.com/api/v1/payment/create.php';
const UPLOAD_API   = 'https://hafrik.com/api/v1/uploads/media.php';
const SUBMIT_API   = 'https://hafrik.com/api/v1/payment/submit-payment.php';

// ─── Add Funds Modal ──────────────────────────────────────────────────────────
function AddFundsModal({ visible, onClose }) {
  const { token } = useAuth();

  const [step,      setStep]      = useState(STEPS.AMOUNT);
  const [amount,    setAmount]    = useState('');
  const [reference, setReference] = useState('');
  const [proof,     setProof]     = useState(null);   // local image asset
  const [proofUrl,  setProofUrl]  = useState('');     // remote URL after upload
  const [creating,  setCreating]  = useState(false);  // step 0 → 1 API call
  const [uploading, setUploading] = useState(false);  // image upload
  const [submitting,setSubmitting]= useState(false);  // final submit
  const [error,     setError]     = useState('');

  const [methods,        setMethods]        = useState([]);
  const [loadingMethods, setLoadingMethods] = useState(false);
  const [selectedMethod, setSelectedMethod] = useState(null);

  // ── Reset on close ──────────────────────────────────────────────────────────
  const reset = () => {
    setStep(STEPS.AMOUNT);
    setAmount('');
    setReference('');
    setProof(null);
    setProofUrl('');
    setError('');
    setCreating(false);
    setUploading(false);
    setSubmitting(false);
    setMethods([]);
    setSelectedMethod(null);
    setLoadingMethods(false);
  };
  const handleClose = () => { reset(); onClose(); };

  const handleBack = () => {
    // Only allow back from INSTRUCTIONS → AMOUNT (not from RECEIPT, prevents re-creating)
    if (step === STEPS.AMOUNT) { handleClose(); return; }
    if (step === STEPS.INSTRUCTIONS) { setStep(STEPS.AMOUNT); setError(''); return; }
    // RECEIPT step: just clear proof and stay (don't re-call create)
    if (step === STEPS.RECEIPT) { setProof(null); setProofUrl(''); setStep(STEPS.INSTRUCTIONS); setError(''); return; }
  };

  // ── STEP 0 → 1: Create payment request ─────────────────────────────────────
  const handleCreate = async () => {
    setError('');
    const val = Number(amount);
    if (!amount || isNaN(val) || val < 10) {
      setError('Minimum top-up amount is ¥10.00');
      return;
    }
    setCreating(true);
    try {
      const res  = await fetch(PAYMENT_API, {
        method:  'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body:    JSON.stringify({ amount: val }),
      });
      const json = await res.json().catch(() => ({}));
      if (json?.status === 'success' || json?.data?.reference) {
        setReference(json.data?.reference ?? '');
        // Confirm amount from server if provided
        if (json.data?.amount) setAmount(String(json.data.amount));
        setStep(STEPS.INSTRUCTIONS);
        fetchMethods();
      } else {
        setError(json?.message ?? json?.error ?? 'Could not create payment request. Please try again.');
      }
    } catch {
      setError('Network error. Please check your connection and try again.');
    }
    setCreating(false);
  };

  // ── Fetch payment gateways ──────────────────────────────────────────────────
  const fetchMethods = async () => {
    setLoadingMethods(true);
    try {
      const formData = new FormData();
      formData.append('get_gateways', '1');

      const res  = await fetch(PAYMENT_API, {
        method:  'POST',
        headers: { Authorization: `Bearer ${token}` },
        body:    formData,
      });
      const json = await res.json().catch(() => ({}));
      console.log('PAYMENT RESPONSE:', json);
      const list = Array.isArray(json?.data?.methods) ? json.data.methods : [];
      setMethods(list);
      if (list.length === 1) setSelectedMethod(list[0]);
    } catch (e) {
      console.log('PAYMENT RESPONSE ERROR:', e);
      setMethods([]);
    }
    setLoadingMethods(false);
  };

  // ── Copy reference to clipboard ─────────────────────────────────────────────
  const copyReference = async () => {
    try {
      await Clipboard.setStringAsync(reference);
      Alert.alert('Copied!', `Reference code "${reference}" copied to clipboard.`);
    } catch {
      Alert.alert('Reference Code', reference);
    }
  };

  // ── Pick proof image ────────────────────────────────────────────────────────
  const handlePickProof = async () => {
    setError('');
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) { setError('Photo library access is required to upload proof.'); return; }
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'], quality: 0.9, allowsEditing: false,
    });
    if (!res.canceled && res.assets?.[0]) {
      setProof(res.assets[0]);
      setProofUrl('');  // clear any previous upload
      setStep(STEPS.RECEIPT);
    }
  };

  // ── STEP 2: Upload image → Submit payment ───────────────────────────────────
  const handleSubmit = async () => {
    if (!proof) { setError('Please upload your payment proof first.'); return; }
    setError('');

    // 1. Upload image
    setUploading(true);
    let uploadedUrl = proofUrl;
    if (!uploadedUrl) {
      try {
        const fd = new FormData();
        fd.append('file', {
          uri:  proof.uri,
          type: proof.mimeType || 'image/jpeg',
          name: proof.fileName || `proof_${Date.now()}.jpg`,
        });
        fd.append('type', 'photo');

        const upRes  = await fetch(UPLOAD_API, {
          method:  'POST',
          headers: { Authorization: `Bearer ${token}` },
          body:    fd,
        });
        const upJson = await upRes.json().catch(() => ({}));
        uploadedUrl  = upJson?.data?.url ?? upJson?.url ?? '';
        if (!uploadedUrl) {
          setError('Image upload failed. Please try again.');
          setUploading(false);
          return;
        }
        setProofUrl(uploadedUrl);
      } catch {
        setError('Upload failed. Check your connection and try again.');
        setUploading(false);
        return;
      }
    }
    setUploading(false);

    // 2. Submit payment
    setSubmitting(true);
    try {
      const res  = await fetch(SUBMIT_API, {
        method:  'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          amount:    Number(amount),
          proof:     uploadedUrl,
          reference,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (json?.status === 'success' || res.ok) {
        setStep(STEPS.SUCCESS);
      } else {
        setError(json?.message ?? json?.error ?? 'Submission failed. Please try again.');
      }
    } catch {
      setError('Network error. Please check your connection and try again.');
    }
    setSubmitting(false);
  };

  const amtNum    = Number(amount) || 0;
  const isBusy    = creating || uploading || submitting;

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={handleClose}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={af.root}>

          {/* ── Header ── */}
          {step !== STEPS.SUCCESS && (
            <View style={af.header}>
              <TouchableOpacity style={af.headerBtn} onPress={handleBack} activeOpacity={0.8} disabled={isBusy}>
                <Ionicons name={step === STEPS.AMOUNT ? 'close' : 'arrow-back'} size={20} color={TEXT_H} />
              </TouchableOpacity>
              <Text style={af.headerTitle}>Add Funds</Text>
              <TouchableOpacity style={af.headerBtn} onPress={handleClose} activeOpacity={0.8} disabled={isBusy}>
                <Ionicons name="close" size={20} color={TEXT_H} />
              </TouchableOpacity>
            </View>
          )}

          {/* ── Progress dots ── */}
          {step < STEPS.SUCCESS && (
            <View style={af.progressWrap}>
              {STEP_LABELS.map((label, i) => (
                <View key={i} style={af.progressStep}>
                  <View style={[
                    af.progressDot,
                    i < step   && af.progressDotDone,
                    i === step && af.progressDotActive,
                  ]}>
                    {i < step
                      ? <Ionicons name="checkmark" size={10} color={WHITE} />
                      : <Text style={[af.progressDotTxt, i === step && { color: WHITE }]}>{i + 1}</Text>
                    }
                  </View>
                  {i < STEP_LABELS.length - 1 && (
                    <View style={[af.progressLine, i < step && { backgroundColor: ACCENT }]} />
                  )}
                </View>
              ))}
            </View>
          )}

          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={af.body}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >

            {/* ── STEP 0: Enter Amount ── */}
            {step === STEPS.AMOUNT && (
              <View style={af.stepWrap}>
                <Text style={af.stepTitle}>Enter Amount</Text>
                <Text style={af.stepSub}>How much would you like to add to your wallet?</Text>

                <View style={af.amountBox}>
                  <Text style={af.amountPrefix}>¥</Text>
                  <TextInput
                    style={af.amountInput}
                    value={amount}
                    onChangeText={t => setAmount(t.replace(/[^0-9.]/g, ''))}
                    placeholder="0.00"
                    placeholderTextColor={TEXT_M + '88'}
                    keyboardType="decimal-pad"
                    autoFocus
                    editable={!isBusy}
                  />
                </View>
                <Text style={af.amountHint}>Minimum top-up: ¥10.00</Text>

                <View style={af.quickAmounts}>
                  {['50', '100', '200', '500'].map(q => (
                    <TouchableOpacity
                      key={q}
                      style={[af.qAmt, amount === q && af.qAmtActive]}
                      onPress={() => setAmount(q)}
                      disabled={isBusy}
                    >
                      <Text style={[af.qAmtTxt, amount === q && { color: ACCENT }]}>¥{q}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

            {/* ── STEP 1: Payment Instructions ── */}
            {step === STEPS.INSTRUCTIONS && (
              <View style={af.stepWrap}>
                <Text style={af.stepTitle}>Complete Payment</Text>
                <Text style={af.stepSub}>Send payment using one of the methods below, then upload your proof.</Text>

                {/* Amount summary */}
                <View style={af.summaryCard}>
                  <View style={af.summaryRow}>
                    <Text style={af.summaryKey}>Amount</Text>
                    <Text style={af.summaryVal}>{fmtMoney(amtNum)}</Text>
                  </View>
                  <View style={af.summaryDivider} />
                  <View style={af.summaryRow}>
                    <Text style={af.summaryKey}>Reference</Text>
                    <Text style={[af.summaryVal, { color: ACCENT, fontSize: 13 }]}>{reference}</Text>
                  </View>
                  <View style={af.summaryDivider} />
                  <View style={af.summaryRow}>
                    <Text style={[af.summaryKey, { fontFamily: FONT_B, color: TEXT_H }]}>Total</Text>
                    <Text style={[af.summaryVal, { fontSize: 20, color: BRAND }]}>{fmtMoney(amtNum)}</Text>
                  </View>
                </View>

                {/* ── Payment methods (dynamic) ── */}
                {loadingMethods && (
                  <View style={af.methodsLoadingRow}>
                    <ActivityIndicator size="small" color={ACCENT} />
                    <Text style={af.methodsLoadingTxt}>Loading payment methods…</Text>
                  </View>
                )}

                {!loadingMethods && methods.length === 0 && (
                  <View style={[af.infoBox, { backgroundColor: DANGER + '10', borderColor: DANGER + '28' }]}>
                    <Ionicons name="warning-outline" size={15} color={DANGER} style={{ marginTop: 1 }} />
                    <Text style={[af.infoTxt, { color: DANGER }]}>
                      Payment is currently unavailable. Please try again later.
                    </Text>
                  </View>
                )}

                {!loadingMethods && methods.map(method => {
                  const isMulti    = methods.length > 1;
                  const isSelected = isMulti && selectedMethod?.id === method.id;
                  return (
                    <TouchableOpacity
                      key={method.id}
                      style={[af.methodCard, isSelected && af.methodCardActive]}
                      onPress={() => isMulti && setSelectedMethod(method)}
                      activeOpacity={isMulti ? 0.8 : 1}
                    >
                      <View style={{ flex: 1 }}>
                        {/* Title row with optional radio */}
                        <View style={af.methodTitleRow}>
                          {isMulti && (
                            <View style={[af.methodRadio, isSelected && af.methodRadioActive]}>
                              {isSelected && <View style={af.methodRadioDot} />}
                            </View>
                          )}
                          <View style={{ flex: 1 }}>
                            <Text style={af.methodTitle}>{method.name}</Text>
                            {!!method.description && (
                              <Text style={af.methodSub}>{method.description}</Text>
                            )}
                          </View>
                        </View>

                        {/* Manual payment details */}
                        {method.type === 'manual' && method.details && (
                          <View style={af.detailsCard}>
                            {!!method.details.bank_name && (
                              <View style={af.detailRow}>
                                <Text style={af.detailKey}>Bank / Platform</Text>
                                <Text style={af.detailVal}>{method.details.bank_name}</Text>
                              </View>
                            )}
                            {!!method.details.account_number && (
                              <>
                                <View style={af.detailsDivider} />
                                <View style={af.detailRow}>
                                  <Text style={af.detailKey}>Account Number</Text>
                                  <Text style={af.detailVal}>{method.details.account_number}</Text>
                                </View>
                              </>
                            )}
                            {!!method.details.account_name && (
                              <>
                                <View style={af.detailsDivider} />
                                <View style={af.detailRow}>
                                  <Text style={af.detailKey}>Account Name</Text>
                                  <Text style={af.detailVal}>{method.details.account_name}</Text>
                                </View>
                              </>
                            )}
                          </View>
                        )}

                        {/* Note / instructions highlight */}
                        {!!method.details?.note && (
                          <View style={[af.infoBox, { marginTop: 8 }]}>
                            <Ionicons name="information-circle-outline" size={14} color={ACCENT} style={{ marginTop: 1 }} />
                            <Text style={af.infoTxt}>{method.details.note}</Text>
                          </View>
                        )}
                      </View>
                    </TouchableOpacity>
                  );
                })}

                {/* Reference — copyable, shown once methods are loaded */}
                {!loadingMethods && methods.length > 0 && (
                  <>
                    <TouchableOpacity
                      style={af.refCopyBox}
                      onPress={copyReference}
                      activeOpacity={0.75}
                    >
                      <View style={{ flex: 1 }}>
                        <Text style={af.refCopyLabel}>Your Reference Code</Text>
                        <Text style={af.refCopyCode}>{reference}</Text>
                      </View>
                      <View style={af.refCopyBtn}>
                        <Ionicons name="copy-outline" size={16} color={ACCENT} />
                        <Text style={af.refCopyBtnTxt}>Copy</Text>
                      </View>
                    </TouchableOpacity>

                    <View style={[af.infoBox, { backgroundColor: ORANGE + '10', borderColor: ORANGE + '28' }]}>
                      <Ionicons name="warning-outline" size={15} color={ORANGE} style={{ marginTop: 1 }} />
                      <Text style={[af.infoTxt, { color: ORANGE }]}>
                        You MUST include this reference code in your payment remarks so we can identify your transaction.
                      </Text>
                    </View>
                  </>
                )}
              </View>
            )}

            {/* ── STEP 2: Upload Proof ── */}
            {step === STEPS.RECEIPT && (
              <View style={af.stepWrap}>
                <Text style={af.stepTitle}>Upload Proof</Text>
                <Text style={af.stepSub}>Take a screenshot of your payment confirmation and upload it below.</Text>

                {/* Preview */}
                <View style={af.receiptBox}>
                  {proof ? (
                    <Image source={{ uri: proof.uri }} style={af.receiptImg} resizeMode="cover" />
                  ) : (
                    <View style={af.receiptPlaceholder}>
                      <Ionicons name="cloud-upload-outline" size={44} color={TEXT_M + '70'} />
                      <Text style={af.receiptTxt}>No image selected</Text>
                    </View>
                  )}
                </View>

                <TouchableOpacity style={af.changeImgBtn} onPress={handlePickProof} activeOpacity={0.85} disabled={isBusy}>
                  <Ionicons name={proof ? 'refresh-outline' : 'image-outline'} size={16} color={ACCENT} />
                  <Text style={af.changeImgTxt}>{proof ? 'Change Image' : 'Select Image'}</Text>
                </TouchableOpacity>

                {/* Summary recap */}
                <View style={[af.summaryCard, { marginTop: 16 }]}>
                  <View style={af.summaryRow}>
                    <Text style={af.summaryKey}>Amount</Text>
                    <Text style={af.summaryVal}>{fmtMoney(amtNum)}</Text>
                  </View>
                  <View style={af.summaryDivider} />
                  <View style={af.summaryRow}>
                    <Text style={af.summaryKey}>Reference</Text>
                    <Text style={[af.summaryVal, { color: ACCENT, fontSize: 13 }]}>{reference}</Text>
                  </View>
                </View>

                {uploading && (
                  <View style={af.uploadingRow}>
                    <ActivityIndicator size="small" color={ACCENT} />
                    <Text style={af.uploadingTxt}>Uploading image…</Text>
                  </View>
                )}
              </View>
            )}

            {/* ── STEP 3: Success ── */}
            {step === STEPS.SUCCESS && (
              <View style={af.successWrap}>
                <LinearGradient colors={[GREEN + '20', GREEN + '08']} style={af.successCircle}>
                  <Ionicons name="checkmark-circle" size={72} color={GREEN} />
                </LinearGradient>
                <Text style={af.successTitle}>Payment Submitted!</Text>
                <Text style={af.successMsg}>
                  Your payment proof has been received and is under review.
                  Funds will be credited to your wallet within 24 hours.
                </Text>
                <View style={af.statusPill}>
                  <View style={af.statusDot} />
                  <Text style={af.statusTxt}>Status: Pending</Text>
                </View>
                <View style={af.successCard}>
                  <View style={af.summaryRow}>
                    <Text style={af.summaryKey}>Amount</Text>
                    <Text style={af.summaryVal}>{fmtMoney(amtNum)}</Text>
                  </View>
                  <View style={af.summaryDivider} />
                  <View style={af.summaryRow}>
                    <Text style={af.summaryKey}>Reference</Text>
                    <Text style={[af.summaryVal, { color: ACCENT, fontSize: 13 }]}>{reference}</Text>
                  </View>
                </View>
              </View>
            )}

          </ScrollView>

          {/* ── Footer CTA ── */}
          <View style={af.footer}>
            {!!error && (
              <View style={af.errorRow}>
                <Ionicons name="alert-circle-outline" size={15} color={DANGER} />
                <Text style={af.errorTxt}>{error}</Text>
              </View>
            )}

            {step === STEPS.SUCCESS && (
              <TouchableOpacity style={af.ctaBtn} onPress={handleClose} activeOpacity={0.88}>
                <Text style={af.ctaBtnTxt}>Done</Text>
              </TouchableOpacity>
            )}

            {step === STEPS.RECEIPT && (
              <TouchableOpacity
                style={[af.ctaBtn, (!proof || isBusy) && af.ctaBtnDisabled]}
                onPress={handleSubmit}
                disabled={!proof || isBusy}
                activeOpacity={0.88}
              >
                {submitting || uploading
                  ? <ActivityIndicator color={WHITE} />
                  : <>
                      <Text style={af.ctaBtnTxt}>Submit Payment</Text>
                      <Ionicons name="checkmark" size={16} color={WHITE} style={{ marginLeft: 6 }} />
                    </>
                }
              </TouchableOpacity>
            )}

            {step === STEPS.INSTRUCTIONS && (() => {
              const canProceed = !loadingMethods && methods.length > 0 &&
                (methods.length === 1 || !!selectedMethod);
              return (
                <TouchableOpacity
                  style={[af.ctaBtn, !canProceed && af.ctaBtnDisabled]}
                  onPress={handlePickProof}
                  activeOpacity={0.88}
                  disabled={!canProceed}
                >
                  {loadingMethods
                    ? <ActivityIndicator color={WHITE} />
                    : <>
                        <Ionicons name="cloud-upload-outline" size={17} color={WHITE} />
                        <Text style={af.ctaBtnTxt}>Upload Proof</Text>
                      </>
                  }
                </TouchableOpacity>
              );
            })()}

            {step === STEPS.AMOUNT && (
              <TouchableOpacity
                style={[af.ctaBtn, (isBusy || !amount) && af.ctaBtnDisabled]}
                onPress={handleCreate}
                disabled={isBusy || !amount}
                activeOpacity={0.88}
              >
                {creating
                  ? <ActivityIndicator color={WHITE} />
                  : <>
                      <Text style={af.ctaBtnTxt}>Continue</Text>
                      <Ionicons name="arrow-forward" size={16} color={WHITE} style={{ marginLeft: 6 }} />
                    </>
                }
              </TouchableOpacity>
            )}
          </View>

        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── Account card ─────────────────────────────────────────────────────────────
const AccountCard = ({ accentColor, icon, label, value, sub, onPress }) => (
  <TouchableOpacity style={cs.accCard} onPress={onPress} activeOpacity={0.88}>
    <View style={[cs.accIconWrap, { backgroundColor: accentColor + '18' }]}>
      <Ionicons name={icon} size={22} color={accentColor} />
    </View>
    <View style={cs.accMid}>
      <Text style={cs.accLabel}>{label}</Text>
      <Text style={cs.accValue}>{value}</Text>
      <Text style={cs.accSub}>{sub}</Text>
    </View>
    <Ionicons name="chevron-forward" size={16} color={TEXT_M + '60'} />
  </TouchableOpacity>
);

// ─────────────────────────────────────────────────────────────────────────────
export default function EarningsScreen() {
  const navigation = useNavigation();
  const { token, user } = useAuth();
  const insets     = useSafeAreaInsets();

  const [balance,         setBalance]         = useState(null);
  const [loading,         setLoading]         = useState(true);
  const [refreshing,      setRefreshing]      = useState(false);
  const [addFundsVisible, setAddFundsVisible] = useState(false);

  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(32)).current;

  const fetchData = useCallback(async () => {
    try {
      const json = await getWalletBalance(token);
      if (json?.status === 'success') setBalance(json.data);
    } catch { /* silent */ }
    setLoading(false);
  }, [token]);

  useEffect(() => {
    fetchData().then(() => {
      Animated.parallel([
        Animated.timing(fadeAnim,  { toValue: 1, duration: 500, useNativeDriver: true }),
        Animated.spring(slideAnim, { toValue: 0, friction: 7, tension: 80, useNativeDriver: true }),
      ]).start();
    });
  }, [fetchData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  }, [fetchData]);

  const walletBal    = Number(balance?.wallet_balance    ?? 0);
  const affiliateBal = Number(balance?.affiliate_balance ?? 0);
  const pointsBal    = Number(balance?.points            ?? 0);
  const pointsValue  = pointsBal / 1000;
  const totalValue   = walletBal + affiliateBal + pointsValue;
  const totalReferrals = balance?.total_referrals ?? 0;

  return (
    <View style={cs.root}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={ACCENT} />}
      >
        {loading ? (
          <LinearGradient
            colors={[BRAND, '#1a237e']}
            style={[cs.hero, { paddingTop: insets.top + 8 }]}
          >
            <View style={cs.heroNav}>
              <TouchableOpacity onPress={() => navigation.goBack()} style={cs.heroBack} activeOpacity={0.85}>
                <Ionicons name="arrow-back" size={20} color={WHITE} />
              </TouchableOpacity>
              <Text style={cs.heroNavTitle}>Earnings</Text>
              <View style={{ width: 38 }} />
            </View>
            <ActivityIndicator color={WHITE + 'CC'} size="large" style={{ marginTop: 40, marginBottom: 40 }} />
          </LinearGradient>
        ) : (
          <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>

            {/* ── Hero = header + balance (merged) ── */}
            <LinearGradient
              colors={[BRAND, '#1a237e', BRAND + 'F0']}
              style={[cs.hero, { paddingTop: insets.top + 8 }]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <View style={cs.heroOrb1} />
              <View style={cs.heroOrb2} />

              {/* Nav row */}
              <View style={cs.heroNav}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={cs.heroBack} activeOpacity={0.85}>
                  <Ionicons name="arrow-back" size={20} color={WHITE} />
                </TouchableOpacity>
                <Text style={cs.heroNavTitle}>Earnings</Text>
                <View style={{ width: 38 }} />
              </View>

              <Text style={cs.heroEyebrow}>TOTAL BALANCE</Text>
              <Text style={cs.heroAmount}>{fmtMoney(totalValue)}</Text>

              {/* Breakdown row */}
              <View style={cs.breakdownRow}>
                <View style={cs.breakdownItem}>
                  <Ionicons name="wallet-outline" size={11} color={WHITE + '90'} />
                  <Text style={cs.breakdownKey}>Wallet</Text>
                  <Text style={cs.breakdownVal}>{fmtMoney(walletBal)}</Text>
                </View>
                <View style={cs.breakdownSep} />
                <View style={cs.breakdownItem}>
                  <Ionicons name="star-outline" size={11} color={WHITE + '90'} />
                  <Text style={cs.breakdownKey}>Points</Text>
                  <Text style={cs.breakdownVal}>{fmtMoney(pointsValue)}</Text>
                </View>
                <View style={cs.breakdownSep} />
                <View style={cs.breakdownItem}>
                  <Ionicons name="git-network-outline" size={11} color={WHITE + '90'} />
                  <Text style={cs.breakdownKey}>Affiliates</Text>
                  <Text style={cs.breakdownVal}>{fmtMoney(affiliateBal)}</Text>
                </View>
              </View>

              {/* Action buttons */}
              <View style={cs.actionRow}>
                <TouchableOpacity style={cs.actionBtn} onPress={() => setAddFundsVisible(true)} activeOpacity={0.85}>
                  <View style={cs.actionBtnIcon}>
                    <Ionicons name="add" size={18} color={BRAND} />
                  </View>
                  <Text style={cs.actionBtnTxt}>Add Funds</Text>
                </TouchableOpacity>

                <TouchableOpacity style={cs.actionBtn} onPress={() => navigation.navigate('SendMoneyScreen')} activeOpacity={0.85}>
                  <View style={cs.actionBtnIcon}>
                    <Ionicons name="send" size={16} color={BRAND} />
                  </View>
                  <Text style={cs.actionBtnTxt}>Send</Text>
                </TouchableOpacity>

                <TouchableOpacity style={cs.actionBtn} onPress={() => navigation.navigate('WalletScreen')} activeOpacity={0.85}>
                  <View style={cs.actionBtnIcon}>
                    <Ionicons name="download" size={18} color={BRAND} />
                  </View>
                  <Text style={cs.actionBtnTxt}>Withdraw</Text>
                </TouchableOpacity>
              </View>
            </LinearGradient>

            {/* ── My Accounts ── */}
            <View style={cs.sectionLabel}>
              <View style={cs.sectionAccent} />
              <Text style={cs.sectionTxt}>MY ACCOUNTS</Text>
            </View>

            <AccountCard
              accentColor={GOLD}
              icon="star"
              label="Points"
              value={`${fmtPoints(pointsBal)} pts`}
              sub={`≈ ${fmtMoney(pointsValue)} · Earn from daily activity`}
              onPress={() => navigation.navigate('PointsScreen', { points: pointsBal })}
            />
            <AccountCard
              accentColor={GREEN}
              icon="wallet"
              label="Wallet"
              value={fmtMoney(walletBal)}
              sub="Send · Withdraw · Receive"
              onPress={() => navigation.navigate('WalletScreen')}
            />
            <AccountCard
              accentColor={PURPLE}
              icon="git-network"
              label="Affiliates"
              value={fmtMoney(affiliateBal)}
              sub={`${totalReferrals} referral${totalReferrals !== 1 ? 's' : ''} · Earn from invites`}
              onPress={() => navigation.navigate('AffiliatesScreen')}
            />

            {/* ── How You Earn ── */}
            <View style={cs.sectionLabel}>
              <View style={cs.sectionAccent} />
              <Text style={cs.sectionTxt}>HOW YOU EARN</Text>
            </View>

            <View style={cs.earnCard}>
              {/* A — Points */}
              <View style={cs.earnItem}>
                <View style={[cs.earnIconWrap, { backgroundColor: GOLD + '18' }]}>
                  <Ionicons name="star" size={18} color={GOLD} />
                </View>
                <View style={cs.earnContent}>
                  <Text style={cs.earnTitle}>Earn Points</Text>
                  <Text style={cs.earnDesc}>Earn points by interacting on Hafrik.</Text>
                  <View style={cs.earnPills}>
                    {['Post +5', 'Comment +5', 'React +5', 'Views +0.001'].map((p, i) => (
                      <View key={i} style={[cs.earnPill, { backgroundColor: GOLD + '15' }]}>
                        <Text style={[cs.earnPillTxt, { color: GOLD }]}>{p}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              </View>

              <View style={cs.earnDivider} />

              {/* B — Conversion */}
              <View style={cs.earnItem}>
                <View style={[cs.earnIconWrap, { backgroundColor: GREEN + '18' }]}>
                  <Ionicons name="swap-horizontal" size={18} color={GREEN} />
                </View>
                <View style={cs.earnContent}>
                  <Text style={cs.earnTitle}>Points to Money</Text>
                  <Text style={cs.earnDesc}>Points automatically convert into money value.</Text>
                  <View style={[cs.earnHighlight, { backgroundColor: GREEN + '12', borderColor: GREEN + '30' }]}>
                    <Text style={[cs.earnHighlightTxt, { color: GREEN }]}>1,000 points = ¥1.00</Text>
                  </View>
                </View>
              </View>

              <View style={cs.earnDivider} />

              {/* C — Daily Limit */}
              <View style={cs.earnItem}>
                <View style={[cs.earnIconWrap, { backgroundColor: ACCENT + '18' }]}>
                  <Ionicons name="time-outline" size={18} color={ACCENT} />
                </View>
                <View style={cs.earnContent}>
                  <Text style={cs.earnTitle}>Daily Limit</Text>
                  <Text style={cs.earnDesc}>
                    You can earn up to 10,000 points per day. Resets 24 hours after your last activity.
                  </Text>
                  <View style={[cs.earnHighlight, { backgroundColor: ACCENT + '10', borderColor: ACCENT + '28' }]}>
                    <Text style={[cs.earnHighlightTxt, { color: ACCENT }]}>Max: 10,000 pts / day</Text>
                  </View>
                </View>
              </View>

              <View style={cs.earnDivider} />

              {/* D — Affiliates */}
              <View style={cs.earnItem}>
                <View style={[cs.earnIconWrap, { backgroundColor: PURPLE + '18' }]}>
                  <Ionicons name="git-network" size={18} color={PURPLE} />
                </View>
                <View style={cs.earnContent}>
                  <Text style={cs.earnTitle}>Refer & Earn</Text>
                  <Text style={cs.earnDesc}>Earn when users sign up using your referral link.</Text>
                  <View style={cs.earnPills}>
                    {[
                      { label: 'Level 1  ¥0.15', color: PURPLE },
                      { label: 'Level 2  ¥0.10', color: VIOLET },
                      { label: 'Level 3  ¥0.05', color: '#4a1d96' },
                    ].map((lv, i) => (
                      <View key={i} style={[cs.earnPill, { backgroundColor: lv.color + '15' }]}>
                        <Text style={[cs.earnPillTxt, { color: lv.color }]}>{lv.label}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              </View>

              <View style={cs.earnDivider} />

              {/* E — Withdraw */}
              <View style={[cs.earnItem, { paddingBottom: 0 }]}>
                <View style={[cs.earnIconWrap, { backgroundColor: TEXT_M + '14' }]}>
                  <Ionicons name="download-outline" size={18} color={TEXT_M} />
                </View>
                <View style={cs.earnContent}>
                  <Text style={cs.earnTitle}>Withdraw Earnings</Text>
                  <Text style={cs.earnDesc}>
                    Transfer your earnings to your wallet or withdraw to your bank anytime.
                  </Text>
                </View>
              </View>
            </View>

            {/* ── Smart Tips ── */}
            <View style={cs.sectionLabel}>
              <View style={cs.sectionAccent} />
              <Text style={cs.sectionTxt}>TIPS TO EARN MORE</Text>
            </View>

            <View style={cs.tipsCard}>
              {[
                { icon: 'calendar-outline',  color: ACCENT,  text: 'Post consistently to increase your visibility and daily points' },
                { icon: 'chatbubbles-outline', color: GREEN,  text: 'Engage with others — comments and reactions both earn points' },
                { icon: 'share-social-outline', color: PURPLE, text: 'Share your referral link on social media to grow your network' },
                { icon: 'videocam-outline',   color: GOLD,   text: 'Create reels — trending video content earns bonus rewards' },
              ].map((tip, i) => (
                <View key={i} style={[cs.tipRow, i > 0 && { borderTopWidth: 1, borderTopColor: '#F2F2F2' }]}>
                  <View style={[cs.tipIcon, { backgroundColor: tip.color + '14' }]}>
                    <Ionicons name={tip.icon} size={15} color={tip.color} />
                  </View>
                  <Text style={cs.tipText}>{tip.text}</Text>
                </View>
              ))}
            </View>

          </Animated.View>
        )}
      </ScrollView>

      <AddFundsModal
        visible={addFundsVisible}
        onClose={() => setAddFundsVisible(false)}
        userId={user?.id}
      />
    </View>
  );
}

// ─── Main Styles ──────────────────────────────────────────────────────────────
const cs = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },

  // Hero (merged header + balance card)
  hero: {
    paddingHorizontal: 22, paddingBottom: 28, overflow: 'hidden',
    borderBottomLeftRadius: 28, borderBottomRightRadius: 28,
    shadowColor: BRAND, shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.28, shadowRadius: 20, elevation: 12,
  },
  heroNav: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: 20,
  },
  heroBack: {
    width: 38, height: 38, borderRadius: 13,
    backgroundColor: WHITE + '1A', alignItems: 'center', justifyContent: 'center',
  },
  heroNavTitle: { fontSize: 16, fontWeight: '900', color: WHITE, fontFamily: FONT_B },
  heroOrb1: { position: 'absolute', width: 220, height: 220, borderRadius: 110, backgroundColor: WHITE + '07', top: -60, right: -50 },
  heroOrb2: { position: 'absolute', width: 130, height: 130, borderRadius: 65, backgroundColor: WHITE + '05', bottom: -40, left: -30 },
  heroEyebrow: { fontSize: 10, color: WHITE + '90', fontWeight: '700', letterSpacing: 1.5, textTransform: 'uppercase', fontFamily: FONT_R },
  heroAmount:  { fontSize: 42, fontWeight: '900', color: WHITE, fontFamily: FONT_B, letterSpacing: -2, marginTop: 4, marginBottom: 14 },

  // Breakdown
  breakdownRow:  { flexDirection: 'row', backgroundColor: WHITE + '10', borderRadius: 14, padding: 12, marginBottom: 18, gap: 0 },
  breakdownItem: { flex: 1, alignItems: 'center', gap: 3 },
  breakdownSep:  { width: 1, backgroundColor: WHITE + '20', marginVertical: 4 },
  breakdownKey:  { fontSize: 10, color: WHITE + '80', fontFamily: FONT_R, marginTop: 1 },
  breakdownVal:  { fontSize: 13, fontWeight: '800', color: WHITE, fontFamily: FONT_B },

  // Action buttons
  actionRow: { flexDirection: 'row', gap: 10 },
  actionBtn: { flex: 1, alignItems: 'center', gap: 7 },
  actionBtnIcon: {
    width: 48, height: 48, borderRadius: 16,
    backgroundColor: WHITE, alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 6,
  },
  actionBtnTxt: { fontSize: 11, fontWeight: '700', color: WHITE, fontFamily: FONT_M },

  // Section label
  sectionLabel: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 20, marginTop: 24, marginBottom: 10 },
  sectionAccent: { width: 3, height: 14, borderRadius: 2, backgroundColor: ACCENT },
  sectionTxt:    { fontSize: 11, fontWeight: '800', color: TEXT_M, letterSpacing: 1.4, fontFamily: FONT_B },

  // Account cards
  accCard: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    marginHorizontal: 16, marginBottom: 10,
    backgroundColor: CARD, borderRadius: 18,
    padding: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 10, elevation: 2,
  },
  accIconWrap: { width: 46, height: 46, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  accMid:      { flex: 1 },
  accLabel:    { fontSize: 10.5, fontWeight: '700', color: TEXT_M, textTransform: 'uppercase', letterSpacing: 0.5, fontFamily: FONT_B, marginBottom: 2 },
  accValue:    { fontSize: 20, fontWeight: '900', color: TEXT_H, fontFamily: FONT_B, letterSpacing: -0.5 },
  accSub:      { fontSize: 11.5, color: TEXT_M, fontFamily: FONT_R, marginTop: 2 },

  // How You Earn card
  earnCard: {
    marginHorizontal: 16, marginBottom: 8,
    backgroundColor: CARD, borderRadius: 20,
    paddingTop: 4, paddingBottom: 18,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04, shadowRadius: 10, elevation: 2,
  },
  earnItem:    { flexDirection: 'row', gap: 14, paddingHorizontal: 18, paddingVertical: 16 },
  earnDivider: { height: 1, backgroundColor: '#F2F2F2', marginHorizontal: 18 },
  earnIconWrap:{ width: 40, height: 40, borderRadius: 13, alignItems: 'center', justifyContent: 'center', marginTop: 2 },
  earnContent: { flex: 1, gap: 6 },
  earnTitle:   { fontSize: 14, fontWeight: '800', color: TEXT_H, fontFamily: FONT_B },
  earnDesc:    { fontSize: 12.5, color: TEXT_M, fontFamily: FONT_R, lineHeight: 18 },
  earnPills:   { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 2 },
  earnPill:    { borderRadius: 8, paddingHorizontal: 9, paddingVertical: 4 },
  earnPillTxt: { fontSize: 11, fontWeight: '700', fontFamily: FONT_M },
  earnHighlight: {
    alignSelf: 'flex-start', borderRadius: 10, borderWidth: 1,
    paddingHorizontal: 12, paddingVertical: 6, marginTop: 2,
  },
  earnHighlightTxt: { fontSize: 13, fontWeight: '800', fontFamily: FONT_B },

  // Smart Tips card
  tipsCard: {
    marginHorizontal: 16, marginBottom: 8,
    backgroundColor: CARD, borderRadius: 18,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04, shadowRadius: 10, elevation: 2,
    overflow: 'hidden',
  },
  tipRow:  { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16 },
  tipIcon: { width: 34, height: 34, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  tipText: { flex: 1, fontSize: 13, color: TEXT_H, lineHeight: 18, fontFamily: FONT_R },
});

// ─── AddFunds Modal Styles ────────────────────────────────────────────────────
const af = StyleSheet.create({
  root: { flex: 1, backgroundColor: WHITE },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: Platform.OS === 'ios' ? 56 : 16, paddingBottom: 12,
    borderBottomWidth: 1, borderBottomColor: '#F0F0F0',
  },
  headerBtn:   { width: 36, height: 36, borderRadius: 12, backgroundColor: '#F7F8FA', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 16, fontWeight: '900', color: TEXT_H, fontFamily: FONT_B },

  // Progress
  progressWrap: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16 },
  progressStep: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  progressDot:  {
    width: 22, height: 22, borderRadius: 11,
    borderWidth: 2, borderColor: '#E0E0E0',
    backgroundColor: WHITE,
    alignItems: 'center', justifyContent: 'center',
  },
  progressDotActive: { borderColor: ACCENT, backgroundColor: ACCENT },
  progressDotDone:   { borderColor: GREEN, backgroundColor: GREEN },
  progressDotTxt:    { fontSize: 10, fontWeight: '800', color: TEXT_M, fontFamily: FONT_B },
  progressLine: { flex: 1, height: 2, backgroundColor: '#E0E0E0', marginHorizontal: 4 },

  body: { padding: 20, paddingBottom: 10 },
  stepWrap: { gap: 0 },
  stepTitle: { fontSize: 22, fontWeight: '900', color: TEXT_H, fontFamily: FONT_B, marginBottom: 6 },
  stepSub:   { fontSize: 13.5, color: TEXT_M, fontFamily: FONT_R, marginBottom: 24, lineHeight: 20 },

  // Amount
  amountBox: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#F7F8FA', borderRadius: 18,
    borderWidth: 2, borderColor: ACCENT + '40',
    paddingHorizontal: 20, paddingVertical: 16, marginBottom: 10,
  },
  amountPrefix: { fontSize: 28, fontWeight: '900', color: BRAND, fontFamily: FONT_B, marginRight: 6 },
  amountInput:  { flex: 1, fontSize: 36, fontWeight: '900', color: TEXT_H, fontFamily: FONT_B, padding: 0 },
  amountHint:   { fontSize: 12, color: TEXT_M, fontFamily: FONT_R, marginBottom: 18 },
  quickAmounts: { flexDirection: 'row', gap: 10, flexWrap: 'wrap' },
  qAmt:         { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 12, borderWidth: 1.5, borderColor: '#E0E0E0', backgroundColor: WHITE },
  qAmtActive:   { borderColor: ACCENT, backgroundColor: ACCENT + '10' },
  qAmtTxt:      { fontSize: 14, fontWeight: '700', color: TEXT_M, fontFamily: FONT_M },

  // Summary
  summaryCard: {
    backgroundColor: '#F7F8FA', borderRadius: 18, overflow: 'hidden', marginBottom: 16,
  },
  summaryRow:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 18, paddingVertical: 16 },
  summaryDivider: { height: 1, backgroundColor: '#EBEBEB' },
  summaryKey:     { fontSize: 14, color: TEXT_M, fontFamily: FONT_R },
  summaryVal:     { fontSize: 16, fontWeight: '800', color: TEXT_H, fontFamily: FONT_B },

  // Info box
  infoBox: {
    flexDirection: 'row', gap: 10, alignItems: 'flex-start',
    backgroundColor: ACCENT + '10', borderRadius: 12,
    borderWidth: 1, borderColor: ACCENT + '25',
    padding: 14,
  },
  infoTxt: { flex: 1, fontSize: 12.5, color: ACCENT, fontFamily: FONT_R, lineHeight: 18 },

  // Methods loading / empty
  methodsLoadingRow: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 18, justifyContent: 'center' },
  methodsLoadingTxt: { fontSize: 13, color: TEXT_M, fontFamily: FONT_R },

  // Methods
  methodCard: {
    backgroundColor: WHITE, borderRadius: 16, padding: 16,
    borderWidth: 2, borderColor: '#E8E8E8', marginBottom: 12,
  },
  methodCardActive:  { borderColor: ACCENT, backgroundColor: ACCENT + '06' },
  methodTitleRow:    { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 10 },
  methodTitle:       { fontSize: 15, fontWeight: '800', color: TEXT_H, fontFamily: FONT_B },
  methodSub:         { fontSize: 12, color: TEXT_M, fontFamily: FONT_R, marginTop: 3 },
  methodRadio:       { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: '#DDD', alignItems: 'center', justifyContent: 'center', marginTop: 2 },
  methodRadioActive: { borderColor: ACCENT },
  methodRadioDot:    { width: 10, height: 10, borderRadius: 5, backgroundColor: ACCENT },

  // Bank details
  detailsCard:    { backgroundColor: '#F7F8FA', borderRadius: 14, overflow: 'hidden', marginBottom: 0, borderWidth: 1, borderColor: '#EBEBEB' },
  detailsDivider: { height: 1, backgroundColor: '#EBEBEB' },
  detailRow:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 12 },
  detailKey:      { fontSize: 12, color: TEXT_M, fontFamily: FONT_R },
  detailVal:      { fontSize: 13, fontWeight: '700', color: TEXT_H, fontFamily: FONT_B, maxWidth: '60%', textAlign: 'right' },

  // Reference copy box
  refCopyBox: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: ACCENT + '08', borderRadius: 14,
    borderWidth: 1.5, borderColor: ACCENT + '30',
    paddingHorizontal: 16, paddingVertical: 14,
    marginBottom: 10,
  },
  refCopyLabel:  { fontSize: 11, color: TEXT_M, fontFamily: FONT_R, marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.6 },
  refCopyCode:   { fontSize: 18, fontWeight: '900', color: BRAND, fontFamily: FONT_B, letterSpacing: 1 },
  refCopyBtn:    { flexDirection: 'row', alignItems: 'center', gap: 4, paddingLeft: 12 },
  refCopyBtnTxt: { fontSize: 12, fontWeight: '700', color: ACCENT, fontFamily: FONT_M },

  // Change image
  changeImgBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'center', paddingVertical: 8, paddingHorizontal: 14, marginBottom: 4 },
  changeImgTxt: { fontSize: 13, fontWeight: '700', color: ACCENT, fontFamily: FONT_M },

  // Uploading row
  uploadingRow: { flexDirection: 'row', alignItems: 'center', gap: 8, justifyContent: 'center', marginTop: 12 },
  uploadingTxt: { fontSize: 13, color: TEXT_M, fontFamily: FONT_R },

  // Receipt
  receiptBox: {
    borderRadius: 18, borderWidth: 2, borderColor: '#E0E0E0',
    borderStyle: 'dashed', overflow: 'hidden',
    backgroundColor: '#F7F8FA', marginBottom: 12,
    minHeight: 180,
  },
  receiptImg: { width: '100%', height: 220 },
  receiptPlaceholder: { flex: 1, minHeight: 180, alignItems: 'center', justifyContent: 'center', gap: 10 },
  receiptTxt: { fontSize: 14, fontWeight: '700', color: TEXT_M, fontFamily: FONT_M },
  receiptSub: { fontSize: 12, color: TEXT_M + 'AA', fontFamily: FONT_R },
  reUploadBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'center' },
  reUploadTxt: { fontSize: 13, color: ACCENT, fontFamily: FONT_M, fontWeight: '700' },

  // Status pill
  statusPill: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: ORANGE + '18', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 7 },
  statusDot:  { width: 8, height: 8, borderRadius: 4, backgroundColor: ORANGE },
  statusTxt:  { fontSize: 13, fontWeight: '800', color: ORANGE, fontFamily: FONT_B },

  // Success
  successCircle: { width: 110, height: 110, borderRadius: 55, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  successCard:   { width: '100%', backgroundColor: '#F7F8FA', borderRadius: 16, overflow: 'hidden', marginTop: 6 },
  successWrap:       { flex: 1, alignItems: 'center', paddingTop: 60, gap: 14, paddingHorizontal: 24 },
  successIcon:       { marginBottom: 8 },
  successTitle:      { fontSize: 26, fontWeight: '900', color: TEXT_H, fontFamily: FONT_B, textAlign: 'center' },
  successMsg:        { fontSize: 14, color: TEXT_M, fontFamily: FONT_R, lineHeight: 22, textAlign: 'center' },
  successDetail:     { flexDirection: 'row', justifyContent: 'space-between', width: '100%', backgroundColor: '#F7F8FA', borderRadius: 14, padding: 16, marginTop: 10 },
  successDetailKey:  { fontSize: 13, color: TEXT_M, fontFamily: FONT_R },
  successDetailVal:  { fontSize: 15, fontWeight: '900', color: BRAND, fontFamily: FONT_B },

  // Footer
  footer: { paddingHorizontal: 20, paddingBottom: Platform.OS === 'ios' ? 36 : 20, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#F0F0F0' },
  errorRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10, justifyContent: 'center' },
  errorTxt: { fontSize: 12.5, color: DANGER, fontFamily: FONT_R, flex: 1 },
  ctaBtn: {
    backgroundColor: BRAND, borderRadius: 16, paddingVertical: 16,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    shadowColor: BRAND, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.3, shadowRadius: 12, elevation: 6,
  },
  ctaBtnTxt:      { fontSize: 15, fontWeight: '900', color: WHITE, fontFamily: FONT_B },
  ctaBtnDisabled: { opacity: 0.45, shadowOpacity: 0 },
});
