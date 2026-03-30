/**
 * VerificationUploadScreen
 * Step 1 — Upload passport/ID from gallery
 * Step 2 — Capture selfie with front camera (camera only, no gallery)
 * Step 3 — Submit both to the API
 */
import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Linking,
  ActivityIndicator,
  Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../../AuthContext';
import { submitVerification } from '../../controllers/verificationController';
import { Colors } from '../../theme/colors';
import AppDetails from '../../helpers/appdetails';

const withOpacity = (hex, opacity) => {
  const normalized = (hex || '').replace('#', '');
  const alpha = Math.round(Math.max(0, Math.min(1, opacity)) * 255).toString(16).padStart(2, '0');
  return `#${normalized}${alpha}`;
};

const BRAND  = Colors.primaryDark;
const ACCENT = Colors.primary;
const CREAM  = Colors.background;

const FONT_B = AppDetails?.fontFamily?.redex?.bold    ?? 'System';
const FONT_M = AppDetails?.fontFamily?.inter?.medium  ?? 'System';
const FONT_R = AppDetails?.fontFamily?.inter?.regular ?? 'System';

// ─── Helper: request permission then launch picker ────────────────────────────
const requestPermission = async (type) => {
  const result = type === 'camera'
    ? await ImagePicker.requestCameraPermissionsAsync()
    : await ImagePicker.requestMediaLibraryPermissionsAsync();

  if (!result.granted) {
    Alert.alert(
      'Permission Required',
      type === 'camera'
        ? 'Camera access is required to take a selfie. Please enable it in Settings.'
        : 'Photo library access is required to upload your passport. Please enable it in Settings.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Open Settings', onPress: () => Linking.openSettings() },
      ],
    );
    return false;
  }
  return true;
};

