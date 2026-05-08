import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  FlatList,
  Image,
  ActivityIndicator,
  ScrollView,
  StatusBar,
  RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../../AuthContext';
import { Colors } from '../../theme';
import { useTheme } from '../../theme/ThemeContext';
import { getGroups, getCategories, joinGroup, leaveGroup } from './services/groupApi';
import CreateModal from './CreateModal';

const BRAND = Colors.primaryDark;
const ACCENT = Colors.primary;
const BG = '#F4F8F8';
const CARD = Colors.white;
const WHITE = Colors.white;
const BLACK = Colors.black;
const MUTED = Colors.secondaryText;
const TEXT = Colors.black;
const BORDER = Colors.borderSoft ?? Colors.borderLight ?? '#E6EEEE';
const GREEN = '#18A957';
const GOLD = '#F2A900';

const TABS = [
  { key: 'discover', label: 'Discover', icon: 'compass-outline' },
  { key: 'joined', label: 'Joined', icon: 'checkmark-circle-outline' },
];

const decodeHtml = (text = '') =>
  String(text)
    .replace(/&#039;/g, "'")
    .replace(/&#8217;/g, "'")
    .replace(/&rsquo;/g, "'")
    .replace(/&lsquo;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;amp;/g, '&')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/&mdash;/g, '-')
    .replace(/&ndash;/g, '-')
    .replace(/&hellip;/g, '...')
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)));

const cleanText = (text = '') =>
  decodeHtml(text).replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();

const fmtCount = (n) => {
  const v = Number(n ?? 0);
  if (v >= 1000000) return `${(v / 1000000).toFixed(1)}M`;
  if (v >= 1000) return `${(v / 1000).toFixed(1)}k`;
  return String(v);
};

const isRealImage = (url) =>
  typeof url === 'string' &&
  url.trim().length > 6 &&
  !url.includes('default-avatar') &&
  !url.includes('blank_profile');

const getGroupId = (group) => group?.id ?? group?.group_id;
const getMembers = (group) => Number(group?.members ?? group?.members_count ?? group?.total_members ?? 0);
const isJoined = (group) => group?.is_joined === true || group?.is_joined === 1 || group?.is_member === true || group?.is_member === 1;

const Metric = ({ value, label }) => (
  <View style={styles.heroMetric}>
    <Text style={styles.heroMetricValue}>{value}</Text>
    <Text style={styles.heroMetricLabel}>{label}</Text>
  </View>
);

const CategoryChip = ({ item, active, onPress }) => {
  const label = item ? cleanText(item.name ?? item.category_name ?? 'Category') : 'All';
  return (
    <TouchableOpacity style={[styles.categoryChip, active && styles.categoryChipActive]} onPress={onPress} activeOpacity={0.82}>
      <Ionicons name={item ? 'pricetag-outline' : 'apps-outline'} size={13} color={active ? WHITE : BRAND} />
      <Text style={[styles.categoryChipText, active && styles.categoryChipTextActive]} numberOfLines={1}>{label}</Text>
    </TouchableOpacity>
  );
};

