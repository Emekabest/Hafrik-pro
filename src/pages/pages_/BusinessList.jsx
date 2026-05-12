import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  FlatList,
  Image,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../AuthContext';
import useStore from '../../repository/store';
import { Colors } from '../../theme';
import { getBusinessList, getBusinessCategories, toggleFollowBusiness } from './Businessapi';
import CreateModal from '../groups/CreateModal';

const BRAND = Colors.primaryDark;
const ACCENT = Colors.primary;
const BG = '#F4F8F8';
const CARD = Colors.white;
const TEXT = Colors.black;
const MUTED = Colors.secondaryText;
const BORDER = Colors.borderSoft ?? Colors.borderLight ?? Colors.border ?? '#E3ECEC';
const WHITE = Colors.white;
const BLACK = Colors.black;
const GOLD = '#F2A900';
const GREEN = '#18A957';

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

const cleanText = (text = '') => decodeHtml(text).replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();

const fmtCount = (n) => {
  const v = Number(n ?? 0);
  if (v >= 1000000) return `${(v / 1000000).toFixed(1)}M`;
  if (v >= 1000) return `${(v / 1000).toFixed(1)}k`;
  return String(v);
};

const alpha = (hex, opacity) => {
  const normalized = String(hex || '').replace('#', '');
  if (normalized.length !== 6) return hex || 'transparent';
  return `#${normalized}${Math.round(Math.max(0, Math.min(1, opacity)) * 255).toString(16).padStart(2, '0')}`;
};

const isRealImage = (url) =>
  typeof url === 'string' &&
  /^https?:\/\//i.test(url.trim()) &&
  !url.includes('default-avatar') &&
  !url.includes('blank_profile');

const BIZ_CAT_MAP = {
  automotive: { icon: 'car-sport-outline', color: '#3b82f6' },
  vehicle: { icon: 'car-sport-outline', color: '#3b82f6' },
  education: { icon: 'school-outline', color: '#7c3aed' },
  school: { icon: 'school-outline', color: '#7c3aed' },
  entertainment: { icon: 'film-outline', color: '#db2777' },
  music: { icon: 'musical-notes-outline', color: '#db2777' },
  event: { icon: 'calendar-outline', color: '#f59e0b' },
  food: { icon: 'restaurant-outline', color: '#ea580c' },
  restaurant: { icon: 'restaurant-outline', color: '#ea580c' },
  health: { icon: 'medkit-outline', color: '#dc2626' },
  fitness: { icon: 'barbell-outline', color: '#16a34a' },
  logistics: { icon: 'cube-outline', color: '#0891b2' },
  transport: { icon: 'bus-outline', color: '#0891b2' },
  shipping: { icon: 'send-outline', color: '#0891b2' },
  tech: { icon: 'laptop-outline', color: '#0284c7' },
  finance: { icon: 'wallet-outline', color: '#16a34a' },
  fashion: { icon: 'shirt-outline', color: '#ec4899' },
  clothing: { icon: 'shirt-outline', color: '#ec4899' },
  'real estate': { icon: 'home-outline', color: '#059669' },
  property: { icon: 'home-outline', color: '#059669' },
  services: { icon: 'hammer-outline', color: '#78716c' },
  travel: { icon: 'airplane-outline', color: '#6366f1' },
  hotel: { icon: 'bed-outline', color: '#6366f1' },
  beauty: { icon: 'rose-outline', color: '#f43f5e' },
  retail: { icon: 'cart-outline', color: '#f97316' },
  shop: { icon: 'bag-handle-outline', color: '#f97316' },
  legal: { icon: 'document-text-outline', color: '#6366f1' },
};

const getCatIcon = (name = '') => {
  const lower = cleanText(name).toLowerCase();
  for (const [key, value] of Object.entries(BIZ_CAT_MAP)) {
    if (lower.includes(key)) return value;
  }
  return { icon: 'storefront-outline', color: BRAND };
};

const getBusinessId = (business) => business?.id ?? business?.page_id;

