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

// ─── Community Card ──────────────────────────────────────────────────────────
const JoinedCommunityCard = ({ group }) => {
  const navigation = useNavigation();
  const title     = cleanText(group.title ?? group.name ?? 'Community');
  const cover     = group.cover ?? group.banner ?? null;
  const avatar    = group.avatar ?? null;
  const members   = group.members_count ?? group.members ?? 0;
  const isPrivate = group.privacy === 'private' || group.type === 'private';
  const category  = cleanText(group.category ?? '');

  const openGroup = () => navigation.navigate('GroupDetails', { groupId: group.id });

  return (
    <View style={cc.card}>
      {/* Cover */}
      <TouchableOpacity style={cc.coverWrap} activeOpacity={0.9} onPress={openGroup}>
        {isRealImg(cover) ? (
          <Image source={{ uri: cover }} style={cc.cover} resizeMode="cover" />
        ) : (
          <LinearGradient
            colors={[BRAND, ACCENT]}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            style={cc.cover}
          />
        )}
        <LinearGradient
          colors={['transparent', BLACK + 'C8']}
          style={cc.coverFade}
        />
        {isPrivate && (
          <View style={cc.privBadge}>
            <Ionicons name="lock-closed" size={10} color={WHITE} />
            <Text style={cc.privTxt}>Private</Text>
          </View>
        )}
        <View style={cc.coverBottom}>
          <Text style={cc.coverTitle} numberOfLines={2}>{title}</Text>
          <View style={cc.coverMeta}>
            <Ionicons name="people" size={12} color={WHITE + 'CC'} />
            <Text style={cc.coverMetaTxt}>{fmtCount(members)} members</Text>
            {!!category && (
              <>
                <View style={cc.dot} />
                <Text style={cc.coverMetaTxt}>{category}</Text>
              </>
            )}
          </View>
        </View>
      </TouchableOpacity>

      {/* Footer */}
      <View style={cc.footer}>
        <View style={cc.footerLeft}>
          {isRealImg(avatar) ? (
            <Image source={{ uri: avatar }} style={cc.avatar} resizeMode="cover" />
          ) : (
            <LinearGradient colors={[BRAND, ACCENT]} style={[cc.avatar, cc.avatarFb]}>
              <Ionicons name="people" size={14} color={WHITE} />
            </LinearGradient>
          )}
          <View>
            <Text style={cc.joinedLabel}>Joined</Text>
            <Text style={cc.privacyHint}>{isPrivate ? 'Private community' : 'Open community'}</Text>
          </View>
        </View>
        <TouchableOpacity style={cc.openBtn} activeOpacity={0.85} onPress={openGroup}>
          <Text style={cc.openBtnTxt}>Open</Text>
          <Ionicons name="arrow-forward" size={13} color={WHITE} />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const cc = StyleSheet.create({
  card: {
    backgroundColor: WHITE,
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: BRAND + '14',
    shadowColor: BLACK,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.09,
    shadowRadius: 14,
    elevation: 4,
  },
  coverWrap: { height: 168, position: 'relative' },
  cover:     { width: '100%', height: '100%' },
  coverFade: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 110 },
  privBadge: {
    position: 'absolute', top: 10, left: 12,
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: BLACK + '70',
    borderRadius: 100, paddingHorizontal: 10, paddingVertical: 4,
  },
  privTxt: {
    fontSize: 10, fontWeight: '700', color: WHITE,
    fontFamily: 'ReadexPro-Medium',
  },
  coverBottom: {
    position: 'absolute', bottom: 0, left: 14, right: 14, paddingBottom: 14,
  },
  coverTitle: {
    fontSize: 18, fontWeight: '900', color: WHITE,
    marginBottom: 6, fontFamily: 'ReadexPro-Bold',
  },
  coverMeta: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  coverMetaTxt: {
    fontSize: 11, color: WHITE + 'CC', fontWeight: '600',
    fontFamily: 'ReadexPro-Regular',
  },
  dot: { width: 3, height: 3, borderRadius: 2, backgroundColor: WHITE + '88' },
  footer: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14, paddingVertical: 13,
  },
  footerLeft:  { flexDirection: 'row', alignItems: 'center', gap: 10 },
  avatar:      { width: 38, height: 38, borderRadius: 10 },
  avatarFb:    { alignItems: 'center', justifyContent: 'center' },
  joinedLabel: {
    fontSize: 12, fontWeight: '700', color: ACCENT,
    fontFamily: 'ReadexPro-SemiBold',
  },
  privacyHint: { fontSize: 11, color: MUTED, fontFamily: 'ReadexPro-Regular' },
  openBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: BRAND, borderRadius: 100,
    paddingHorizontal: 16, paddingVertical: 9,
  },
  openBtnTxt: {
    fontSize: 12, fontWeight: '800', color: WHITE,
    fontFamily: 'ReadexPro-SemiBold',
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
          <Ionicons name="people-outline" size={34} color={MUTED} />
        </LinearGradient>
        <Text style={{ fontSize: 16, fontWeight: '800', color: BLACK, fontFamily: 'ReadexPro-Bold' }}>
          No communities yet
        </Text>
        <Text style={{ fontSize: 13, color: MUTED, textAlign: 'center', paddingHorizontal: 32, fontFamily: 'ReadexPro-Regular', lineHeight: 19 }}>
          You haven't joined any communities yet. Explore and join conversations.
        </Text>
      </>
    )}
  </View>
);

