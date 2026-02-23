import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  FlatList,
  Image,
  ActivityIndicator,
  Animated,
  Dimensions,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../AuthContext';
import AppDetails from '../../helpers/appdetails';
import { useNavigation } from '@react-navigation/native';

// ─── API imports ─────────────────────────────────────────────────────────────
import { getGroups, joinGroup, leaveGroup } from './services/groupApi';
import { getBusinessList, followBusiness, unfollowBusiness } from '../pages_/Businessapi';

const { width: SCREEN_W } = Dimensions.get('window');

// ─── Constants ────────────────────────────────────────────────────────────────
const BRAND = '#0C3F44';
const ACCENT = '#13C296';
const CREAM = '#F5F0E8';
const MUTED = '#7A9198';
const DARK = '#0D1B1E';

const COMMUNITY_FILTERS = ['All', 'My Groups', 'City Groups', 'Business', 'Students'];
const BUSINESS_FILTERS = ['All', 'Sourcing', 'Shipping', 'Food', 'Legal', 'Fashion'];

const CATEGORY_FILTER_MAP = {
  'City Communities': 'City Groups',
  'Business & Entrepreneurs': 'Business',
  Students: 'Students',
};

// ─── Helpers ────────────────────────────────────────────────────────────────
const decodeHtml = (text = '') =>
  String(text)
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");

const cleanText = (text = '') =>
  decodeHtml(text)
    .replace(/<[^>]*>/g, '')
    .replace(/\s+/g, ' ')
    .trim();

