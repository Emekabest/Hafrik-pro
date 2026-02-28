import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  FlatList, Image, ActivityIndicator, Animated, Dimensions,
  Alert, ScrollView, StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../../AuthContext';
import { useNavigation } from '@react-navigation/native';


// ─── API imports ────────────────────────────────────────────────────────────
import { getGroups, getCategories, joinGroup, leaveGroup } from './services/groupApi';
import { getBusinessList, toggleFollowBusiness } from '../pages_/Businessapi';

const { width: SCREEN_W } = Dimensions.get('window');

// ─── Design tokens ───────────────────────────────────────────────────────────
const BRAND  = '#0C3F44';
const ACCENT = '#13C296';
const CREAM  = '#F5F7F7';
const MUTED  = '#7A9198';
const DARK   = '#0D1B1E';
const BORDER = 'rgba(12,63,68,0.08)';
const CARD   = '#ffffff';

// ─── Static business filter options ──────────────────────────────────────────
const BUSINESS_FILTERS = ['All', 'Sourcing', 'Shipping', 'Food', 'Legal', 'Fashion'];

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
  const [expanded,    setExpanded]    = useState(false);

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
            colors={[BRAND, '#0b6272', ACCENT + '88']}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            style={cc.cover}
          />
        )}
        {/* Gradient fade for text legibility */}
        <LinearGradient
          colors={['transparent', 'rgba(6,22,26,0.78)']}
          style={cc.coverFade}
        />
        {/* Top badges */}
        <View style={cc.topBadges}>
          {promoted && (
            <View style={cc.featBadge}>
              <Ionicons name="star" size={9} color="#F9C846" />
              <Text style={cc.featTxt}>Featured</Text>
            </View>
          )}
          {private_ && (
            <View style={cc.privBadge}>
              <Ionicons name="lock-closed" size={10} color="#fff" />
            </View>
          )}
        </View>
        {/* Name + member count + joined pill */}
        <View style={cc.coverBottom}>
          <Text style={cc.coverTitle} numberOfLines={1}>{title || 'Community'}</Text>
          <View style={cc.coverMeta}>
            <Ionicons name="people" size={12} color="rgba(255,255,255,0.8)" />
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
              <LinearGradient colors={[BRAND, '#1a6b75']} style={[cc.avatar, cc.avatarFb]}>
                <Ionicons name="people" size={18} color="#fff" />
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
            ? <ActivityIndicator size="small" color={isMember ? BRAND : '#fff'} />
            : <Text style={[cc.joinTxt, isMember && cc.leaveTxt]}>{isMember ? 'Leave' : 'Join Group'}</Text>
          }
        </TouchableOpacity>
      </View>
    </View>
  );
};

