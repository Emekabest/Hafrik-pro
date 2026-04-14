import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, CommonActions } from '@react-navigation/native';
import { useAuth } from '../../AuthContext';
import { useTheme } from '../../theme/ThemeContext';
import AppDetails from '../../helpers/appdetails';
import { Colors } from '../../theme/colors';

const BRAND  = Colors.primaryDark;
const ACCENT = Colors.primary;
const DARK   = Colors.deepSlate;
const MUTED  = Colors.secondaryText;

const withOpacity = (hex, opacity) => {
  const normalized = (hex || '').replace('#', '');
  const alpha = Math.round(Math.max(0, Math.min(1, opacity)) * 255).toString(16).padStart(2, '0');
  return `#${normalized}${alpha}`;
};

// ── Row ───────────────────────────────────────────────────────────────────────
const Row = ({ icon, iconColor = BRAND, label, value, onPress, destructive, last }) => (
  <TouchableOpacity
    style={[styles.row, last && styles.rowLast]}
    activeOpacity={onPress ? 0.75 : 1}
    onPress={onPress}
    disabled={!onPress}
  >
    <View style={[styles.rowIcon, { backgroundColor: (destructive ? Colors.warningStrong : iconColor) + '18' }]}>
      <Ionicons name={icon} size={17} color={destructive ? Colors.warningStrong : iconColor} />
    </View>
    <Text style={[styles.rowLabel, destructive && styles.rowLabelRed]}>{label}</Text>
    {value ? (
      <Text style={styles.rowValue}>{value}</Text>
    ) : onPress ? (
      <Ionicons name="chevron-forward" size={15} color={withOpacity(Colors.black, 0.2)} />
    ) : null}
  </TouchableOpacity>
);

// ── Section ───────────────────────────────────────────────────────────────────
const Section = ({ title, children }) => (
  <View style={styles.section}>
    <Text style={styles.sectionLabel}>{title}</Text>
    <View style={styles.sectionCard}>{children}</View>
  </View>
);

// ─────────────────────────────────────────────────────────────────────────────
export default function SettingsScreen() {
  const { token, logout } = useAuth();
  const navigation        = useNavigation();
  const insets            = useSafeAreaInsets();

  const openWeb = (title, url) => navigation.navigate('InAppBrowser', { title, url });

  const handleLogout = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out of Hafrik?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            if (typeof logout === 'function') await logout();
            navigation.dispatch(
              CommonActions.reset({ index: 0, routes: [{ name: 'Login' }] })
            );
          },
        },
      ]
    );
  };

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      {/* ── Full-bleed gradient header ── */}
      <LinearGradient
        colors={[BRAND, '#0f5060']}
        style={[styles.header, { paddingTop: insets.top + 12 }]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} activeOpacity={0.8}>
          <Ionicons name="arrow-back" size={20} color={Colors.white} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Settings</Text>
          <Text style={styles.headerSub}>Manage your account & preferences</Text>
        </View>
        <View style={styles.headerIconWrap}>
          <Ionicons name="settings-outline" size={20} color={Colors.white + '80'} />
        </View>
      </LinearGradient>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 40 }]}
      >
        {/* Account */}
        <Section title="Account">
          <Row
            icon="person-outline"
            label="Edit Profile"
            onPress={() => navigation.navigate('Profile')}
          />
          <Row
            icon="lock-closed-outline"
            label="Change Password"
            onPress={() => openWeb('Change Password', `https://hafrik.com/settings/security/password?token=${token}`)}
          />
          <Row
            icon="mail-outline"
            label="Email & Phone"
            onPress={() => openWeb('Email & Phone', `https://hafrik.com/settings/security/password?token=${token}`)}
          />
          <Row
            icon="shield-checkmark-outline"
            iconColor={ACCENT}
            label="Verification"
            onPress={() => navigation.navigate('VerificationIntro')}
            last
          />
        </Section>

        {/* Privacy */}
        <Section title="Privacy">
          <Row
            icon="eye-outline"
            label="Privacy Settings"
            onPress={() => openWeb('Privacy Settings', `https://hafrik.com/settings/privacy?token=${token}`)}
          />
          <Row
            icon="ban"
            label="Blocked Accounts"
            onPress={()=> navigation.navigate("BlockedAccountsScreen")}
          />
          <Row
            icon="notifications-outline"
            label="Notification Preferences"
            onPress={() => openWeb('Notifications', `https://hafrik.com/settings/privacy?token=${token}`)}
          />
          <Row
            icon="trash-outline"
            iconColor="#ef4444"
            label="Delete Account"
            onPress={() => openWeb('Delete Account', `https://hafrik.com/settings/delete?token=${token}`)}
            last
          />
        </Section>

        {/* Grow */}
        <Section title="Grow">
          <Row
            icon="megaphone-outline"
            iconColor="#f59e0b"
            label="Ads Manager"
            onPress={() => openWeb('Ads Manager', 'https://hafrik.com/ads')}
            last
          />
        </Section>

        {/* About */}
        <Section title="About">
          <Row
            icon="document-text-outline"
            label="Terms of Use"
            onPress={() => openWeb('Terms of Use', 'https://hafrik.com/static/terms')}
          />
          <Row
            icon="shield-checkmark-outline"
            label="Privacy Policy"
            onPress={() => openWeb('Privacy Policy', 'https://hafrik.com/static/privacy')}
          />
          <Row
            icon="information-circle-outline"
            iconColor={ACCENT}
            label="About Us"
            onPress={() => navigation.navigate('AboutUs')}
          />
          <Row
            icon="layers-outline"
            label="App Version"
            value={`v${AppDetails?.version ?? '1.0.0'}`}
            last
          />
        </Section>

      </ScrollView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#f5f7fa',
  },

  // ── Header ──
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 20,
    gap: 12,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: { flex: 1 },
  headerTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: Colors.white,
    letterSpacing: -0.4,
    fontFamily: AppDetails?.fontFamily?.redex?.bold ?? 'System',
  },
  headerSub: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.6)',
    marginTop: 1,
    fontFamily: AppDetails?.fontFamily?.inter?.regular ?? 'System',
  },
  headerIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ── Scroll ──
  scroll: {
    paddingTop: 20,
    paddingHorizontal: 14,
  },

  // ── Section ──
  section: {
    marginBottom: 24,
  },
  sectionLabel: {
    fontSize: 10.5,
    fontWeight: '800',
    color: MUTED,
    textTransform: 'uppercase',
    letterSpacing: 1.3,
    marginBottom: 8,
    paddingHorizontal: 4,
    fontFamily: AppDetails?.fontFamily?.redex?.bold ?? 'System',
  },
  sectionCard: {
    backgroundColor: Colors.white,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: withOpacity(Colors.primaryDark, 0.07),
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },

  // ── Row ──
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 13,
    paddingHorizontal: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: withOpacity(Colors.primaryDark, 0.07),
    gap: 12,
  },
  rowLast: { borderBottomWidth: 0 },
  rowIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowLabel: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
    color: DARK,
    fontFamily: AppDetails?.fontFamily?.redex?.bold ?? 'System',
  },
  rowLabelRed: { color: Colors.warningStrong },
  rowValue: {
    fontSize: 13,
    color: MUTED,
    fontFamily: AppDetails?.fontFamily?.inter?.regular ?? 'System',
  },
});
