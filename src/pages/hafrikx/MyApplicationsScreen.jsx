import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, StatusBar, RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import apiClient from '../../api/apiClient';

const BG     = '#f7fff7';
const CARD   = '#ffffff';
const BORDER = '#e4eeef';
const BRAND  = '#0c3f44';
const TEAL   = '#1f8e93';
const MUTED  = '#5f6b6d';
const WHITE  = '#ffffff';

const STATUS_COLORS = {
  pending:   '#f59e0b',
  reviewing: '#3b82f6',
  approved:  '#10b981',
  rejected:  '#ef4444',
  completed: '#10b981',
};

const statusColor = (status) =>
  STATUS_COLORS[(status ?? '').toLowerCase()] ?? MUTED;

const ApplicationCard = ({ item, onPress }) => {
  const color = statusColor(item.status);
  return (
    <TouchableOpacity style={styles.card} activeOpacity={0.85} onPress={() => onPress(item)}>
      <View style={[styles.cardAccent, { backgroundColor: color }]} />
      <View style={styles.cardBody}>
        <Text style={styles.cardTitle} numberOfLines={1}>{item.service_name}</Text>
        <Text style={styles.cardDate}>{item.created_at}</Text>
      </View>
      <View style={[styles.statusBadge, { backgroundColor: color + '18', borderColor: color + '44' }]}>
        <Text style={[styles.statusTxt, { color }]}>{item.status}</Text>
      </View>
      <Ionicons name="chevron-forward" size={16} color={MUTED} />
    </TouchableOpacity>
  );
};

export default function MyApplicationsScreen() {
  const insets     = useSafeAreaInsets();
  const navigation = useNavigation();

  const [items, setItems]           = useState([]);
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError]           = useState(null);

  const fetchApplications = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else           setLoading(true);
    setError(null);
    try {
      const res  = await apiClient.get('/services/my_applications.php');
      const data = res.data?.data ?? res.data ?? [];
      setItems(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.response?.data?.message ?? 'Failed to load applications');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchApplications(); }, [fetchApplications]);

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
          <Text style={styles.headerTitle}>My Applications</Text>
          <Text style={styles.headerSub}>Track your service requests</Text>
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
          <TouchableOpacity style={styles.retryBtn} onPress={() => fetchApplications()}>
            <Text style={styles.retryTxt}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={item => String(item.id)}
          renderItem={({ item }) => (
            <ApplicationCard
              item={item}
              onPress={(a) => navigation.navigate('ApplicationDetail', { id: a.id })}
            />
          )}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => fetchApplications(true)}
              tintColor={TEAL}
            />
          }
          ListEmptyComponent={
            <View style={styles.center}>
              <Ionicons name="document-outline" size={52} color={MUTED + '88'} />
              <Text style={styles.centerTxt}>No applications yet</Text>
              <Text style={styles.centerSub}>Your submitted service requests will appear here</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root:   { flex: 1, backgroundColor: BG },

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

  listContent: { padding: 16, paddingBottom: 40 },

  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: CARD,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: BORDER,
    marginBottom: 10,
    overflow: 'hidden',
    paddingRight: 14,
    paddingVertical: 14,
    gap: 12,
  },
  cardAccent: { width: 4, height: '100%', borderRadius: 2 },
  cardBody:   { flex: 1 },
  cardTitle:  { color: BRAND, fontSize: 14, fontFamily: 'WorkSans_600SemiBold', marginBottom: 3 },
  cardDate:   { color: MUTED, fontSize: 12, fontFamily: 'WorkSans_400Regular' },

  statusBadge: {
    borderRadius: 8, borderWidth: 1,
    paddingHorizontal: 8, paddingVertical: 3,
  },
  statusTxt: {
    fontSize: 11,
    fontFamily: 'WorkSans_600SemiBold',
    textTransform: 'capitalize',
  },

  center: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 32,
  },
  centerTxt: {
    color: MUTED,
    fontSize: 14,
    fontFamily: 'WorkSans_500Medium',
    marginTop: 12,
    textAlign: 'center',
  },
  centerSub: {
    color: MUTED + 'aa',
    fontSize: 12,
    fontFamily: 'WorkSans_400Regular',
    marginTop: 6,
    textAlign: 'center',
    lineHeight: 18,
  },
  retryBtn: {
    marginTop: 16,
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: TEAL,
  },
  retryTxt: { color: WHITE, fontSize: 13, fontFamily: 'WorkSans_600SemiBold' },
});
