import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, FlatList,
  Image, ActivityIndicator, StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../../AuthContext';
import { Colors } from '../../theme';

const BRAND  = Colors.primaryDark;
const ACCENT = Colors.primary;
const CREAM  = Colors.background;
const MUTED  = Colors.secondaryText;
const WHITE  = Colors.white;
const BLACK  = Colors.black;

const BIZ_DARK = '#0C3F44';  // Cyprus
const BIZ_MID  = '#155A60';  // Cyprus → Java midpoint

const fmtCount = (n) => {
  const v = Number(n ?? 0);
  if (v >= 1_000_000) return (v / 1_000_000).toFixed(1) + 'M';
  if (v >= 1_000)     return (v / 1_000).toFixed(1) + 'k';
  return String(v);
};

const cleanText = (t = '') =>
  String(t).replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();

const isRealImg = (url) =>
  typeof url === 'string' && url.trim().length > 6 &&
  !url.includes('default-avatar') && !url.includes('blank_profile');

// ─── Business Card ────────────────────────────────────────────────────────────
const BusinessCard = ({ page }) => {
  const navigation = useNavigation();
  const name      = cleanText(page.title ?? page.name ?? 'Business');
  const logo      = page.logo ?? page.avatar ?? page.image ?? null;
  const category  = cleanText(page.category ?? page.type ?? '');
  const location  = cleanText(page.location ?? page.address ?? page.city ?? '');
  const followers = Number(page.followers_count ?? page.likes ?? page.members ?? 0);
  const about     = cleanText(page.about ?? page.description ?? '');

  const openPage = () =>
    navigation.navigate('BusinessDetails', { pageId: page.id ?? page.page_id });

  return (
    <TouchableOpacity style={bc.card} activeOpacity={0.88} onPress={openPage}>
      {/* Left: logo + accent stripe */}
      <View style={bc.logoCol}>
        <View style={bc.logoWrap}>
          {isRealImg(logo) ? (
            <Image source={{ uri: logo }} style={bc.logo} resizeMode="cover" />
          ) : (
            <LinearGradient
              colors={[BIZ_DARK, BRAND]}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
              style={[bc.logo, bc.logoFb]}
            >
              <Ionicons name="storefront" size={22} color={WHITE} />
            </LinearGradient>
          )}
        </View>
        <View style={bc.accentBar} />
      </View>

      {/* Center: details */}
      <View style={bc.info}>
        <Text style={bc.name} numberOfLines={1}>{name}</Text>

        {!!category && (
          <View style={bc.catRow}>
            <View style={bc.catPill}>
              <Ionicons name="pricetag-outline" size={9} color={BRAND} style={{ marginRight: 3 }} />
              <Text style={bc.catTxt}>{category}</Text>
            </View>
          </View>
        )}

        {!!about && (
          <Text style={bc.about} numberOfLines={2}>{about}</Text>
        )}

        <View style={bc.metaRow}>
          {!!location && (
            <View style={bc.metaItem}>
              <Ionicons name="location-outline" size={11} color={MUTED} />
              <Text style={bc.metaTxt} numberOfLines={1}>{location}</Text>
            </View>
          )}
          {followers > 0 && (
            <View style={bc.metaItem}>
              <Ionicons name="people-outline" size={11} color={MUTED} />
              <Text style={bc.metaTxt}>{fmtCount(followers)} followers</Text>
            </View>
          )}
        </View>
      </View>

      {/* Right: open button */}
      <TouchableOpacity style={bc.openBtn} activeOpacity={0.85} onPress={openPage}>
        <Ionicons name="arrow-forward" size={15} color={BRAND} />
      </TouchableOpacity>
    </TouchableOpacity>
  );
};

const bc = StyleSheet.create({
  card: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: WHITE, borderRadius: 18, padding: 14, gap: 12,
    borderWidth: 1, borderColor: BRAND + '12',
    shadowColor: BLACK, shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 8, elevation: 3,
  },
  logoCol:  { alignItems: 'center', gap: 6 },
  logoWrap: { borderRadius: 14, overflow: 'hidden', borderWidth: 1.5, borderColor: BRAND + '20' },
  logo:     { width: 58, height: 58, borderRadius: 14 },
  logoFb:   { alignItems: 'center', justifyContent: 'center' },
  accentBar: { width: 24, height: 3, borderRadius: 2, backgroundColor: ACCENT },
  info:     { flex: 1, gap: 5 },
  name:     { fontSize: 15, fontWeight: '800', color: BLACK, fontFamily: 'ReadexPro-Bold' },
  catRow:   { flexDirection: 'row' },
  catPill: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: ACCENT + '18', borderRadius: 100,
    paddingHorizontal: 10, paddingVertical: 3, alignSelf: 'flex-start',
  },
  catTxt:   { fontSize: 10, fontWeight: '700', color: BRAND, fontFamily: 'ReadexPro-Medium' },
  about:    { fontSize: 12, color: MUTED, lineHeight: 17, fontFamily: 'ReadexPro-Regular' },
  metaRow:  { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaTxt:  { fontSize: 11, color: MUTED, fontFamily: 'ReadexPro-Regular', maxWidth: 110 },
  openBtn: {
    width: 36, height: 36, borderRadius: 12,
    backgroundColor: BRAND + '0F', borderWidth: 1, borderColor: BRAND + '22',
    alignItems: 'center', justifyContent: 'center',
  },
});

