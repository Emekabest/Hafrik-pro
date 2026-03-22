import React, { useEffect, useState, useCallback, useMemo, useRef } from "react";
import {
  View, Text, FlatList, ActivityIndicator, StyleSheet,
  TouchableOpacity, TextInput, Image, ScrollView, StatusBar, Modal,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { useAuth } from "../../AuthContext";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import useStore from "../../repository/store";
import { getBusinessList, getBusinessCategories, toggleFollowBusiness } from "./Businessapi";
import CreateModal from "../groups/CreateModal";
import { Colors } from "../../theme";

const BRAND      = Colors.primaryDark;
const ACCENT     = Colors.primary;
const CREAM      = Colors.background;
const CARD       = Colors.white;
const BORDER     = Colors.border;
const MUTED      = Colors.secondaryText;
const DARK       = Colors.black;
const WHITE      = Colors.white;
const ON_DARK_14 = WHITE + '24';

const decodeHtml = (text = '') =>
  String(text)
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&#039;/g, "'")
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

// ─── Category Dropdown Modal ───────────────────────────────────────────────────
const CategoryDropdown = ({ visible, categories, activeCat, onSelect, onClose }) => (
  <Modal
    visible={visible}
    transparent
    animationType="fade"
    onRequestClose={onClose}
  >
    <TouchableOpacity style={dd.overlay} activeOpacity={1} onPress={onClose}>
      <View style={dd.sheet}>
        <View style={dd.sheetHeader}>
          <Text style={dd.sheetTitle}>Filter by Category</Text>
          <TouchableOpacity onPress={onClose} style={dd.closeBtn}>
            <Ionicons name="close" size={20} color={DARK} />
          </TouchableOpacity>
        </View>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={dd.list}>
          {/* All option */}
          <TouchableOpacity
            style={[dd.item, activeCat === null && dd.itemOn]}
            onPress={() => { onSelect(null); onClose(); }}
            activeOpacity={0.75}
          >
            <View style={[dd.itemDot, activeCat === null && dd.itemDotOn]} />
            <Text style={[dd.itemTxt, activeCat === null && dd.itemTxtOn]}>All Categories</Text>
            {activeCat === null && <Ionicons name="checkmark" size={16} color={ACCENT} />}
          </TouchableOpacity>
          {categories.map((cat) => {
            const id = cat.id ?? cat.category_id;
            const on = activeCat === id;
            return (
              <TouchableOpacity
                key={`cat-${id}`}
                style={[dd.item, on && dd.itemOn]}
                onPress={() => { onSelect(id); onClose(); }}
                activeOpacity={0.75}
              >
                <View style={[dd.itemDot, on && dd.itemDotOn]} />
                <Text style={[dd.itemTxt, on && dd.itemTxtOn]} numberOfLines={1}>
                  {cat.name ?? cat.title ?? ''}
                </Text>
                {on && <Ionicons name="checkmark" size={16} color={ACCENT} />}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>
    </TouchableOpacity>
  </Modal>
);

// ─── Business Card ────────────────────────────────────────────────────────────
const BusinessCard = ({ business, onOpen, user, categoryName }) => {
  const openComposer = useStore((s) => s.openComposer);

  const isVerified = business.verified_value === 1 || business.verified === true;
  const isOwner    =
    business.is_owner === true || business.is_owner === 1 ||
    (user?.id && String(business.user_id) === String(user.id));

  const [isLiked,    setIsLiked]    = useState(!!(business.is_liked));
  const [likeCount,  setLikeCount]  = useState(Number(business.likes ?? 0));
  const [likeLoading, setLikeLoading] = useState(false);
  const likeRef = useRef({ isLiked, likeLoading });
  likeRef.current = { isLiked, likeLoading };

  const handleLike = useCallback(async (e) => {
    e.stopPropagation?.();
    const { isLiked: was, likeLoading: busy } = likeRef.current;
    if (busy) return;
    setLikeLoading(true);
    setIsLiked(!was);
    setLikeCount(c => was ? Math.max(0, c - 1) : c + 1);
    try {
      const res = await toggleFollowBusiness(business.id, was ? 'unlike' : 'like');
      const d   = res?.data ?? res;
      if (d?.is_liked != null) setIsLiked(!!d.is_liked);
      if (d?.likes    != null) setLikeCount(Number(d.likes) || 0);
    } catch {
      setIsLiked(was);
      setLikeCount(c => was ? c + 1 : Math.max(0, c - 1));
    }
    setLikeLoading(false);
  }, [business.id]);

  const title  = cleanText(business.title ?? '');
  const about  = cleanText(business.about ?? '');
  const avatar = business.avatar ?? null;
  const cover  = business.cover ?? business.banner ?? null;

  return (
    <TouchableOpacity style={bs.card} activeOpacity={0.88} onPress={() => onOpen?.(business)}>
      {/* Cover */}
      {isRealImage(cover) ? (
        <Image source={{ uri: cover }} style={bs.cover} resizeMode="cover" />
      ) : (
        <View style={[bs.cover, bs.coverFallback]}>
          <Ionicons name="business-outline" size={28} color={WHITE + '44'} />
        </View>
      )}

      {isVerified && (
        <View style={bs.verifiedChip}>
          <Ionicons name="checkmark-circle" size={11} color={WHITE} />
          <Text style={bs.verifiedTxt}>Verified</Text>
        </View>
      )}

      <View style={bs.cardBody}>
        {/* Avatar + name row */}
        <View style={bs.avatarRow}>
          {isRealImage(avatar) ? (
            <Image source={{ uri: avatar }} style={bs.avatar} resizeMode="cover" />
          ) : (
            <View style={[bs.avatar, bs.avatarFb]}>
              <Ionicons name="business" size={20} color={WHITE} />
            </View>
          )}
          <View style={{ flex: 1 }}>
            <View style={bs.titleRow}>
              <Text style={bs.title} numberOfLines={1}>{title || 'Business'}</Text>
              {isOwner && (
                <View style={bs.ownerPill}>
                  <Ionicons name="shield-checkmark" size={10} color={ACCENT} />
                  <Text style={bs.ownerPillTxt}>Your Page</Text>
                </View>
              )}
            </View>
            {!!categoryName && (
              <View style={bs.catTagPill}>
                <Ionicons name="pricetag-outline" size={9} color={ACCENT} />
                <Text style={bs.catTagTxt} numberOfLines={1}>{categoryName}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Description */}
        {!!about && (
          <Text style={bs.desc} numberOfLines={2}>{about}</Text>
        )}
      </View>

      {/* Footer */}
      <View style={bs.footer}>
        <View style={bs.followerRow}>
          <Ionicons name="heart-outline" size={13} color={MUTED} />
          <Text style={bs.followerTxt}>{fmtCount(likeCount)} likes</Text>
        </View>
        {isOwner ? (
          <View style={bs.footerRight}>
            <TouchableOpacity
              style={bs.postBtn} activeOpacity={0.8}
              onPress={() => openComposer({ target_type: 'page', target_id: business.id, title, avatar: avatar ?? undefined, locked: true })}
            >
              <Ionicons name="create-outline" size={13} color={ACCENT} />
              <Text style={bs.postBtnTxt}>Post</Text>
            </TouchableOpacity>
            <TouchableOpacity style={bs.viewBtn} onPress={() => onOpen?.(business)} activeOpacity={0.85}>
              <Text style={bs.viewBtnTxt}>View Page</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={bs.footerRight}>
            <TouchableOpacity
              style={[bs.likeBtn, isLiked && bs.likedBtn]}
              onPress={handleLike}
              activeOpacity={0.85}
              disabled={likeLoading}
            >
              {likeLoading
                ? <ActivityIndicator size="small" color={isLiked ? MUTED : WHITE} style={{ width: 52 }} />
                : <>
                    <Ionicons name={isLiked ? 'heart' : 'heart-outline'} size={13} color={isLiked ? MUTED : WHITE} />
                    <Text style={[bs.likeBtnTxt, isLiked && bs.likedBtnTxt]}>{isLiked ? 'Liked' : 'Like'}</Text>
                  </>
              }
            </TouchableOpacity>
            <TouchableOpacity style={bs.viewBtn} onPress={() => onOpen?.(business)} activeOpacity={0.85}>
              <Text style={bs.viewBtnTxt}>View</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
};

// ─── Ad Banner ────────────────────────────────────────────────────────────────
const AdBanner = () => (
  <View style={adst.wrap}>
    <View style={adst.sponsorRow}>
      <Ionicons name="megaphone-outline" size={11} color={MUTED} />
      <Text style={adst.sponsorTxt}>Sponsored</Text>
    </View>
    <View style={adst.body}>
      <View style={adst.imgBox}>
        <Ionicons name="storefront-outline" size={24} color={ACCENT} />
      </View>
      <View style={adst.text}>
        <Text style={adst.adTitle} numberOfLines={2}>Grow your business with Hafrik</Text>
        <Text style={adst.adSub}>Reach thousands across Africa. List your business today.</Text>
        <View style={adst.cta}>
          <Text style={adst.ctaTxt}>Learn More</Text>
          <Ionicons name="arrow-forward" size={12} color={ACCENT} />
        </View>
      </View>
    </View>
  </View>
);

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function BusinessList() {
  const navigation = useNavigation();
  const { token, user } = useAuth();
  const { top } = useSafeAreaInsets();

  const [pages,        setPages]       = useState([]);
  const [totalCount,   setTotalCount]  = useState(0);
  const [loading,      setLoading]     = useState(true);
  const [loadingMore,  setLoadingMore] = useState(false);
  const [page,         setPage]        = useState(1);
  const [hasMore,      setHasMore]     = useState(true);
  const [search,       setSearch]      = useState('');
  const [categories,   setCategories]  = useState([]);
  const [activeCat,    setActiveCat]   = useState(null);   // numeric category id or null
  const [showCatModal, setShowCatModal]= useState(false);
  const [showCreate,   setShowCreate]  = useState(false);
  const [refreshing,   setRefreshing]  = useState(false);
  const [activeFilter, setActiveFilter]= useState('all'); // 'all' | 'following' | 'managed'

  const activeFilterRef = useRef('all');
  activeFilterRef.current = activeFilter;
  const activeCatRef = useRef(null);
  activeCatRef.current = activeCat;

  // Map category id → name for card display
  const catMap = useMemo(() => {
    const m = {};
    categories.forEach(c => {
      const id = c.id ?? c.category_id;
      if (id != null) m[id] = c.name ?? c.title ?? '';
    });
    return m;
  }, [categories]);

  const activeCatName = activeCat != null ? (catMap[activeCat] ?? '') : '';

  useEffect(() => {
    loadCategories();
    loadPages(1, '', true);
  }, []); // eslint-disable-line

  const loadCategories = async () => {
    try {
      const res = await getBusinessCategories(token);
      if (res?.status === 'success') {
        const raw = Array.isArray(res.data) ? res.data : [];
        const seen = new Set();
        const parents = raw.filter(cat => {
          const id = cat.id ?? cat.category_id;
          if (seen.has(id)) return false;
          seen.add(id);
          const parentId = cat.parent_id ?? cat.parent ?? null;
          return parentId == null || parentId === 0 || parentId === '0';
        });
        setCategories(parents);
      }
    } catch (e) { console.log('BusinessList loadCategories:', e); }
  };

  const loadPages = async (pageNum, query, replace = false) => {
    if (pageNum === 1) setLoading(true);
    else setLoadingMore(true);
    try {
      const filters = {};
      if (query?.trim())              filters.search    = query.trim();
      const filter = activeFilterRef.current;
      if (filter === 'following')     filters.liked     = 1;
      if (filter === 'suggested')     filters.suggested = 1;
      if (filter === 'verified')      filters.verified  = 1;
      if (filter === 'managed')       filters.managed   = 1;
      if (activeCatRef.current != null) filters.category = activeCatRef.current;
      const res  = await getBusinessList(pageNum, filters);
      const list = Array.isArray(res?.data?.data) ? res.data.data : [];
      const total = Number(res?.data?.total ?? res?.data?.total_count ?? list.length);
      setPages(prev => replace || pageNum === 1 ? list : [...prev, ...list]);
      if (pageNum === 1) setTotalCount(total);
      setHasMore(list.length >= 20);
      setPage(pageNum);
    } catch (e) { console.log('BusinessList loadPages:', e); }
    setLoading(false);
    setLoadingMore(false);
  };

  const handleSearch = useCallback((text) => {
    setSearch(text);
    loadPages(1, text, true);
  }, []); // eslint-disable-line

  const handleFilter = useCallback((key) => {
    setActiveFilter(key);
    activeFilterRef.current = key;
    setPages([]); setPage(1); setHasMore(true);
    setTimeout(() => loadPages(1, search, true), 0);
  }, [search]); // eslint-disable-line

  const handleSelectCat = useCallback((id) => {
    setActiveCat(id);
    activeCatRef.current = id;
    setPages([]); setPage(1); setHasMore(true);
    setTimeout(() => loadPages(1, search, true), 0);
  }, [search]); // eslint-disable-line

  // Inject ad every 5 cards (category now filtered server-side)
  const processedPages = useMemo(() => {
    const result = [];
    pages.forEach((item, i) => {
      result.push(item);
      if ((i + 1) % 5 === 0 && i + 1 < pages.length) {
        result.push({ _isAd: true, id: `ad-${i}` });
      }
    });
    return result;
  }, [pages]);

  const handleLoadMore = useCallback(() => {
    if (loadingMore || !hasMore) return;
    loadPages(page + 1, search);
  }, [page, loadingMore, hasMore, search]); // eslint-disable-line

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadPages(1, search, true);
    setRefreshing(false);
  }, [search]); // eslint-disable-line

  return (
    <View style={bs.root}>
      <StatusBar barStyle="light-content" />

      {/* ── Header ── */}
      <View style={[bs.header, { paddingTop: top + 8 }]}>
        <View style={bs.headerTop}>
          <TouchableOpacity style={bs.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.8}>
            <Ionicons name="arrow-back" size={20} color={WHITE} />
          </TouchableOpacity>
          <View style={bs.headerLogoWrap} pointerEvents="none">
            <Image source={require('../../assl.js/Layer 3.png')} style={bs.headerLogo} resizeMode="contain" />
          </View>
          <View style={{ flex: 1 }} />
          <TouchableOpacity style={bs.createBtn} onPress={() => setShowCreate(true)} activeOpacity={0.85}>
            <Ionicons name="add" size={16} color={WHITE} />
            <Text style={bs.createBtnTxt}>Add Page</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* ── List ── */}
      <FlatList
        data={processedPages}
        keyExtractor={(item) => item._isAd ? item.id : String(item.id)}
        renderItem={({ item }) => {
          if (item._isAd) return <AdBanner />;
          return (
            <BusinessCard
              business={item}
              user={user}
              categoryName={catMap[item.category] ?? ''}
              onOpen={(b) => navigation.navigate('BusinessDetails', { pageId: b.id })}
            />
          );
        }}
        contentContainerStyle={bs.listContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        refreshing={refreshing}
        onRefresh={onRefresh}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.4}
        ListHeaderComponent={
          <View>
            {/* ── Hero ── */}
            <View style={bs.heroBlock}>
              <View style={bs.heroPills}>
                <View style={bs.heroLivePill}>
                  <View style={bs.heroLiveDot} />
                  <Text style={bs.heroLiveText}>BUSINESS DIRECTORY</Text>
                </View>
              </View>

              <Text style={bs.heroTitle}>Discover African{'\n'}Businesses.</Text>
              <Text style={bs.heroSub}>
                Browse verified services, products, and opportunities built for Africa and the world.
              </Text>

              <View style={bs.heroStats}>
                <View style={bs.heroStatItem}>
                  <Text style={bs.heroStatNum}>{fmtCount(totalCount || pages.length)}</Text>
                  <Text style={bs.heroStatLabel}>Listed</Text>
                </View>
                <View style={bs.heroStatDivider} />
                <View style={bs.heroStatItem}>
                  <Text style={bs.heroStatNum}>{fmtCount(categories.length)}</Text>
                  <Text style={bs.heroStatLabel}>Categories</Text>
                </View>
              </View>

              {/* ── Search ── */}
              <View style={bs.heroSearch}>
                <Ionicons name="search" size={19} color={WHITE + 'BF'} />
                <TextInput
                  style={bs.searchInput}
                  placeholder="Search businesses…"
                  placeholderTextColor={WHITE + '70'}
                  value={search}
                  onChangeText={handleSearch}
                  returnKeyType="search"
                  autoCorrect={false}
                  autoCapitalize="none"
                />
                <TouchableOpacity activeOpacity={0.85} style={bs.heroSearchBtn} onPress={() => handleSearch('')}>
                  {search.length > 0
                    ? <Ionicons name="close" size={16} color={BRAND} />
                    : <Ionicons name="arrow-forward" size={17} color={BRAND} />
                  }
                </TouchableOpacity>
              </View>
            </View>

            {/* ── Filter row: tabs + category dropdown ── */}
            <View style={bs.filterBar}>
              {/* Filter tabs */}
              <View style={bs.filterTabs}>
                {[
                  { key: 'all',       label: 'All' },
                  { key: 'following', label: 'Following' },
                  { key: 'suggested', label: 'Suggested' },
                  { key: 'verified',  label: 'Verified' },
                ].map(({ key, label }) => (
                  <TouchableOpacity
                    key={key}
                    style={[bs.filterChip, activeFilter === key && bs.filterChipOn]}
                    onPress={() => handleFilter(key)}
                    activeOpacity={0.75}
                  >
                    <Text style={[bs.filterTxt, activeFilter === key && bs.filterTxtOn]}>{label}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Category dropdown button */}
              <TouchableOpacity
                style={[bs.catDropBtn, activeCat != null && bs.catDropBtnOn]}
                onPress={() => setShowCatModal(true)}
                activeOpacity={0.8}
              >
                <Ionicons name="pricetag-outline" size={13} color={activeCat != null ? WHITE : BRAND} />
                <Text style={[bs.catDropTxt, activeCat != null && bs.catDropTxtOn]} numberOfLines={1}>
                  {activeCatName || 'Category'}
                </Text>
                <Ionicons name="chevron-down" size={13} color={activeCat != null ? WHITE : MUTED} />
              </TouchableOpacity>
            </View>

            {/* ── Section label ── */}
            <View style={bs.sectionBar}>
              <View style={bs.sectionAccent} />
              <Text style={bs.sectionBarText}>
                {activeCatName ? activeCatName.toUpperCase() : 'ALL BUSINESSES'}
              </Text>
              {activeCat != null && (
                <TouchableOpacity onPress={() => setActiveCat(null)} style={bs.clearCat}>
                  <Ionicons name="close-circle" size={15} color={MUTED} />
                </TouchableOpacity>
              )}
            </View>
          </View>
        }
        ListEmptyComponent={
          loading ? (
            <View style={bs.emptyWrap}>
              <ActivityIndicator color={ACCENT} size="large" />
            </View>
          ) : (
            <View style={bs.emptyWrap}>
              <View style={bs.emptyCircle}>
                <Ionicons name="business-outline" size={36} color={MUTED} />
              </View>
              <Text style={bs.emptyTitle}>No businesses found</Text>
              <Text style={bs.emptySub}>Try adjusting your search or filters</Text>
            </View>
          )
        }
        ListFooterComponent={
          loadingMore ? <ActivityIndicator color={ACCENT} style={{ marginVertical: 20 }} /> : null
        }
      />

      {/* ── Category Dropdown Modal ── */}
      <CategoryDropdown
        visible={showCatModal}
        categories={categories}
        activeCat={activeCat}
        onSelect={handleSelectCat}
        onClose={() => setShowCatModal(false)}
      />

      <CreateModal
        visible={showCreate}
        type="business"
        navigation={navigation}
        token={token}
        user={user}
        onClose={() => setShowCreate(false)}
        onCreated={() => loadPages(1, search, true)}
      />
    </View>
  );
}

const bs = StyleSheet.create({
  root: { flex: 1, backgroundColor: CREAM },

  // ── Header ──
  header: {
    backgroundColor: BRAND,
    paddingHorizontal: 16, paddingBottom: 10,
    shadowColor: BRAND, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.22, shadowRadius: 10, elevation: 8,
  },
  headerTop:      { flexDirection: 'row', alignItems: 'center', gap: 12 },
  backBtn:        { width: 36, height: 36, borderRadius: 18, backgroundColor: ON_DARK_14, alignItems: 'center', justifyContent: 'center' },
  headerLogoWrap: { position: 'absolute', left: 0, right: 0, alignItems: 'center', pointerEvents: 'none' },
  headerLogo:     { height: 26, width: 110 },
  createBtn:    { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: ACCENT, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 100 },
  createBtnTxt: { fontSize: 12, fontWeight: '800', color: WHITE },
  heroSearch:   { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: WHITE + '15', borderRadius: 999, borderWidth: 1, borderColor: WHITE + '28', paddingHorizontal: 18, paddingRight: 10, height: 52, marginTop: 18 },
  heroSearchBtn:{ width: 36, height: 36, borderRadius: 999, backgroundColor: ACCENT, alignItems: 'center', justifyContent: 'center' },
  searchInput:  { flex: 1, color: WHITE, fontSize: 14, paddingVertical: 0 },

  // ── Filter bar ──
  filterBar:    { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, gap: 8 },
  filterTabs:   { flex: 1, flexDirection: 'row', gap: 8 },
  filterChip:   { height: 34, paddingHorizontal: 14, borderRadius: 100, backgroundColor: CARD, borderWidth: 1.5, borderColor: BORDER, alignItems: 'center', justifyContent: 'center' },
  filterChipOn: { backgroundColor: ACCENT, borderColor: ACCENT },
  filterTxt:    { fontSize: 12, fontWeight: '700', color: MUTED },
  filterTxtOn:  { color: WHITE },

  // ── Category dropdown button ──
  catDropBtn:   { flexDirection: 'row', alignItems: 'center', gap: 5, height: 34, paddingHorizontal: 12, borderRadius: 100, backgroundColor: CARD, borderWidth: 1.5, borderColor: BORDER, maxWidth: 130 },
  catDropBtnOn: { backgroundColor: BRAND, borderColor: BRAND },
  catDropTxt:   { fontSize: 12, fontWeight: '700', color: BRAND, flex: 1 },
  catDropTxtOn: { color: WHITE },

  listContent: { paddingBottom: 100, gap: 14 },

  // ── Hero ──
  heroBlock: {
    backgroundColor: '#0c3f44',
    paddingHorizontal: 20, paddingTop: 28, paddingBottom: 20,
    borderBottomLeftRadius: 28, borderBottomRightRadius: 28,
    overflow: 'hidden',
    marginBottom: 4,
  },
  heroPills:      { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 },
  heroLivePill:   { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: WHITE + '12', borderWidth: 1, borderColor: WHITE + '1E', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999 },
  heroLiveDot:    { width: 6, height: 6, borderRadius: 3, backgroundColor: ACCENT },
  heroLiveText:   { fontSize: 10, fontWeight: '700', letterSpacing: 1.2, color: WHITE + 'BF' },
  heroTitle:      { fontSize: 27, fontWeight: '900', color: WHITE, lineHeight: 34 },
  heroSub:        { marginTop: 6, fontSize: 13, lineHeight: 18, color: WHITE + '99' },
  heroStats: {
    flexDirection: 'row', alignItems: 'center', marginTop: 18,
    backgroundColor: WHITE + '12', borderRadius: 14,
    borderWidth: 1, borderColor: WHITE + '1A',
    paddingVertical: 13, paddingHorizontal: 16,
  },
  heroStatItem:    { flex: 1, alignItems: 'center' },
  heroStatNum:     { fontSize: 18, fontWeight: '900', color: WHITE },
  heroStatLabel:   { fontSize: 10, color: WHITE + '88', marginTop: 2, textTransform: 'uppercase', letterSpacing: 0.5 },
  heroStatDivider: { width: 1, height: 30, backgroundColor: WHITE + '22' },

  // ── Section label ──
  sectionBar:    { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, gap: 8 },
  sectionAccent: { width: 3, height: 14, borderRadius: 2, backgroundColor: ACCENT },
  sectionBarText:{ fontSize: 11, fontWeight: '800', color: MUTED, letterSpacing: 1.5, flex: 1 },
  clearCat:      { padding: 2 },

  // ── Card ──
  card: {
    backgroundColor: CARD, borderRadius: 20, overflow: 'hidden',
    marginHorizontal: 14,
    borderWidth: 1, borderColor: BRAND + '12',
    shadowColor: DARK, shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.07, shadowRadius: 10, elevation: 3,
  },
  cover:         { width: '100%', height: 110 },
  coverFallback: { backgroundColor: BRAND, alignItems: 'center', justifyContent: 'center' },
  verifiedChip:  { position: 'absolute', top: 10, right: 10, flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: ACCENT, borderRadius: 100, paddingHorizontal: 8, paddingVertical: 3 },
  verifiedTxt:   { fontSize: 9, fontWeight: '800', color: WHITE },
  cardBody:      { padding: 14, paddingBottom: 10 },
  avatarRow:     { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 10 },
  avatar:        { width: 52, height: 52, borderRadius: 14, marginTop: -28, borderWidth: 3, borderColor: CARD, backgroundColor: BRAND },
  avatarFb:      { alignItems: 'center', justifyContent: 'center', backgroundColor: BRAND },
  titleRow:      { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6, marginBottom: 4 },
  title:         { fontSize: 15, fontWeight: '900', color: DARK, flex: 1 },
  ownerPill:     { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: ACCENT + '18', borderRadius: 100, paddingHorizontal: 7, paddingVertical: 2 },
  ownerPillTxt:  { fontSize: 10, color: ACCENT, fontWeight: '700' },
  catTagPill:    { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: ACCENT + '12', borderRadius: 100, paddingHorizontal: 7, paddingVertical: 2, alignSelf: 'flex-start' },
  catTagTxt:     { fontSize: 10, color: ACCENT, fontWeight: '700' },
  desc:          { fontSize: 13, color: MUTED, lineHeight: 19 },

  // ── Footer ──
  footer:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, paddingVertical: 10, borderTopWidth: 1, borderTopColor: BRAND + '12' },
  followerRow:  { flexDirection: 'row', alignItems: 'center', gap: 4 },
  followerTxt:  { fontSize: 11, color: MUTED, fontWeight: '600' },
  footerRight:  { flexDirection: 'row', alignItems: 'center', gap: 8 },
  postBtn:      { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 100, backgroundColor: ACCENT + '14', borderWidth: 1, borderColor: ACCENT + '38' },
  postBtnTxt:   { fontSize: 12, fontWeight: '700', color: ACCENT },
  viewBtn:      { backgroundColor: BRAND, paddingHorizontal: 16, paddingVertical: 7, borderRadius: 100, alignItems: 'center' },
  viewBtnTxt:   { fontSize: 12, fontWeight: '800', color: WHITE },
  likeBtn:      { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: BRAND, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 100 },
  likedBtn:     { backgroundColor: CREAM, borderWidth: 1.5, borderColor: BORDER },
  likeBtnTxt:   { fontSize: 12, fontWeight: '800', color: WHITE },
  likedBtnTxt:  { color: MUTED },

  // ── Empty ──
  emptyWrap:   { alignItems: 'center', justifyContent: 'center', paddingTop: 80, gap: 14 },
  emptyCircle: { width: 90, height: 90, borderRadius: 45, alignItems: 'center', justifyContent: 'center', backgroundColor: ACCENT + '18' },
  emptyTitle:  { fontSize: 16, fontWeight: '800', color: DARK },
  emptySub:    { fontSize: 12, color: MUTED, textAlign: 'center' },
});

const adst = StyleSheet.create({
  wrap: {
    backgroundColor: '#ffffff', marginHorizontal: 14, borderRadius: 16,
    overflow: 'hidden', borderWidth: 1, borderColor: BRAND + '12',
    shadowColor: DARK, shadowOpacity: 0.04, shadowRadius: 8, elevation: 2,
  },
  sponsorRow: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 14, paddingTop: 10, marginBottom: 6 },
  sponsorTxt: { fontSize: 9, fontWeight: '700', color: MUTED, letterSpacing: 0.8, textTransform: 'uppercase' },
  body:       { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingBottom: 14 },
  imgBox:     { width: 72, height: 72, borderRadius: 14, backgroundColor: ACCENT + '14', alignItems: 'center', justifyContent: 'center' },
  text:       { flex: 1 },
  adTitle:    { fontSize: 14, fontWeight: '800', color: DARK, lineHeight: 19, marginBottom: 3 },
  adSub:      { fontSize: 12, color: MUTED, lineHeight: 17, marginBottom: 7 },
  cta:        { flexDirection: 'row', alignItems: 'center', gap: 4 },
  ctaTxt:     { fontSize: 12, fontWeight: '800', color: ACCENT },
});

// ─── Dropdown styles ──────────────────────────────────────────────────────────
const dd = StyleSheet.create({
  overlay: {
    flex: 1, backgroundColor: DARK + '55',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: CARD,
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    maxHeight: '65%',
    paddingBottom: 30,
  },
  sheetHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingTop: 20, paddingBottom: 14,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: BORDER,
  },
  sheetTitle: { fontSize: 16, fontWeight: '800', color: DARK },
  closeBtn:   { width: 32, height: 32, borderRadius: 16, backgroundColor: CREAM, alignItems: 'center', justifyContent: 'center' },
  list:       { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 8 },
  item:       { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 13, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: BORDER },
  itemOn:     { /* no bg change — checkmark indicates selection */ },
  itemDot:    { width: 8, height: 8, borderRadius: 4, backgroundColor: BORDER },
  itemDotOn:  { backgroundColor: ACCENT },
  itemTxt:    { flex: 1, fontSize: 14, color: DARK, fontWeight: '500' },
  itemTxtOn:  { color: BRAND, fontWeight: '700' },
});
