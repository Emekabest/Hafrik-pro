import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, CommonActions } from '@react-navigation/native';
import { useAuth } from '../../AuthContext';
import { useTheme } from '../../theme/ThemeContext';
import AppDetails from '../../helpers/appdetails';
import { Colors } from '../../theme/colors';

const withOpacity = (hex, opacity) => {
  const normalized = (hex || "").replace("#", "");
  const alpha = Math.round(Math.max(0, Math.min(1, opacity)) * 255).toString(16).padStart(2, "0");
  return `#${normalized}${alpha}`;
};


const BRAND  = Colors.primaryDark;
const ACCENT = Colors.primary;
const CREAM  = Colors.background;
const DARK   = Colors.deepSlate;
const MUTED  = Colors.secondaryText;

const Section = ({ title, children, themeColors }) => (
  <View style={styles.section}>
    <Text style={[styles.sectionTitle, themeColors && { color: themeColors.textSecondary }]}>{title}</Text>
    <View style={[styles.sectionCard, themeColors && { backgroundColor: themeColors.surface, borderColor: themeColors.border }]}>{children}</View>
  </View>
);

const Row = ({ icon, iconColor = BRAND, label, value, onPress, destructive, last, right, themeColors }) => (
  <TouchableOpacity
    style={[styles.row, last && styles.rowLast, themeColors && { borderBottomColor: themeColors.border }]}
    activeOpacity={onPress ? 0.82 : 1}
    onPress={onPress}
    disabled={!onPress && !right}
  >
    <View style={[styles.rowIcon, { backgroundColor: `${iconColor}18` }]}>
      <Ionicons name={icon} size={17} color={iconColor} />
    </View>
    <Text style={[styles.rowLabel, destructive && styles.rowLabelRed, themeColors && { color: themeColors.text }]}>{label}</Text>
    {right ? right : value ? (
      <Text style={[styles.rowValue, themeColors && { color: themeColors.textSecondary }]}>{value}</Text>
    ) : onPress ? (
      <Ionicons name="chevron-forward" size={16} color={themeColors ? themeColors.textMuted : withOpacity(Colors.black, 0.25)} />
    ) : null}
  </TouchableOpacity>
);

export default function SettingsScreen() {

  const { token } = useAuth();

  const navigation = useNavigation();
  const { top }    = useSafeAreaInsets();
  const { logout } = useAuth();
  const { isDark, colors } = useTheme();

  const openWeb = (title, url) =>
    navigation.navigate('InAppBrowser', { title, url });

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

  const tc = isDark ? colors : null; // pass null for light mode (uses defaults)

  return (
    <View style={[styles.root, { paddingTop: top, backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.headerBg }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.8}>
          <Ionicons name="arrow-back" size={21} color={colors.headerText} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.headerText }]}>Settings</Text>
        <View style={{ width: 38 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 60 }}
      >
        {/* Account */}
        <Section title="Account" themeColors={tc}>
          <Row
            icon="person-outline"
            label="Edit Profile"
            onPress={() => navigation.navigate('Profile')}
            themeColors={tc}
          />
          <Row
            icon="lock-closed-outline"
            label="Change Password"
            onPress={() => openWeb('Change Password', 'https://hafrik.com/settings/security/password')}
            themeColors={tc}
          />
          <Row
            icon="mail-outline"
            label="Email & Phone"
            onPress={() => openWeb('Email & Phone', 'https://hafrik.com/settings/security/password')}
            last
            themeColors={tc}
          />
        </Section>

        {/* Privacy */}
        <Section title="Privacy" themeColors={tc}>
          <Row
            icon="eye-outline"
            label="Privacy Settings"
            onPress={() => openWeb('Privacy Settings', `https://hafrik.com/settings/privacy/`)}
            themeColors={tc}
          />
          <Row
            icon="notifications-outline"
            label="Notification Preferences"
            onPress={() => openWeb('Notifications', `https://hafrik.com/settings/privacy?token=${token}`)}
            last
            themeColors={tc}
          />
          <Row
            icon="trash-outline"
            label="Delete Account"
            onPress={() => openWeb('Notifications', `https://hafrik.com/settings/delete?token=${token}`)}
            last
            themeColors={tc}
          />
        </Section>

        {/* About */}
        <Section title="About" themeColors={tc}>
          <Row
            icon="document-text-outline"
            label="Terms of Use"
            onPress={() => openWeb('Terms of Use', 'https://hafrik.com/termsofuse.html')}
            themeColors={tc}
          />
          <Row
            icon="shield-checkmark-outline"
            label="Privacy Policy"
            onPress={() => openWeb('Privacy Policy', 'https://hafrik.com/static/privacy')}
            themeColors={tc}
          />
          <Row
            icon="megaphone-outline"
            iconColor={ACCENT}
            label="Our Media Kit"
            onPress={() => openWeb('Media Kit', 'https://hafrik.com/sponsored-ads.html')}
            themeColors={tc}
          />
          <Row
            icon="information-circle-outline"
            label="About Us"
            onPress={() => openWeb('About Us', 'https://hafrik.com/abouthafrik.html')}
            themeColors={tc}
          />
          <Row
            icon="layers-outline"
            label="App Version"
            value={`v${AppDetails?.version ?? '1.0.0'}`}
            last
            themeColors={tc}
          />
        </Section>

        {/* Account Actions */}
        <Section title="Account Actions" themeColors={tc}>
          <Row
            icon="log-out-outline"
            iconColor={Colors.warningStrong}
            label="Log out"
            destructive
            onPress={handleLogout}
            last
            themeColors={tc}
          />
        </Section>
      </ScrollView>
    </View>
  );
}

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
    flex: 1,
    textAlign: 'center',
    fontSize: 17, fontWeight: '800', color: Colors.white,
    fontFamily: AppDetails?.fontFamily?.redex?.bold ?? 'System',
  },

  section: { marginTop: 24, paddingHorizontal: 14 },
  sectionTitle: {
    fontSize: 11, fontWeight: '900', color: MUTED,
    letterSpacing: 1.2, textTransform: 'uppercase',
    marginBottom: 8, paddingHorizontal: 4,
    fontFamily: AppDetails?.fontFamily?.redex?.bold ?? 'System',
  },
  sectionCard: {
    backgroundColor: Colors.white,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: withOpacity(Colors.primaryDark, 0.07),
    overflow: 'hidden',
  },

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
    width: 34, height: 34, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
  },
  rowLabel: {
    flex: 1, fontSize: 14, fontWeight: '700', color: DARK,
    fontFamily: AppDetails?.fontFamily?.redex?.bold ?? 'System',
  },
  rowLabelRed: { color: Colors.warningStrong },
  rowValue: {
    fontSize: 13, color: MUTED,
    fontFamily: AppDetails?.fontFamily?.inter?.regular ?? 'System',
  },
});
