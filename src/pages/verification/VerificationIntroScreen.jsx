/**
 * VerificationIntroScreen
 * The first screen in the verification flow.
 * Shows the current status and lets the user start the application.
 *
 * Status states:
 *   not_submitted → CTA to apply
 *   pending       → "Under review" message
 *   approved      → Verified badge + success message
 *   rejected      → Rejection note + option to reapply
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../../AuthContext';
import { getVerificationStatus } from '../../controllers/verificationController';
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

// ─── Status config ────────────────────────────────────────────────────────────
const STATUS_MAP = {
  not_submitted: {
    icon:    'shield-outline',
    iconBg:  BRAND,
    title:   'Get Verified on Hafrik',
    sub:     'A verified badge lets people know your account is authentic. It appears on your profile and posts.',
    badge:   null,
  },
  pending: {
    icon:    'time-outline',
    iconBg:  '#d97706',
    title:   'Verification Under Review',
    sub:     'We have received your documents. Our team will review your application within 3–5 business days.',
    badge:   { label: 'Pending', color: '#d97706', bg: '#fef3c7' },
  },
  approved: {
    icon:    'checkmark-circle',
    iconBg:  '#16a34a',
    title:   'You Are Verified!',
    sub:     'Congratulations! Your account is now verified. The blue badge appears on your profile and posts.',
    badge:   { label: 'Approved', color: '#16a34a', bg: '#dcfce7' },
  },
  rejected: {
    icon:    'close-circle',
    iconBg:  Colors.warningStrong,
    title:   'Verification Rejected',
    sub:     'Your application was not approved. Please review the note below and reapply with clear documents.',
    badge:   { label: 'Rejected', color: Colors.warningStrong, bg: '#fee2e2' },
  },
};

const BENEFITS = [
  { icon: 'checkmark-shield-outline', text: 'Builds trust with your audience' },
  { icon: 'ribbon-outline',           text: 'Stands out with an official badge' },
  { icon: 'trending-up-outline',      text: 'Unlock exclusive creator features' },
  { icon: 'eye-outline',              text: 'Higher visibility in search results' },
];

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function VerificationIntroScreen() {
  const navigation     = useNavigation();
  const { top }        = useSafeAreaInsets();
  const { token }      = useAuth();

  const [loading,  setLoading]  = useState(true);
  const [status,   setStatus]   = useState('not_submitted');
  const [rejNote,  setRejNote]  = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    const result = await getVerificationStatus(token);
    setStatus(result.status);
    setRejNote(result.rejectedNote || '');
    setLoading(false);
  }, [token]);

  // Reload whenever screen comes into focus (e.g. after submission)
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const cfg = STATUS_MAP[status] ?? STATUS_MAP.not_submitted;
  const canApply = status === 'not_submitted' || status === 'rejected';

  return (
    <View style={[styles.root, { paddingTop: top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.8}>
          <Ionicons name="arrow-back" size={21} color={Colors.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Verification</Text>
        <View style={{ width: 38 }} />
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={ACCENT} />
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>

          {/* Hero card */}
          <View style={styles.heroCard}>
            <View style={[styles.heroIconWrap, { backgroundColor: cfg.iconBg }]}>
              <Ionicons name={cfg.icon} size={40} color={Colors.white} />
            </View>

            {/* Status badge */}
            {cfg.badge && (
              <View style={[styles.statusBadge, { backgroundColor: cfg.badge.bg }]}>
                <Text style={[styles.statusBadgeText, { color: cfg.badge.color }]}>
                  {cfg.badge.label}
                </Text>
              </View>
            )}

            <Text style={styles.heroTitle}>{cfg.title}</Text>
            <Text style={styles.heroSub}>{cfg.sub}</Text>

            {/* Rejection note */}
            {status === 'rejected' && !!rejNote && (
              <View style={styles.rejectionNote}>
                <Ionicons name="information-circle-outline" size={16} color={Colors.warningStrong} />
                <Text style={styles.rejectionNoteText}>{rejNote}</Text>
              </View>
            )}
          </View>

          {/* Benefits list (only for not_submitted / rejected) */}
          {canApply && (
            <View style={styles.benefitsCard}>
              <Text style={styles.benefitsTitle}>Why get verified?</Text>
              {BENEFITS.map((b, i) => (
                <View key={i} style={styles.benefitRow}>
                  <View style={styles.benefitIcon}>
                    <Ionicons name={b.icon} size={18} color={ACCENT} />
                  </View>
                  <Text style={styles.benefitText}>{b.text}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Steps preview (only for not_submitted / rejected) */}
          {canApply && (
            <View style={styles.stepsCard}>
              <Text style={styles.benefitsTitle}>How it works</Text>
              {[
                { n: '1', label: 'Upload a valid government-issued ID or passport' },
                { n: '2', label: 'Take a live selfie — no gallery photos allowed' },
                { n: '3', label: 'Submit and wait for our team to review (3–5 days)' },
              ].map((s) => (
                <View key={s.n} style={styles.stepRow}>
                  <View style={styles.stepNum}>
                    <Text style={styles.stepNumText}>{s.n}</Text>
                  </View>
                  <Text style={styles.stepText}>{s.label}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Approved extras */}
          {status === 'approved' && (
            <View style={[styles.benefitsCard, { borderLeftColor: '#16a34a', borderLeftWidth: 3 }]}>
              <View style={styles.benefitRow}>
                <Ionicons name="checkmark-circle" size={22} color="#16a34a" />
                <Text style={[styles.benefitText, { color: '#16a34a', fontFamily: FONT_M }]}>
                  Your verified badge is now live on your profile.
                </Text>
              </View>
            </View>
          )}

          {/* CTA */}
          {canApply && (
            <TouchableOpacity
              style={styles.applyBtn}
              activeOpacity={0.88}
              onPress={() => navigation.navigate('VerificationUpload')}
            >
              <Ionicons name="shield-checkmark-outline" size={20} color={Colors.white} style={{ marginRight: 8 }} />
              <Text style={styles.applyBtnText}>
                {status === 'rejected' ? 'Reapply for Verification' : 'Apply for Verification'}
              </Text>
            </TouchableOpacity>
          )}

          {/* Pending refresh hint */}
          {status === 'pending' && (
            <TouchableOpacity style={styles.refreshBtn} onPress={load} activeOpacity={0.8}>
              <Ionicons name="refresh-outline" size={16} color={ACCENT} style={{ marginRight: 6 }} />
              <Text style={styles.refreshBtnText}>Check status again</Text>
            </TouchableOpacity>
          )}

          <Text style={styles.disclaimer}>
            Hafrik's team reviews all applications manually. Submitting false documents may result in a permanent account ban.
          </Text>
        </ScrollView>
      )}
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

  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  content: { padding: 16, paddingBottom: 60, gap: 16 },

  // Hero
  heroCard: {
    backgroundColor: Colors.white,
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: withOpacity(BRAND, 0.07),
    shadowColor: BRAND,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  heroIconWrap: {
    width: 84, height: 84, borderRadius: 42,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 16,
    shadowColor: BRAND,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 6,
  },
  statusBadge: {
    paddingHorizontal: 14, paddingVertical: 5,
    borderRadius: 20, marginBottom: 12,
  },
  statusBadgeText: { fontSize: 12, fontWeight: '700', fontFamily: FONT_M },
  heroTitle: {
    fontSize: 20, fontWeight: '800', color: BRAND,
    fontFamily: FONT_B, textAlign: 'center', marginBottom: 10,
  },
  heroSub: {
    fontSize: 14, color: Colors.secondaryText, lineHeight: 21,
    fontFamily: FONT_R, textAlign: 'center',
  },
  rejectionNote: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
    marginTop: 16, padding: 12,
    backgroundColor: '#fee2e2', borderRadius: 12,
  },
  rejectionNoteText: {
    flex: 1, fontSize: 13, color: Colors.warningStrong,
    fontFamily: FONT_R, lineHeight: 18,
  },

  // Benefits
  benefitsCard: {
    backgroundColor: Colors.white,
    borderRadius: 18, padding: 18,
    borderWidth: 1, borderColor: withOpacity(BRAND, 0.07),
    gap: 12,
  },
  benefitsTitle: {
    fontSize: 13, fontWeight: '900', color: Colors.secondaryText,
    letterSpacing: 1.1, textTransform: 'uppercase', fontFamily: FONT_B,
  },
  benefitRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  benefitIcon: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: withOpacity(ACCENT, 0.1),
    alignItems: 'center', justifyContent: 'center',
  },
  benefitText: { flex: 1, fontSize: 14, color: Colors.deepSlate, fontFamily: FONT_R },

  // Steps
  stepsCard: {
    backgroundColor: Colors.white,
    borderRadius: 18, padding: 18,
    borderWidth: 1, borderColor: withOpacity(BRAND, 0.07),
    gap: 14,
  },
  stepRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 14 },
  stepNum: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: BRAND,
    alignItems: 'center', justifyContent: 'center',
  },
  stepNumText: { color: Colors.white, fontSize: 13, fontWeight: '800', fontFamily: FONT_B },
  stepText:    { flex: 1, fontSize: 14, color: Colors.deepSlate, fontFamily: FONT_R, lineHeight: 20, paddingTop: 4 },

  // CTA
  applyBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: BRAND, borderRadius: 16,
    paddingVertical: 16, paddingHorizontal: 24,
    shadowColor: BRAND,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 10, elevation: 6,
  },
  applyBtnText: {
    color: Colors.white, fontSize: 15, fontWeight: '800',
    fontFamily: FONT_B,
  },

  refreshBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 12, borderRadius: 12,
    borderWidth: 1, borderColor: withOpacity(ACCENT, 0.35),
    backgroundColor: withOpacity(ACCENT, 0.05),
  },
  refreshBtnText: { color: ACCENT, fontSize: 14, fontWeight: '600', fontFamily: FONT_M },

  disclaimer: {
    fontSize: 11, color: withOpacity(Colors.secondaryText, 0.8),
    fontFamily: FONT_R, textAlign: 'center', lineHeight: 16,
    paddingHorizontal: 8,
  },
});
