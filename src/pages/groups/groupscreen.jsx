import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  FlatList, Image, ActivityIndicator,
  Alert, ScrollView, StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../../AuthContext';
import { useNavigation } from '@react-navigation/native';
import { Colors } from '../../theme';


// ─── API imports ────────────────────────────────────────────────────────────
import { getGroups, getCategories, joinGroup, leaveGroup } from './services/groupApi';
import useStore from '../../repository/store';
import CreateModal from './CreateModal';

// ─── Design tokens ───────────────────────────────────────────────────────────
const BRAND  = Colors.primaryDark;
const ACCENT = Colors.primary;
const CREAM  = Colors.background;
const MUTED  = Colors.secondaryText;
const DARK   = Colors.black;
const BORDER = BRAND + '14';
const CARD   = Colors.white;
const WHITE  = Colors.white;
const BLACK  = Colors.black;
const FEATURE_GOLD = Colors.gradientOrange[0];
const FEATURE_AMBER = Colors.gradientOrange[1];
const COVER_TINT = ACCENT + 'CC';
const SCRIM_STRONG = BLACK + 'C7';
const SCRIM_MEDIUM = BLACK + '8C';
const SCRIM_SOFT = BLACK + '73';
const ON_DARK_80 = WHITE + 'CC';
const ON_DARK_85 = WHITE + 'D9';
const ON_DARK_55 = WHITE + '8C';
const ON_DARK_50 = WHITE + '80';
const ON_DARK_40 = WHITE + '66';
const ON_DARK_15 = WHITE + '26';
const ON_DARK_14 = WHITE + '24';
const ON_DARK_10 = WHITE + '1A';
const ON_DARK_04 = WHITE + '0A';
const ACCENT_SOFT_08 = ACCENT + '14';
const ACCENT_SOFT_09 = ACCENT + '17';
const ACCENT_SOFT_10 = ACCENT + '1A';
const ACCENT_SOFT_12 = ACCENT + '1F';
const ACCENT_SOFT_22 = ACCENT + '38';
const ACCENT_SOFT_25 = ACCENT + '40';
const ACCENT_SOFT_26 = ACCENT + '42';
const ACCENT_SOFT_50 = ACCENT + '80';
const BRAND_SOFT_07 = BRAND + '12';
const TEXT_ACCENT_DARK = BRAND;
const TEXT_SUBDUED = Colors.grey;

// ─── Helpers ─────────────────────────────────────────────────────────────────
const decodeHtml = (text = '') =>
  String(text)
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/&mdash;/g, '—').replace(/&rsquo;/g, "'").replace(/&lsquo;/g, "'");

const cleanText = (text = '') =>
  decodeHtml(text).replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();

const fmtCount = (n) => {
  const v = Number(n ?? 0);
  if (v >= 1_000_000) return (v / 1_000_000).toFixed(1) + 'M';
  if (v >= 1_000) return (v / 1_000).toFixed(1) + 'k';
  return String(v);
};

const isRealImage = (url) =>
  typeof url === 'string' && url.trim().length > 6 &&
  !url.includes('default-avatar') && !url.includes('blank_profile');