// ─── Empty state ─────────────────────────────────────────────────────────────
const Empty = ({ loading }) => (
  <View style={{ alignItems: 'center', paddingTop: 70, gap: 14 }}>
    {loading ? (
      <ActivityIndicator color={ACCENT} size="large" />
    ) : (
      <>
        <LinearGradient
          colors={[ACCENT + '22', BRAND + '11']}
          style={{ width: 88, height: 88, borderRadius: 44, alignItems: 'center', justifyContent: 'center' }}
        >
          <Ionicons name="storefront-outline" size={34} color={MUTED} />
        </LinearGradient>
        <Text style={{ fontSize: 16, fontWeight: '800', color: BLACK, fontFamily: 'ReadexPro-Bold' }}>
          No businesses followed
        </Text>
        <Text style={{ fontSize: 13, color: MUTED, textAlign: 'center', paddingHorizontal: 32, fontFamily: 'ReadexPro-Regular', lineHeight: 19 }}>
          You haven't followed any businesses yet. Discover and connect with businesses on Hafrik.
        </Text>
      </>
    )}
  </View>
);

// ─── Main Screen ──────────────────────────────────────────────────────────────
const LikedBusinessesScreen = () => {
  const navigation = useNavigation();
  const { top }    = useSafeAreaInsets();
  const { token }  = useAuth();

  const [businesses, setBusinesses] = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    if (!token) return;
    try {
      const res  = await fetch('https://hafrik.com/api/v1/feed/my_target.php', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      const pages = Array.isArray(json?.data?.pages) ? json.data.pages : [];
      setBusinesses(pages);
    } catch {}
  }, [token]);

  useEffect(() => {
    setLoading(true);
    fetchData().finally(() => setLoading(false));
  }, [fetchData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  }, [fetchData]);

  const renderItem = useCallback(({ item }) => <BusinessCard page={item} />, []);

  return (
    <View style={gs.root}>
      <StatusBar barStyle="light-content" />

      {/* ── Hero header — carries safe-area top padding ── */}
      <View style={[gs.header, { paddingTop: top + 12 }]}>
        <View style={gs.decor1} pointerEvents="none" />
        <View style={gs.decor2} pointerEvents="none" />

        <View style={gs.headerRow}>
          <TouchableOpacity style={gs.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.8}>
            <Ionicons name="arrow-back" size={20} color={WHITE} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={gs.eyebrow}>HAFRIK BUSINESS</Text>
            <Text style={gs.headerTitle}>Businesses You Follow</Text>
          </View>
        </View>

        <Text style={gs.headerDesc}>
          Stay connected with businesses, services, and opportunities you care about.
        </Text>

        <View style={gs.countBadge}>
          <Ionicons name="storefront" size={14} color={WHITE} />
          <Text style={gs.countTxt}>{fmtCount(businesses.length)} following</Text>
        </View>
      </View>

      {/* ── Business list ── */}
      <FlatList
        data={businesses}
        keyExtractor={(item, idx) => `biz-${item.id ?? idx}`}
        renderItem={renderItem}
        contentContainerStyle={gs.listContent}
        showsVerticalScrollIndicator={false}
        refreshing={refreshing}
        onRefresh={onRefresh}
        ListEmptyComponent={<Empty loading={loading} />}
        ListFooterComponent={
          loading && businesses.length > 0
            ? <ActivityIndicator color={ACCENT} style={{ marginVertical: 24 }} />
            : null
        }
      />
    </View>
  );
};

const gs = StyleSheet.create({
  root: { flex: 1, backgroundColor: CREAM },

  header: {
    backgroundColor: BRAND,
    paddingHorizontal: 18,
    paddingBottom: 20,
    overflow: 'hidden',
    shadowColor: BRAND,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.22,
    shadowRadius: 18,
    elevation: 14,
  },
  decor1: {
    position: 'absolute', width: 220, height: 220, borderRadius: 110,
    backgroundColor: WHITE + '05', top: -70, right: -50,
  },
  decor2: {
    position: 'absolute', width: 150, height: 150, borderRadius: 75,
    backgroundColor: WHITE + '06', bottom: -55, left: -40,
  },

  headerRow: {
    flexDirection: 'row', alignItems: 'flex-start',
    gap: 12, marginBottom: 14,
  },
  backBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: WHITE + '1E',
    alignItems: 'center', justifyContent: 'center',
    marginTop: 2,
  },
  eyebrow: {
    fontSize: 9, fontWeight: '700', letterSpacing: 2.5,
    color: WHITE + 'AA', marginBottom: 3, fontFamily: 'ReadexPro-Bold',
  },
  headerTitle: {
    fontSize: 22, fontWeight: '900', color: WHITE,
    fontFamily: 'ReadexPro-Bold',
  },
  headerDesc: {
    fontSize: 13, color: WHITE + 'CC', lineHeight: 20,
    marginBottom: 16, fontFamily: 'ReadexPro-Regular',
  },
  countBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    alignSelf: 'flex-start',
    backgroundColor: WHITE + '18', borderRadius: 100,
    paddingHorizontal: 12, paddingVertical: 6,
    borderWidth: 1, borderColor: WHITE + '22',
  },
  countTxt: {
    fontSize: 12, fontWeight: '700', color: WHITE,
    fontFamily: 'ReadexPro-SemiBold',
  },

  listContent: {
    paddingHorizontal: 16, paddingBottom: 100, paddingTop: 14, gap: 12,
  },
});

export default LikedBusinessesScreen;
