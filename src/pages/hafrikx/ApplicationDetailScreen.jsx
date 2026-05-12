import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import apiClient from '../../api/apiClient';

const BG     = '#f7fff7';
const CARD   = '#ffffff';
const BORDER = '#e4eeef';
const BRAND  = '#0c3f44';
const TEAL   = '#1f8e93';
const MUTED  = '#5f6b6d';
const WHITE  = '#ffffff';
const GOLD   = '#c9a84c';

const STATUS_COLORS = {
  pending:   '#f59e0b',
  reviewing: '#3b82f6',
  approved:  '#10b981',
  rejected:  '#ef4444',
  completed: '#10b981',
};

const statusColor = (status) =>
  STATUS_COLORS[(status ?? '').toLowerCase()] ?? MUTED;

const statusIcon = (status) => {
  const s = String(status ?? '').toLowerCase();
  if (s === 'approved' || s === 'completed') return 'checkmark-circle';
  if (s === 'rejected') return 'close-circle';
  if (s === 'reviewing') return 'sync-circle';
  return 'time';
};

const formatLabel = (key = '') =>
  key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

const InfoRow = ({ label, value }) => {
  if (!value && value !== 0) return null;
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
};

export default function ApplicationDetailScreen() {
  const insets     = useSafeAreaInsets();
  const navigation = useNavigation();
  const route      = useRoute();
  const { id }     = route.params ?? {};

  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await apiClient.get(`/services/get_application.php?id=${id}`);
        setData(res.data?.data ?? res.data ?? null);
      } catch (err) {
        setError(err.response?.data?.message ?? 'Failed to load application');
      } finally {
        setLoading(false);
      }
    };
    if (id) fetch();
  }, [id]);

  const color = statusColor(data?.status);
  const payload = data?.payload && typeof data.payload === 'object' ? data.payload : {};

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={BRAND} />

      {/* Header */}
      <LinearGradient
        colors={[BRAND, TEAL]}
        style={[styles.header, { paddingTop: insets.top + 14 }]}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
      >
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.8}>
          <Ionicons name="arrow-back" size={21} color={WHITE} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Application Detail</Text>
          {!!data?.service_name && (
            <Text style={styles.headerSub} numberOfLines={1}>{data.service_name}</Text>
          )}
        </View>
        <View style={{ width: 38 }} />
      </LinearGradient>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={TEAL} />
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Ionicons name="alert-circle-outline" size={48} color={MUTED} />
          <Text style={styles.centerTxt}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => navigation.goBack()}>
            <Text style={styles.retryTxt}>Go Back</Text>
          </TouchableOpacity>
        </View>
      ) : !data ? (
        <View style={styles.center}>
          <Text style={styles.centerTxt}>Application not found</Text>
        </View>
      ) : (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          <LinearGradient
            colors={[BRAND, TEAL]}
            style={styles.heroCard}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <View style={styles.heroOrb} />
            <View style={styles.heroTop}>
              <View style={[styles.statusIconWrap, { backgroundColor: color + '22' }]}>
                <Ionicons name={statusIcon(data.status)} size={26} color={color} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.heroKicker}>APPLICATION STATUS</Text>
                <Text style={styles.heroTitle}>{data.service_name}</Text>
              </View>
            </View>
            <View style={[styles.statusBanner, { backgroundColor: color + '18', borderColor: color + '55' }]}>
              <View style={[styles.statusDot, { backgroundColor: color }]} />
              <Text style={[styles.statusTxt, { color }]}>
                {data.status?.toUpperCase?.() ?? data.status ?? 'PENDING'}
              </Text>
            </View>
            <Text style={styles.heroSub}>Submitted {data.created_at || 'recently'} • Request #{data.id ?? id}</Text>
          </LinearGradient>

          <View style={styles.timelineCard}>
            {[
              { label: 'Submitted', active: true, icon: 'paper-plane-outline' },
              { label: 'Review', active: ['reviewing', 'approved', 'completed'].includes(String(data.status ?? '').toLowerCase()), icon: 'search-outline' },
              { label: 'Decision', active: ['approved', 'completed', 'rejected'].includes(String(data.status ?? '').toLowerCase()), icon: 'flag-outline' },
            ].map((step, index, arr) => (
              <View key={step.label} style={styles.timelineItem}>
                <View style={[styles.timelineDot, step.active && { backgroundColor: color, borderColor: color }]}>
                  <Ionicons name={step.icon} size={13} color={step.active ? WHITE : MUTED} />
                </View>
                <Text style={[styles.timelineText, step.active && { color: BRAND }]}>{step.label}</Text>
                {index < arr.length - 1 && <View style={styles.timelineLine} />}
              </View>
            ))}
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Service Details</Text>
            <InfoRow label="Service"      value={data.service_name} />
            <InfoRow label="Submitted"    value={data.created_at} />
            <InfoRow label="Reference"    value={data.id ?? id} />
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Your Information</Text>
            <InfoRow label="Full Name" value={data.full_name} />
            <InfoRow label="Phone"     value={data.phone} />
            <InfoRow label="Email"     value={data.email} />
          </View>

          {/* Dynamic payload fields */}
          {Object.keys(payload).length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Additional Information</Text>
              {Object.entries(payload).map(([key, val]) => (
                <InfoRow
                  key={key}
                  label={formatLabel(key)}
                  value={typeof val === 'object' ? JSON.stringify(val) : String(val)}
                />
              ))}
            </View>
          )}

          {/* Admin note */}
          {!!data.admin_note && (
            <View style={styles.adminNoteCard}>
              <View style={styles.adminNoteHeader}>
                <Ionicons name="megaphone-outline" size={16} color={GOLD} />
                <Text style={styles.adminNoteTitle}>Admin Message</Text>
              </View>
              <Text style={styles.adminNoteTxt}>{data.admin_note}</Text>
            </View>
          )}

          <TouchableOpacity style={styles.helpCard} activeOpacity={0.85} onPress={() => navigation.navigate('HafrikXVisa')}>
            <View style={styles.helpIcon}>
              <Ionicons name="help-buoy-outline" size={18} color={TEAL} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.helpTitle}>Need another service?</Text>
              <Text style={styles.helpSub}>Browse services or submit a new request.</Text>
            </View>
            <Ionicons name="arrow-forward" size={16} color={BRAND} />
          </TouchableOpacity>

          <View style={{ height: 50 }} />
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root:   { flex: 1, backgroundColor: BG },
  scroll: { flex: 1 },
  content: { padding: 16 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  backBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center', justifyContent: 'center',
  },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerTitle:  { color: WHITE, fontSize: 17, fontFamily: 'ReadexPro_600SemiBold' },
  headerSub:    { color: 'rgba(255,255,255,0.7)', fontSize: 11, fontFamily: 'WorkSans_400Regular', marginTop: 2 },

  heroCard: {
    borderRadius: 24,
    padding: 18,
    marginBottom: 14,
    overflow: 'hidden',
    shadowColor: BRAND,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 18,
    elevation: 8,
  },
  heroOrb: {
    position: 'absolute',
    width: 170,
    height: 170,
    borderRadius: 85,
    backgroundColor: WHITE,
    opacity: 0.06,
    right: -52,
    top: -72,
  },
  heroTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 14,
  },
  statusIconWrap: {
    width: 54,
    height: 54,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroKicker: { color: 'rgba(255,255,255,0.65)', fontSize: 9, fontFamily: 'WorkSans_700Bold', letterSpacing: 1.4 },
  heroTitle: { color: WHITE, fontSize: 19, fontFamily: 'ReadexPro_600SemiBold', lineHeight: 25, marginTop: 2 },
  heroSub: { color: 'rgba(255,255,255,0.72)', fontSize: 12, fontFamily: 'WorkSans_500Medium', marginTop: 10 },
  statusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 10,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  statusDot: { width: 10, height: 10, borderRadius: 5 },
  statusTxt: { fontSize: 13, fontFamily: 'WorkSans_700Bold', letterSpacing: 0.5 },

  timelineCard: {
    flexDirection: 'row',
    backgroundColor: CARD,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 14,
    marginBottom: 14,
  },
  timelineItem: {
    flex: 1,
    alignItems: 'center',
  },
  timelineDot: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: BG,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  timelineText: { color: MUTED, fontSize: 11, fontFamily: 'WorkSans_700Bold', marginTop: 6 },
  timelineLine: {
    position: 'absolute',
    top: 17,
    left: '50%',
    right: '-50%',
    height: 1,
    backgroundColor: BORDER,
  },
  section: {
    backgroundColor: CARD,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: BORDER,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginBottom: 14,
    shadowColor: BRAND,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  sectionTitle: {
    color: TEAL,
    fontSize: 10.5,
    fontFamily: 'WorkSans_700Bold',
    letterSpacing: 1.2,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
    marginBottom: 4,
  },

  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: BORDER + '88',
    gap: 10,
  },
  infoLabel: {
    width: 100,
    color: MUTED,
    fontSize: 12.5,
    fontFamily: 'WorkSans_500Medium',
  },
  infoValue: {
    flex: 1,
    color: BRAND,
    fontSize: 13,
    fontFamily: 'WorkSans_600SemiBold',
    lineHeight: 19,
  },

  adminNoteCard: {
    backgroundColor: GOLD + '10',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: GOLD + '40',
    padding: 16,
    marginBottom: 14,
  },
  helpCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: CARD,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 14,
  },
  helpIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: TEAL + '14',
    alignItems: 'center',
    justifyContent: 'center',
  },
  helpTitle: { color: BRAND, fontSize: 14, fontFamily: 'WorkSans_700Bold' },
  helpSub: { color: MUTED, fontSize: 12, fontFamily: 'WorkSans_400Regular', marginTop: 2 },
  adminNoteHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  adminNoteTitle: {
    color: BRAND,
    fontSize: 13,
    fontFamily: 'WorkSans_700Bold',
  },
  adminNoteTxt: {
    color: MUTED,
    fontSize: 13.5,
    fontFamily: 'WorkSans_400Regular',
    lineHeight: 20,
  },

  center: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 32,
  },
  centerTxt: {
    color: MUTED, fontSize: 14,
    fontFamily: 'WorkSans_500Medium',
    marginTop: 12, textAlign: 'center',
  },
  retryBtn: {
    marginTop: 16, paddingHorizontal: 24, paddingVertical: 10,
    borderRadius: 10, backgroundColor: TEAL,
  },
  retryTxt: { color: WHITE, fontSize: 13, fontFamily: 'WorkSans_600SemiBold' },
});