// ─── Community Card ───────────────────────────────────────────────────────────
const CommunityCard = ({ group, onOpen, onPostInGroup }) => {
  const { token } = useAuth();
  const [joining,     setJoining]     = useState(false);
  const [isMember,    setIsMember]    = useState(group.is_joined === true || group.is_joined === 1 || group._isMember === true);
  const [memberCount, setMemberCount] = useState(group.members_count ?? group.members ?? 0);

  useEffect(() => {
    setIsMember(group.is_joined === true || group.is_joined === 1 || group._isMember === true);
    setMemberCount(group.members_count ?? group.members ?? 0);
  }, [group.is_joined, group._isMember, group.members_count, group.members]);

  const handleJoinLeave = async () => {
    if (joining) return;
    setJoining(true);
    const was = isMember;
    try {
      if (was) { await leaveGroup(group.id, token); setIsMember(false); setMemberCount((c) => Math.max(0, c - 1)); }
      else     { await joinGroup(group.id, token);  setIsMember(true);  setMemberCount((c) => c + 1); }
    } catch {
      Alert.alert('Error', 'Could not update membership. Please try again.');
      setIsMember(was);
    } finally {
      setJoining(false);
    }
  };

  const title    = cleanText(group.title ?? '');
  const about    = cleanText(group.about ?? '');
  const category = cleanText(group.category ?? '');
  const cover    = group.cover ?? group.banner ?? null;
  const avatar   = group.avatar ?? null;
  const promoted = !!group.is_promoted;
  const private_ = group.privacy === 'private' || group.type === 'private';

  return (
    <View style={cc.card}>
      {/* ─ Cover — tappable, name + stats overlaid ─ */}
      <TouchableOpacity
        style={cc.coverWrap}
        activeOpacity={0.92}
        onPress={() => onOpen?.(group)}
      >
        {isRealImage(cover) ? (
          <Image source={{ uri: cover }} style={cc.cover} resizeMode="cover" />
        ) : (
          <LinearGradient
            colors={[BRAND, ACCENT, COVER_TINT]}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            style={cc.cover}
          />
        )}
        {/* Gradient fade for text legibility */}
        <LinearGradient
          colors={['transparent', SCRIM_STRONG]}
          style={cc.coverFade}
        />
        {/* Top badges */}
        <View style={cc.topBadges}>
          {promoted && (
            <View style={cc.featBadge}>
              <Ionicons name="star" size={9} color={FEATURE_GOLD} />
              <Text style={cc.featTxt}>Featured</Text>
            </View>
          )}
          {private_ && (
            <View style={cc.privBadge}>
              <Ionicons name="lock-closed" size={10} color={Colors.white} />
            </View>
          )}
        </View>
        {/* Name + member count + joined pill */}
        <View style={cc.coverBottom}>
          <Text style={cc.coverTitle} numberOfLines={1}>{title || 'Community'}</Text>
          <View style={cc.coverMeta}>
            <Ionicons name="people" size={12} color={ON_DARK_80} />
            <Text style={cc.coverMetaTxt}>{fmtCount(memberCount)} members</Text>
            {isMember && (
              <View style={cc.joinedPill}>
                <Ionicons name="checkmark-circle" size={11} color={ACCENT} />
                <Text style={cc.joinedTxt}>Joined</Text>
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>

      {/* ─ Body ─ */}
      <View style={cc.body}>
        <View style={cc.bodyTop}>
          {/* Avatar overlapping the cover */}
          <View style={cc.avatarWrap}>
            {isRealImage(avatar) ? (
              <Image source={{ uri: avatar }} style={cc.avatar} resizeMode="cover" />
            ) : (
              <LinearGradient colors={[BRAND, ACCENT]} style={[cc.avatar, cc.avatarFb]}>
                <Ionicons name="people" size={18} color={WHITE} />
              </LinearGradient>
            )}
          </View>
          {!!category && (
            <View style={cc.catChip}>
              <Text style={cc.catTxt}>{category}</Text>
            </View>
          )}
        </View>
        {!!about && (
          <Text style={cc.about} numberOfLines={2}>{about}</Text>
        )}
      </View>

      {/* ─ Footer ─ */}
      <View style={cc.footer}>
        {isMember ? (
          <TouchableOpacity
            style={cc.postBtn}
            activeOpacity={0.8}
            onPress={() => onPostInGroup?.(group)}
          >
            <Ionicons name="create-outline" size={13} color={ACCENT} />
            <Text style={cc.postTxt}>Post in group</Text>
          </TouchableOpacity>
        ) : (
          <View style={cc.hintRow}>
            <Ionicons name="chatbubbles-outline" size={13} color={MUTED} />
            <Text style={cc.hintTxt}>{private_ ? 'Private group' : 'Open community'}</Text>
          </View>
        )}
        <TouchableOpacity
          style={[cc.joinBtn, isMember && cc.leaveBtn]}
          onPress={handleJoinLeave}
          disabled={joining}
          activeOpacity={0.85}
        >
          {joining
            ? <ActivityIndicator size="small" color={isMember ? BRAND : Colors.white} />
            : <Text style={[cc.joinTxt, isMember && cc.leaveTxt]}>{isMember ? 'Leave' : 'Join Group'}</Text>
          }
        </TouchableOpacity>
      </View>
    </View>
  );
};

// ─── Community Card Styles ──────────────────────────────────────────────────
const cc = StyleSheet.create({
  card: {
    backgroundColor: WHITE, borderRadius: 20, overflow: 'hidden',
    shadowColor: BLACK, shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.1, shadowRadius: 16, elevation: 5,
    borderWidth: 1, borderColor: BRAND_SOFT_07,
  },
  coverWrap: { height: 140, position: 'relative', overflow: 'hidden' },
  cover:     { width: '100%', height: '100%' },
  coverFade: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 110 },
  topBadges: {
    position: 'absolute', top: 10, left: 12,
    flexDirection: 'row', gap: 6, alignItems: 'center',
  },
  featBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: BLACK + '85', borderRadius: 100,
    paddingHorizontal: 9, paddingVertical: 4,
  },
  featTxt:   { fontSize: 9, fontWeight: '900', color: FEATURE_GOLD, letterSpacing: 0.3 },
  privBadge: {
    width: 26, height: 26, borderRadius: 13,
    backgroundColor: SCRIM_MEDIUM, alignItems: 'center', justifyContent: 'center',
  },
  coverBottom:  { position: 'absolute', bottom: 0, left: 14, right: 14, paddingBottom: 12 },
  coverTitle:   { fontSize: 16, fontWeight: '900', color: WHITE, marginBottom: 5 },
  coverMeta:    { flexDirection: 'row', alignItems: 'center', gap: 6 },
  coverMetaTxt: { fontSize: 11, color: ON_DARK_85, fontWeight: '600' },
  joinedPill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: ACCENT_SOFT_26, borderRadius: 100,
    paddingHorizontal: 7, paddingVertical: 2,
    borderWidth: 1, borderColor: ACCENT_SOFT_50,
  },
  joinedTxt: { fontSize: 10, fontWeight: '800', color: ACCENT },
  body:      { paddingHorizontal: 14, paddingTop: 10, paddingBottom: 8 },
  bodyTop:   { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  avatarWrap: {
    width: 46, height: 46, borderRadius: 13,
    overflow: 'hidden', borderWidth: 3, borderColor: WHITE,
    marginTop: -26,
    shadowColor: BLACK, shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.14, shadowRadius: 8, elevation: 4,
  },
  avatar:   { width: '100%', height: '100%' },
  avatarFb: { alignItems: 'center', justifyContent: 'center' },
  catChip:  {
    backgroundColor: ACCENT + '18', borderRadius: 100,
    paddingHorizontal: 10, paddingVertical: 4,
  },
  catTxt:   { fontSize: 10, fontWeight: '800', color: TEXT_ACCENT_DARK },
  about:    { fontSize: 13, color: TEXT_SUBDUED, lineHeight: 19 },
  footer: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 14, paddingVertical: 11,
    borderTopWidth: 1, borderTopColor: BRAND_SOFT_07, gap: 10,
  },
  postBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    backgroundColor: ACCENT_SOFT_09, borderRadius: 100,
    paddingHorizontal: 12, paddingVertical: 8,
    borderWidth: 1, borderColor: ACCENT_SOFT_22,
  },
  postTxt:  { fontSize: 12, fontWeight: '700', color: ACCENT },
  hintRow:  { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6 },
  hintTxt:  { fontSize: 12, color: MUTED },
  joinBtn:  {
    backgroundColor: BRAND, borderRadius: 100,
    paddingHorizontal: 20, paddingVertical: 9,
    alignItems: 'center', minWidth: 95,
  },
  leaveBtn: { backgroundColor: WHITE, borderWidth: 1.5, borderColor: BRAND },
  joinTxt:  { fontSize: 12, fontWeight: '900', color: Colors.white },
  leaveTxt: { color: BRAND },
});