// ─── Business Card ────────────────────────────────────────────────────────────
const BusinessCard = ({ business, onOpen }) => {
  const [following,     setFollowing]     = useState(false);
  const [isFollowing,   setIsFollowing]   = useState(business.is_following ?? false);
  const [followerCount, setFollowerCount] = useState(business.followers_count ?? business.followers ?? 0);
  const [expanded,      setExpanded]      = useState(false);

  useEffect(() => {
    setIsFollowing(business.is_following ?? false);
    setFollowerCount(business.followers_count ?? business.followers ?? 0);
  }, [business.is_following, business.followers_count, business.followers]);

  const isVerified = business.verified_value === 1 || business.verified === true;

  const handleFollow = async () => {
    if (following) return;
    setFollowing(true);
    const was = isFollowing;
    try {
      await toggleFollowBusiness(business.id, token);
      setIsFollowing(!was);
      setFollowerCount((c) => was ? Math.max(0, c - 1) : c + 1);
    } catch {
      Alert.alert('Error', 'Could not update follow. Please try again.');
      setIsFollowing(was);
    } finally {
      setFollowing(false);
    }
  };

  const title    = cleanText(business.title ?? '');
  const about    = cleanText(business.about ?? '');
  const location = cleanText(business.location ?? '');
  const avatar   = business.avatar ?? null;
  const cover    = business.cover ?? business.banner ?? null;

  return (
    <View style={gs.card}>
      {/* Cover */}
      {isRealImage(cover) ? (
        <Image source={{ uri: cover }} style={gs.cover} resizeMode="cover" />
      ) : (
        <LinearGradient
          colors={['#062A2E', BRAND, '#0a4a52']}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          style={gs.cover}
        >
          <View style={gs.coverPattern} />
        </LinearGradient>
      )}

      {isVerified && (
        <View style={[gs.coverBadges, { justifyContent: 'flex-end' }]}>
          <View style={gs.verifiedChip}>
            <Ionicons name="checkmark-circle" size={11} color="#fff" />
            <Text style={gs.verifiedTxt}>Verified</Text>
          </View>
        </View>
      )}

      <TouchableOpacity style={gs.cardBody} activeOpacity={0.88} onPress={() => onOpen && onOpen(business)}>
        <View style={gs.avatarRow}>
          {isRealImage(avatar) && !String(avatar).includes('default-avatar') ? (
            <Image source={{ uri: avatar }} style={[gs.avatar, { borderRadius: 26 }]} resizeMode="cover" />
          ) : (
            <LinearGradient colors={['#062A2E', BRAND]} style={[gs.avatar, gs.avatarFallback, { borderRadius: 26 }]}>
              <Ionicons name="business" size={22} color="#fff" />
            </LinearGradient>
          )}
          <View style={{ flex: 1 }}>
            <Text style={gs.title} numberOfLines={1}>{title || 'Business'}</Text>
            <View style={gs.metaRow}>
              <View style={gs.memberStat}>
                <Ionicons name="heart-outline" size={11} color={MUTED} />
                <Text style={gs.memberStatTxt}>{fmtCount(followerCount)} followers</Text>
              </View>
              {!!location && (
                <View style={gs.memberStat}>
                  <Ionicons name="location-outline" size={11} color={MUTED} />
                  <Text style={gs.memberStatTxt} numberOfLines={1}>{location}</Text>
                </View>
              )}
            </View>
          </View>
        </View>

        {!!about && (
          <View style={gs.descWrap}>
            <Text style={gs.desc} numberOfLines={expanded ? undefined : 2}>{about}</Text>
            {about.length > 90 && (
              <TouchableOpacity onPress={() => setExpanded((e) => !e)} activeOpacity={0.7}>
                <Text style={gs.descToggle}>{expanded ? 'Show less' : 'Read more'}</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </TouchableOpacity>

      <View style={gs.footer}>
        <TouchableOpacity
          style={gs.msgBtn}
          activeOpacity={0.85}
          onPress={() => Alert.alert('Coming soon', 'Messaging will be available soon.')}
        >
          <Ionicons name="chatbubble-outline" size={13} color={BRAND} />
          <Text style={gs.msgTxt}>Message</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[gs.joinBtn, isFollowing && gs.leaveBtn]}
          onPress={handleFollow}
          activeOpacity={0.85}
          disabled={following}
        >
          {following
            ? <ActivityIndicator size="small" color={isFollowing ? BRAND : '#fff'} />
            : <Text style={[gs.joinTxt, isFollowing && gs.leaveTxt]}>
                {isFollowing ? 'Following' : 'Follow'}
              </Text>
          }
        </TouchableOpacity>
      </View>
    </View>
  );
};

// ─── Community Card Styles ──────────────────────────────────────────────────
const cc = StyleSheet.create({
  card: {
    backgroundColor: '#fff', borderRadius: 20, overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.1, shadowRadius: 16, elevation: 5,
    borderWidth: 1, borderColor: 'rgba(12,63,68,0.07)',
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
    backgroundColor: 'rgba(0,0,0,0.52)', borderRadius: 100,
    paddingHorizontal: 9, paddingVertical: 4,
  },
  featTxt:   { fontSize: 9, fontWeight: '900', color: '#F9C846', letterSpacing: 0.3 },
  privBadge: {
    width: 26, height: 26, borderRadius: 13,
    backgroundColor: 'rgba(0,0,0,0.45)', alignItems: 'center', justifyContent: 'center',
  },
  coverBottom:  { position: 'absolute', bottom: 0, left: 14, right: 14, paddingBottom: 12 },
  coverTitle:   { fontSize: 16, fontWeight: '900', color: '#fff', marginBottom: 5 },
  coverMeta:    { flexDirection: 'row', alignItems: 'center', gap: 6 },
  coverMetaTxt: { fontSize: 11, color: 'rgba(255,255,255,0.85)', fontWeight: '600' },
  joinedPill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(19,194,150,0.26)', borderRadius: 100,
    paddingHorizontal: 7, paddingVertical: 2,
    borderWidth: 1, borderColor: 'rgba(19,194,150,0.5)',
  },
  joinedTxt: { fontSize: 10, fontWeight: '800', color: ACCENT },
  body:      { paddingHorizontal: 14, paddingTop: 10, paddingBottom: 8 },
  bodyTop:   { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  avatarWrap: {
    width: 46, height: 46, borderRadius: 13,
    overflow: 'hidden', borderWidth: 3, borderColor: '#fff',
    marginTop: -26,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.14, shadowRadius: 8, elevation: 4,
  },
  avatar:   { width: '100%', height: '100%' },
  avatarFb: { alignItems: 'center', justifyContent: 'center' },
  catChip:  {
    backgroundColor: ACCENT + '18', borderRadius: 100,
    paddingHorizontal: 10, paddingVertical: 4,
  },
  catTxt:   { fontSize: 10, fontWeight: '800', color: '#0a7a5a' },
  about:    { fontSize: 13, color: '#4a6068', lineHeight: 19 },
  footer: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 14, paddingVertical: 11,
    borderTopWidth: 1, borderTopColor: 'rgba(12,63,68,0.07)', gap: 10,
  },
  postBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    backgroundColor: 'rgba(19,194,150,0.09)', borderRadius: 100,
    paddingHorizontal: 12, paddingVertical: 8,
    borderWidth: 1, borderColor: 'rgba(19,194,150,0.22)',
  },
  postTxt:  { fontSize: 12, fontWeight: '700', color: ACCENT },
  hintRow:  { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6 },
  hintTxt:  { fontSize: 12, color: MUTED },
  joinBtn:  {
    backgroundColor: BRAND, borderRadius: 100,
    paddingHorizontal: 20, paddingVertical: 9,
    alignItems: 'center', minWidth: 95,
  },
  leaveBtn: { backgroundColor: '#fff', borderWidth: 1.5, borderColor: BRAND },
  joinTxt:  { fontSize: 12, fontWeight: '900', color: '#fff' },
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

// ─── Main Screen ─────────────────────────────────────────────────────────────
const CommunitiesScreen = ({ route }) => {
  const navigation = useNavigation();
  const { top }    = useSafeAreaInsets();
  const { token }  = useAuth();

  const initialTab = route?.params?.initialTab ?? 0;
  const [activeTab, setActiveTab] = useState(initialTab);
  const tabAnim = useRef(new Animated.Value(initialTab)).current;

  const [groups,       setGroups]       = useState([]);
  const [groupsLoad,   setGroupsLoad]   = useState(true);
  const [groupsPage,   setGroupsPage]   = useState(1);
  const [groupsMore,   setGroupsMore]   = useState(true);
  const [groupFilter,  setGroupFilter]  = useState('All');
  const [categories,   setCategories]   = useState([]);

  const [businesses, setBusinesses] = useState([]);
  const [bizLoad,    setBizLoad]    = useState(true);
  const [bizPage,    setBizPage]    = useState(1);
  const [bizMore,    setBizMore]    = useState(true);
  const [bizFilter,  setBizFilter]  = useState('All');

  const [search, setSearch] = useState('');
  const [refreshing, setRefreshing] = useState(false);

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
      console.log('[Groups] loadGroups error:', e);
    } finally {
      setGroupsLoad(false);
    }
  }, [token]);

  const loadCategories = useCallback(async () => {
    try {
      const res = await getCategories(token);
      if (res?.status === 'success') {
        // Sort by group_count descending so most popular come first
        const cats = Array.isArray(res.data)
          ? [...res.data].sort((a, b) => (Number(b.group_count) || 0) - (Number(a.group_count) || 0))
          : [];
        setCategories(cats);
      }
    } catch (e) {
      console.log('[Groups] loadCategories error:', e);
    }
  }, [token]);

  const loadBusinesses = useCallback(async (page = 1, replace = false) => {
    try {
      setBizLoad(true);
      const res = await getBusinessList(page, 15);
      if (res?.status === 'success') {
        const items = res.data?.data ?? res.data ?? [];
        setBusinesses((p) => (replace ? items : [...p, ...items]));
        setBizMore(items.length >= 15);
        setBizPage(page);
      }
    } catch (e) {
      console.log('[Groups] loadBusinesses error:', e);
    } finally {
      setBizLoad(false);
    }
  }, []);

  useEffect(() => {
    loadGroups(1, true);
    loadBusinesses(1, true);
    loadCategories();
  }, []); // eslint-disable-line

  useEffect(() => {
    if (route?.params?.initialTab !== undefined && route.params.initialTab !== activeTab) {
      switchTab(route.params.initialTab);
    }
  }, [route?.params?.initialTab]); // eslint-disable-line

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([loadGroups(1, true), loadBusinesses(1, true)]);
    setRefreshing(false);
  }, [loadGroups, loadBusinesses]);

  const switchTab = (idx) => {
    setActiveTab(idx);
    Animated.spring(tabAnim, { toValue: idx, useNativeDriver: false, tension: 120, friction: 8 }).start();
  };

  const indLeft = tabAnim.interpolate({ inputRange: [0, 1], outputRange: ['2%', '52%'] });

  // Build community filter pills dynamically from categories API + fixed labels
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

  const filteredBusinesses = useMemo(() => {
    let r = businesses;
    if (search.trim()) {
      const q = search.toLowerCase();
      r = r.filter((b) =>
        cleanText(b.title ?? '').toLowerCase().includes(q) ||
        cleanText(b.about ?? '').toLowerCase().includes(q) ||
        cleanText(b.location ?? '').toLowerCase().includes(q)
      );
    }
    if (bizFilter !== 'All') {
      const kw = {
        Sourcing: ['sourcing', 'import', 'wholesale'],
        Shipping: ['shipping', 'freight', 'logistics'],
        Food:     ['food', 'restaurant', 'kitchen'],
        Legal:    ['legal', 'law', 'visa'],
        Fashion:  ['fashion', 'cloth', 'boutique', 'style'],
      }[bizFilter] ?? [];
      r = r.filter((b) => {
        const hay = `${cleanText(b.title)} ${cleanText(b.about)} ${cleanText(b.category_name ?? '')}`.toLowerCase();
        return kw.some((k) => hay.includes(k));
      });
    }
    return [...r].sort((a, b) => {
      const av = a.verified_value === 1 || a.verified === true ? 1 : 0;
      const bv = b.verified_value === 1 || b.verified === true ? 1 : 0;
      return bv - av;
    });
  }, [businesses, search, bizFilter]);

  const handlePostInGroup = useCallback((group) => {
    // Navigate to GroupDetails — it has the Create Post button that opens the composer
    navigation.navigate('GroupDetails', { groupId: group.id, openCompose: true });
  }, [navigation]);

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

  const renderBusiness = useCallback(
    ({ item }) => (
      <BusinessCard
        business={item}
        onOpen={(b) => navigation.navigate('BusinessDetails', { pageId: b.id })}
      />
    ),
    [navigation]
  );

  const groupStats = [
    { label: 'Groups',  value: fmtCount(groups.length) },
    { label: 'Joined',  value: fmtCount(groups.filter((g) => g.is_joined === true || g.is_joined === 1 || g._isMember).length) },
    { label: 'Showing', value: fmtCount(filteredGroups.length) },
  ];

  const bizStats = [
    { label: 'Pages',    value: fmtCount(businesses.length) },
    { label: 'Verified', value: fmtCount(businesses.filter((b) => b.verified_value === 1).length) },
    { label: 'Showing',  value: fmtCount(filteredBusinesses.length) },
  ];

  return (
    <View style={gs.root}>
      <StatusBar barStyle="light-content" />

      {/* ── Header ── */}
      <LinearGradient
        colors={[BRAND, '#0A5560']}
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
            <Ionicons name="arrow-back" size={20} color="#fff" />
          </TouchableOpacity>

          <View style={{ flex: 1 }}>
            <Text style={gs.headerEyebrow}>HAFRIK</Text>
            <Text style={gs.headerTitle}>
              {activeTab === 0 ? 'Communities' : 'Business Pages'}
            </Text>
          </View>

          <TouchableOpacity
            style={gs.createBtn}
            activeOpacity={0.85}
            onPress={() => Alert.alert('Coming soon', 'Creating a group will be available soon.')}
          >
            <Ionicons name="add" size={16} color="#fff" />
            <Text style={gs.createBtnTxt}>{activeTab === 0 ? 'Create' : 'Add Page'}</Text>
          </TouchableOpacity>
        </View>

        {/* Search bar */}
        <View style={gs.searchBar}>
          <Ionicons name="search-outline" size={16} color="rgba(255,255,255,0.55)" style={{ marginRight: 8 }} />
          <TextInput
            style={gs.searchInput}
            placeholder={activeTab === 0 ? 'Search communities…' : 'Search businesses…'}
            placeholderTextColor="rgba(255,255,255,0.4)"
            value={search}
            onChangeText={setSearch}
            returnKeyType="search"
            autoCorrect={false}
            autoCapitalize="none"
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={18} color="rgba(255,255,255,0.5)" />
            </TouchableOpacity>
          )}
        </View>

        {/* Tab pills */}
        <View style={gs.tabBar}>
          <Animated.View style={[gs.tabInd, { left: indLeft }]} />
          {['Communities', 'Business'].map((t, i) => (
            <TouchableOpacity key={t} style={gs.tabBtn} onPress={() => switchTab(i)} activeOpacity={0.8}>
              <Text style={[gs.tabTxt, activeTab === i && gs.tabTxtOn]}>{t}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </LinearGradient>

      {/* ── Communities tab ── */}
      {activeTab === 0 && (
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
      )}

      {/* ── Business tab ── */}
      {activeTab === 1 && (
        <View style={{ flex: 1 }}>
          <FilterRow filters={BUSINESS_FILTERS} active={bizFilter} onChange={setBizFilter} />
          <StatsBar items={bizStats} />
          <FlatList
            data={filteredBusinesses}
            keyExtractor={(item) => String(item.id)}
            renderItem={renderBusiness}
            contentContainerStyle={gs.listContent}
            showsVerticalScrollIndicator={false}
            refreshing={refreshing}
            onRefresh={onRefresh}
            onEndReached={() => { if (bizMore && !bizLoad) loadBusinesses(bizPage + 1); }}
            onEndReachedThreshold={0.4}
            ListEmptyComponent={<Empty loading={bizLoad} label="businesses" />}
            ListFooterComponent={
              bizLoad && businesses.length > 0
                ? <ActivityIndicator color={ACCENT} style={{ marginVertical: 20 }} />
                : null
            }
          />
        </View>
      )}
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
    backgroundColor: 'rgba(255,255,255,0.04)', top: -80, right: -60,
  },
  decor2: {
    position: 'absolute', width: 120, height: 120, borderRadius: 60,
    backgroundColor: 'rgba(19,194,150,0.08)', bottom: -40, left: -30,
  },
  headerTop: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14 },
  backBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.14)', alignItems: 'center', justifyContent: 'center',
  },
  headerEyebrow: { fontSize: 9, fontWeight: '700', letterSpacing: 2.5, color: ACCENT, marginBottom: 2 },
  headerTitle:   { fontSize: 22, fontWeight: '900', color: '#fff' },
  createBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: ACCENT, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 100,
  },
  createBtnTxt: { fontSize: 12, fontWeight: '800', color: '#fff' },

  searchBar: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 100,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 14, height: 42, marginBottom: 14,
  },
  searchInput: { flex: 1, color: '#fff', fontSize: 13 },

  tabBar: {
    flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 100, padding: 3, height: 40, position: 'relative',
  },
  tabInd: {
    position: 'absolute', top: 3, bottom: 3, width: '47%',
    backgroundColor: '#fff', borderRadius: 100,
  },
  tabBtn: { flex: 1, alignItems: 'center', justifyContent: 'center', zIndex: 1 },
  tabTxt: { fontSize: 13, fontWeight: '700', color: 'rgba(255,255,255,0.55)' },
  tabTxtOn: { color: BRAND },

  // Filter
  filterWrap: { paddingHorizontal: 14, paddingVertical: 12, gap: 8 },
  filterPill: {
    height: 32, paddingHorizontal: 14, borderRadius: 100,
    backgroundColor: 'rgba(12,63,68,0.07)', borderWidth: 1, borderColor: BORDER,
    alignItems: 'center', justifyContent: 'center',
  },
  filterPillOn: { backgroundColor: BRAND, borderColor: BRAND },
  filterTxt:    { fontSize: 12, fontWeight: '600', color: DARK },
  filterTxtOn:  { color: '#fff' },

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
    shadowColor: '#000', shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06, shadowRadius: 10, elevation: 3,
  },
  cover: { width: '100%', height: 88 },
  coverPattern: {
    position: 'absolute', inset: 0,
    backgroundColor: 'rgba(0,0,0,0.08)',
  },
  coverBadges: {
    position: 'absolute', top: 8, left: 8, right: 8,
    flexDirection: 'row', gap: 6, flexWrap: 'wrap',
  },
  promotedChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(0,0,0,0.55)', borderRadius: 100,
    paddingHorizontal: 8, paddingVertical: 3,
  },
  promotedTxt: { fontSize: 9, fontWeight: '800', color: '#F4A535' },
  privateChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(0,0,0,0.55)', borderRadius: 100,
    paddingHorizontal: 8, paddingVertical: 3,
  },
  privateTxt: { fontSize: 9, fontWeight: '700', color: '#fff' },
  memberChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(0,0,0,0.55)', borderRadius: 100,
    paddingHorizontal: 8, paddingVertical: 3,
  },
  memberChipTxt: { fontSize: 9, fontWeight: '700', color: ACCENT },
  verifiedChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: ACCENT, borderRadius: 100,
    paddingHorizontal: 8, paddingVertical: 3,
  },
  verifiedTxt: { fontSize: 9, fontWeight: '800', color: '#fff' },

  cardBody: { padding: 14 },
  avatarRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 10 },
  avatar: { width: 52, height: 52, borderRadius: 14, marginTop: -28, borderWidth: 3, borderColor: CARD },
  avatarFallback: { alignItems: 'center', justifyContent: 'center' },

  title:  { fontSize: 15, fontWeight: '900', color: DARK, flexShrink: 1 },
  metaRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6, marginTop: 4 },
  catPill: {
    backgroundColor: 'rgba(19,194,150,0.12)', borderRadius: 100,
    paddingHorizontal: 8, paddingVertical: 2, maxWidth: 160,
  },
  catTxt: { fontSize: 10, fontWeight: '700', color: '#0a7a5a' },
  memberStat: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  memberStatTxt: { fontSize: 11, color: MUTED },

  descWrap: { marginTop: 2 },
  desc:     { fontSize: 13, color: '#4a6068', lineHeight: 19 },
  descToggle: { fontSize: 12, fontWeight: '700', color: ACCENT, marginTop: 4 },

  footer: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 14, paddingVertical: 12,
    borderTopWidth: 1, borderTopColor: BORDER,
  },
  postBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 100,
    backgroundColor: 'rgba(19,194,150,0.1)', borderWidth: 1, borderColor: 'rgba(19,194,150,0.25)',
  },
  postBtnTxt: { fontSize: 12, fontWeight: '700', color: ACCENT },

  joinBtn: {
    backgroundColor: BRAND, paddingHorizontal: 18, paddingVertical: 8,
    borderRadius: 100, minWidth: 90, alignItems: 'center',
  },
  leaveBtn: { backgroundColor: CARD, borderWidth: 1.5, borderColor: BRAND },
  joinTxt:  { fontSize: 12, fontWeight: '800', color: '#fff' },
  leaveTxt: { color: BRAND },

  msgBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 100,
    borderWidth: 1.5, borderColor: BRAND,
  },
  msgTxt: { fontSize: 12, fontWeight: '700', color: BRAND },

  // Empty
  emptyWrap:   { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 80, gap: 14 },
  emptyCircle: { width: 90, height: 90, borderRadius: 45, alignItems: 'center', justifyContent: 'center' },
  emptyTitle:  { fontSize: 16, fontWeight: '800', color: DARK },
  emptySub:    { fontSize: 12, color: MUTED, textAlign: 'center' },
});

export default CommunitiesScreen;
