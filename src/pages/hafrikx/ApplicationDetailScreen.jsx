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
          {/* Status banner */}
          <View style={[styles.statusBanner, { backgroundColor: color + '14', borderColor: color + '40' }]}>
            <View style={[styles.statusDot, { backgroundColor: color }]} />
            <Text style={[styles.statusTxt, { color }]}>
              {data.status?.toUpperCase?.() ?? data.status}
            </Text>
          </View>

          {/* Main details */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Service Details</Text>
            <InfoRow label="Service"      value={data.service_name} />
            <InfoRow label="Submitted"    value={data.created_at} />
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Your Information</Text>
            <InfoRow label="Full Name" value={data.full_name} />
            <InfoRow label="Phone"     value={data.phone} />
            <InfoRow label="Email"     value={data.email} />
          </View>

          {/* Dynamic payload fields */}
          {data.payload && typeof data.payload === 'object' && Object.keys(data.payload).length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Additional Information</Text>
              {Object.entries(data.payload).map(([key, val]) => (
                <InfoRow
                  key={key}
                  label={key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
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

  statusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 20,
  },
  statusDot: { width: 10, height: 10, borderRadius: 5 },
  statusTxt: { fontSize: 13, fontFamily: 'WorkSans_700Bold', letterSpacing: 0.5 },

  section: {
    backgroundColor: CARD,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: BORDER,
    paddingHorizontal: 16,
    paddingVertical: 6,
    marginBottom: 14,
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