// ─── Upload slot component ─────────────────────────────────────────────────────
const UploadSlot = ({ icon, title, hint, asset, onPress, disabled }) => {
  const hasImage = !!asset?.uri;
  return (
    <TouchableOpacity
      style={[styles.slot, hasImage && styles.slotFilled, disabled && styles.slotDisabled]}
      activeOpacity={0.85}
      onPress={onPress}
      disabled={disabled}
    >
      {hasImage ? (
        <View style={styles.slotPreviewWrap}>
          <Image source={{ uri: asset.uri }} style={styles.slotPreview} resizeMode="cover" />
          <View style={styles.slotEditBadge}>
            <Ionicons name="pencil" size={12} color={Colors.white} />
          </View>
          <View style={styles.slotCheck}>
            <Ionicons name="checkmark-circle" size={26} color="#16a34a" />
          </View>
        </View>
      ) : (
        <View style={styles.slotEmpty}>
          <View style={[styles.slotIconCircle, { backgroundColor: withOpacity(ACCENT, 0.1) }]}>
            <Ionicons name={icon} size={28} color={ACCENT} />
          </View>
          <Text style={styles.slotTitle}>{title}</Text>
          <Text style={styles.slotHint}>{hint}</Text>
          <View style={styles.slotCta}>
            <Ionicons name="add-circle-outline" size={16} color={ACCENT} />
            <Text style={styles.slotCtaText}>Tap to {title.toLowerCase()}</Text>
          </View>
        </View>
      )}
    </TouchableOpacity>
  );
};

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function VerificationUploadScreen() {
  const navigation = useNavigation();
  const { top }    = useSafeAreaInsets();
  const { token }  = useAuth();

  const [passport,    setPassport]    = useState(null);
  const [selfie,      setSelfie]      = useState(null);
  const [submitting,  setSubmitting]  = useState(false);

  // ── Pick passport from gallery ────────────────────────────────────────────
  const pickPassport = useCallback(async () => {
    const ok = await requestPermission('gallery');
    if (!ok) return;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.85,
    });

    if (!result.canceled && result.assets?.[0]) {
      setPassport(result.assets[0]);
    }
  }, []);

  // ── Capture selfie with front camera ─────────────────────────────────────
  const captureSelfie = useCallback(async () => {
    const ok = await requestPermission('camera');
    if (!ok) return;

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.85,
      cameraType: ImagePicker.CameraType.front,
    });

    if (!result.canceled && result.assets?.[0]) {
      setSelfie(result.assets[0]);
    }
  }, []);

  // ── Submit ────────────────────────────────────────────────────────────────
  const handleSubmit = useCallback(async () => {
    if (!passport || !selfie) return;

    Alert.alert(
      'Submit Verification',
      'Please make sure your documents are clear and readable before submitting.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Submit',
          onPress: async () => {
            setSubmitting(true);
            try {
              await submitVerification(token, passport, selfie);
              navigation.replace('VerificationPending');
            } catch (err) {
              Alert.alert('Submission Failed', err.message || 'Please try again.');
            } finally {
              setSubmitting(false);
            }
          },
        },
      ],
    );
  }, [passport, selfie, token, navigation]);

  const canSubmit = !!passport && !!selfie && !submitting;

  return (
    <View style={[styles.root, { paddingTop: top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.8}>
          <Ionicons name="arrow-back" size={21} color={Colors.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Upload Documents</Text>
        <View style={{ width: 38 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>

        {/* Progress indicator */}
        <View style={styles.progressRow}>
          <View style={[styles.progressStep, styles.progressStepActive]}>
            <Ionicons name="card-outline" size={16} color={Colors.white} />
            <Text style={styles.progressStepText}>Passport</Text>
          </View>
          <View style={[styles.progressLine, selfie && styles.progressLineDone]} />
          <View style={[styles.progressStep, selfie ? styles.progressStepActive : styles.progressStepInactive]}>
            <Ionicons name="camera-outline" size={16} color={selfie ? Colors.white : Colors.secondaryText} />
            <Text style={[styles.progressStepText, !selfie && { color: Colors.secondaryText }]}>Selfie</Text>
          </View>
        </View>

        {/* Step 1: Passport */}
        <View style={styles.stepSection}>
          <View style={styles.stepHeader}>
            <View style={styles.stepBadge}>
              <Text style={styles.stepBadgeText}>1</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.stepTitle}>Passport or Government ID</Text>
              <Text style={styles.stepDesc}>Upload a clear, unobstructed photo of your valid government-issued document.</Text>
            </View>
          </View>
          <UploadSlot
            icon="card-outline"
            title="Upload Passport"
            hint="JPG or PNG · Must be clear and unblurred"
            asset={passport}
            onPress={pickPassport}
          />
          {/* Tips */}
          <View style={styles.tipsRow}>
            {[
              { icon: 'checkmark-circle-outline', text: 'All four corners visible', ok: true },
              { icon: 'checkmark-circle-outline', text: 'No glare or blur', ok: true },
              { icon: 'close-circle-outline',     text: 'No screenshots or copies', ok: false },
            ].map((t, i) => (
              <View key={i} style={styles.tipItem}>
                <Ionicons name={t.icon} size={13} color={t.ok ? '#16a34a' : Colors.warningStrong} />
                <Text style={[styles.tipText, { color: t.ok ? '#16a34a' : Colors.warningStrong }]}>{t.text}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Step 2: Selfie */}
        <View style={styles.stepSection}>
          <View style={styles.stepHeader}>
            <View style={[styles.stepBadge, !passport && styles.stepBadgeMuted]}>
              <Text style={styles.stepBadgeText}>2</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.stepTitle, !passport && { color: Colors.secondaryText }]}>Live Selfie</Text>
              <Text style={styles.stepDesc}>Take a live selfie with your front camera. Gallery uploads are not accepted.</Text>
            </View>
          </View>
          <UploadSlot
            icon="person-circle-outline"
            title="Take Selfie"
            hint="Front camera only · No filters · Look directly at the camera"
            asset={selfie}
            onPress={captureSelfie}
            disabled={!passport}
          />
          {/* Tips */}
          <View style={styles.tipsRow}>
            {[
              { icon: 'checkmark-circle-outline', text: 'Good lighting on your face', ok: true },
              { icon: 'checkmark-circle-outline', text: 'No sunglasses or masks', ok: true },
              { icon: 'close-circle-outline',     text: 'No filters or cropping', ok: false },
            ].map((t, i) => (
              <View key={i} style={styles.tipItem}>
                <Ionicons name={t.icon} size={13} color={t.ok ? '#16a34a' : Colors.warningStrong} />
                <Text style={[styles.tipText, { color: t.ok ? '#16a34a' : Colors.warningStrong }]}>{t.text}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Submit */}
        <TouchableOpacity
          style={[styles.submitBtn, !canSubmit && styles.submitBtnDisabled]}
          activeOpacity={canSubmit ? 0.88 : 1}
          onPress={handleSubmit}
          disabled={!canSubmit}
        >
          {submitting ? (
            <ActivityIndicator size="small" color={Colors.white} />
          ) : (
            <>
              <Ionicons name="cloud-upload-outline" size={20} color={Colors.white} style={{ marginRight: 8 }} />
              <Text style={styles.submitBtnText}>Submit for Verification</Text>
            </>
          )}
        </TouchableOpacity>

        {!passport && (
          <Text style={styles.submitHint}>Upload your passport first, then take a selfie to continue.</Text>
        )}
        {passport && !selfie && (
          <Text style={styles.submitHint}>Take a selfie to complete your application.</Text>
        )}

        <Text style={styles.disclaimer}>
          Your documents are encrypted and used only for identity verification. They will not be shared with third parties.
        </Text>
      </ScrollView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: CREAM },

  header: {
    backgroundColor: BRAND,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingBottom: 12,
    paddingTop: 8,
    shadowColor: BRAND,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 8,
  },
  backBtn: {
    width: 38, height: 38, borderRadius: 12,
    backgroundColor: withOpacity(Colors.white, 0.13),
    alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: {
    flex: 1, textAlign: 'center',
    fontSize: 17, fontWeight: '800', color: Colors.white,
    fontFamily: FONT_B,
  },

  content: { padding: 16, paddingBottom: 60, gap: 20 },

  // Progress
  progressRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: withOpacity(BRAND, 0.07),
  },
  progressStep: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 6, paddingHorizontal: 10, borderRadius: 10,
  },
  progressStepActive: { backgroundColor: BRAND },
  progressStepInactive: { backgroundColor: withOpacity(BRAND, 0.06) },
  progressStepText: { fontSize: 12, fontWeight: '700', color: Colors.white, fontFamily: FONT_M },
  progressLine: { height: 2, width: 20, backgroundColor: withOpacity(BRAND, 0.15) },
  progressLineDone: { backgroundColor: BRAND },

  // Steps
  stepSection: {
    backgroundColor: Colors.white,
    borderRadius: 18, padding: 16,
    borderWidth: 1, borderColor: withOpacity(BRAND, 0.07),
    gap: 14,
  },
  stepHeader: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  stepBadge: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: BRAND,
    alignItems: 'center', justifyContent: 'center',
    marginTop: 2,
  },
  stepBadgeMuted: { backgroundColor: withOpacity(BRAND, 0.25) },
  stepBadgeText: { color: Colors.white, fontSize: 13, fontWeight: '800', fontFamily: FONT_B },
  stepTitle: { fontSize: 15, fontWeight: '800', color: BRAND, fontFamily: FONT_B, marginBottom: 3 },
  stepDesc: { fontSize: 13, color: Colors.secondaryText, fontFamily: FONT_R, lineHeight: 18 },

  // Upload slot
  slot: {
    borderRadius: 14, borderWidth: 2, borderColor: withOpacity(ACCENT, 0.3),
    borderStyle: 'dashed', overflow: 'hidden', minHeight: 160,
  },
  slotFilled: { borderStyle: 'solid', borderColor: '#16a34a' },
  slotDisabled: { opacity: 0.45 },
  slotEmpty: { alignItems: 'center', justifyContent: 'center', padding: 24, gap: 8 },
  slotIconCircle: {
    width: 60, height: 60, borderRadius: 30,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 4,
  },
  slotTitle: { fontSize: 14, fontWeight: '700', color: BRAND, fontFamily: FONT_M },
  slotHint:  { fontSize: 12, color: Colors.secondaryText, fontFamily: FONT_R, textAlign: 'center' },
  slotCta:   { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 4 },
  slotCtaText: { fontSize: 13, color: ACCENT, fontWeight: '600', fontFamily: FONT_M },

  slotPreviewWrap: { height: 200 },
  slotPreview: { width: '100%', height: '100%' },
  slotEditBadge: {
    position: 'absolute', bottom: 8, right: 8,
    backgroundColor: withOpacity(Colors.black, 0.55),
    borderRadius: 14, width: 28, height: 28,
    alignItems: 'center', justifyContent: 'center',
  },
  slotCheck: { position: 'absolute', top: 8, right: 8 },

  // Tips
  tipsRow: { gap: 6, paddingLeft: 4 },
  tipItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  tipText: { fontSize: 12, fontFamily: FONT_R },

  // Submit
  submitBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: BRAND, borderRadius: 16,
    paddingVertical: 16, paddingHorizontal: 24,
    shadowColor: BRAND, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 10, elevation: 6,
  },
  submitBtnDisabled: {
    backgroundColor: withOpacity(BRAND, 0.35),
    shadowOpacity: 0, elevation: 0,
  },
  submitBtnText: {
    color: Colors.white, fontSize: 15, fontWeight: '800', fontFamily: FONT_B,
  },
  submitHint: {
    textAlign: 'center', fontSize: 13, color: Colors.secondaryText,
    fontFamily: FONT_R, marginTop: -8,
  },
  disclaimer: {
    fontSize: 11, color: withOpacity(Colors.secondaryText, 0.8),
    fontFamily: FONT_R, textAlign: 'center', lineHeight: 16,
    paddingHorizontal: 8,
  },
});