// ─── Filter pill row (horizontal scroll) ────────────────────────────────────
const FilterRow = ({ filters, active, onChange }) => (
  <ScrollView
    horizontal
    showsHorizontalScrollIndicator={false}
    contentContainerStyle={gs.filterWrap}
  >
    {filters.map((f) => (
      <TouchableOpacity
        key={f}
        style={[gs.filterPill, active === f && gs.filterPillOn]}
        onPress={() => onChange(f)}
        activeOpacity={0.8}
      >
        <Text style={[gs.filterTxt, active === f && gs.filterTxtOn]}>{f}</Text>
      </TouchableOpacity>
    ))}
  </ScrollView>
);

// ─── Stats bar ────────────────────────────────────────────────────────────────
const StatsBar = ({ items }) => (
  <View style={gs.statsBar}>
    {items.map((s, i) => (
      <React.Fragment key={s.label}>
        {i > 0 && <View style={gs.statsDivider} />}
        <View style={gs.statItem}>
          <Text style={gs.statNum}>{s.value}</Text>
          <Text style={gs.statLabel}>{s.label}</Text>
        </View>
      </React.Fragment>
    ))}
  </View>
);

// ─── Empty state ─────────────────────────────────────────────────────────────
const Empty = ({ loading, label }) =>
  loading ? (
    <View style={gs.emptyWrap}>
      <ActivityIndicator color={ACCENT} size="large" />
    </View>
  ) : (
    <View style={gs.emptyWrap}>
      <LinearGradient colors={[ACCENT + '22', BRAND + '11']} style={gs.emptyCircle}>
        <Ionicons name="search-outline" size={36} color={MUTED} />
      </LinearGradient>
      <Text style={gs.emptyTitle}>No {label} found</Text>
      <Text style={gs.emptySub}>Try adjusting your search or filters</Text>
    </View>
  );

