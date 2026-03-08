import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  Image, ActivityIndicator, RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../AuthContext';
import { Colors } from '../../theme/colors';

const BRAND  = Colors.primaryDark;
const ACCENT = Colors.primary;
const CREAM  = Colors.background;
const MUTED  = Colors.secondaryText;
const WHITE  = Colors.white;
const BLACK  = Colors.black;
const BORDER = Colors.borderLight ?? '#EBEBEB';

const TABS = [
  { key: 'businesses', label: 'My Businesses',  icon: 'storefront-outline'   },
  { key: 'communities', label: 'My Communities', icon: 'people-circle-outline' },
];

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

// ─── Empty state ──────────────────────────────────────────────────────────────
const EmptyState = ({ icon, message }) => (
  <View style={styles.empty}>
    <LinearGradient
      colors={[ACCENT + '1A', BRAND + '0E']}
      style={styles.emptyCircle}
    >
      <Ionicons name={icon} size={34} color={MUTED} />
    </LinearGradient>
    <Text style={styles.emptyText}>{message}</Text>
  </View>
);

// ─── Business card ────────────────────────────────────────────────────────────
const BusinessCard = ({ item }) => {
  const navigation = useNavigation();
  const name      = cleanText(item.title || item.name || 'Business');
  const avatar    = item.logo ?? item.avatar ?? item.image ?? null;
  const followers = Number(item.followers_count ?? item.likes ?? item.members ?? 0);
  const category  = cleanText(item.category ?? item.type ?? '');
  const about     = cleanText(item.about || item.description || '');

  return (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.85}
      onPress={() => navigation.navigate('BusinessDetails', { pageId: item.id ?? item.page_id })}
    >
      <View style={styles.cardAvatarWrap}>
        {isRealImg(avatar) ? (
          <Image source={{ uri: avatar }} style={styles.cardAvatar} resizeMode="cover" />
        ) : (
          <LinearGradient
            colors={[BRAND, ACCENT]}
            style={[styles.cardAvatar, styles.cardAvatarFallback]}
          >
            <Ionicons name="storefront" size={22} color={WHITE} />
          </LinearGradient>
        )}
      </View>
      <View style={styles.cardInfo}>
        <Text style={styles.cardName} numberOfLines={1}>{name}</Text>
        {!!category && <Text style={styles.cardCategory} numberOfLines={1}>{category}</Text>}
        {!!about    && <Text style={styles.cardMeta} numberOfLines={1}>{about}</Text>}
        {followers > 0 && (
          <View style={styles.cardStatRow}>
            <Ionicons name="people-outline" size={11} color={MUTED} />
            <Text style={styles.cardStat}>{fmtCount(followers)} followers</Text>
          </View>
        )}
      </View>
      <View style={styles.cardArrow}>
        <Ionicons name="chevron-forward" size={14} color={BRAND + '66'} />
      </View>
    </TouchableOpacity>
  );
};

// ─── Community card ───────────────────────────────────────────────────────────
const CommunityCard = ({ item }) => {
  const navigation = useNavigation();
  const name    = cleanText(item.title || item.name || 'Community');
  const avatar  = item.avatar ?? item.cover ?? item.image ?? null;
  const members = Number(item.members_count ?? item.members ?? 0);
  const about   = cleanText(item.about || item.description || '');

  return (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.85}
      onPress={() => navigation.navigate('GroupDetails', { groupId: item.id ?? item.group_id })}
    >
      <View style={[styles.cardAvatarWrap, styles.communityAvatarWrap]}>
        {isRealImg(avatar) ? (
          <Image source={{ uri: avatar }} style={styles.cardAvatar} resizeMode="cover" />
        ) : (
          <LinearGradient
            colors={[ACCENT, BRAND]}
            style={[styles.cardAvatar, styles.cardAvatarFallback]}
          >
            <Ionicons name="people" size={22} color={WHITE} />
          </LinearGradient>
        )}
      </View>
      <View style={styles.cardInfo}>
        <Text style={styles.cardName} numberOfLines={1}>{name}</Text>
        {!!about && <Text style={styles.cardMeta} numberOfLines={1}>{about}</Text>}
        {members > 0 && (
          <View style={styles.cardStatRow}>
            <Ionicons name="people-outline" size={11} color={MUTED} />
            <Text style={styles.cardStat}>{fmtCount(members)} members</Text>
          </View>
        )}
      </View>
      <View style={styles.cardArrow}>
        <Ionicons name="chevron-forward" size={14} color={BRAND + '66'} />
      </View>
    </TouchableOpacity>
  );
};

