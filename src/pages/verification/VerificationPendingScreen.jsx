/**
 * VerificationPendingScreen
 * Shown immediately after a user submits their verification documents.
 * Provides a clear confirmation that documents were received and are under review.
 */
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, CommonActions } from '@react-navigation/native';
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

const STEPS = [
  { icon: 'cloud-done-outline',          color: '#16a34a', label: 'Documents submitted',   done: true },
  { icon: 'search-outline',              color: BRAND,     label: 'Under review (3–5 days)',done: false },
  { icon: 'shield-checkmark-outline',    color: BRAND,     label: 'Decision sent by email', done: false },
];

export default function VerificationPendingScreen() {
  const { top }   = useSafeAreaInsets();
  const navigation = useNavigation();

  const goHome = () => {
    // Pop back to the root tab navigator (Settings → Home)
    navigation.dispatch(
      CommonActions.reset({ index: 0, routes: [{ name: 'MainTabs' }] })
    );
  };

  const goSettings = () => {
    // Navigate back to settings stack
    navigation.navigate('Settings');
  };

  return (
    <View style={[styles.root, { paddingTop: top }]}>
      {/* Minimal header — no back button, user should use the CTAs */}
      <View style={styles.header}>
        <View style={{ width: 38 }} />
        <Text style={styles.headerTitle}>Submitted</Text>
        <View style={{ width: 38 }} />
      </View>

      <View style={styles.body}>
        {/* Big animated icon */}
        <View style={styles.iconRing}>
          <View style={styles.iconInner}>
            <Ionicons name="time" size={52} color={Colors.white} />
          </View>
        </View>

        <Text style={styles.title}>Application Submitted!</Text>
        <Text style={styles.subtitle}>
          Your documents have been received. Our team will review your identity and get back to you within 3–5 business days.
        </Text>

        {/* Review pipeline */}
        <View style={styles.pipeline}>
          {STEPS.map((step, i) => (
            <View key={i} style={styles.pipelineRow}>
              <View style={[styles.pipelineIcon, { backgroundColor: step.done ? '#dcfce7' : withOpacity(BRAND, 0.08) }]}>
                <Ionicons name={step.icon} size={20} color={step.color} />
              </View>
              <Text style={[styles.pipelineLabel, step.done && styles.pipelineLabelDone]}>
                {step.label}
              </Text>
              {step.done && (
                <Ionicons name="checkmark-circle" size={18} color="#16a34a" />
              )}
            </View>
          ))}
        </View>

        {/* Info cards */}
        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <Ionicons name="mail-outline" size={18} color={ACCENT} />
            <Text style={styles.infoText}>
              You'll receive an email notification once a decision is made.
            </Text>
          </View>
          <View style={styles.infoDivider} />
          <View style={styles.infoRow}>
            <Ionicons name="shield-outline" size={18} color={ACCENT} />
            <Text style={styles.infoText}>
              You can check the status anytime in <Text style={{ fontFamily: FONT_M, color: BRAND }}>Settings → Verification</Text>.
            </Text>
          </View>
        </View>

        {/* CTAs */}
        <TouchableOpacity style={styles.primaryBtn} activeOpacity={0.88} onPress={goHome}>
          <Ionicons name="home-outline" size={18} color={Colors.white} style={{ marginRight: 8 }} />
          <Text style={styles.primaryBtnText}>Back to Home</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.secondaryBtn} activeOpacity={0.8} onPress={goSettings}>
          <Text style={styles.secondaryBtnText}>View in Settings</Text>
        </TouchableOpacity>
      </View>
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
  headerTitle: {
    flex: 1, textAlign: 'center',
    fontSize: 17, fontWeight: '800', color: Colors.white,
    fontFamily: FONT_B,
  },

  body: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 40,
    paddingBottom: 40,
    gap: 20,
  },

  // Icon
  iconRing: {
    width: 120, height: 120, borderRadius: 60,
    backgroundColor: withOpacity(BRAND, 0.1),
    alignItems: 'center', justifyContent: 'center',
  },
  iconInner: {
    width: 90, height: 90, borderRadius: 45,
    backgroundColor: BRAND,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: BRAND,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4, shadowRadius: 14, elevation: 10,
  },

  title: {
    fontSize: 24, fontWeight: '900', color: BRAND,
    fontFamily: FONT_B, textAlign: 'center',
  },
  subtitle: {
    fontSize: 14, color: Colors.secondaryText,
    fontFamily: FONT_R, textAlign: 'center', lineHeight: 21,
  },

  // Pipeline
  pipeline: {
    width: '100%',
    backgroundColor: Colors.white,
    borderRadius: 18, padding: 16,
    borderWidth: 1, borderColor: withOpacity(BRAND, 0.07),
    gap: 14,
  },
  pipelineRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
  },
  pipelineIcon: {
    width: 40, height: 40, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
  },
  pipelineLabel: {
    flex: 1, fontSize: 14, color: withOpacity(BRAND, 0.55),
    fontFamily: FONT_R,
  },
  pipelineLabelDone: {
    color: '#16a34a', fontFamily: FONT_M,
  },

  // Info
  infoCard: {
    width: '100%',
    backgroundColor: Colors.white,
    borderRadius: 18, padding: 16,
    borderWidth: 1, borderColor: withOpacity(BRAND, 0.07),
    gap: 0,
  },
  infoRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingVertical: 8 },
  infoText: { flex: 1, fontSize: 13, color: Colors.deepSlate, fontFamily: FONT_R, lineHeight: 19 },
  infoDivider: { height: StyleSheet.hairlineWidth, backgroundColor: withOpacity(BRAND, 0.08) },

  // Buttons
  primaryBtn: {
    width: '100%',
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: BRAND, borderRadius: 16,
    paddingVertical: 16,
    shadowColor: BRAND, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 10, elevation: 6,
  },
  primaryBtnText: {
    color: Colors.white, fontSize: 15, fontWeight: '800', fontFamily: FONT_B,
  },
  secondaryBtn: {
    width: '100%',
    alignItems: 'center', justifyContent: 'center',
    paddingVertical: 14, borderRadius: 16,
    borderWidth: 1, borderColor: withOpacity(BRAND, 0.3),
    backgroundColor: withOpacity(BRAND, 0.04),
  },
  secondaryBtnText: {
    color: BRAND, fontSize: 14, fontWeight: '700', fontFamily: FONT_M,
  },
});