// ─── Community Card ──────────────────────────────────────────────────────────
const CommunityCard = ({ group, onJoinLeave, onOpen }) => {
  const [joining, setJoining] = useState(false);
  const [isMember, setIsMember] = useState(group._isMember ?? false);
  const [memberCount, setMemberCount] = useState(group.members ?? 0);

  useEffect(() => {
    setIsMember(group._isMember ?? false);
    setMemberCount(group.members ?? 0);
  }, [group._isMember, group.members]);

  const handleJoinLeave = async () => {
    if (joining) return;
    setJoining(true);
    const wasMember = isMember;
    try {
      if (wasMember) {
        await leaveGroup(group.id);
        setIsMember(false);
        setMemberCount((c) => Math.max(0, c - 1));
      } else {
        await joinGroup(group.id);
        setIsMember(true);
        setMemberCount((c) => c + 1);
      }
      onJoinLeave && onJoinLeave(group.id, !wasMember);
    } catch (e) {
      Alert.alert('Error', 'Could not update membership. Please try again.');
      setIsMember(wasMember);
      setMemberCount((c) => {
        if (wasMember) return c + 1;
        return Math.max(0, c - 1);
      });
    } finally {
      setJoining(false);
    }
  };

  const title = cleanText(group.title || '');
  const categoryLabel = cleanText(group.category || '');
  const about = cleanText(group.about || '');
  const isPromoted = !!group.is_promoted;

  return (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.88}
      onPress={() => onOpen && onOpen(group)}
    >
      <View style={styles.cardHeader}>
        {group.avatar ? (
          <Image source={{ uri: group.avatar }} style={styles.groupAvatar} />
        ) : (
          <View style={[styles.groupAvatar, { backgroundColor: BRAND, alignItems: 'center', justifyContent: 'center' }]}>
            <Text style={{ fontSize: 20 }}>👥</Text>
          </View>
        )}

        <View style={styles.cardHeaderInfo}>
          <View style={styles.titleRow}>
            <Text style={styles.cardTitle} numberOfLines={1}>{title}</Text>
            {isPromoted && (
              <View style={styles.promotedBadge}>
                <Text style={styles.promotedText}>⭐</Text>
              </View>
            )}
          </View>

          <View style={styles.metaRow}>
            {categoryLabel ? (
              <View style={styles.categoryPill}>
                <Text style={styles.categoryPillText} numberOfLines={1}>{categoryLabel}</Text>
              </View>
            ) : null}
            <Text style={styles.memberCount}>
              {memberCount >= 1000 ? `${(memberCount / 1000).toFixed(1)}k` : memberCount} members
            </Text>
          </View>
        </View>
      </View>

      {!!about && (
        <Text style={styles.cardAbout} numberOfLines={2}>{about}</Text>
      )}

      <View style={styles.cardFooter}>
        <TouchableOpacity
          style={[styles.joinBtn, isMember && styles.joinBtnActive]}
          onPress={(e) => { e?.stopPropagation?.(); handleJoinLeave(); }}
          activeOpacity={0.85}
          disabled={joining}
        >
          {joining ? (
            <ActivityIndicator size="small" color={isMember ? BRAND : '#fff'} />
          ) : (
            <Text style={[styles.joinBtnText, isMember && styles.joinBtnTextActive]}>
              {isMember ? 'Leave' : 'Join Group'}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
};

// ─── Business Card ────────────────────────────────────────────────────────────
const BusinessCard = ({ business, onFollowToggle, onOpen }) => {
  const [following, setFollowing] = useState(false);
  const [isFollowing, setIsFollowing] = useState(business.is_following ?? false);
  const [followerCount, setFollowerCount] = useState(
    business.followers_count ?? business.followers ?? 0
  );

  useEffect(() => {
    setIsFollowing(business.is_following ?? false);
    setFollowerCount(business.followers_count ?? business.followers ?? 0);
  }, [business.is_following, business.followers_count, business.followers]);

  const isVerified = business.verified_value === 1 || business.verified === true;

  const handleFollow = async () => {
    if (following) return;
    setFollowing(true);
    const wasFollowing = isFollowing;
    try {
      if (wasFollowing) {
        await unfollowBusiness(business.id);
        setIsFollowing(false);
        setFollowerCount((c) => Math.max(0, c - 1));
      } else {
        await followBusiness(business.id);
        setIsFollowing(true);
        setFollowerCount((c) => c + 1);
      }
      onFollowToggle && onFollowToggle(business.id, !wasFollowing);
    } catch (e) {
      Alert.alert('Error', 'Could not update follow. Please try again.');
      setIsFollowing(wasFollowing);
      setFollowerCount((c) => {
        if (wasFollowing) return c + 1;
        return Math.max(0, c - 1);
      });
    } finally {
      setFollowing(false);
    }
  };

  const title = cleanText(business.title || '');
  const about = cleanText(business.about || '');
  const location = cleanText(business.location || '');

  return (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.88}
      onPress={() => onOpen && onOpen(business)}
    >
      <View style={styles.cardHeader}>
        {business.avatar && !String(business.avatar).includes('default-avatar') ? (
          <Image source={{ uri: business.avatar }} style={styles.bizAvatar} />
        ) : (
          <View style={[styles.bizAvatar, { backgroundColor: CREAM, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(12,63,68,0.12)' }]}>
            <Text style={{ fontSize: 22 }}>🏢</Text>
          </View>
        )}

        <View style={styles.cardHeaderInfo}>
          <View style={styles.titleRow}>
            <Text style={styles.cardTitle} numberOfLines={1}>{title}</Text>
            {isVerified && (
              <View style={styles.verifiedBadge}>
                <Text style={styles.verifiedText}>✓</Text>
              </View>
            )}
          </View>
          <Text style={styles.memberCount}>
            {followerCount >= 1000 ? `${(followerCount / 1000).toFixed(1)}k` : followerCount} followers
          </Text>
          {!!location && (
            <Text style={styles.locationText} numberOfLines={1}>📍 {location}</Text>
          )}
        </View>
      </View>

      {!!about && (
        <Text style={styles.cardAbout} numberOfLines={2}>{about}</Text>
      )}

      <View style={styles.cardFooter}>
        <TouchableOpacity
          style={styles.messageBtn}
          activeOpacity={0.85}
          onPress={(e) => { e?.stopPropagation?.(); Alert.alert('Coming soon', 'Messaging will be available soon.'); }}
        >
          <Text style={styles.messageBtnText}>Message</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.joinBtn, isFollowing && styles.joinBtnActive]}
          onPress={(e) => { e?.stopPropagation?.(); handleFollow(); }}
          activeOpacity={0.85}
          disabled={following}
        >
          {following ? (
            <ActivityIndicator size="small" color={isFollowing ? BRAND : '#fff'} />
          ) : (
            <Text style={[styles.joinBtnText, isFollowing && styles.joinBtnTextActive]}>
              {isFollowing ? 'Following' : 'Follow'}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
};

// ─── Main Screen ──────────────────────────────────────────────────────────────
const CommunitiesScreen = ({ route }) => {
  const navigation = useNavigation();
  const { top } = useSafeAreaInsets();
  const { token } = useAuth();

  const initialTab = route?.params?.initialTab ?? 0;
  const [activeTab, setActiveTab] = useState(initialTab);
  const tabAnim = useRef(new Animated.Value(initialTab)).current;

  const [groups, setGroups] = useState([]);
  const [groupsLoading, setGroupsLoading] = useState(true);
  const [groupsPage, setGroupsPage] = useState(1);
  const [groupsHasMore, setGroupsHasMore] = useState(true);
  const [groupFilter, setGroupFilter] = useState('All');

  const [businesses, setBusinesses] = useState([]);
  const [bizLoading, setBizLoading] = useState(true);
  const [bizPage, setBizPage] = useState(1);
  const [bizHasMore, setBizHasMore] = useState(true);
  const [bizFilter, setBizFilter] = useState('All');

  const [search, setSearch] = useState('');

  const loadGroups = useCallback(async (page = 1, replace = false) => {
    try {
      setGroupsLoading(true);
      const response = await getGroups(page, 15);
      if (response?.status === 'success') {
        const items = response.data?.data ?? [];
        setGroups((prev) => (replace ? items : [...prev, ...items]));
        setGroupsHasMore(items.length >= 15);
        setGroupsPage(page);
      }
    } catch (e) {
      console.log('Load groups error:', e);
    } finally {
      setGroupsLoading(false);
    }
  }, []);

  const loadBusinesses = useCallback(async (page = 1, replace = false) => {
    try {
      setBizLoading(true);
      const response = await getBusinessList(page, 15);
      if (response?.status === 'success') {
        const items = response.data?.data ?? [];
        setBusinesses((prev) => (replace ? items : [...prev, ...items]));
        setBizHasMore(items.length >= 15);
        setBizPage(page);
      }
    } catch (e) {
      console.log('Load businesses error:', e);
    } finally {
      setBizLoading(false);
    }
  }, []);

  useEffect(() => {
    loadGroups(1, true);
    loadBusinesses(1, true);
  }, []);

  // Listen for tab changes from navigation params
  useEffect(() => {
    if (route?.params?.initialTab !== undefined && route.params.initialTab !== activeTab) {
      switchTab(route.params.initialTab);
    }
  }, [route?.params?.initialTab]);

  const switchTab = (idx) => {
    setActiveTab(idx);
    Animated.spring(tabAnim, {
      toValue: idx,
      useNativeDriver: false,
      tension: 120,
      friction: 8,
    }).start();
  };

  const indicatorLeft = tabAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['2%', '52%'],
  });

  const filteredGroups = useMemo(() => {
    let result = groups;
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (g) =>
          cleanText(g.title || '').toLowerCase().includes(q) ||
          cleanText(g.about || '').toLowerCase().includes(q) ||
          cleanText(g.category || '').toLowerCase().includes(q)
      );
    }
    if (groupFilter !== 'All') {
      if (groupFilter === 'My Groups') {
        result = result.filter((g) => g._isMember);
      } else {
        result = result.filter((g) => {
          const apiCategory = cleanText(g.category || '');
          const mappedFilter = CATEGORY_FILTER_MAP[apiCategory];
          return mappedFilter === groupFilter || apiCategory === groupFilter;
        });
      }
    }
    // Promoted groups float to the top
    return [...result].sort((a, b) => (b.is_promoted ? 1 : 0) - (a.is_promoted ? 1 : 0));
  }, [groups, search, groupFilter]);

  const filteredBusinesses = useMemo(() => {
    let result = businesses;
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (b) =>
          cleanText(b.title || '').toLowerCase().includes(q) ||
          cleanText(b.about || '').toLowerCase().includes(q) ||
          cleanText(b.location || '').toLowerCase().includes(q)
      );
    }
    if (bizFilter !== 'All') {
      const filterMap = {
        Sourcing: ['sourcing', 'import', 'wholesale'],
        Shipping: ['shipping', 'freight', 'logistics'],
        Food: ['food', 'restaurant', 'kitchen', 'cuisine'],
        Legal: ['legal', 'law', 'visa'],
        Fashion: ['fashion', 'cloth', 'boutique', 'style'],
      };
      const keywords = filterMap[bizFilter] ?? [];
      result = result.filter((b) => {
        const haystack = `${cleanText(b.title)} ${cleanText(b.about)} ${cleanText(b.category_name)}`.toLowerCase();
        return keywords.some((k) => haystack.includes(k));
      });
    }
    // Verified pages float to the top
    return [...result].sort((a, b) => {
      const aVerified = a.verified_value === 1 || a.verified === true ? 1 : 0;
      const bVerified = b.verified_value === 1 || b.verified === true ? 1 : 0;
      return bVerified - aVerified;
    });
  }, [businesses, search, bizFilter]);

  const renderGroup = useCallback(
    ({ item }) => (
      <CommunityCard
        group={item}
        onOpen={(group) => navigation.navigate('GroupDetails', { groupId: group.id })}
      />
    ),
    [navigation]
  );

  const renderBusiness = useCallback(
    ({ item }) => (
      <BusinessCard
        business={item}
        onOpen={(biz) => navigation.navigate('BusinessDetails', { pageId: biz.id })}
      />
    ),
    [navigation]
  );

  const ListEmpty = ({ loading, label }) =>
    loading ? (
      <ActivityIndicator color={ACCENT} size="large" style={{ marginTop: 40 }} />
    ) : (
      <View style={styles.emptyWrap}>
        <Text style={styles.emptyIcon}>🔍</Text>
        <Text style={styles.emptyText}>No {label} found</Text>
      </View>
    );

  // ── Filter pill renderer — extracted so it renders at fixed height ──
  const renderFilterPill = (item, activeFilter, setFilter) => (
    <TouchableOpacity
      key={item}
      style={[styles.filterPill, activeFilter === item && styles.filterPillActive]}
      onPress={() => setFilter(item)}
      activeOpacity={0.85}
    >
      <Text style={[styles.filterText, activeFilter === item && styles.filterTextActive]}>
        {item}
      </Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.root}>
      {/* ── Header ── */}
      <View style={[styles.header, { paddingTop: top + 6 }]}>
        {/* Back button row */}
        <View style={styles.backRow}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => navigation.goBack()}
            activeOpacity={0.8}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="chevron-back" size={20} color="#fff" />
          </TouchableOpacity>
        </View>


        <View style={styles.headerRow}>
          <View>
            <Text style={styles.hafrikLabel}>HAFRIK</Text>
            <Text style={styles.headerTitle}>
              {activeTab === 0 ? 'Communities' : 'Business Pages'}
            </Text>
          </View>

          <TouchableOpacity style={styles.createBtn} activeOpacity={0.8}>
            <Ionicons name="add" size={18} color="#fff" />
            <Text style={styles.createBtnText}>
              {activeTab === 0 ? 'Create' : 'Add Business'}
            </Text>
          </TouchableOpacity>
        </View>




        {/* Search */}
        <View style={styles.searchWrap}>
          <Ionicons name="search-outline" size={16} color={MUTED} style={{ marginRight: 8 }} />
          <TextInput
            style={styles.searchInput}
            placeholder={activeTab === 0 ? 'Search communities…' : 'Search businesses…'}
            placeholderTextColor={MUTED}
            value={search}
            onChangeText={setSearch}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={18} color={MUTED} />
            </TouchableOpacity>
          )}
        </View>

        {/* Tab Switcher */}
        <View style={styles.tabBar}>
          <Animated.View style={[styles.tabIndicator, { left: indicatorLeft }]} />
          {['Communities', 'Business'].map((tab, i) => (
            <TouchableOpacity
              key={tab}
              style={styles.tabBtn}
              onPress={() => switchTab(i)}
              activeOpacity={0.8}
            >
              <Text style={[styles.tabText, activeTab === i && styles.tabTextActive]}>{tab}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>



      {/* ── Communities Tab ── */}
      {activeTab === 0 && (
        <View style={{ flex: 1 }}>
          {/* FIX: use a plain horizontal ScrollView-style row instead of FlatList
              so pills don't inherit the list container height */}
          <View style={styles.filterRow}>
            {COMMUNITY_FILTERS.map((item) =>
              renderFilterPill(item, groupFilter, setGroupFilter)
            )}
          </View>

          <View style={styles.statsBar}>
            <Text style={styles.statItem}>
              <Text style={styles.statNum}>{groups.length}</Text> Groups
            </Text>
            <View style={styles.statDivider} />
            <Text style={styles.statItem}>
              <Text style={styles.statNum}>{groups.filter((g) => g._isMember).length}</Text> Joined
            </Text>
          </View>

          <FlatList
            data={filteredGroups}
            keyExtractor={(item) => String(item.id)}
            renderItem={renderGroup}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            onEndReached={() => {
              if (groupsHasMore && !groupsLoading) loadGroups(groupsPage + 1);
            }}
            onEndReachedThreshold={0.4}
            ListEmptyComponent={<ListEmpty loading={groupsLoading} label="communities" />}
            ListFooterComponent={
              groupsLoading && groups.length > 0 ? (
                <ActivityIndicator color={ACCENT} style={{ marginVertical: 16 }} />
              ) : null
            }
          />
        </View>
      )}

      {/* ── Business Tab ── */}
      {activeTab === 1 && (
        <View style={{ flex: 1 }}>
          <View style={styles.filterRow}>
            {BUSINESS_FILTERS.map((item) =>
              renderFilterPill(item, bizFilter, setBizFilter)
            )}
          </View>

          <View style={styles.statsBar}>
            <Text style={styles.statItem}>
              <Text style={styles.statNum}>{businesses.length}</Text> Businesses
            </Text>
            <View style={styles.statDivider} />
            <Text style={styles.statItem}>
              <Text style={styles.statNum}>
                {businesses.filter((b) => b.verified_value === 1).length}
              </Text>{' '}
              Verified
            </Text>
          </View>

          <FlatList
            data={filteredBusinesses}
            keyExtractor={(item) => String(item.id)}
            renderItem={renderBusiness}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            onEndReached={() => {
              if (bizHasMore && !bizLoading) loadBusinesses(bizPage + 1);
            }}
            onEndReachedThreshold={0.4}
            ListEmptyComponent={<ListEmpty loading={bizLoading} label="businesses" />}
            ListFooterComponent={
              bizLoading && businesses.length > 0 ? (
                <ActivityIndicator color={ACCENT} style={{ marginVertical: 16 }} />
              ) : null
            }
          />
        </View>
      )}
    </View>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: CREAM },

  header: { backgroundColor: BRAND, paddingHorizontal: 16, paddingBottom: 14 },

  // ── NEW: back button row sits above the title row ──
  backRow: {
    marginBottom: 6,
  },
  backBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  hafrikLabel: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 2,
    color: ACCENT,
    fontFamily: AppDetails?.fontFamily?.redex?.bold ?? 'System',
    marginBottom: 2,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#fff',
    fontFamily: AppDetails?.fontFamily?.redex?.bold ?? 'System',
  },
  createBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: ACCENT,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 100,
  },
  createBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#fff',
    fontFamily: AppDetails?.fontFamily?.redex?.bold ?? 'System',
  },

  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 100,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)',
    paddingHorizontal: 14,
    height: 42,
    marginBottom: 14,
  },
  searchInput: {
    flex: 1,
    color: '#fff',
    fontSize: 13,
    fontFamily: AppDetails?.fontFamily?.inter?.regular ?? 'System',
  },

  tabBar: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 100,
    padding: 3,
    position: 'relative',
    height: 40,
  },
  tabIndicator: {
    position: 'absolute',
    top: 3,
    bottom: 3,
    width: '47%',
    backgroundColor: '#fff',
    borderRadius: 100,
  },
  tabBtn: { flex: 1, alignItems: 'center', justifyContent: 'center', zIndex: 1 },
  tabText: {
    fontSize: 13,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.6)',
    fontFamily: AppDetails?.fontFamily?.redex?.bold ?? 'System',
  },
  tabTextActive: { color: BRAND },

  // ── FIX: filterRow is now a plain flexbox row (not a FlatList container)
  //    so pills sit at their natural/intrinsic height ──
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'nowrap',          // single horizontal line; add wrap if you want wrapping
    alignItems: 'center',        // ← KEY FIX: centres pills vertically at their own height
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 8,
  },
  filterPill: {
    // ← explicit height so pills are never stretched by their parent
    height: 32,
    paddingHorizontal: 14,
    borderRadius: 100,
    backgroundColor: 'rgba(12,63,68,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(12,63,68,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterPillActive: { backgroundColor: BRAND, borderColor: BRAND },
  filterText: {
    fontSize: 12,
    fontWeight: '600',
    color: DARK,
    fontFamily: AppDetails?.fontFamily?.inter?.medium ?? 'System',
  },
  filterTextActive: { color: '#fff' },

  statsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 8,
    gap: 10,
  },
  statItem: { fontSize: 11, color: MUTED, fontFamily: AppDetails?.fontFamily?.inter?.regular ?? 'System' },
  statNum: { fontWeight: '800', color: DARK, fontFamily: AppDetails?.fontFamily?.redex?.bold ?? 'System' },
  statDivider: { width: 1, height: 12, backgroundColor: 'rgba(12,63,68,0.15)' },

  listContent: { paddingHorizontal: 14, paddingBottom: 100, gap: 10 },

  card: {
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(12,63,68,0.07)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 10 },
  groupAvatar: { width: 50, height: 50, borderRadius: 14, backgroundColor: CREAM },
  bizAvatar: { width: 50, height: 50, borderRadius: 25 },
  cardHeaderInfo: { flex: 1 },

  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 3 },

  cardTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: DARK,
    fontFamily: AppDetails?.fontFamily?.redex?.bold ?? 'System',
    flexShrink: 1,
  },
  categoryPill: {
    backgroundColor: 'rgba(19,194,150,0.12)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 100,
    maxWidth: 160,
  },
  categoryPillText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#0a8060',
    fontFamily: AppDetails?.fontFamily?.inter?.medium ?? 'System',
  },
  memberCount: { fontSize: 11, color: MUTED, fontFamily: AppDetails?.fontFamily?.inter?.regular ?? 'System' },
  locationText: { fontSize: 10, color: MUTED, marginTop: 2 },

  promotedBadge: { backgroundColor: 'rgba(244,165,53,0.15)', borderRadius: 100, paddingHorizontal: 4, paddingVertical: 1 },
  promotedText: { fontSize: 10 },

  verifiedBadge: { width: 16, height: 16, borderRadius: 8, backgroundColor: ACCENT, alignItems: 'center', justifyContent: 'center' },
  verifiedText: { fontSize: 9, fontWeight: '800', color: '#fff' },

  cardAbout: {
    fontSize: 13,
    color: '#4a6068',
    lineHeight: 19,
    marginBottom: 12,
    fontFamily: AppDetails?.fontFamily?.inter?.regular ?? 'System',
  },

  cardFooter: { flexDirection: 'row', gap: 8, justifyContent: 'flex-end' },

  joinBtn: {
    backgroundColor: BRAND,
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 100,
    minWidth: 90,
    alignItems: 'center',
  },
  joinBtnActive: { backgroundColor: '#fff', borderWidth: 1.5, borderColor: BRAND },
  joinBtnText: { fontSize: 12, fontWeight: '700', color: '#fff', fontFamily: AppDetails?.fontFamily?.redex?.bold ?? 'System' },
  joinBtnTextActive: { color: BRAND },

  messageBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 100,
    borderWidth: 1.5,
    borderColor: BRAND,
    alignItems: 'center',
  },
  messageBtnText: { fontSize: 12, fontWeight: '700', color: BRAND, fontFamily: AppDetails?.fontFamily?.redex?.bold ?? 'System' },

  emptyWrap: { alignItems: 'center', paddingTop: 60, gap: 10 },
  emptyIcon: { fontSize: 36 },
  emptyText: { fontSize: 14, color: MUTED, fontFamily: AppDetails?.fontFamily?.inter?.regular ?? 'System' },
});




export default CommunitiesScreen;