import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  FlatList, Image, ActivityIndicator, ScrollView,
  StatusBar, Modal, TouchableWithoutFeedback,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../../AuthContext';
import { useNavigation } from '@react-navigation/native';
import { Colors } from '../../theme';
import { useTheme } from '../../theme/ThemeContext';

// ─── API imports ─────────────────────────────────────────────────────────────
import { getGroups, getCategories, joinGroup, leaveGroup } from './services/groupApi';
import CreateModal from './CreateModal';

// ─── Design tokens ────────────────────────────────────────────────────────────
const BRAND          = Colors.primaryDark;
const ACCENT         = Colors.primary;
const CREAM          = Colors.background;
const MUTED          = Colors.secondaryText;
const DARK           = Colors.black;

const CARD           = Colors.white;
const WHITE          = Colors.white;
const BLACK          = Colors.black;
const FEATURE_GOLD   = Colors.gradientOrange?.[0] ?? '#f59e0b';
const COVER_TINT     = ACCENT + 'CC';
const SCRIM_STRONG   = BLACK + 'C7';
const SCRIM_MEDIUM   = BLACK + '8C';
const ON_DARK_80     = WHITE + 'CC';
const ON_DARK_85     = WHITE + 'D9';
const ON_DARK_55     = WHITE + '8C';
const ON_DARK_40     = WHITE + '66';
const ON_DARK_15     = WHITE + '26';
const ON_DARK_14     = WHITE + '24';
const ON_DARK_10     = WHITE + '1A';
const ON_DARK_04     = WHITE + '0A';
const ACCENT_SOFT_09 = ACCENT + '17';
const ACCENT_SOFT_22 = ACCENT + '38';
const ACCENT_SOFT_26 = ACCENT + '42';
const ACCENT_SOFT_50 = ACCENT + '80';
const BRAND_SOFT_07  = BRAND + '12';
const TEXT_ACCENT    = BRAND;
const TEXT_SUBDUED   = Colors.grey;

// ─── Helpers ──────────────────────────────────────────────────────────────────
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
  if (v >= 1_000)     return (v / 1_000).toFixed(1) + 'k';
  return String(v);
};

const isRealImage = (url) =>
  typeof url === 'string' && url.trim().length > 6 &&
  !url.includes('default-avatar') && !url.includes('blank_profile');


// ─── Community Card (horizontal list) ────────────────────────────────────────
const CommunityCard = ({ item, onJoinToggle, onOpen }) => {
  const title   = cleanText(item.title ?? '');
  const avatar  = item.avatar ?? null;
  const members = item.members ?? item.members_count ?? 0;
  const joined  = item.is_joined === true || item.is_joined === 1;

  return (
    <View style={cc.card}>
      {/* Single row: avatar | info | join btn | chevron */}
      <TouchableOpacity style={cc.row} activeOpacity={0.88} onPress={onOpen}>
        {/* Avatar */}
        {isRealImage(avatar) ? (
          <Image source={{ uri: avatar }} style={cc.avatar} resizeMode="cover" />
        ) : (
          <LinearGradient colors={[BRAND, ACCENT]} style={[cc.avatar, cc.avatarFb]}>
            <Ionicons name="people" size={22} color={WHITE} />
          </LinearGradient>
        )}

        {/* Info */}
        <View style={cc.info}>
          <Text style={cc.title} numberOfLines={1}>{title || 'Community'}</Text>
          <Text style={cc.members}>{fmtCount(members)} Members</Text>
        </View>

        {/* Join / Joined button — stops propagation so tap doesn't open group */}
        <TouchableOpacity
          style={joined ? cc.joinedBtn : cc.joinBtn}
          onPress={(e) => { e.stopPropagation(); onJoinToggle(item); }}
          activeOpacity={0.85}
          hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
        >
          <Text style={joined ? cc.joinedText : cc.joinText}>
            {joined ? '✓ Joined' : '+ Join'}
          </Text>
        </TouchableOpacity>

        <Ionicons name="chevron-forward" size={16} color={MUTED + '80'} />
      </TouchableOpacity>
    </View>
  );
};

