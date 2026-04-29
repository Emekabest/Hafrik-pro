// src/components/AddFundsModal.jsx — Shared wallet top-up modal
// Used by EarningsScreen and CheckoutScreen
import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ActivityIndicator,
  ScrollView, Modal, TextInput, KeyboardAvoidingView,
  Platform, Image, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import * as Clipboard from 'expo-clipboard';

import { useAuth } from '../AuthContext';
import { Colors } from '../theme';
import AppDetails from '../helpers/appdetails';

// ─── Constants ────────────────────────────────────────────────────────────────
const BRAND  = Colors.primaryDark;
const ACCENT = Colors.primary;
const WHITE  = Colors.white;
const TEXT_H = Colors.black;
const TEXT_M = Colors.secondaryText;
const GREEN  = Colors.success ?? '#22c55e';
const ORANGE = Colors.warm  ?? '#f4a535';
const DANGER = '#ef4444';

const FONT_B = AppDetails?.fontFamily?.redex?.bold    ?? 'System';
const FONT_R = AppDetails?.fontFamily?.inter?.regular ?? 'System';
const FONT_M = AppDetails?.fontFamily?.inter?.medium  ?? 'System';

const fmtMoney = (n) =>
  `¥${Number(n ?? 0).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const STEPS = { AMOUNT: 0, INSTRUCTIONS: 1, RECEIPT: 2, SUCCESS: 3 };
const STEP_LABELS = ['Amount', 'Instructions', 'Proof'];

const PAYMENT_API = 'https://hafrik.com/api/v1/payment/create.php';
const UPLOAD_API  = 'https://hafrik.com/api/v1/uploads/media.php';
const SUBMIT_API  = 'https://hafrik.com/api/v1/payment/submit-payment.php';

// ─── Component ────────────────────────────────────────────────────────────────
export default function AddFundsModal({ visible, onClose }) {
  const { token } = useAuth();

  const [step,      setStep]      = useState(STEPS.AMOUNT);
  const [amount,    setAmount]    = useState('');
  const [reference, setReference] = useState('');
  const [proof,     setProof]     = useState(null);
  const [proofUrl,  setProofUrl]  = useState('');
  const [creating,  setCreating]  = useState(false);
  const [uploading, setUploading] = useState(false);
  const [submitting,setSubmitting]= useState(false);
  const [error,     setError]     = useState('');

  const [methods,        setMethods]        = useState([]);
  const [loadingMethods, setLoadingMethods] = useState(false);
  const [selectedMethod, setSelectedMethod] = useState(null);

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
    if (step === STEPS.AMOUNT)        { handleClose(); return; }
    if (step === STEPS.INSTRUCTIONS)  { setStep(STEPS.AMOUNT); setError(''); return; }
    if (step === STEPS.RECEIPT)       { setProof(null); setProofUrl(''); setStep(STEPS.INSTRUCTIONS); setError(''); return; }
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
      const list = Array.isArray(json?.data?.methods) ? json.data.methods : [];
      setMethods(list);
      if (list.length === 1) setSelectedMethod(list[0]);
    } catch {
      setMethods([]);
    }
    setLoadingMethods(false);
  };

  // ── Copy reference ──────────────────────────────────────────────────────────
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
      setProofUrl('');
      setStep(STEPS.RECEIPT);
    }
  };

  // ── STEP 2: Upload image → Submit payment ───────────────────────────────────
  const handleSubmit = async () => {
    if (!proof) { setError('Please upload your payment proof first.'); return; }
    setError('');
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
    setSubmitting(true);
    try {
      const res  = await fetch(SUBMIT_API, {
        method:  'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body:    JSON.stringify({ amount: Number(amount), proof: uploadedUrl, reference }),
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

  const amtNum = Number(amount) || 0;
  const isBusy = creating || uploading || submitting;

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={handleClose}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={af.root}>

          {/* ── Gradient Header ── */}
          <LinearGradient
            colors={[BRAND, ACCENT]}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            style={af.header}
          >
            <TouchableOpacity style={af.headerBtn} onPress={handleBack} activeOpacity={0.8} disabled={isBusy}>
              <Ionicons name={step === STEPS.AMOUNT ? 'close' : 'arrow-back'} size={20} color={WHITE} />
            </TouchableOpacity>
            <View style={{ alignItems: 'center' }}>
              <Text style={af.headerTitle}>
                {step === STEPS.SUCCESS ? 'Payment Submitted' : 'Add Funds'}
              </Text>
              {step < STEPS.SUCCESS && (
                <Text style={af.headerStepLabel}>
                  Step {step + 1} of {STEP_LABELS.length} — {STEP_LABELS[step]}
                </Text>
              )}
            </View>
            <TouchableOpacity style={af.headerBtn} onPress={handleClose} activeOpacity={0.8} disabled={isBusy}>
              <Ionicons name="close" size={20} color={WHITE} />
            </TouchableOpacity>
          </LinearGradient>

          {/* ── Progress bar ── */}
          {step < STEPS.SUCCESS && (
            <View style={af.progressBarTrack}>
              <View style={[af.progressBarFill, { width: `${((step + 1) / STEP_LABELS.length) * 100}%` }]} />
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
                <Text style={af.stepTitle}>How much to add?</Text>
                <Text style={af.stepSub}>Enter the amount you want to top up your wallet with.</Text>
                <View style={af.amountBox}>
                  <Text style={af.amountPrefix}>¥</Text>
                  <TextInput
                    style={af.amountInput}
                    value={amount}
                    onChangeText={t => setAmount(t.replace(/[^0-9.]/g, ''))}
                    placeholder="0.00"
                    placeholderTextColor={TEXT_M + '55'}
                    keyboardType="decimal-pad"
                    autoFocus
                    editable={!isBusy}
                  />
                </View>
                <Text style={af.amountHint}>Minimum top-up: ¥10.00</Text>
                <Text style={af.quickLabel}>Quick amounts</Text>
                <View style={af.quickAmounts}>
                  {['50', '100', '200', '500'].map(q => (
                    <TouchableOpacity
                      key={q}
                      style={[af.qAmt, amount === q && af.qAmtActive]}
                      onPress={() => setAmount(q)}
                      disabled={isBusy}
                    >
                      <Text style={[af.qAmtTxt, amount === q && { color: WHITE }]}>¥{q}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

            {/* ── STEP 1: Payment Instructions ── */}
            {step === STEPS.INSTRUCTIONS && (
              <View style={af.stepWrap}>
                <View style={af.amountPill}>
                  <Ionicons name="wallet-outline" size={18} color={ACCENT} />
                  <Text style={af.amountPillLabel}>You are paying</Text>
                  <Text style={af.amountPillVal}>{fmtMoney(amtNum)}</Text>
                </View>
                {loadingMethods && (
                  <View style={af.methodsLoadingRow}>
                    <ActivityIndicator size="large" color={ACCENT} />
                    <Text style={af.methodsLoadingTxt}>Loading payment methods…</Text>
                  </View>
                )}
                {!loadingMethods && methods.length === 0 && (
                  <View style={[af.infoBox, { backgroundColor: DANGER + '10', borderColor: DANGER + '28' }]}>
                    <Ionicons name="warning-outline" size={16} color={DANGER} />
                    <Text style={[af.infoTxt, { color: DANGER }]}>
                      Payment is currently unavailable. Please try again later.
                    </Text>
                  </View>
                )}
                {!loadingMethods && methods.map(method => {
                  const isMulti    = methods.length > 1;
                  const isSelected = isMulti && selectedMethod?.id === method.id;
                  const qrUrl      = method.qr_code_url ?? method.details?.qr_code ?? null;
                  const hasAccount = !!method.details?.account_number;
                  const hasName    = !!method.details?.account_name;
                  return (
                    <View key={method.id} style={[af.methodCard, isSelected && af.methodCardActive]}>
                      {isMulti && (
                        <TouchableOpacity style={af.methodTitleRow} onPress={() => setSelectedMethod(method)} activeOpacity={0.8}>
                          <View style={[af.methodRadio, isSelected && af.methodRadioActive]}>
                            {isSelected && <View style={af.methodRadioDot} />}
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={af.methodTitle}>{method.name}</Text>
                            {!!method.description && <Text style={af.methodSub}>{method.description}</Text>}
                          </View>
                        </TouchableOpacity>
                      )}
                      {!isMulti && (
                        <View style={af.methodTitleRow}>
                          <View style={af.methodIconCircle}>
                            <Ionicons name="qr-code-outline" size={20} color={ACCENT} />
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={af.methodTitle}>{method.name}</Text>
                            {!!method.description && <Text style={af.methodSub}>{method.description}</Text>}
                          </View>
                        </View>
                      )}
                      {!!qrUrl && (
                        <View style={af.qrWrap}>
                          <View style={af.qrFrame}>
                            <Image source={{ uri: qrUrl }} style={af.qrImage} resizeMode="contain" />
                          </View>
                          <View style={af.qrBadge}>
                            <Ionicons name="scan-outline" size={14} color={WHITE} />
                            <Text style={af.qrBadgeTxt}>Scan QR Code to Pay</Text>
                          </View>
                        </View>
                      )}
                      {(hasAccount || hasName) && (
                        <View style={af.detailsCard}>
                          {hasAccount && (
                            <View style={af.detailRow}>
                              <Text style={af.detailKey}>Account Number</Text>
                              <Text style={af.detailVal}>{method.details.account_number}</Text>
                            </View>
                          )}
                          {hasAccount && hasName && <View style={af.detailsDivider} />}
                          {hasName && (
                            <View style={af.detailRow}>
                              <Text style={af.detailKey}>Account Name</Text>
                              <Text style={af.detailVal}>{method.details.account_name}</Text>
                            </View>
                          )}
                        </View>
                      )}
                      {!!method.details?.note && (
                        <View style={af.noteBox}>
                          <Text style={af.noteTitle}>Instructions</Text>
                          {method.details.note.split('\n').filter(l => l.trim()).map((line, i) => (
                            <View key={i} style={af.noteLine}>
                              <Text style={af.noteBullet}>•</Text>
                              <Text style={af.noteText}>{line.trim()}</Text>
                            </View>
                          ))}
                        </View>
                      )}
                    </View>
                  );
                })}
              </View>
            )}

            {/* ── STEP 2: Upload Proof ── */}
            {step === STEPS.RECEIPT && (
              <View style={af.stepWrap}>
                <Text style={af.stepTitle}>Upload Payment Proof</Text>
                <Text style={af.stepSub}>Take a screenshot of your payment and upload it so we can verify.</Text>
                <View style={af.amountPill}>
                  <Ionicons name="wallet-outline" size={18} color={ACCENT} />
                  <Text style={af.amountPillLabel}>Amount paid</Text>
                  <Text style={af.amountPillVal}>{fmtMoney(amtNum)}</Text>
                </View>
                <TouchableOpacity style={af.receiptTapArea} onPress={handlePickProof} activeOpacity={0.85} disabled={isBusy}>
                  {proof ? (
                    <Image source={{ uri: proof.uri }} style={af.receiptImg} resizeMode="cover" />
                  ) : (
                    <View style={af.receiptPlaceholder}>
                      <View style={af.uploadIconCircle}>
                        <Ionicons name="cloud-upload-outline" size={34} color={ACCENT} />
                      </View>
                      <Text style={af.receiptTxt}>Tap to upload screenshot</Text>
                      <Text style={af.receiptSub}>JPG, PNG supported</Text>
                    </View>
                  )}
                </TouchableOpacity>
                {proof && (
                  <TouchableOpacity style={af.changeImgBtn} onPress={handlePickProof} disabled={isBusy} activeOpacity={0.8}>
                    <Ionicons name="refresh-outline" size={15} color={ACCENT} />
                    <Text style={af.changeImgTxt}>Change Image</Text>
                  </TouchableOpacity>
                )}
                {uploading && (
                  <View style={af.uploadingRow}>
                    <ActivityIndicator size="small" color={ACCENT} />
                    <Text style={af.uploadingTxt}>Uploading…</Text>
                  </View>
                )}
              </View>
            )}

            {/* ── STEP 3: Success ── */}
            {step === STEPS.SUCCESS && (
              <View style={af.successWrap}>
                <LinearGradient colors={[GREEN + '25', GREEN + '08']} style={af.successCircle}>
                  <Ionicons name="checkmark-circle" size={80} color={GREEN} />
                </LinearGradient>
                <Text style={af.successTitle}>Payment Submitted!</Text>
                <Text style={af.successMsg}>
                  Your payment proof is under review. Funds will be credited to your wallet within 5 minutes.
                </Text>
                <View style={af.statusPill}>
                  <View style={af.statusDot} />
                  <Text style={af.statusTxt}>Pending Review</Text>
                </View>
                <View style={af.successCard}>
                  <View style={af.summaryRow}>
                    <Text style={af.summaryKey}>Amount</Text>
                    <Text style={af.summaryVal}>{fmtMoney(amtNum)}</Text>
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
                  : <><Text style={af.ctaBtnTxt}>Submit Payment</Text><Ionicons name="checkmark" size={16} color={WHITE} style={{ marginLeft: 6 }} /></>
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
                    : <><Ionicons name="cloud-upload-outline" size={17} color={WHITE} /><Text style={af.ctaBtnTxt}>Upload Proof</Text></>
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
                  : <><Text style={af.ctaBtnTxt}>Continue</Text><Ionicons name="arrow-forward" size={16} color={WHITE} style={{ marginLeft: 6 }} /></>
                }
              </TouchableOpacity>
            )}
          </View>

        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const af = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F7F8FA' },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: Platform.OS === 'ios' ? 56 : 20, paddingBottom: 16,
  },
  headerBtn:       { width: 36, height: 36, borderRadius: 18, backgroundColor: WHITE + '22', alignItems: 'center', justifyContent: 'center' },
  headerTitle:     { fontSize: 17, fontWeight: '900', color: WHITE, fontFamily: FONT_B },
  headerStepLabel: { fontSize: 11, color: WHITE + 'AA', fontFamily: FONT_R, marginTop: 2 },

  progressBarTrack: { height: 3, backgroundColor: '#E0E8E8' },
  progressBarFill:  { height: 3, backgroundColor: ACCENT },

  body:      { padding: 20, paddingBottom: 20 },
  stepWrap:  { gap: 16 },
  stepTitle: { fontSize: 22, fontWeight: '900', color: TEXT_H, fontFamily: FONT_B },
  stepSub:   { fontSize: 13.5, color: TEXT_M, fontFamily: FONT_R, lineHeight: 20, marginTop: -8 },

  amountBox: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: WHITE, borderRadius: 20,
    borderWidth: 2, borderColor: ACCENT + '50',
    paddingHorizontal: 20, paddingVertical: 18,
    shadowColor: ACCENT, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 12, elevation: 3,
  },
  amountPrefix: { fontSize: 30, fontWeight: '900', color: BRAND, fontFamily: FONT_B, marginRight: 8 },
  amountInput:  { flex: 1, fontSize: 42, fontWeight: '900', color: TEXT_H, fontFamily: FONT_B, padding: 0 },
  amountHint:   { fontSize: 12, color: TEXT_M, fontFamily: FONT_R, marginTop: -8 },
  quickLabel:   { fontSize: 12, fontWeight: '700', color: TEXT_M, fontFamily: FONT_M, textTransform: 'uppercase', letterSpacing: 0.8 },
  quickAmounts: { flexDirection: 'row', gap: 10, flexWrap: 'wrap' },
  qAmt:         { paddingHorizontal: 22, paddingVertical: 12, borderRadius: 14, borderWidth: 1.5, borderColor: '#E0E0E0', backgroundColor: WHITE },
  qAmtActive:   { borderColor: ACCENT, backgroundColor: ACCENT },
  qAmtTxt:      { fontSize: 15, fontWeight: '700', color: TEXT_M, fontFamily: FONT_M },

  amountPill: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: WHITE, borderRadius: 16, padding: 16,
    borderWidth: 1.5, borderColor: ACCENT + '30',
    shadowColor: BRAND, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2,
  },
  amountPillLabel: { flex: 1, fontSize: 13, color: TEXT_M, fontFamily: FONT_R },
  amountPillVal:   { fontSize: 22, fontWeight: '900', color: BRAND, fontFamily: FONT_B },

  summaryCard:    { backgroundColor: WHITE, borderRadius: 18, overflow: 'hidden' },
  summaryRow:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 18, paddingVertical: 16 },
  summaryDivider: { height: 1, backgroundColor: '#EBEBEB' },
  summaryKey:     { fontSize: 14, color: TEXT_M, fontFamily: FONT_R },
  summaryVal:     { fontSize: 16, fontWeight: '800', color: TEXT_H, fontFamily: FONT_B },

  infoBox: {
    flexDirection: 'row', gap: 10, alignItems: 'flex-start',
    backgroundColor: ACCENT + '10', borderRadius: 12,
    borderWidth: 1, borderColor: ACCENT + '25', padding: 14,
  },
  infoTxt: { flex: 1, fontSize: 12.5, color: ACCENT, fontFamily: FONT_R, lineHeight: 18 },

  methodsLoadingRow: { alignItems: 'center', gap: 12, padding: 40, justifyContent: 'center' },
  methodsLoadingTxt: { fontSize: 13, color: TEXT_M, fontFamily: FONT_R },

  methodCard: {
    backgroundColor: WHITE, borderRadius: 20, padding: 20,
    borderWidth: 1.5, borderColor: '#E8E8E8',
    shadowColor: BRAND, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.07, shadowRadius: 12, elevation: 3,
  },
  methodCardActive:  { borderColor: ACCENT },
  methodTitleRow:    { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  methodIconCircle:  { width: 44, height: 44, borderRadius: 22, backgroundColor: ACCENT + '15', alignItems: 'center', justifyContent: 'center' },
  methodTitle:       { fontSize: 17, fontWeight: '900', color: TEXT_H, fontFamily: FONT_B },
  methodSub:         { fontSize: 12, color: TEXT_M, fontFamily: FONT_R, marginTop: 2 },
  methodRadio:       { width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: '#DDD', alignItems: 'center', justifyContent: 'center' },
  methodRadioActive: { borderColor: ACCENT },
  methodRadioDot:    { width: 12, height: 12, borderRadius: 6, backgroundColor: ACCENT },

  qrWrap:     { alignItems: 'center', marginBottom: 16 },
  qrFrame:    { padding: 12, backgroundColor: WHITE, borderRadius: 20, borderWidth: 1.5, borderColor: '#E8E8E8', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 12, elevation: 4 },
  qrImage:    { width: 260, height: 260, borderRadius: 12 },
  qrBadge:    { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 14, backgroundColor: ACCENT, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 8 },
  qrBadgeTxt: { fontSize: 13, fontWeight: '700', color: WHITE, fontFamily: FONT_M },

  noteBox:    { backgroundColor: '#F7F8FA', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#EBEBEB' },
  noteTitle:  { fontSize: 13, fontWeight: '800', color: TEXT_H, fontFamily: FONT_B, marginBottom: 10 },
  noteLine:   { flexDirection: 'row', gap: 8, marginBottom: 6 },
  noteBullet: { fontSize: 14, color: ACCENT, fontWeight: '900' },
  noteText:   { flex: 1, fontSize: 13, color: TEXT_M, fontFamily: FONT_R, lineHeight: 19 },

  detailsCard:    { backgroundColor: '#F7F8FA', borderRadius: 14, overflow: 'hidden', borderWidth: 1, borderColor: '#EBEBEB' },
  detailsDivider: { height: 1, backgroundColor: '#EBEBEB' },
  detailRow:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 12 },
  detailKey:      { fontSize: 12, color: TEXT_M, fontFamily: FONT_R },
  detailVal:      { fontSize: 13, fontWeight: '700', color: TEXT_H, fontFamily: FONT_B, maxWidth: '60%', textAlign: 'right' },

  receiptTapArea: {
    borderRadius: 20, borderWidth: 2, borderColor: ACCENT + '40',
    borderStyle: 'dashed', overflow: 'hidden',
    backgroundColor: WHITE, minHeight: 200,
  },
  receiptImg:         { width: '100%', height: 240 },
  receiptPlaceholder: { minHeight: 200, alignItems: 'center', justifyContent: 'center', gap: 10, padding: 20 },
  uploadIconCircle:   { width: 68, height: 68, borderRadius: 34, backgroundColor: ACCENT + '12', alignItems: 'center', justifyContent: 'center' },
  receiptTxt:         { fontSize: 15, fontWeight: '700', color: TEXT_H, fontFamily: FONT_M },
  receiptSub:         { fontSize: 12, color: TEXT_M, fontFamily: FONT_R },
  changeImgBtn:       { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'center', paddingVertical: 10 },
  changeImgTxt:       { fontSize: 13, fontWeight: '700', color: ACCENT, fontFamily: FONT_M },
  uploadingRow:       { flexDirection: 'row', alignItems: 'center', gap: 8, justifyContent: 'center' },
  uploadingTxt:       { fontSize: 13, color: TEXT_M, fontFamily: FONT_R },

  statusPill: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: ORANGE + '18', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 8 },
  statusDot:  { width: 8, height: 8, borderRadius: 4, backgroundColor: ORANGE },
  statusTxt:  { fontSize: 13, fontWeight: '800', color: ORANGE, fontFamily: FONT_B },

  successWrap:   { flex: 1, alignItems: 'center', paddingTop: 60, gap: 16, paddingHorizontal: 24 },
  successCircle: { width: 120, height: 120, borderRadius: 60, alignItems: 'center', justifyContent: 'center' },
  successCard:   { width: '100%', backgroundColor: WHITE, borderRadius: 18, overflow: 'hidden', borderWidth: 1, borderColor: '#EBEBEB' },
  successTitle:  { fontSize: 28, fontWeight: '900', color: TEXT_H, fontFamily: FONT_B, textAlign: 'center' },
  successMsg:    { fontSize: 14, color: TEXT_M, fontFamily: FONT_R, lineHeight: 22, textAlign: 'center' },

  footer:         { paddingHorizontal: 20, paddingBottom: Platform.OS === 'ios' ? 36 : 20, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#F0F0F0', backgroundColor: WHITE },
  errorRow:       { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 },
  errorTxt:       { fontSize: 12.5, color: DANGER, fontFamily: FONT_R, flex: 1 },
  ctaBtn:         { backgroundColor: BRAND, borderRadius: 16, paddingVertical: 17, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', shadowColor: BRAND, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.35, shadowRadius: 14, elevation: 6 },
  ctaBtnTxt:      { fontSize: 16, fontWeight: '900', color: WHITE, fontFamily: FONT_B },
  ctaBtnDisabled: { opacity: 0.45, shadowOpacity: 0 },
});