// ─── Main Screen (Communities only) ─────────────────────────────────────────
const CommunitiesScreen = () => {
  const navigation      = useNavigation();
  const { top }         = useSafeAreaInsets();
  const { token, user } = useAuth();
  const openComposer    = useStore((s) => s.openComposer);

  const [showCreate,   setShowCreate]  = useState(false);
  const [groups,       setGroups]      = useState([]);
  const [groupsLoad,   setGroupsLoad]  = useState(true);
  const [groupsPage,   setGroupsPage]  = useState(1);
  const [groupsMore,   setGroupsMore]  = useState(true);
  const [groupFilter,  setGroupFilter] = useState('All');
  const [categories,   setCategories]  = useState([]);
  const [search,       setSearch]      = useState('');
  const [refreshing,   setRefreshing]  = useState(false);

  const loadGroups = useCallback(async (page = 1, replace = false) => {
    try {
      setGroupsLoad(true);
      const res = await getGroups(page, 15, {}, token);
      if (res?.status === 'success') {
        const items = res.data?.data ?? res.data ?? [];
        setGroups((p) => (replace ? items : [...p, ...items]));
        setGroupsMore(items.length >= 15);
        setGroupsPage(page);
      }
    } catch (e) {
      console.log('[Communities] loadGroups error:', e);
    } finally {
      setGroupsLoad(false);
    }
  }, [token]);

  const loadCategories = useCallback(async () => {
    try {
      const res = await getCategories(token);
      if (res?.status === 'success') {
        const cats = Array.isArray(res.data)
          ? [...res.data].sort((a, b) => (Number(b.group_count) || 0) - (Number(a.group_count) || 0))
          : [];
        setCategories(cats);
      }
    } catch (e) {
      console.log('[Communities] loadCategories error:', e);
    }
  }, [token]);

  useEffect(() => {
    loadGroups(1, true);
    loadCategories();
  }, []); // eslint-disable-line

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadGroups(1, true);
    setRefreshing(false);
  }, [loadGroups]);

  const communityFilters = useMemo(() => {
    const catNames = categories.map((c) => cleanText(c.name ?? c.category_name ?? ''));
    return ['All', 'My Groups', ...catNames].filter(Boolean);
  }, [categories]);

  const filteredGroups = useMemo(() => {
    let r = groups;
    if (search.trim()) {
      const q = search.toLowerCase();
      r = r.filter((g) =>
        cleanText(g.title ?? '').toLowerCase().includes(q) ||
        cleanText(g.about ?? '').toLowerCase().includes(q) ||
        cleanText(g.category ?? '').toLowerCase().includes(q)
      );
    }
    if (groupFilter === 'My Groups') {
      r = r.filter((g) => g.is_joined === true || g.is_joined === 1 || g._isMember === true);
    } else if (groupFilter !== 'All') {
      r = r.filter((g) => cleanText(g.category ?? '').toLowerCase() === groupFilter.toLowerCase());
    }
    return [...r].sort((a, b) => (b.is_promoted ? 1 : 0) - (a.is_promoted ? 1 : 0));
  }, [groups, search, groupFilter]);

  const handlePostInGroup = useCallback((group) => {
    openComposer({ _type: 'group', id: group.id, title: group.title, locked: true });
  }, [openComposer]);

  const renderGroup = useCallback(
    ({ item }) => (
      <CommunityCard
        group={item}
        onOpen={(g) => navigation.navigate('GroupDetails', { groupId: g.id })}
        onPostInGroup={handlePostInGroup}
      />
    ),
    [navigation, handlePostInGroup]
  );

  const groupStats = [
    { label: 'Groups',  value: fmtCount(groups.length) },
    { label: 'Joined',  value: fmtCount(groups.filter((g) => g.is_joined === true || g.is_joined === 1 || g._isMember).length) },
    { label: 'Showing', value: fmtCount(filteredGroups.length) },
  ];

  return (
    <View style={gs.root}>
      <StatusBar barStyle="light-content" />

      {/* ── Header ── */}
      <LinearGradient
        colors={[BRAND, ACCENT]}
        style={[gs.header, { paddingTop: top + 8 }]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        {/* Decorative circles */}
        <View style={gs.decor1} pointerEvents="none" />
        <View style={gs.decor2} pointerEvents="none" />

        {/* Back + title row */}
        <View style={gs.headerTop}>
          <TouchableOpacity style={gs.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.8}>
            <Ionicons name="arrow-back" size={20} color={Colors.white} />
          </TouchableOpacity>

          <View style={{ flex: 1 }}>
            <Text style={gs.headerEyebrow}>HAFRIK</Text>
            <Text style={gs.headerTitle}>Communities</Text>
          </View>

          <TouchableOpacity
            style={gs.createBtn}
            activeOpacity={0.85}
            onPress={() => setShowCreate(true)}
          >
            <Ionicons name="add" size={16} color={Colors.white} />
            <Text style={gs.createBtnTxt}>Create</Text>
          </TouchableOpacity>
        </View>

        {/* Search bar */}
        <View style={gs.searchBar}>
          <Ionicons name="search-outline" size={16} color={ON_DARK_55} style={{ marginRight: 8 }} />
          <TextInput
            style={gs.searchInput}
            placeholder="Search communities…"
            placeholderTextColor={ON_DARK_40}
            value={search}
            onChangeText={setSearch}
            returnKeyType="search"
            autoCorrect={false}
            autoCapitalize="none"
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={18} color={ON_DARK_50} />
            </TouchableOpacity>
          )}
        </View>

      </LinearGradient>

      <View style={{ flex: 1 }}>
        <FilterRow filters={communityFilters} active={groupFilter} onChange={setGroupFilter} />
        <StatsBar items={groupStats} />
        <FlatList
          data={filteredGroups}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderGroup}
          contentContainerStyle={gs.listContent}
          showsVerticalScrollIndicator={false}
          refreshing={refreshing}
          onRefresh={onRefresh}
          onEndReached={() => { if (groupsMore && !groupsLoad) loadGroups(groupsPage + 1); }}
          onEndReachedThreshold={0.4}
          ListEmptyComponent={<Empty loading={groupsLoad} label="communities" />}
          ListFooterComponent={
            groupsLoad && groups.length > 0
              ? <ActivityIndicator color={ACCENT} style={{ marginVertical: 20 }} />
              : null
          }
        />
      </View>

      <CreateModal
        visible={showCreate}
        type="community"
        navigation={navigation}
        token={token}
        user={user}
        onClose={() => setShowCreate(false)}
        onCreated={() => loadGroups(1, true)}
      />
    </View>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────