// ─── Community Card Styles ────────────────────────────────────────────────────
const cc = StyleSheet.create({
  card: {
    backgroundColor: CARD,
    borderRadius: 14,
    marginHorizontal: 14,
    borderWidth: 1,
    borderColor: BRAND_SOFT_07,
    shadowColor: BLACK,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 14,
    gap: 12,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 14,
  },
  avatarFb: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: {
    flex: 1,
    gap: 3,
  },
  title: {
    fontSize: 14,
    fontWeight: '800',
    color: DARK,
    lineHeight: 19,
  },
  members: {
    fontSize: 12,
    color: MUTED,
    fontWeight: '500',
  },
  joinBtn: {
    backgroundColor: BRAND,
    borderRadius: 100,
    paddingHorizontal: 22,
    paddingVertical: 9,
  },
  joinedBtn: {
    backgroundColor: ACCENT,
    borderRadius: 100,
    paddingHorizontal: 22,
    paddingVertical: 9,
  },
  joinText:   { fontSize: 13, fontWeight: '800', color: WHITE },
  joinedText: { fontSize: 13, fontWeight: '800', color: WHITE },
  postBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: 100,
    paddingVertical: 9,
    backgroundColor: ACCENT + '12',
    borderWidth: 1,
    borderColor: ACCENT + '30',
  },
  postTxt: { fontSize: 13, fontWeight: '700', color: ACCENT },
});

