import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../../AuthContext';
import AppDetails from '../../helpers/appdetails';

const BRAND  = '#0C3F44';
const ACCENT = '#13C296';
const CREAM  = '#F5F7F7';
const DARK   = '#0D1B1E';
const MUTED  = '#7A9198';

const Section = ({ title, children }) => (
  <View style={styles.section}>
    <Text style={styles.sectionTitle}>{title}</Text>
    <View style={styles.sectionCard}>{children}</View>
  </View>
);

const Row = ({ icon, iconColor = BRAND, label, value, onPress, destructive, last }) => (
  <TouchableOpacity
    style={[styles.row, last && styles.rowLast]}
    activeOpacity={onPress ? 0.82 : 1}
    onPress={onPress}
    disabled={!onPress}
  >
    <View style={[styles.rowIcon, { backgroundColor: `${iconColor}18` }]}>
      <Ionicons name={icon} size={17} color={iconColor} />
    </View>
    <Text style={[styles.rowLabel, destructive && styles.rowLabelRed]}>{label}</Text>
    {value ? (
      <Text style={styles.rowValue}>{value}</Text>
    ) : onPress ? (
      <Ionicons name="chevron-forward" size={16} color="rgba(0,0,0,0.25)" />
    ) : null}
  </TouchableOpacity>
);

export default function SettingsScreen() {
  const navigation = useNavigation();
  const { top }    = useSafeAreaInsets();
  const { logout } = useAuth();

  return (
    <View style={[styles.root, { paddingTop: top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.8}>
          <Ionicons name="arrow-back" size={21} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Settings</Text>
        <View style={{ width: 38 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 60 }}
      >
        {/* Account */}
        <Section title="Account">
          <Row icon="person-outline" label="Edit Profile" onPress={() => navigation.navigate('Profile')} />
          <Row icon="lock-closed-outline" label="Change Password" onPress={() => navigation.navigate('InAppBrowser', { title: 'Change Password', url: 'https://hafrik.com/settings/password' })} />
          <Row icon="mail-outline" label="Email & Phone" onPress={() => navigation.navigate('InAppBrowser', { title: 'Contact Info', url: 'https://hafrik.com/settings/contact' })} last />
        </Section>

        {/* Privacy */}
        <Section title="Privacy">
          <Row icon="eye-outline" label="Privacy Settings" onPress={() => navigation.navigate('InAppBrowser', { title: 'Privacy', url: 'https://hafrik.com/settings/privacy' })} />
          <Row icon="notifications-outline" label="Notification Preferences" onPress={() => navigation.navigate('InAppBrowser', { title: 'Notifications', url: 'https://hafrik.com/settings/notifications' })} last />
        </Section>

        {/* About */}
        <Section title="About">
          <Row icon="document-text-outline" label="Terms of Service" onPress={() => navigation.navigate('InAppBrowser', { title: 'Terms of Service', url: 'https://hafrik.com/terms' })} />
          <Row icon="shield-checkmark-outline" label="Privacy Policy" onPress={() => navigation.navigate('InAppBrowser', { title: 'Privacy Policy', url: 'https://hafrik.com/privacy' })} />
          <Row icon="information-circle-outline" label="App Version" value={`v${AppDetails?.version ?? '1.0.0'}`} last />
        </Section>

        {/* Danger zone */}
        <Section title="Account Actions">
          <Row
            icon="log-out-outline"
            iconColor="#b00020"
            label="Log out"
            destructive
            onPress={() => { if (typeof logout === 'function') logout(); }}
            last
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
    backgroundColor: 'rgba(255,255,255,0.13)',
    alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 17, fontWeight: '800', color: '#fff',
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
    backgroundColor: '#fff',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(12,63,68,0.07)',
    overflow: 'hidden',
  },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 13,
    paddingHorizontal: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(12,63,68,0.07)',
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
  rowLabelRed: { color: '#b00020' },
  rowValue: {
    fontSize: 13, color: MUTED,
    fontFamily: AppDetails?.fontFamily?.inter?.regular ?? 'System',
  },
});