// ─── Main screen ──────────────────────────────────────────────────────────────
const MyPagesAndGroupsScreen = () => {
  const navigation = useNavigation();
  const route      = useRoute();
  const insets     = useSafeAreaInsets();
  const { token }  = useAuth();

  // Support deep-linking to a specific tab from the drawer
  const initialTab = route.params?.initialTab ?? 'businesses';

  const [activeTab,  setActiveTab]  = useState(initialTab);
  const [pages,      setPages]      = useState([]);
  const [groups,     setGroups]     = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    if (!token) return;
    try {
      const res  = await fetch('https://hafrik.com/api/v1/feed/my_target.php', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      const data = json?.data ?? {};
      setPages(Array.isArray(data.pages)  ? data.pages  : []);
      setGroups(Array.isArray(data.groups) ? data.groups : []);
    } catch {}
  }, [token]);

  useEffect(() => {
    setLoading(true);
    fetchData().finally(() => setLoading(false));
  }, [fetchData]);

  // Keep tab in sync if navigated with a new initialTab
  useEffect(() => {
    if (route.params?.initialTab) {
      setActiveTab(route.params.initialTab);
    }
  }, [route.params?.initialTab]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  }, [fetchData]);

  const listData = activeTab === 'businesses' ? pages : groups;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>

      {/* ── Hero gradient ── */}
      <LinearGradient
        colors={[BRAND, ACCENT + 'EE']}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        style={styles.hero}
      >
        <View style={styles.decor1} pointerEvents="none" />
        <View style={styles.decor2} pointerEvents="none" />

        <View style={styles.heroTopRow}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.8}>
            <Ionicons name="arrow-back" size={20} color={WHITE} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={styles.heroEyebrow}>HAFRIK</Text>
            <Text style={styles.heroTitle}>Your Network</Text>
          </View>
        </View>

        <Text style={styles.heroDesc}>
          Manage the communities you participate in and the businesses you run.
        </Text>

        <View style={styles.heroStats}>
          <View style={styles.heroStat}>
            <Ionicons name="storefront-outline" size={15} color={WHITE} />
            <Text style={styles.heroStatNum}>{pages.length}</Text>
            <Text style={styles.heroStatLabel}>Businesses</Text>
          </View>
          <View style={styles.heroStatDivider} />
          <View style={styles.heroStat}>
            <Ionicons name="people-outline" size={15} color={WHITE} />
            <Text style={styles.heroStatNum}>{groups.length}</Text>
            <Text style={styles.heroStatLabel}>Communities</Text>
          </View>
        </View>
      </LinearGradient>

      {/* ── Tab bar ── */}
      <View style={styles.tabBar}>
        {TABS.map((tab) => {
          const active = activeTab === tab.key;
          return (
            <TouchableOpacity
              key={tab.key}
              style={[styles.tab, active && styles.tabActive]}
              onPress={() => setActiveTab(tab.key)}
              activeOpacity={0.8}
            >
              <Ionicons
                name={tab.icon}
                size={15}
                color={active ? BRAND : MUTED}
                style={{ marginRight: 5 }}
              />
              <Text style={[styles.tabLabel, active && styles.tabLabelActive]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* ── Content ── */}
      {loading ? (
        <View style={styles.loaderWrap}>
          <ActivityIndicator size="large" color={ACCENT} />
        </View>
      ) : (
        <FlatList
          data={listData}
          keyExtractor={(item, idx) => `${activeTab}-${item.id ?? idx}`}
          renderItem={({ item }) =>
            activeTab === 'businesses'
              ? <BusinessCard item={item} />
              : <CommunityCard item={item} />
          }
          contentContainerStyle={[
            styles.list,
            listData.length === 0 && styles.listEmpty,
          ]}
          showsVerticalScrollIndicator={false}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={[ACCENT]}
              tintColor={ACCENT}
            />
          }
          ListEmptyComponent={
            <EmptyState
              icon={activeTab === 'businesses' ? 'storefront-outline' : 'people-circle-outline'}
              message={
                activeTab === 'businesses'
                  ? 'You have no business pages yet.'
                  : 'You have no communities yet.'
              }
            />
          }
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: CREAM },

  // ── Hero
  hero: {
    paddingHorizontal: 18,
    paddingBottom: 20,
    overflow: 'hidden',
    shadowColor: BRAND,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.22,
    shadowRadius: 14,
    elevation: 10,
  },
  decor1: {
    position: 'absolute', width: 200, height: 200, borderRadius: 100,
    backgroundColor: WHITE + '06', top: -70, right: -50,
  },
  decor2: {
    position: 'absolute', width: 120, height: 120, borderRadius: 60,
    backgroundColor: ACCENT + '14', bottom: -45, left: -25,
  },
  heroTopRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12,
  },
  backBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: WHITE + '1E',
    alignItems: 'center', justifyContent: 'center',
  },
  heroEyebrow: {
    fontSize: 9, fontWeight: '700', letterSpacing: 2.5,
    color: ACCENT + 'CC', marginBottom: 2, fontFamily: 'ReadexPro-Bold',
  },
  heroTitle: {
    fontSize: 22, fontWeight: '900', color: WHITE,
    fontFamily: 'ReadexPro-Bold',
  },
  heroDesc: {
    fontSize: 13, color: WHITE + 'CC', lineHeight: 19,
    marginBottom: 16, fontFamily: 'ReadexPro-Regular',
  },
  heroStats: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: WHITE + '14',
    borderRadius: 14, paddingVertical: 12, paddingHorizontal: 20,
    borderWidth: 1, borderColor: WHITE + '1A',
  },
  heroStat:        { flex: 1, alignItems: 'center', gap: 4 },
  heroStatDivider: { width: 1, height: 32, backgroundColor: WHITE + '22' },
  heroStatNum:     { fontSize: 18, fontWeight: '900', color: WHITE, fontFamily: 'ReadexPro-Bold' },
  heroStatLabel:   { fontSize: 10, color: WHITE + 'AA', fontFamily: 'ReadexPro-Regular', textTransform: 'uppercase', letterSpacing: 0.4 },

  // ── Tabs
  tabBar: {
    flexDirection: 'row',
    backgroundColor: WHITE,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
    paddingHorizontal: 16,
    paddingTop: 2,
  },
  tab: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 13, paddingHorizontal: 14,
    marginRight: 4,
    borderBottomWidth: 2.5, borderBottomColor: 'transparent',
  },
  tabActive: { borderBottomColor: BRAND },
  tabLabel: {
    fontSize: 13, fontWeight: '600', color: MUTED,
    fontFamily: 'ReadexPro-Medium',
  },
  tabLabelActive: {
    color: BRAND, fontWeight: '800',
    fontFamily: 'ReadexPro-Bold',
  },

  // ── List
  list: {
    paddingHorizontal: 16, paddingTop: 14, paddingBottom: 50,
  },
  listEmpty: { flex: 1, justifyContent: 'center' },
  separator: { height: 10 },

  // ── Cards
  card: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: WHITE, borderRadius: 16, padding: 14,
    borderWidth: 1, borderColor: BORDER, gap: 12,
    shadowColor: BRAND, shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 4, elevation: 1,
  },
  cardAvatarWrap:       { borderRadius: 14, overflow: 'hidden' },
  communityAvatarWrap:  { borderRadius: 12 },
  cardAvatar: { width: 54, height: 54, borderRadius: 14 },
  cardAvatarFallback:   { alignItems: 'center', justifyContent: 'center' },
  cardInfo: { flex: 1, gap: 3 },
  cardName: {
    fontSize: 14, fontWeight: '800', color: BRAND,
    fontFamily: 'ReadexPro-Bold',
  },
  cardCategory: {
    fontSize: 11, color: ACCENT, fontWeight: '600',
    fontFamily: 'ReadexPro-Medium',
  },
  cardMeta: {
    fontSize: 12, color: MUTED, lineHeight: 16,
    fontFamily: 'ReadexPro-Regular',
  },
  cardStatRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  cardStat: {
    fontSize: 11, color: MUTED, fontWeight: '500',
    fontFamily: 'ReadexPro-Regular',
  },
  cardArrow: {
    width: 28, height: 28, borderRadius: 10,
    backgroundColor: BRAND + '0A',
    alignItems: 'center', justifyContent: 'center',
  },

  // ── Loader / empty
  loaderWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  empty: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60, gap: 14 },
  emptyCircle: { width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center' },
  emptyText: {
    fontSize: 14, color: MUTED, fontWeight: '500',
    fontFamily: 'ReadexPro-Regular',
  },
});

export default MyPagesAndGroupsScreen;