// ─── Main Screen ──────────────────────────────────────────────────────────────
const CommunitiesScreen = () => {
  const navigation      = useNavigation();
  const { top }         = useSafeAreaInsets();
  const { token, user } = useAuth();
  const { colors: tc }  = useTheme();

  const TABS = [
    { key: 'discover', label: 'Discover' },
    { key: 'joined',   label: 'Joined Communities' },
    { key: 'managed',  label: 'My Communities' },
  ];

  const [showCreate,       setShowCreate]       = useState(false);
  const [groups,           setGroups]           = useState([]);
  const [groupsLoad,       setGroupsLoad]       = useState(true);
  const [groupsPage,       setGroupsPage]       = useState(1);
  const [groupsMore,       setGroupsMore]       = useState(true);
  const [activeTab,        setActiveTab]        = useState('discover');
  const [categories,       setCategories]       = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [showCatPicker,    setShowCatPicker]    = useState(false);
  const [search,           setSearch]           = useState('');
  const [refreshing,       setRefreshing]       = useState(false);

  const activeTabRef       = useRef(activeTab);
  const searchRef          = useRef(search);
  const selectedCatRef     = useRef(selectedCategory);
  activeTabRef.current     = activeTab;
  searchRef.current        = search;
  selectedCatRef.current   = selectedCategory;

  const loadGroups = useCallback(async (page = 1, replace = false) => {
    try {
      setGroupsLoad(true);
      const tab   = activeTabRef.current;
      const query = searchRef.current;
      const cat   = selectedCatRef.current;

      const params = {};
      if (tab === 'joined')  params.joined  = 1;
      if (tab === 'managed') params.managed = 1;
      if (cat?.id)           params.category_id = cat.id;
      if (query.trim())      params.search  = query.trim();

      const res = await getGroups(page, 20, params);
      if (res?.status === 'success') {
        const items = Array.isArray(res.data?.data) ? res.data.data : (Array.isArray(res.data) ? res.data : []);
        setGroups((p) => (replace ? items : [...p, ...items]));
        setGroupsMore(items.length >= 20);
        setGroupsPage(page);
      }
    } catch (e) {
      console.log('[Communities] loadGroups error:', e);
    } finally {
      setGroupsLoad(false);
    }
  }, []);

  const loadCategories = useCallback(async () => {
    try {
      const res = await getCategories(token);
      if (res?.status === 'success') {
        const raw = Array.isArray(res.data) ? res.data : [];
        setCategories(raw);
      }
    } catch (e) {
      console.log('[Communities] loadCategories error:', e);
    }
  }, [token]);

  // Initial load
  useEffect(() => {
    loadGroups(1, true);
    loadCategories();
  }, []); // eslint-disable-line

  // Reload when tab changes
  const firstTabRender = useRef(true);
  useEffect(() => {
    if (firstTabRender.current) { firstTabRender.current = false; return; }
    setSelectedCategory(null); // reset category on tab switch
    setGroups([]);
    setGroupsPage(1);
    setGroupsMore(true);
    loadGroups(1, true);
  }, [activeTab]); // eslint-disable-line

  // Reload when category changes
  const firstCatRender = useRef(true);
  useEffect(() => {
    if (firstCatRender.current) { firstCatRender.current = false; return; }
    setGroups([]);
    setGroupsPage(1);
    setGroupsMore(true);
    loadGroups(1, true);
  }, [selectedCategory]); // eslint-disable-line

  // Reload on search change (debounced)
  const firstSearchRender = useRef(true);
  useEffect(() => {
    if (firstSearchRender.current) { firstSearchRender.current = false; return; }
    const t = setTimeout(() => {
      setGroups([]);
      setGroupsPage(1);
      setGroupsMore(true);
      loadGroups(1, true);
    }, 400);
    return () => clearTimeout(t);
  }, [search]); // eslint-disable-line

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadGroups(1, true);
    setRefreshing(false);
  }, [loadGroups]);

  // ── Optimistic join/leave — state lives here, card is pure display ──────────
  const handleJoinToggle = useCallback(async (item) => {
    const isJoining = !(item.is_joined === true || item.is_joined === 1);

    // Optimistic update
    setGroups(prev => prev.map(c =>
      c.id === item.id
        ? { ...c, is_joined: isJoining, members: isJoining ? (c.members ?? 0) + 1 : Math.max(0, (c.members ?? 0) - 1) }
        : c
    ));

    try {
      const res = await (isJoining ? joinGroup(item.id) : leaveGroup(item.id));
      const updated = res?.data;
      if (updated) {
        setGroups(prev => prev.map(c =>
          c.id === item.id
            ? { ...c, is_joined: updated.is_joined, members: updated.members }
            : c
        ));
      }
    } catch {
      // Rollback
      setGroups(prev => prev.map(c =>
        c.id === item.id
          ? { ...c, is_joined: !isJoining, members: isJoining ? Math.max(0, (c.members ?? 0) - 1) : (c.members ?? 0) + 1 }
          : c
      ));
    }
  }, []);


  const joinedCount = useMemo(
    () => groups.filter((g) => g.is_joined === true || g.is_joined === 1).length,
    [groups]
  );

  const renderGroup = useCallback(
    ({ item }) => (
      <CommunityCard
        item={item}
        onJoinToggle={handleJoinToggle}
        onOpen={() => navigation.navigate('GroupDetails', { groupId: item.id })}
      />
    ),
    [handleJoinToggle, navigation]
  );

  return (
    <View style={[gs.root, { backgroundColor: tc.background ?? CREAM }]}>
      <StatusBar barStyle="light-content" />

      {/* ── Slim fixed header ── */}
      <View style={[gs.header, { paddingTop: top + 8 }]}>
        <View style={gs.headerTop}>
          <TouchableOpacity style={gs.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.8}>
            <Ionicons name="arrow-back" size={20} color={WHITE} />
          </TouchableOpacity>
          <View style={gs.headerLogoWrap} pointerEvents="none">
            <Image source={require('../../assl.js/Layer 3.png')} style={gs.headerLogo} resizeMode="contain" />
          </View>
          <View style={{ flex: 1 }} />
          <TouchableOpacity style={gs.createBtn} onPress={() => setShowCreate(true)} activeOpacity={0.85}>
            <Ionicons name="add" size={16} color={WHITE} />
            <Text style={gs.createBtnTxt}>Create</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* ── List ── */}
      <FlatList
        data={groups}
        keyExtractor={(item, index) => `${item.id ?? index}_${index}`}
        renderItem={renderGroup}
        contentContainerStyle={gs.listContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        refreshing={refreshing}
        onRefresh={onRefresh}
        onEndReached={() => { if (groupsMore && !groupsLoad) loadGroups(groupsPage + 1); }}
        onEndReachedThreshold={0.4}
        ListHeaderComponent={
          <View>
            {/* ── Hero — DO NOT TOUCH ── */}
            <View style={gs.heroBlock}>
              <View style={gs.heroPills}>
                <View style={gs.heroLivePill}>
                  <View style={gs.heroLiveDot} />
                  <Text style={gs.heroLiveText}>COMMUNITIES</Text>
                </View>
                {joinedCount > 0 && (
                  <View style={gs.heroCountPill}>
                    <Ionicons name="checkmark-circle" size={10} color={WHITE + 'BF'} />
                    <Text style={gs.heroCountText}>{fmtCount(joinedCount)} Joined</Text>
                  </View>
                )}
              </View>

              <Text style={gs.heroTitle}>Connect & Grow{'\n'}Together.</Text>
              <Text style={gs.heroSub}>
                Discover communities, meet like-minded people, and be part of conversations that matter.
              </Text>

              <View style={gs.heroStats}>
                <View style={gs.heroStatItem}>
                  <Text style={gs.heroStatNum}>{fmtCount(groups.length)}</Text>
                  <Text style={gs.heroStatLabel}>Groups</Text>
                </View>
                <View style={gs.heroStatDivider} />
                <View style={gs.heroStatItem}>
                  <Text style={gs.heroStatNum}>{fmtCount(joinedCount)}</Text>
                  <Text style={gs.heroStatLabel}>Joined</Text>
                </View>
                <View style={gs.heroStatDivider} />
                <View style={gs.heroStatItem}>
                  <Text style={gs.heroStatNum}>{fmtCount(categories.length)}</Text>
                  <Text style={gs.heroStatLabel}>Categories</Text>
                </View>
              </View>

              {/* Search */}
              <View style={gs.heroSearch}>
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
                    <Ionicons name="close-circle" size={18} color={ON_DARK_55} />
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {/* ── 3 Tabs ── */}
            <View style={gs.tabsRow}>
              {TABS.map((tab) => {
                const on = activeTab === tab.key;
                return (
                  <TouchableOpacity
                    key={tab.key}
                    style={[gs.tab, on && gs.tabOn]}
                    onPress={() => setActiveTab(tab.key)}
                    activeOpacity={0.75}
                  >
                    <Text style={[gs.tabTxt, on && gs.tabTxtOn]}>{tab.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* ── Category dropdown ── */}
            {activeTab === 'discover' && categories.length > 0 && (
              <TouchableOpacity
                style={gs.catBtn}
                onPress={() => setShowCatPicker(true)}
                activeOpacity={0.8}
              >
                <Ionicons name="grid-outline" size={14} color={selectedCategory ? ACCENT : MUTED} />
                <Text style={[gs.catBtnTxt, selectedCategory && gs.catBtnTxtOn]} numberOfLines={1}>
                  {selectedCategory ? cleanText(selectedCategory.name ?? selectedCategory.category_name ?? '') : 'All Categories'}
                </Text>
                <Ionicons name="chevron-down" size={14} color={selectedCategory ? ACCENT : MUTED} />
              </TouchableOpacity>
            )}
          </View>
        }
        ListEmptyComponent={
          groupsLoad ? (
            <View style={gs.emptyWrap}>
              <ActivityIndicator color={ACCENT} size="large" />
            </View>
          ) : (
            <View style={gs.emptyWrap}>
              <View style={gs.emptyCircle}>
                <Ionicons name="people-outline" size={36} color={MUTED} />
              </View>
              <Text style={gs.emptyTitle}>
                {activeTab === 'joined'  ? 'No joined communities yet' :
                 activeTab === 'managed' ? 'No communities created yet' :
                 'No communities found'}
              </Text>
              <Text style={gs.emptySub}>
                {activeTab === 'joined'  ? 'Join a community to see it here' :
                 activeTab === 'managed' ? 'Create one using the button above' :
                 'Try adjusting your search'}
              </Text>
            </View>
          )
        }
        ListFooterComponent={
          groupsLoad && groups.length > 0
            ? <ActivityIndicator color={ACCENT} style={{ marginVertical: 20 }} />
            : null
        }
      />

      <CreateModal
        visible={showCreate}
        type="community"
        navigation={navigation}
        token={token}
        user={user}
        onClose={() => setShowCreate(false)}
        onCreated={() => loadGroups(1, true)}
      />


      {/* ── Category Picker Modal ── */}
      <Modal
        visible={showCatPicker}
        transparent
        animationType="slide"
        onRequestClose={() => setShowCatPicker(false)}
        statusBarTranslucent
      >
        <TouchableWithoutFeedback onPress={() => setShowCatPicker(false)}>
          <View style={gs.catOverlay}>
            <TouchableWithoutFeedback>
              <View style={gs.catSheet}>
                <View style={gs.catHandle} />
                <Text style={gs.catSheetTitle}>Filter by Category</Text>

                <ScrollView showsVerticalScrollIndicator={false}>
                  {/* All option */}
                  <TouchableOpacity
                    style={[gs.catItem, !selectedCategory && gs.catItemOn]}
                    onPress={() => { setSelectedCategory(null); setShowCatPicker(false); }}
                    activeOpacity={0.75}
                  >
                    <Ionicons name="grid" size={16} color={!selectedCategory ? ACCENT : MUTED} />
                    <Text style={[gs.catItemTxt, !selectedCategory && gs.catItemTxtOn]}>All Categories</Text>
                    {!selectedCategory && <Ionicons name="checkmark-circle" size={18} color={ACCENT} />}
                  </TouchableOpacity>

                  {categories.map((cat, idx) => {
                    const name = cleanText(cat.name ?? cat.category_name ?? '');
                    const on   = selectedCategory?.id === (cat.id ?? cat.category_id);
                    return (
                      <TouchableOpacity
                        key={`cat_${cat.id ?? cat.category_id ?? idx}`}
                        style={[gs.catItem, on && gs.catItemOn]}
                        onPress={() => { setSelectedCategory(cat); setShowCatPicker(false); }}
                        activeOpacity={0.75}
                      >
                        <Ionicons name="people-outline" size={16} color={on ? ACCENT : MUTED} />
                        <Text style={[gs.catItemTxt, on && gs.catItemTxtOn]}>{name}</Text>
                        {cat.group_count ? <Text style={gs.catItemCount}>{fmtCount(cat.group_count)}</Text> : null}
                        {on && <Ionicons name="checkmark-circle" size={18} color={ACCENT} />}
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </View>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────
const gs = StyleSheet.create({
  root: { flex: 1, backgroundColor: CREAM },

  // ── Slim header ──
  header: {
    backgroundColor: BRAND,
    paddingHorizontal: 16, paddingBottom: 10,
    shadowColor: BRAND, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.22, shadowRadius: 10, elevation: 8,
  },
  headerTop:      { flexDirection: 'row', alignItems: 'center', gap: 12 },
  backBtn:        { width: 36, height: 36, borderRadius: 18, backgroundColor: ON_DARK_14, alignItems: 'center', justifyContent: 'center' },
  headerLogoWrap: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
  headerLogo:     { height: 26, width: 110 },
  createBtn:    { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: ACCENT, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 100 },
  createBtnTxt: { fontSize: 12, fontWeight: '800', color: WHITE },

  listContent: { paddingBottom: 100, gap: 10 },

  // ── Tabs ──
  tabsRow: {
    flexDirection: 'row',
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 8,
    backgroundColor: CARD,
    borderBottomWidth: 1,
    borderBottomColor: BRAND_SOFT_07,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 9,
    borderRadius: 100,
    backgroundColor: BRAND_SOFT_07,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  tabOn: {
    backgroundColor: BRAND,
    borderColor: BRAND,
  },
  tabTxt:   { fontSize: 11, fontWeight: '700', color: MUTED },
  tabTxtOn: { color: WHITE },

  // ── Category dropdown button ──
  catBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 14,
    marginTop: 10,
    marginBottom: 4,
    paddingHorizontal: 14,
    paddingVertical: 11,
    backgroundColor: CARD,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BRAND_SOFT_07,
  },
  catBtnTxt:   { flex: 1, fontSize: 13, color: MUTED, fontWeight: '600' },
  catBtnTxtOn: { color: ACCENT, fontWeight: '700' },

  // ── Category picker modal ──
  catOverlay:  { flex: 1, justifyContent: 'flex-end', backgroundColor: BLACK + '55' },
  catSheet: {
    backgroundColor: WHITE,
    borderTopLeftRadius: 22, borderTopRightRadius: 22,
    paddingTop: 10, maxHeight: '65%',
  },
  catHandle:   { width: 36, height: 4, borderRadius: 2, backgroundColor: MUTED + '44', alignSelf: 'center', marginBottom: 12 },
  catSheetTitle: { fontSize: 14, fontWeight: '800', color: DARK, paddingHorizontal: 18, marginBottom: 8 },
  catItem: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 18, paddingVertical: 13,
    borderBottomWidth: 1, borderBottomColor: BRAND_SOFT_07,
  },
  catItemOn:   { backgroundColor: ACCENT + '0D' },
  catItemTxt:  { flex: 1, fontSize: 14, color: DARK, fontWeight: '600' },
  catItemTxtOn:{ color: ACCENT, fontWeight: '800' },
  catItemCount:{ fontSize: 12, color: MUTED },

  // ── Hero ──
  heroBlock: {
    backgroundColor: BRAND,
    paddingHorizontal: 18, paddingTop: 18, paddingBottom: 24,
    borderBottomLeftRadius: 26, borderBottomRightRadius: 26,
    overflow: 'hidden', marginBottom: 0,
  },
  heroPills:    { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 },
  heroLivePill: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: ON_DARK_10, borderWidth: 1, borderColor: ON_DARK_15, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999 },
  heroLiveDot:  { width: 6, height: 6, borderRadius: 3, backgroundColor: ACCENT },
  heroLiveText: { fontSize: 10, fontWeight: '700', letterSpacing: 1.2, color: WHITE + 'BF' },
  heroCountPill:{ flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: ON_DARK_10, borderWidth: 1, borderColor: ON_DARK_15, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999 },
  heroCountText:{ fontSize: 11, fontWeight: '700', color: WHITE + 'BF' },
  heroTitle:    { fontSize: 28, fontWeight: '900', color: WHITE, lineHeight: 34 },
  heroSub:      { marginTop: 8, fontSize: 13, lineHeight: 19, color: WHITE + 'A6' },
  heroStats: {
    flexDirection: 'row', alignItems: 'center', marginTop: 18,
    backgroundColor: WHITE + '12', borderRadius: 14,
    borderWidth: 1, borderColor: WHITE + '1A',
    paddingVertical: 13, paddingHorizontal: 16,
  },
  heroStatItem:   { flex: 1, alignItems: 'center' },
  heroStatNum:    { fontSize: 18, fontWeight: '900', color: WHITE },
  heroStatLabel:  { fontSize: 10, color: WHITE + '88', marginTop: 2, textTransform: 'uppercase', letterSpacing: 0.5 },
  heroStatDivider:{ width: 1, height: 30, backgroundColor: WHITE + '22' },
  heroSearch: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: ON_DARK_10, borderRadius: 100,
    borderWidth: 1, borderColor: ON_DARK_15,
    paddingHorizontal: 14, height: 44, marginTop: 16,
  },
  searchInput: { flex: 1, color: WHITE, fontSize: 13 },


  // ── Empty ──
  emptyWrap:   { alignItems: 'center', justifyContent: 'center', paddingTop: 80, gap: 14 },
  emptyCircle: { width: 90, height: 90, borderRadius: 45, alignItems: 'center', justifyContent: 'center', backgroundColor: ACCENT + '18' },
  emptyTitle:  { fontSize: 16, fontWeight: '800', color: DARK },
  emptySub:    { fontSize: 12, color: MUTED, textAlign: 'center' },
});

export default CommunitiesScreen;