const CategoryChip = ({ item, active, onPress }) => {
  const name = item ? cleanText(item.name ?? item.category_name ?? item.title ?? 'Category') : 'All';
  const { icon, color } = item ? getCatIcon(name) : { icon: 'apps-outline', color: BRAND };
  return (
    <TouchableOpacity style={[styles.categoryChip, active && styles.categoryChipActive]} onPress={onPress} activeOpacity={0.82}>
      <View style={[styles.categoryIcon, { backgroundColor: active ? WHITE + '22' : alpha(color, 0.13) }]}>
        <Ionicons name={icon} size={14} color={active ? WHITE : color} />
      </View>
      <Text style={[styles.categoryChipText, active && styles.categoryChipTextActive]} numberOfLines={1}>{name}</Text>
    </TouchableOpacity>
  );
};

const SkeletonBlock = ({ style }) => {
  const pulse = useRef(new Animated.Value(0.35)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 0.72, duration: 760, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0.35, duration: 760, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);
  return <Animated.View style={[styles.skeletonBlock, style, { opacity: pulse }]} />;
};

const BusinessCard = ({ business, user, categoryName, onOpen, onFollowToggle }) => {
  const openComposer = useStore((state) => state.openComposer);
  const id = getBusinessId(business);
  const title = cleanText(business?.title ?? business?.name ?? 'Business');
  const about = cleanText(business?.about ?? business?.description ?? '');
  const cover = business?.cover ?? business?.cover_image ?? business?.banner ?? business?.image ?? business?.avatar;
  const avatar = business?.avatar ?? business?.logo ?? business?.profile_picture ?? business?.image;
  const verified = business?.verified === true || business?.verified === 1 || business?.verified_value === 1;
  const liked = business?.is_liked === true || business?.is_liked === 1 || business?.is_following === true || business?.is_following === 1;
  const likes = Number(business?.likes ?? business?.followers ?? business?.followers_count ?? 0);
  const isOwner =
    business?.is_owner === true ||
    business?.is_owner === 1 ||
    (user?.id && String(business?.user_id) === String(user.id));
  const cat = categoryName || cleanText(business?.category_name ?? business?.category_title ?? '');
  const { icon, color } = getCatIcon(cat);

  return (
    <TouchableOpacity style={styles.businessCard} onPress={onOpen} activeOpacity={0.9}>
      <View style={styles.businessCover}>
        {isRealImage(cover) ? (
          <Image source={{ uri: cover }} style={styles.coverImage} resizeMode="cover" />
        ) : (
          <LinearGradient colors={[BRAND, '#0D5257', ACCENT]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.coverImage}>
            <Ionicons name="storefront-outline" size={38} color={WHITE + '45'} />
          </LinearGradient>
        )}
        <LinearGradient colors={['transparent', 'rgba(0,0,0,0.68)']} style={StyleSheet.absoluteFill} />
        <View style={styles.coverTopRow}>
          {verified && (
            <View style={styles.verifiedBadge}>
              <Ionicons name="checkmark-circle" size={11} color={WHITE} />
              <Text style={styles.verifiedBadgeText}>Verified</Text>
            </View>
          )}
          {!!cat && (
            <View style={[styles.categoryBadge, { backgroundColor: alpha(color, 0.9) }]}>
              <Ionicons name={icon} size={10} color={WHITE} />
              <Text style={styles.categoryBadgeText} numberOfLines={1}>{cat}</Text>
            </View>
          )}
        </View>
      </View>

      <View style={styles.businessBody}>
        <View style={styles.identityRow}>
          {isRealImage(avatar) ? (
            <Image source={{ uri: avatar }} style={styles.businessAvatar} resizeMode="cover" />
          ) : (
            <LinearGradient colors={[BRAND, ACCENT]} style={[styles.businessAvatar, styles.avatarFallback]}>
              <Ionicons name="business" size={23} color={WHITE} />
            </LinearGradient>
          )}
          <View style={styles.businessText}>
            <View style={styles.titleRow}>
              <Text style={styles.businessTitle} numberOfLines={1}>{title}</Text>
              {isOwner && (
                <View style={styles.ownerPill}>
                  <Text style={styles.ownerPillText}>Yours</Text>
                </View>
              )}
            </View>
            <View style={styles.metaRow}>
              <Ionicons name="heart" size={11} color={liked ? ACCENT : MUTED} />
              <Text style={styles.metaText}>{fmtCount(likes)} followers</Text>
            </View>
          </View>
        </View>

        {!!about && <Text style={styles.businessAbout} numberOfLines={2}>{about}</Text>}

        <View style={styles.actionRow}>
          {isOwner ? (
            <TouchableOpacity
              style={styles.secondaryAction}
              onPress={(event) => {
                event.stopPropagation();
                openComposer({ target_type: 'page', target_id: id, title, avatar: avatar ?? undefined, locked: true });
              }}
              activeOpacity={0.84}
            >
              <Ionicons name="create-outline" size={15} color={BRAND} />
              <Text style={styles.secondaryActionText}>Post</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[styles.secondaryAction, liked && styles.secondaryActionOn]}
              onPress={(event) => {
                event.stopPropagation();
                onFollowToggle(business);
              }}
              activeOpacity={0.84}
            >
              <Ionicons name={liked ? 'checkmark' : 'add'} size={15} color={liked ? BRAND : ACCENT} />
              <Text style={[styles.secondaryActionText, liked && { color: BRAND }]}>{liked ? 'Following' : 'Follow'}</Text>
            </TouchableOpacity>
          )}

          <View style={styles.primaryAction}>
            <Text style={styles.primaryActionText}>{isOwner ? 'Manage Page' : 'View Page'}</Text>
            <Ionicons name="arrow-forward" size={13} color={WHITE} />
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const SkeletonCard = () => (
  <View style={styles.businessCard}>
    <SkeletonBlock style={{ height: 128, borderRadius: 0 }} />
    <View style={styles.businessBody}>
      <View style={styles.identityRow}>
        <SkeletonBlock style={{ width: 58, height: 58, borderRadius: 20 }} />
        <View style={{ flex: 1, gap: 8 }}>
          <SkeletonBlock style={{ width: '72%', height: 14 }} />
          <SkeletonBlock style={{ width: '42%', height: 10 }} />
        </View>
      </View>
      <SkeletonBlock style={{ width: '92%', height: 10, marginTop: 14 }} />
      <SkeletonBlock style={{ width: '68%', height: 10, marginTop: 8 }} />
    </View>
  </View>
);

export default function BusinessList() {
  const navigation = useNavigation();
  const { token, user } = useAuth();
  const { top } = useSafeAreaInsets();

  const [pages, setPages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [pageNum, setPageNum] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [search, setSearch] = useState('');
  const [categories, setCategories] = useState([]);
  const [activeCat, setActiveCat] = useState(null);
  const [activeFilter, setActiveFilter] = useState('all');
  const [refreshing, setRefreshing] = useState(false);
  const [showCreate, setShowCreate] = useState(false);

  const searchRef = useRef('');
  const activeCatRef = useRef(null);
  const activeFilterRef = useRef('all');
  searchRef.current = search;
  activeCatRef.current = activeCat;
  activeFilterRef.current = activeFilter;

  const categoryMap = useMemo(() => {
    const map = {};
    categories.forEach((cat) => {
      const id = cat?.id ?? cat?.category_id;
      const name = cleanText(cat?.name ?? cat?.category_name ?? cat?.title ?? '');
      if (id != null && name) map[String(id)] = name;
    });
    return map;
  }, [categories]);

  const getCategoryName = useCallback((business) => {
    const direct = cleanText(business?.category_name ?? business?.category_title ?? '');
    if (direct && !/^\d+$/.test(direct)) return direct;
    const id = business?.category_id ?? business?.category;
    return id != null ? categoryMap[String(id)] ?? '' : '';
  }, [categoryMap]);

  const loadCategories = useCallback(async () => {
    try {
      const res = await getBusinessCategories(token);
      if (res?.status === 'success') {
        const raw = Array.isArray(res.data) ? res.data : Array.isArray(res.data?.data) ? res.data.data : [];
        const seen = new Set();
        const parentOnly = raw.filter((cat) => {
          const id = cat.id ?? cat.category_id;
          if (seen.has(id)) return false;
          seen.add(id);
          const parent = cat.parent_id ?? cat.parent ?? null;
          return parent == null || parent === 0 || parent === '0';
        });
        setCategories(parentOnly);
      }
    } catch (error) {
      console.log('[BusinessList] categories error:', error?.response?.data || error?.message || error);
    }
  }, [token]);

  const loadPages = useCallback(async (nextPage = 1, replace = false) => {
    try {
      if (nextPage === 1) setLoading(true);
      else setLoadingMore(true);

      const filters = {};
      const query = searchRef.current.trim();
      const filter = activeFilterRef.current;
      const category = activeCatRef.current;

      if (query) filters.search = query;
      if (filter === 'following') filters.liked = 1;
      if (filter === 'verified') filters.verified = 1;
      if (category != null) filters.category = category;

      const res = await getBusinessList(nextPage, filters);
      const list = Array.isArray(res?.data?.data)
        ? res.data.data
        : Array.isArray(res?.data)
          ? res.data
          : [];
      setPages((prev) => replace || nextPage === 1 ? list : [...prev, ...list]);
      setHasMore(list.length >= 20);
      setPageNum(nextPage);
    } catch (error) {
      console.log('[BusinessList] load error:', error?.response?.data || error?.message || error);
    } finally {
      setLoading(false);
      setLoadingMore(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadCategories();
    loadPages(1, true);
  }, [loadCategories, loadPages]);

  const firstSearch = useRef(true);
  useEffect(() => {
    if (firstSearch.current) {
      firstSearch.current = false;
      return;
    }
    const timer = setTimeout(() => {
      setPages([]);
      setPageNum(1);
      setHasMore(true);
      loadPages(1, true);
    }, 360);
    return () => clearTimeout(timer);
  }, [search, loadPages]);

  const handleFilter = useCallback((filter) => {
    setActiveFilter(filter);
    activeFilterRef.current = filter;
    setPages([]);
    setPageNum(1);
    setHasMore(true);
    setTimeout(() => loadPages(1, true), 0);
  }, [loadPages]);

  const handleCategory = useCallback((categoryId) => {
    setActiveCat(categoryId);
    activeCatRef.current = categoryId;
    setActiveFilter('all');
    activeFilterRef.current = 'all';
    setPages([]);
    setPageNum(1);
    setHasMore(true);
    setTimeout(() => loadPages(1, true), 0);
  }, [loadPages]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    loadPages(1, true);
  }, [loadPages]);

  const handleLoadMore = useCallback(() => {
    if (loadingMore || !hasMore || loading) return;
    loadPages(pageNum + 1, false);
  }, [hasMore, loading, loadingMore, loadPages, pageNum]);

  const openBusiness = useCallback((business) => {
    navigation.navigate('BusinessDetails', { pageId: getBusinessId(business) });
  }, [navigation]);

  const handleFollowToggle = useCallback(async (business) => {
    const id = getBusinessId(business);
    if (!id) return;
    const wasFollowing = business.is_liked === true || business.is_liked === 1 || business.is_following === true || business.is_following === 1;
    setPages((prev) => prev.map((item) => (
      String(getBusinessId(item)) === String(id)
        ? {
            ...item,
            is_liked: !wasFollowing,
            is_following: !wasFollowing,
            likes: Math.max(0, Number(item.likes ?? item.followers ?? 0) + (wasFollowing ? -1 : 1)),
          }
        : item
    )));
    try {
      const res = await toggleFollowBusiness(id, wasFollowing ? 'unlike' : 'like');
      const data = res?.data ?? res;
      if (data?.is_liked != null || data?.likes != null) {
        setPages((prev) => prev.map((item) => (
          String(getBusinessId(item)) === String(id)
            ? {
                ...item,
                is_liked: data.is_liked ?? !wasFollowing,
                is_following: data.is_liked ?? !wasFollowing,
                likes: data.likes ?? item.likes,
              }
            : item
        )));
      }
    } catch (error) {
      console.log('[BusinessList] follow error:', error?.response?.data || error?.message || error);
      setPages((prev) => prev.map((item) => (
        String(getBusinessId(item)) === String(id)
          ? {
              ...item,
              is_liked: wasFollowing,
              is_following: wasFollowing,
              likes: Math.max(0, Number(item.likes ?? item.followers ?? 0) + (wasFollowing ? 1 : -1)),
            }
          : item
      )));
    }
  }, []);

  const ListHeader = useMemo(() => (
    <View>
      <LinearGradient colors={[BRAND, '#0C4B4F', ACCENT]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero}>
        <View style={styles.heroPills}>
          <View style={styles.heroPill}>
            <View style={styles.heroDot} />
            <Text style={styles.heroPillText}>BUSINESS DIRECTORY</Text>
          </View>
          <View style={styles.heroPill}>
            <Ionicons name="shield-checkmark" size={11} color={WHITE} />
            <Text style={styles.heroPillText}>Trusted pages</Text>
          </View>
        </View>
        <Text style={styles.heroTitle}>Discover African{'\n'}businesses in China.</Text>
        <Text style={styles.heroSub}>Find services, shops, logistics, restaurants, schools and business pages from the Hafrik community.</Text>

        <View style={styles.searchBox}>
          <Ionicons name="search" size={18} color={WHITE + 'CC'} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search businesses..."
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

      <View style={styles.filterCard}>
        {[
          { key: 'all', label: 'All', icon: 'grid-outline' },
          { key: 'verified', label: 'Verified', icon: 'shield-checkmark-outline' },
          { key: 'following', label: 'Following', icon: 'heart-outline' },
        ].map((filter) => {
          const active = activeFilter === filter.key;
          return (
            <TouchableOpacity
              key={filter.key}
              style={[styles.filterButton, active && styles.filterButtonActive]}
              onPress={() => handleFilter(filter.key)}
              activeOpacity={0.8}
            >
              <Ionicons name={filter.icon} size={14} color={active ? WHITE : MUTED} />
              <Text style={[styles.filterText, active && styles.filterTextActive]}>{filter.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={styles.categoryStrip}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryScroll}>
          <CategoryChip item={null} active={activeCat == null} onPress={() => handleCategory(null)} />
          {categories.map((cat, index) => {
            const id = cat.id ?? cat.category_id ?? index;
            const active = String(activeCat ?? '') === String(id);
            return (
              <CategoryChip
                key={`biz-cat-${id}`}
                item={cat}
                active={active}
                onPress={() => handleCategory(id)}
              />
            );
          })}
        </ScrollView>
      </View>

      <View style={styles.sectionIntro}>
        <Text style={styles.sectionIntroTitle}>
          {activeFilter === 'verified'
            ? 'Verified businesses'
            : activeFilter === 'following'
              ? 'Businesses you follow'
              : 'Business directory'}
        </Text>
        <Text style={styles.sectionIntroSub}>
          {search
            ? `Showing results for "${search}"`
            : activeCat != null
              ? categoryMap[String(activeCat)] ?? 'Selected category'
              : 'Tap a business to view posts, products, info and contact options.'}
        </Text>
      </View>
    </View>
  ), [activeCat, activeFilter, categories, categoryMap, handleCategory, handleFilter, search]);

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" />

      <View style={[styles.header, { paddingTop: top + 8 }]}>
        <TouchableOpacity style={styles.headerIcon} onPress={() => navigation.goBack()} activeOpacity={0.84}>
          <Ionicons name="arrow-back" size={20} color={WHITE} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Businesses</Text>
          <Text style={styles.headerSub}>Discover trusted pages</Text>
        </View>
        <TouchableOpacity style={styles.createButton} onPress={() => setShowCreate(true)} activeOpacity={0.86}>
          <Ionicons name="add" size={18} color={BRAND} />
        </TouchableOpacity>
      </View>

      <FlatList
        data={loading && pages.length === 0 ? ['sk1', 'sk2', 'sk3'] : pages}
        keyExtractor={(item, index) => typeof item === 'string' ? item : `business-${getBusinessId(item) ?? index}-${index}`}
        renderItem={({ item }) => (
          typeof item === 'string' ? (
            <SkeletonCard />
          ) : (
            <BusinessCard
              business={item}
              user={user}
              categoryName={getCategoryName(item)}
              onOpen={() => openBusiness(item)}
              onFollowToggle={handleFollowToggle}
            />
          )
        )}
        ListHeaderComponent={ListHeader}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={ACCENT}
            colors={[ACCENT, BRAND]}
            progressBackgroundColor={WHITE}
          />
        }
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.42}
        ListEmptyComponent={
          !loading ? (
            <View style={styles.emptyWrap}>
              <View style={styles.emptyCircle}>
                <Ionicons name="business-outline" size={36} color={MUTED} />
              </View>
              <Text style={styles.emptyTitle}>No businesses found</Text>
              <Text style={styles.emptySub}>Try another search, filter, or category.</Text>
            </View>
          ) : null
        }
        ListFooterComponent={
          loadingMore ? <ActivityIndicator color={ACCENT} style={styles.footerLoader} /> : null
        }
      />

      <CreateModal
        visible={showCreate}
        type="business"
        navigation={navigation}
        token={token}
        user={user}
        onClose={() => setShowCreate(false)}
        onCreated={() => loadPages(1, true)}
      />
    </View>
  );
}

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
    borderColor: WHITE + '22',
  },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerTitle: { color: WHITE, fontSize: 16, fontWeight: '900', fontFamily: 'ReadexPro-Bold' },
  headerSub: { color: WHITE + 'A8', fontSize: 11, marginTop: 1, fontFamily: 'ReadexPro-Regular' },
  createButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: ACCENT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContent: { paddingBottom: 110 },
  hero: {
    paddingHorizontal: 18,
    paddingTop: 24,
    paddingBottom: 20,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  heroPills: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 15 },
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
  heroDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: ACCENT },
  heroPillText: { color: WHITE + 'D0', fontSize: 10, fontWeight: '900', letterSpacing: 0.75, fontFamily: 'ReadexPro-Bold' },
  heroTitle: { color: WHITE, fontSize: 28, lineHeight: 34, fontWeight: '900', letterSpacing: -0.7, fontFamily: 'ReadexPro-Bold' },
  heroSub: { color: WHITE + 'B8', fontSize: 13, lineHeight: 19, marginTop: 8, fontFamily: 'ReadexPro-Regular' },
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
  searchInput: { flex: 1, color: WHITE, fontSize: 14, paddingVertical: 0, fontFamily: 'ReadexPro-Regular' },
  searchClear: { width: 36, height: 36, borderRadius: 18, backgroundColor: ACCENT, alignItems: 'center', justifyContent: 'center' },
  filterCard: {
    marginHorizontal: 14,
    marginTop: 14,
    backgroundColor: CARD,
    borderRadius: 24,
    padding: 6,
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: BORDER,
  },
  filterButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 5,
  },
  filterButtonActive: { backgroundColor: BRAND },
  filterText: { color: MUTED, fontSize: 10.5, fontWeight: '900', fontFamily: 'ReadexPro-Bold' },
  filterTextActive: { color: WHITE },
  categoryStrip: { paddingVertical: 12 },
  categoryScroll: { paddingHorizontal: 14, gap: 8 },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    backgroundColor: CARD,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 8,
    maxWidth: 190,
  },
  categoryChipActive: { backgroundColor: BRAND, borderColor: BRAND },
  categoryIcon: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  categoryChipText: { color: BRAND, fontSize: 12, fontWeight: '900', fontFamily: 'ReadexPro-Bold' },
  categoryChipTextActive: { color: WHITE },
  sectionIntro: { paddingHorizontal: 16, paddingTop: 2, paddingBottom: 10 },
  sectionIntroTitle: { color: TEXT, fontSize: 16, fontWeight: '900', fontFamily: 'ReadexPro-Bold' },
  sectionIntroSub: { color: MUTED, fontSize: 12, marginTop: 3, fontFamily: 'ReadexPro-Regular' },

  businessCard: {
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
  businessCover: { height: 126, backgroundColor: BRAND, overflow: 'hidden' },
  coverImage: { width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' },
  coverTopRow: { position: 'absolute', left: 12, right: 12, bottom: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  verifiedBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: ACCENT, borderRadius: 999, paddingHorizontal: 9, paddingVertical: 5 },
  verifiedBadgeText: { color: WHITE, fontSize: 10, fontWeight: '900', fontFamily: 'ReadexPro-Bold' },
  categoryBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 999, paddingHorizontal: 9, paddingVertical: 5, maxWidth: '62%' },
  categoryBadgeText: { color: WHITE, fontSize: 10, fontWeight: '900', fontFamily: 'ReadexPro-Bold' },
  businessBody: { padding: 14 },
  identityRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  businessAvatar: { width: 58, height: 58, borderRadius: 20, marginTop: -32, borderWidth: 3, borderColor: CARD, backgroundColor: BORDER },
  avatarFallback: { alignItems: 'center', justifyContent: 'center' },
  businessText: { flex: 1, paddingTop: 2 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  businessTitle: { flex: 1, color: TEXT, fontSize: 16, fontWeight: '900', fontFamily: 'ReadexPro-Bold' },
  ownerPill: { backgroundColor: alpha(ACCENT, 0.13), borderRadius: 999, paddingHorizontal: 7, paddingVertical: 3 },
  ownerPillText: { color: ACCENT, fontSize: 9, fontWeight: '900', fontFamily: 'ReadexPro-Bold' },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  metaText: { color: MUTED, fontSize: 11.5, fontFamily: 'ReadexPro-Regular' },
  businessAbout: { color: MUTED, fontSize: 12.5, lineHeight: 18, marginTop: 11, fontFamily: 'ReadexPro-Regular' },
  actionRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 14 },
  secondaryAction: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    borderRadius: 999,
    paddingHorizontal: 15,
    paddingVertical: 10,
    backgroundColor: alpha(ACCENT, 0.1),
    borderWidth: 1,
    borderColor: alpha(ACCENT, 0.24),
    minWidth: 96,
  },
  secondaryActionOn: { backgroundColor: CARD, borderColor: BORDER },
  secondaryActionText: { color: ACCENT, fontSize: 12, fontWeight: '900', fontFamily: 'ReadexPro-Bold' },
  primaryAction: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: BRAND,
    borderRadius: 999,
    paddingVertical: 10,
  },
  primaryActionText: { color: WHITE, fontSize: 12, fontWeight: '900', fontFamily: 'ReadexPro-Bold' },
  skeletonBlock: { backgroundColor: BRAND + '14' },
  emptyWrap: { alignItems: 'center', justifyContent: 'center', paddingTop: 58, paddingHorizontal: 30 },
  emptyCircle: { width: 88, height: 88, borderRadius: 44, backgroundColor: ACCENT + '14', alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  emptyTitle: { color: TEXT, fontSize: 16, fontWeight: '900', fontFamily: 'ReadexPro-Bold' },
  emptySub: { color: MUTED, textAlign: 'center', fontSize: 12, lineHeight: 18, marginTop: 5, fontFamily: 'ReadexPro-Regular' },
  footerLoader: { marginVertical: 22 },
});
