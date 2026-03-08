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
import AppDetails from '../../helpers/appdetails';
import { Colors } from '../../theme/colors';
import { useTheme } from '../../theme/ThemeContext';

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

const Section = ({ title, children }) => (
  <View style={styles.section}>
    <Text style={styles.sectionTitle}>{title}</Text>
    <View style={styles.sectionCard}>{children}</View>
  </View>
);

const Row = ({ icon, iconColor = BRAND, label, onPress, destructive, last }) => (
  <TouchableOpacity
    style={[styles.row, last && styles.rowLast]}
    activeOpacity={0.82}
    onPress={onPress}
  >
    <View style={[styles.rowIcon, { backgroundColor: `${iconColor}18` }]}>
      <Ionicons name={icon} size={17} color={iconColor} />
    </View>
    <Text style={[styles.rowLabel, destructive && styles.rowLabelRed]}>{label}</Text>
    <Ionicons
      name="chevron-forward"
      size={16}
      color={destructive ? withOpacity(Colors.warningStrong, 0.3) : withOpacity(Colors.black, 0.25)}
    />
  </TouchableOpacity>
);

export default function AdvancedSettingsScreen() {
  const navigation = useNavigation();
  const { top }    = useSafeAreaInsets();
  const { colors: tc } = useTheme();

  const openWeb = (title, url) =>
    navigation.navigate('InAppBrowser', { title, url });

  return (
    <View style={[styles.root, { paddingTop: top, backgroundColor: tc.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.8}>
          <Ionicons name="arrow-back" size={21} color={Colors.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>More Settings</Text>
        <View style={{ width: 38 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 60 }}
      >
        {/* Membership & Verification */}
        <Section title="Membership & Verification">
          <Row
            icon="ribbon-outline"
            label="Membership"
            onPress={() => openWeb('Membership', 'https://hafrik.com/settings/membership')}
          />
          <Row
            icon="shield-checkmark-outline"
            label="Verification"
            onPress={() => openWeb('Verification', 'https://hafrik.com/settings/verification')}
            last
          />
        </Section>

        {/* Affiliates */}
        <Section title="Affiliates">
          <Row
            icon="people-circle-outline"
            label="Affiliates"
            onPress={() => openWeb('Affiliates', 'https://hafrik.com/settings/affiliates')}
          />
          <Row
            icon="cash-outline"
            label="Affiliate Payments"
            onPress={() => openWeb('Affiliate Payments', 'https://hafrik.com/settings/affiliates/payments')}
            last
          />
        </Section>

        {/* Points & Payments */}
        <Section title="Points & Payments">
          <Row
            icon="star-outline"
            label="Points"
            onPress={() => openWeb('Points', 'https://hafrik.com/settings/points')}
          />
          <Row
            icon="wallet-outline"
            label="Points Payments"
            onPress={() => openWeb('Points Payments', 'https://hafrik.com/settings/points/payments')}
          />
          <Row
            icon="card-outline"
            label="Bank Accounts"
            onPress={() => openWeb('Bank Accounts', 'https://hafrik.com/settings/bank')}
            last
          />
        </Section>

        {/* Data & Addresses */}
        <Section title="Data & Addresses">
          <Row
            icon="location-outline"
            label="Saved Addresses"
            onPress={() => openWeb('Saved Addresses', 'https://hafrik.com/settings/addresses')}
          />
          <Row
            icon="download-outline"
            label="Download My Information"
            onPress={() => openWeb('Download Information', 'https://hafrik.com/settings/information')}
            last
          />
        </Section>

        {/* Danger Zone */}
        <Section title="Danger Zone">
          <Row
            icon="trash-outline"
              iconColor={Colors.warningStrong}
            label="Delete Account"
            destructive
            onPress={() => openWeb('Delete Account', 'https://hafrik.com/settings/delete')}
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
});