const CommunityCard = ({ item, onOpen, onJoinToggle, categoryName }) => {
  const title = cleanText(item?.title ?? item?.name ?? 'Community');
  const about = cleanText(item?.description ?? item?.about ?? '');
  const category = cleanText(categoryName ?? item?.category_name ?? item?.category_title ?? '');
  const privacy = cleanText(item?.privacy ?? item?.type ?? '');
  const cover = item?.cover ?? item?.cover_image ?? item?.cover_photo ?? item?.cover_url ?? item?.banner ?? item?.group_cover ?? item?.image ?? item?.avatar;
  const avatar = item?.avatar ?? item?.icon ?? item?.group_picture ?? item?.profile_picture ?? item?.image;
  const joined = isJoined(item);
  const members = getMembers(item);
  const posts = Number(item?.posts_count ?? item?.posts ?? 0);

  return (
    <TouchableOpacity style={styles.groupCard} onPress={onOpen} activeOpacity={0.9}>
      <View style={styles.coverWrap}>
        {isRealImage(cover) ? (
          <Image source={{ uri: cover }} style={styles.coverImage} resizeMode="cover" />
        ) : (
          <LinearGradient colors={[BRAND, '#0C4B4F', ACCENT]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.coverImage} />
        )}
        <LinearGradient colors={['transparent', 'rgba(0,0,0,0.66)']} style={StyleSheet.absoluteFill} />
        <View style={styles.coverBadgeRow}>
          {!!category && (
            <View style={styles.coverBadge}>
              <Text style={styles.coverBadgeText} numberOfLines={1}>{category}</Text>
            </View>
          )}
          {!!privacy && (
            <View style={styles.privacyBadge}>
              <Ionicons name={privacy.toLowerCase() === 'private' ? 'lock-closed' : 'earth'} size={10} color={WHITE} />
              <Text style={styles.privacyBadgeText}>{privacy}</Text>
            </View>
          )}
        </View>
      </View>

      <View style={styles.cardBody}>
        <View style={styles.avatarRow}>
          {isRealImage(avatar) ? (
            <Image source={{ uri: avatar }} style={styles.groupAvatar} resizeMode="cover" />
          ) : (
            <LinearGradient colors={[BRAND, ACCENT]} style={[styles.groupAvatar, styles.avatarFallback]}>
              <Ionicons name="people" size={24} color={WHITE} />
            </LinearGradient>
          )}

          <View style={styles.titleBlock}>
            <Text style={styles.groupTitle} numberOfLines={1}>{title}</Text>
            <Text style={styles.groupMeta} numberOfLines={1}>
              {members > 0 ? `${fmtCount(members)} members` : 'New community'}
              {posts > 0 ? ` · ${fmtCount(posts)} posts` : ''}
            </Text>
          </View>
        </View>

        {!!about && <Text style={styles.groupAbout} numberOfLines={2}>{about}</Text>}

        <View style={styles.cardActions}>
          <TouchableOpacity
            style={[styles.joinButton, joined && styles.joinedButton]}
            onPress={(event) => {
              event.stopPropagation();
              onJoinToggle(item);
            }}
            activeOpacity={0.84}
          >
            <Ionicons name={joined ? 'checkmark' : 'add'} size={15} color={joined ? BRAND : WHITE} />
            <Text style={[styles.joinButtonText, joined && styles.joinedButtonText]}>{joined ? 'Joined' : 'Join'}</Text>
          </TouchableOpacity>

          <View style={styles.viewButton}>
            <Text style={styles.viewButtonText}>View community</Text>
            <Ionicons name="arrow-forward" size={13} color={ACCENT} />
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const SkeletonCard = ({ index }) => (
  <View style={[styles.groupCard, { opacity: 0.75 - index * 0.08 }]}>
    <View style={styles.skeletonCover} />
    <View style={styles.cardBody}>
      <View style={styles.avatarRow}>
        <View style={styles.skeletonAvatar} />
        <View style={{ flex: 1, gap: 8 }}>
          <View style={styles.skeletonLineBig} />
          <View style={styles.skeletonLineSmall} />
        </View>
      </View>
      <View style={styles.skeletonTextLine} />
      <View style={[styles.skeletonTextLine, { width: '68%' }]} />
    </View>
  </View>
);

const CommunitiesScreen = () => {
  const navigation = useNavigation();
  const { top } = useSafeAreaInsets();
  const { token, user } = useAuth();
  const { colors: tc } = useTheme();

  const [showCreate, setShowCreate] = useState(false);
  const [groups, setGroups] = useState([]);
  const [groupsLoad, setGroupsLoad] = useState(true);
  const [groupsPage, setGroupsPage] = useState(1);
  const [groupsMore, setGroupsMore] = useState(true);
  const [activeTab, setActiveTab] = useState('discover');
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [search, setSearch] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const activeTabRef = useRef(activeTab);
  const searchRef = useRef(search);
  const selectedCatRef = useRef(selectedCategory);
  activeTabRef.current = activeTab;
  searchRef.current = search;
  selectedCatRef.current = selectedCategory;

  const loadGroups = useCallback(async (page = 1, replace = false) => {
    try {
      if (page === 1) setGroupsLoad(true);
      const tab = activeTabRef.current;
      const query = searchRef.current.trim();
      const cat = selectedCatRef.current;
      const params = {};

      if (tab === 'joined') params.joined = 1;
      if (cat?.id || cat?.category_id) params.category_id = cat.id ?? cat.category_id;
      if (query) params.search = query;

      const res = await getGroups(page, 20, params);
      if (res?.status === 'success') {
        const items = Array.isArray(res.data?.data)
          ? res.data.data
          : Array.isArray(res.data)
            ? res.data
            : [];
        setGroups((prev) => replace ? items : [...prev, ...items]);
        setGroupsMore(items.length >= 20);
        setGroupsPage(page);
      }
    } catch (error) {
      console.log('[Communities] loadGroups error:', error?.response?.data || error?.message || error);
    } finally {
      setGroupsLoad(false);
      setRefreshing(false);
    }
  }, []);

  const loadCategories = useCallback(async () => {
    try {
      const res = await getCategories(token);
      if (res?.status === 'success') {
        const raw = Array.isArray(res.data) ? res.data : Array.isArray(res.data?.data) ? res.data.data : [];
        setCategories(raw);
      }
    } catch (error) {
      console.log('[Communities] loadCategories error:', error?.response?.data || error?.message || error);
    }
  }, [token]);

  useEffect(() => {
    loadGroups(1, true);
    loadCategories();
  }, [loadGroups, loadCategories]);

  const firstTab = useRef(true);
  useEffect(() => {
    if (firstTab.current) {
      firstTab.current = false;
      return;
    }
    setSelectedCategory(null);
    setGroups([]);
    setGroupsPage(1);
    setGroupsMore(true);
    loadGroups(1, true);
  }, [activeTab, loadGroups]);

  const firstCat = useRef(true);
  useEffect(() => {
    if (firstCat.current) {
      firstCat.current = false;
      return;
    }
    setGroups([]);
    setGroupsPage(1);
    setGroupsMore(true);
    loadGroups(1, true);
  }, [selectedCategory, loadGroups]);

  const firstSearch = useRef(true);
  useEffect(() => {
    if (firstSearch.current) {
      firstSearch.current = false;
      return;
    }
    const timer = setTimeout(() => {
      setGroups([]);
      setGroupsPage(1);
      setGroupsMore(true);
      loadGroups(1, true);
    }, 360);
    return () => clearTimeout(timer);
  }, [search, loadGroups]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadGroups(1, true);
  }, [loadGroups]);

  const handleJoinToggle = useCallback(async (item) => {
    const id = getGroupId(item);
    if (!id) return;
    const joining = !isJoined(item);
    const delta = joining ? 1 : -1;

    setGroups((prev) => prev.map((group) => {
      if (String(getGroupId(group)) !== String(id)) return group;
      const currentMembers = getMembers(group);
      return {
        ...group,
        is_joined: joining,
        is_member: joining,
        members: Math.max(0, currentMembers + delta),
        members_count: Math.max(0, currentMembers + delta),
      };
    }));

    try {
      const res = await (joining ? joinGroup(id) : leaveGroup(id));
      const updated = res?.data ?? res;
      if (updated) {
        setGroups((prev) => prev.map((group) => (
          String(getGroupId(group)) === String(id)
            ? {
                ...group,
                is_joined: updated.is_joined ?? joining,
                is_member: updated.is_joined ?? joining,
                members: updated.members ?? group.members,
                members_count: updated.members ?? group.members_count,
              }
            : group
        )));
      }
    } catch (error) {
      console.log('[Communities] join error:', error?.response?.data || error?.message || error);
      setGroups((prev) => prev.map((group) => {
        if (String(getGroupId(group)) !== String(id)) return group;
        const currentMembers = getMembers(group);
        return {
          ...group,
          is_joined: !joining,
          is_member: !joining,
          members: Math.max(0, currentMembers - delta),
          members_count: Math.max(0, currentMembers - delta),
        };
      }));
    }
  }, []);

  const joinedCount = useMemo(() => groups.filter(isJoined).length, [groups]);
  const activeTabLabel = TABS.find((tab) => tab.key === activeTab)?.label ?? 'Discover';
  const categoryMap = useMemo(() => {
    const map = {};
    categories.forEach((cat) => {
      const id = cat?.id ?? cat?.category_id;
      const name = cleanText(cat?.name ?? cat?.category_name ?? cat?.title ?? '');
      if (id != null && name) map[String(id)] = name;
    });
    return map;
  }, [categories]);

  const getCategoryName = useCallback((group) => {
    const direct = cleanText(group?.category_name ?? group?.category_title ?? '');
    if (direct && !/^\d+$/.test(direct)) return direct;
    const id = group?.category_id ?? group?.category;
    return id != null ? categoryMap[String(id)] ?? '' : '';
  }, [categoryMap]);

  const renderGroup = useCallback(({ item }) => (
    <CommunityCard
      item={item}
      categoryName={getCategoryName(item)}
      onJoinToggle={handleJoinToggle}
      onOpen={() => navigation.navigate('GroupDetails', { groupId: getGroupId(item) })}
    />
  ), [getCategoryName, handleJoinToggle, navigation]);

  const ListHeader = useMemo(() => (
    <View>
      <LinearGradient
        colors={[BRAND, '#0C4B4F', ACCENT]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.heroBlock}
      >
        <View style={styles.heroPillRow}>
          <View style={styles.heroPill}>
            <View style={styles.liveDot} />
            <Text style={styles.heroPillText}>COMMUNITIES</Text>
          </View>
          <View style={styles.heroPill}>
            <Ionicons name="sparkles" size={11} color={WHITE} />
            <Text style={styles.heroPillText}>Find your people</Text>
          </View>
        </View>

        <Text style={styles.heroTitle}>Discover communities{'\n'}built around real life.</Text>
        <Text style={styles.heroSub}>Ask questions, share updates, join city groups, business circles and interest spaces on Hafrik.</Text>

        <View style={styles.searchBox}>
          <Ionicons name="search" size={18} color={WHITE + 'CC'} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search communities..."
            placeholderTextColor={WHITE + '8A'}
            value={search}
            onChangeText={setSearch}
            returnKeyType="search"
            autoCorrect={false}
            autoCapitalize="none"
          />
          {!!search && (
            <TouchableOpacity style={styles.searchClear} onPress={() => setSearch('')} activeOpacity={0.8}>
              <Ionicons name="close" size={16} color={BRAND} />
            </TouchableOpacity>
          )}
        </View>
      </LinearGradient>

      <View style={styles.tabsCard}>
        {TABS.map((tab) => {
          const active = activeTab === tab.key;
          return (
            <TouchableOpacity
              key={tab.key}
              style={[styles.tabButton, active && styles.tabButtonActive]}
              onPress={() => setActiveTab(tab.key)}
              activeOpacity={0.78}
            >
              <Ionicons name={tab.icon} size={15} color={active ? WHITE : MUTED} />
              <Text style={[styles.tabText, active && styles.tabTextActive]}>{tab.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {activeTab === 'discover' && (
        <View style={styles.categoryStrip}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryScroll}>
            <CategoryChip item={null} active={!selectedCategory} onPress={() => setSelectedCategory(null)} />
            {categories.map((cat, index) => {
              const id = cat.id ?? cat.category_id ?? index;
              const active = String(selectedCategory?.id ?? selectedCategory?.category_id ?? '') === String(id);
              return (
                <CategoryChip
                  key={`cat-${id}`}
                  item={cat}
                  active={active}
                  onPress={() => setSelectedCategory(cat)}
                />
              );
            })}
          </ScrollView>
        </View>
      )}

      <View style={styles.sectionIntro}>
        <Text style={styles.sectionIntroTitle}>{activeTabLabel} communities</Text>
        <Text style={styles.sectionIntroSub}>
          {search ? `Showing results for "${search}"` : selectedCategory ? cleanText(selectedCategory.name ?? selectedCategory.category_name) : 'Tap a community to view posts, members and media.'}
        </Text>
      </View>
    </View>
  ), [activeTab, activeTabLabel, categories, search, selectedCategory]);

  return (
    <View style={[styles.root, { backgroundColor: tc.background ?? BG }]}>
      <StatusBar barStyle="light-content" />

      <View style={[styles.header, { paddingTop: top + 8 }]}>
        <TouchableOpacity style={styles.headerIcon} onPress={() => navigation.goBack()} activeOpacity={0.84}>
          <Ionicons name="arrow-back" size={20} color={WHITE} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Communities</Text>
          <Text style={styles.headerSub}>Connect, learn, belong</Text>
        </View>
        <TouchableOpacity style={styles.createButton} onPress={() => setShowCreate(true)} activeOpacity={0.86}>
          <Ionicons name="add" size={18} color={BRAND} />
        </TouchableOpacity>
      </View>

      <FlatList
        data={groups}
        keyExtractor={(item, index) => `community-${getGroupId(item) ?? index}-${index}`}
        renderItem={renderGroup}
        ListHeaderComponent={ListHeader}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={ACCENT}
            colors={[ACCENT, BRAND]}
            progressBackgroundColor={WHITE}
          />
        }
        onEndReached={() => {
          if (groupsMore && !groupsLoad) loadGroups(groupsPage + 1);
        }}
        onEndReachedThreshold={0.4}
        ListEmptyComponent={
          groupsLoad ? (
            <View style={styles.skeletonWrap}>
              {[0, 1, 2].map((index) => <SkeletonCard key={index} index={index} />)}
            </View>
          ) : (
            <View style={styles.emptyWrap}>
              <View style={styles.emptyCircle}>
                <Ionicons name="people-outline" size={36} color={MUTED} />
              </View>
              <Text style={styles.emptyTitle}>
                {activeTab === 'joined' ? 'No joined communities yet' : 'No communities found'}
              </Text>
              <Text style={styles.emptySub}>
                {activeTab === 'joined' ? 'Join a community and it will appear here.' : 'Try another search or category.'}
              </Text>
            </View>
          )
        }
        ListFooterComponent={
          groupsLoad && groups.length > 0 ? (
            <ActivityIndicator color={ACCENT} style={styles.footerLoader} />
          ) : null
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
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },
  header: {
    backgroundColor: BRAND,
    paddingHorizontal: 14,
    paddingBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: WHITE + '18',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: WHITE + '20',
  },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerTitle: {
    color: WHITE,
    fontSize: 16,
    fontWeight: '900',
    fontFamily: 'ReadexPro-Bold',
  },
  headerSub: {
    color: WHITE + 'A8',
    fontSize: 11,
    marginTop: 1,
    fontFamily: 'ReadexPro-Regular',
  },
  createButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: ACCENT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContent: { paddingBottom: 110 },

  heroBlock: {
    paddingHorizontal: 18,
    paddingTop: 22,
    paddingBottom: 18,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    overflow: 'hidden',
  },
  heroPillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 15,
  },
  heroPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: WHITE + '16',
    borderWidth: 1,
    borderColor: WHITE + '24',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: ACCENT,
  },
  heroPillText: {
    color: WHITE + 'D0',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.75,
    fontFamily: 'ReadexPro-Bold',
  },
  heroTitle: {
    color: WHITE,
    fontSize: 28,
    lineHeight: 34,
    fontWeight: '900',
    letterSpacing: -0.7,
    fontFamily: 'ReadexPro-Bold',
  },
  heroSub: {
    color: WHITE + 'B8',
    fontSize: 13,
    lineHeight: 19,
    marginTop: 8,
    fontFamily: 'ReadexPro-Regular',
  },
  heroMetrics: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 18,
    paddingVertical: 13,
    paddingHorizontal: 12,
    backgroundColor: WHITE + '14',
    borderWidth: 1,
    borderColor: WHITE + '1F',
    borderRadius: 20,
  },
  heroMetric: { flex: 1, alignItems: 'center', gap: 2 },
  heroMetricValue: {
    color: WHITE,
    fontSize: 17,
    fontWeight: '900',
    fontFamily: 'ReadexPro-Bold',
  },
  heroMetricLabel: {
    color: WHITE + '94',
    fontSize: 9.5,
    textTransform: 'uppercase',
    letterSpacing: 0.55,
    fontWeight: '800',
    fontFamily: 'ReadexPro-Bold',
  },
  heroMetricDivider: { width: 1, height: 30, backgroundColor: WHITE + '24' },
  searchBox: {
    marginTop: 16,
    height: 52,
    borderRadius: 26,
    backgroundColor: WHITE + '17',
    borderWidth: 1,
    borderColor: WHITE + '28',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingLeft: 16,
    paddingRight: 8,
  },
  searchInput: {
    flex: 1,
    color: WHITE,
    fontSize: 14,
    paddingVertical: 0,
    fontFamily: 'ReadexPro-Regular',
  },
  searchClear: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: ACCENT,
    alignItems: 'center',
    justifyContent: 'center',
  },

  tabsCard: {
    marginHorizontal: 14,
    marginTop: 14,
    backgroundColor: CARD,
    borderRadius: 24,
    padding: 6,
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: BORDER,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 5,
  },
  tabButtonActive: { backgroundColor: BRAND },
  tabText: {
    color: MUTED,
    fontSize: 11,
    fontWeight: '900',
    fontFamily: 'ReadexPro-Bold',
  },
  tabTextActive: { color: WHITE },

  categoryStrip: {
    paddingVertical: 12,
  },
  categoryScroll: {
    paddingHorizontal: 14,
    gap: 8,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: CARD,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 999,
    paddingHorizontal: 13,
    paddingVertical: 8,
    maxWidth: 180,
  },
  categoryChipActive: {
    backgroundColor: BRAND,
    borderColor: BRAND,
  },
  categoryChipText: {
    color: BRAND,
    fontSize: 12,
    fontWeight: '900',
    fontFamily: 'ReadexPro-Bold',
  },
  categoryChipTextActive: { color: WHITE },

  sectionIntro: {
    paddingHorizontal: 16,
    paddingTop: 2,
    paddingBottom: 10,
  },
  sectionIntroTitle: {
    color: TEXT,
    fontSize: 16,
    fontWeight: '900',
    fontFamily: 'ReadexPro-Bold',
  },
  sectionIntroSub: {
    color: MUTED,
    fontSize: 12,
    marginTop: 3,
    fontFamily: 'ReadexPro-Regular',
  },

  groupCard: {
    marginHorizontal: 14,
    marginBottom: 14,
    backgroundColor: CARD,
    borderRadius: 26,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: BORDER,
    shadowColor: BLACK,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.07,
    shadowRadius: 18,
    elevation: 3,
  },
  coverWrap: {
    height: 118,
    backgroundColor: BRAND,
    overflow: 'hidden',
  },
  coverImage: {
    width: '100%',
    height: '100%',
  },
  coverBadgeRow: {
    position: 'absolute',
    left: 12,
    right: 12,
    bottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  coverBadge: {
    maxWidth: '64%',
    backgroundColor: WHITE + '20',
    borderWidth: 1,
    borderColor: WHITE + '26',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  coverBadgeText: {
    color: WHITE,
    fontSize: 10.5,
    fontWeight: '900',
    fontFamily: 'ReadexPro-Bold',
  },
  privacyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: BLACK + '44',
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  privacyBadgeText: {
    color: WHITE,
    fontSize: 10.5,
    fontWeight: '800',
    textTransform: 'capitalize',
    fontFamily: 'ReadexPro-Bold',
  },
  cardBody: {
    padding: 14,
  },
  avatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  groupAvatar: {
    width: 58,
    height: 58,
    borderRadius: 20,
    backgroundColor: BORDER,
    marginTop: -30,
    borderWidth: 3,
    borderColor: CARD,
  },
  avatarFallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleBlock: { flex: 1, paddingTop: 2 },
  groupTitle: {
    color: TEXT,
    fontSize: 16,
    fontWeight: '900',
    fontFamily: 'ReadexPro-Bold',
  },
  groupMeta: {
    color: MUTED,
    fontSize: 11.5,
    marginTop: 3,
    fontFamily: 'ReadexPro-Regular',
  },
  groupAbout: {
    color: MUTED,
    fontSize: 12.5,
    lineHeight: 18,
    marginTop: 11,
    fontFamily: 'ReadexPro-Regular',
  },
  cardActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 14,
  },
  joinButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    backgroundColor: BRAND,
    borderRadius: 999,
    paddingHorizontal: 17,
    paddingVertical: 10,
    minWidth: 92,
  },
  joinedButton: {
    backgroundColor: CARD,
    borderWidth: 1.5,
    borderColor: BORDER,
  },
  joinButtonText: {
    color: WHITE,
    fontSize: 12,
    fontWeight: '900',
    fontFamily: 'ReadexPro-Bold',
  },
  joinedButtonText: { color: BRAND },
  viewButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: ACCENT + '10',
    borderWidth: 1,
    borderColor: ACCENT + '24',
    borderRadius: 999,
    paddingVertical: 10,
  },
  viewButtonText: {
    color: ACCENT,
    fontSize: 12,
    fontWeight: '900',
    fontFamily: 'ReadexPro-Bold',
  },

  skeletonWrap: { paddingTop: 4 },
  skeletonCover: { height: 118, backgroundColor: BRAND + '12' },
  skeletonAvatar: {
    width: 58,
    height: 58,
    borderRadius: 20,
    backgroundColor: BRAND + '14',
    marginTop: -30,
    borderWidth: 3,
    borderColor: CARD,
  },
  skeletonLineBig: {
    width: '72%',
    height: 14,
    borderRadius: 7,
    backgroundColor: BRAND + '12',
  },
  skeletonLineSmall: {
    width: '44%',
    height: 10,
    borderRadius: 5,
    backgroundColor: BRAND + '0D',
  },
  skeletonTextLine: {
    width: '92%',
    height: 10,
    borderRadius: 5,
    backgroundColor: BRAND + '0D',
    marginTop: 11,
  },
  emptyWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 58,
    paddingHorizontal: 30,
  },
  emptyCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: ACCENT + '14',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  emptyTitle: {
    color: TEXT,
    fontSize: 16,
    fontWeight: '900',
    fontFamily: 'ReadexPro-Bold',
  },
  emptySub: {
    color: MUTED,
    textAlign: 'center',
    fontSize: 12,
    lineHeight: 18,
    marginTop: 5,
    fontFamily: 'ReadexPro-Regular',
  },
  footerLoader: { marginVertical: 22 },
});

export default CommunitiesScreen;