const gs = StyleSheet.create({
  root: { flex: 1, backgroundColor: CREAM },

  // Header
  header: {
    paddingHorizontal: 16, paddingBottom: 14, overflow: 'hidden',
    shadowColor: BRAND, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.28, shadowRadius: 16, elevation: 14,
  },
  decor1: {
    position: 'absolute', width: 200, height: 200, borderRadius: 100,
    backgroundColor: ON_DARK_04, top: -80, right: -60,
  },
  decor2: {
    position: 'absolute', width: 120, height: 120, borderRadius: 60,
    backgroundColor: ACCENT_SOFT_08, bottom: -40, left: -30,
  },
  headerTop: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14 },
  backBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: ON_DARK_14, alignItems: 'center', justifyContent: 'center',
  },
  headerEyebrow: { fontSize: 9, fontWeight: '700', letterSpacing: 2.5, color: ACCENT, marginBottom: 2 },
  headerTitle:   { fontSize: 22, fontWeight: '900', color: Colors.white },
  createBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: ACCENT, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 100,
  },
  createBtnTxt: { fontSize: 12, fontWeight: '800', color: Colors.white },

  searchBar: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: ON_DARK_10, borderRadius: 100,
    borderWidth: 1, borderColor: ON_DARK_15,
    paddingHorizontal: 14, height: 42, marginBottom: 14,
  },
  searchInput: { flex: 1, color: Colors.white, fontSize: 13 },

  // Filter
  filterWrap: { paddingHorizontal: 14, paddingVertical: 12, gap: 8 },
  filterPill: {
    height: 32, paddingHorizontal: 14, borderRadius: 100,
    backgroundColor: BRAND_SOFT_07, borderWidth: 1, borderColor: BORDER,
    alignItems: 'center', justifyContent: 'center',
  },
  filterPillOn: { backgroundColor: BRAND, borderColor: BRAND },
  filterTxt:    { fontSize: 12, fontWeight: '600', color: DARK },
  filterTxtOn:  { color: Colors.white },

  // Stats
  statsBar:   { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 10, gap: 0 },
  statItem:   { flex: 1, alignItems: 'center' },
  statNum:    { fontSize: 16, fontWeight: '900', color: DARK },
  statLabel:  { fontSize: 10, color: MUTED, marginTop: 1 },
  statsDivider: { width: 1, height: 28, backgroundColor: BORDER },

  listContent: { paddingHorizontal: 14, paddingBottom: 100, gap: 14 },

  // Card
  card: {
    backgroundColor: CARD, borderRadius: 20, overflow: 'hidden',
    borderWidth: 1, borderColor: BORDER,
    shadowColor: BLACK, shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06, shadowRadius: 10, elevation: 3,
  },
  cover: { width: '100%', height: 88 },
  coverPattern: {
    position: 'absolute', inset: 0,
    backgroundColor: BLACK + '14',
  },
  coverBadges: {
    position: 'absolute', top: 8, left: 8, right: 8,
    flexDirection: 'row', gap: 6, flexWrap: 'wrap',
  },
  promotedChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: SCRIM_SOFT, borderRadius: 100,
    paddingHorizontal: 8, paddingVertical: 3,
  },
  promotedTxt: { fontSize: 9, fontWeight: '800', color: FEATURE_AMBER },
  privateChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: SCRIM_SOFT, borderRadius: 100,
    paddingHorizontal: 8, paddingVertical: 3,
  },
  privateTxt: { fontSize: 9, fontWeight: '700', color: Colors.white },
  memberChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: SCRIM_SOFT, borderRadius: 100,
    paddingHorizontal: 8, paddingVertical: 3,
  },
  memberChipTxt: { fontSize: 9, fontWeight: '700', color: ACCENT },
  verifiedChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: ACCENT, borderRadius: 100,
    paddingHorizontal: 8, paddingVertical: 3,
  },
  verifiedTxt: { fontSize: 9, fontWeight: '800', color: Colors.white },

  cardBody: { padding: 14 },
  avatarRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 10 },
  avatar: { width: 52, height: 52, borderRadius: 14, marginTop: -28, borderWidth: 3, borderColor: CARD },
  avatarFallback: { alignItems: 'center', justifyContent: 'center' },

  title:  { fontSize: 15, fontWeight: '900', color: DARK, flexShrink: 1 },
  metaRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6, marginTop: 4 },
  catPill: {
    backgroundColor: ACCENT_SOFT_12, borderRadius: 100,
    paddingHorizontal: 8, paddingVertical: 2, maxWidth: 160,
  },
  catTxt: { fontSize: 10, fontWeight: '700', color: TEXT_ACCENT_DARK },
  memberStat: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  memberStatTxt: { fontSize: 11, color: MUTED },

  descWrap: { marginTop: 2 },
  desc:     { fontSize: 13, color: TEXT_SUBDUED, lineHeight: 19 },
  descToggle: { fontSize: 12, fontWeight: '700', color: ACCENT, marginTop: 4 },

  footer: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 14, paddingVertical: 12,
    borderTopWidth: 1, borderTopColor: BORDER,
  },
  postBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 100,
    backgroundColor: ACCENT_SOFT_10, borderWidth: 1, borderColor: ACCENT_SOFT_25,
  },
  postBtnTxt: { fontSize: 12, fontWeight: '700', color: ACCENT },

  joinBtn: {
    backgroundColor: BRAND, paddingHorizontal: 18, paddingVertical: 8,
    borderRadius: 100, minWidth: 90, alignItems: 'center',
  },
  leaveBtn: { backgroundColor: CARD, borderWidth: 1.5, borderColor: BRAND },
  joinTxt:  { fontSize: 12, fontWeight: '800', color: Colors.white },
  leaveTxt: { color: BRAND },

  followerRow:    { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 5 },
  followerRowTxt: { fontSize: 12, color: MUTED, fontWeight: '600' },
  followerRowTxtOn: { color: ACCENT },

  // Empty
  emptyWrap:   { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 80, gap: 14 },
  emptyCircle: { width: 90, height: 90, borderRadius: 45, alignItems: 'center', justifyContent: 'center' },
  emptyTitle:  { fontSize: 16, fontWeight: '800', color: DARK },
  emptySub:    { fontSize: 12, color: MUTED, textAlign: 'center' },
});

export default CommunitiesScreen;