// ─── Main Screen ──────────────────────────────────────────────────────────────
const JoinedCommunitiesScreen = () => {
  const navigation = useNavigation();
  const { top }    = useSafeAreaInsets();
  const { token }  = useAuth();

  const [communities, setCommunities] = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [refreshing,  setRefreshing]  = useState(false);

  const fetchData = useCallback(async () => {
    if (!token) return;
    try {
      const res  = await fetch('https://hafrik.com/api/v1/feed/my_target.php', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      const groups = Array.isArray(json?.data?.groups) ? json.data.groups : [];
      setCommunities(groups);
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

  const renderItem = useCallback(({ item }) => <JoinedCommunityCard group={item} />, []);

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
            <Text style={gs.eyebrow}>HAFRIK</Text>
            <Text style={gs.headerTitle}>Your Communities</Text>
          </View>
        </View>

        <Text style={gs.headerDesc}>
          These are the communities you belong to where conversations, ideas, and experiences are shared.
        </Text>

        <View style={gs.countBadge}>
          <Ionicons name="people" size={14} color={WHITE} />
          <Text style={gs.countTxt}>{fmtCount(communities.length)} joined</Text>
        </View>
      </View>

      {/* ── Community list ── */}
      <FlatList
        data={communities}
        keyExtractor={(item, idx) => `comm-${item.id ?? idx}`}
        renderItem={renderItem}
        contentContainerStyle={gs.listContent}
        showsVerticalScrollIndicator={false}
        refreshing={refreshing}
        onRefresh={onRefresh}
        ListEmptyComponent={<Empty loading={loading} />}
        ListFooterComponent={
          loading && communities.length > 0
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
    shadowRadius: 16,
    elevation: 12,
  },
  decor1: {
    position: 'absolute', width: 230, height: 230, borderRadius: 115,
    backgroundColor: WHITE + '06', top: -80, right: -60,
  },
  decor2: {
    position: 'absolute', width: 140, height: 140, borderRadius: 70,
    backgroundColor: ACCENT + '14', bottom: -55, left: -30,
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
    color: ACCENT + 'CC', marginBottom: 3, fontFamily: 'ReadexPro-Bold',
  },
  headerTitle: {
    fontSize: 24, fontWeight: '900', color: WHITE,
    fontFamily: 'ReadexPro-Bold',
  },
  headerDesc: {
    fontSize: 13, color: WHITE + 'CC', lineHeight: 20,
    marginBottom: 16, fontFamily: 'ReadexPro-Regular',
  },
  countBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    alignSelf: 'flex-start',
    backgroundColor: WHITE + '1A', borderRadius: 100,
    paddingHorizontal: 12, paddingVertical: 6,
    borderWidth: 1, borderColor: WHITE + '22',
  },
  countTxt: {
    fontSize: 12, fontWeight: '700', color: WHITE,
    fontFamily: 'ReadexPro-SemiBold',
  },

  listContent: {
    paddingHorizontal: 16, paddingBottom: 100, paddingTop: 14, gap: 14,
  },
});

export default JoinedCommunitiesScreen;
