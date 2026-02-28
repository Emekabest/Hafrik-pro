// src/pages/users/UserProfileScreen.jsx
import React, {
  useState, useEffect, useRef, useCallback, useMemo, memo,
} from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Image,
  FlatList, Modal, ActivityIndicator, RefreshControl,
  StatusBar, Dimensions, Animated,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../AuthContext';
import FeedCard from '../home/feeds/feedcard.jsx';

const { width: SCREEN_W } = Dimensions.get('window');
const BASE_URL  = 'https://hafrik.com';
const CELL_SIZE = Math.floor((SCREEN_W - 6) / 3);
const BRAND  = '#0C3F44';
const ACCENT = '#13C296';
const CREAM  = '#F0F5F5';
const DARK   = '#0D1B1E';
const MUTED  = '#7A9198';
const BORDER = 'rgba(12,63,68,0.09)';
const TABS   = ['posts', 'media', 'communities', 'pages'];

const decodeHtml = (t = '') =>
  String(t)
    .replace(/&rsquo;|&#039;/g, "'")
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/<[^>]*>/g, '').trim();

const fmtCount = n => {
  const v = Number(n ?? 0);
  if (v >= 1_000_000) return (v / 1_000_000).toFixed(1) + 'M';
  if (v >= 1_000)     return (v / 1_000).toFixed(1) + 'k';
  return String(v);
};

const hasRealImg = url =>
  !!url &&
  !String(url).includes('blank_profile') &&
  !String(url).includes('/default.');

// ── Derive display image from new media[] structure ───────────────────────────
const getMediaThumb = (post) => {
  const first = post?.media?.[0] ?? null;
  if (!first) return { uri: null, isVideo: false };
  if (first.type === 'photo')              return { uri: first.url,                             isVideo: false };
  if (first.type === 'video' || first.type === 'reel')
                                            return { uri: first.thumbnail ?? first.video_url,   isVideo: true  };
  return { uri: null, isVideo: false };
};

// ── Post card — uses shared FeedCard ─────────────────────────────────────────

// ── Media cell ────────────────────────────────────────────────────────────────
const MediaCell = memo(({ item, onPress }) => {
  const { uri, isVideo } = getMediaThumb(item);
  return (
    <TouchableOpacity style={ss.mediaCell} activeOpacity={0.85} onPress={onPress}>
      {hasRealImg(uri)
        ? <Image source={{ uri }} style={ss.mediaCellImg} resizeMode="cover" />
        : <View style={ss.mediaCellFallback}><Ionicons name="image-outline" size={22} color={MUTED} /></View>
      }
      {isVideo && (
        <View style={ss.mediaCellPlay}>
          <Ionicons name="play-circle" size={24} color="#fff" />
        </View>
      )}
    </TouchableOpacity>
  );
});

// ── Community card ────────────────────────────────────────────────────────────
const CommunityCard = memo(({ item, onPress }) => {
  const name    = decodeHtml(item?.title ?? item?.name ?? 'Community');
  const members = fmtCount(item?.members_count ?? item?.members ?? 0);
  const banner  = item?.cover ?? item?.banner ?? item?.image ?? null;
  const avatar  = item?.avatar ?? item?.image ?? null;
  return (
    <TouchableOpacity style={ss.groupCard} activeOpacity={0.88} onPress={onPress}>
      {hasRealImg(banner)
        ? <Image source={{ uri: banner }} style={ss.groupBanner} resizeMode="cover" />
        : <View style={[ss.groupBanner, { backgroundColor: BRAND, alignItems: 'center', justifyContent: 'center' }]}>
            <Ionicons name="people" size={22} color={ACCENT} />
          </View>
      }
      <View style={ss.groupBody}>
        <View style={ss.groupAvatarWrap}>
          {hasRealImg(avatar)
            ? <Image source={{ uri: avatar }} style={ss.groupAvatar} />
            : <View style={[ss.groupAvatar, { backgroundColor: ACCENT + '22', alignItems: 'center', justifyContent: 'center' }]}>
                <Ionicons name="people-outline" size={16} color={ACCENT} />
              </View>
          }
        </View>
        <View style={{ flex: 1 }}>
          <Text numberOfLines={1} style={ss.groupName}>{name}</Text>
          <Text style={ss.groupSub}>{members} members</Text>
        </View>
        <View style={ss.joinBtn}><Text style={ss.joinBtnTxt}>View</Text></View>
      </View>
    </TouchableOpacity>
  );
});

// ── Page card ─────────────────────────────────────────────────────────────────
const PageCard = memo(({ item, onPress }) => {
  const name      = decodeHtml(item?.title ?? item?.name ?? 'Page');
  const followers = fmtCount(item?.followers_count ?? item?.followers ?? 0);
  const cat       = item?.category ?? item?.type ?? null;
  const avatar    = item?.avatar ?? item?.logo ?? item?.image ?? null;
  return (
    <TouchableOpacity style={ss.pageCard} activeOpacity={0.88} onPress={onPress}>
      {hasRealImg(avatar)
        ? <Image source={{ uri: avatar }} style={ss.pageAvatar} resizeMode="cover" />
        : <View style={[ss.pageAvatar, { backgroundColor: ACCENT + '22', alignItems: 'center', justifyContent: 'center' }]}>
            <Ionicons name="business-outline" size={20} color={ACCENT} />
          </View>
      }
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
          <Text numberOfLines={1} style={ss.pageName}>{name}</Text>
          {!!item?.verified && <Ionicons name="checkmark-circle" size={14} color={ACCENT} />}
        </View>
        {!!cat && <Text style={ss.pageCat}>{cat}</Text>}
        <Text style={ss.pageSub}>{followers} followers</Text>
      </View>
      <View style={ss.viewBtn}><Text style={ss.viewBtnTxt}>Visit</Text></View>
    </TouchableOpacity>
  );
});

// ── Person row ────────────────────────────────────────────────────────────────
const PeopleRow = memo(({ item, onPress }) => {
  const name   = decodeHtml(item?.full_name ?? item?.username ?? 'User');
  const handle = item?.username ?? '';
  const avatar = item?.avatar ?? null;
  return (
    <TouchableOpacity style={ss.peopleRow} activeOpacity={0.88} onPress={onPress}>
      {hasRealImg(avatar)
        ? <Image source={{ uri: avatar }} style={ss.peopleAvatar} />
        : <View style={[ss.peopleAvatar, { backgroundColor: ACCENT + '22', alignItems: 'center', justifyContent: 'center' }]}>
            <Ionicons name="person-outline" size={18} color={ACCENT} />
          </View>
      }
      <View style={{ flex: 1 }}>
        <Text numberOfLines={1} style={ss.peopleName}>{name}</Text>
        {!!handle && <Text style={ss.peopleHandle}>@{handle}</Text>}
      </View>
      <Ionicons name="chevron-forward" size={16} color={MUTED} />
    </TouchableOpacity>
  );
});

// ── Followers / Following modal ───────────────────────────────────────────────
const PeopleModal = ({ visible, title, userId, endpoint, token, navigation, onClose }) => {
  const [items,   setItems]   = useState([]);
  const [page,    setPage]    = useState(1);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const mountedRef             = useRef(true);

  useEffect(() => () => { mountedRef.current = false; }, []);

  const fetchPage = useCallback(async (pg) => {
    if (loading || (!hasMore && pg > 1)) return;
    setLoading(true);
    try {
      const url  = BASE_URL + endpoint + '?user_id=' + userId + '&page=' + pg + '&limit=20';
      const res  = await fetch(url, { headers: { Authorization: 'Bearer ' + token } });
      const json = await res.json();
      const list = json?.data?.data ?? json?.data ?? [];
      if (!mountedRef.current) return;
      if (!Array.isArray(list) || list.length === 0) {
        setHasMore(false);
      } else {
        setItems(prev => pg === 1 ? list : [...prev, ...list]);
        setPage(pg);
        const totalPages = json?.data?.total_pages ?? null;
        if (totalPages != null) setHasMore(pg < totalPages);
        else if (list.length < 20) setHasMore(false);
      }
    } catch {}
    if (mountedRef.current) setLoading(false);
  }, [loading, hasMore, userId, endpoint, token]); // eslint-disable-line

  useEffect(() => {
    if (visible) { setItems([]); setPage(1); setHasMore(true); fetchPage(1); }
  }, [visible]); // eslint-disable-line

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={ss.modalOverlay}>
        <View style={ss.modalSheet}>
          <View style={ss.modalHandle} />
          <View style={ss.modalHeader}>
            <Text style={ss.modalTitle}>{title}</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={22} color={DARK} />
            </TouchableOpacity>
          </View>
          <FlatList
            data={items}
            keyExtractor={(it, i) => String(it?.id ?? it?.user_id ?? i)}
            renderItem={({ item }) => (
              <PeopleRow
                item={item}
                onPress={() => { onClose(); navigation.push('UserProfile', { userId: item.id ?? item.user_id }); }}
              />
            )}
            onEndReached={() => hasMore && fetchPage(page + 1)}
            onEndReachedThreshold={0.4}
            ListFooterComponent={loading
              ? <ActivityIndicator size="small" color={BRAND} style={{ padding: 16 }} />
              : null}
            contentContainerStyle={{ paddingBottom: 30 }}
          />
        </View>
      </View>
    </Modal>
  );
};

// ── Tab state factory ─────────────────────────────────────────────────────────
const makeTabState = () => ({ data: [], page: 1, loading: false, hasMore: true, totalPages: null });

// ── MAIN SCREEN ───────────────────────────────────────────────────────────────
export default function UserProfileScreen({ navigation, route }) {
  const { token, user: authUser } = useAuth();
  const insets    = useSafeAreaInsets();
  const userId    = route?.params?.userId;

  const [profile,     setProfile]     = useState(null);
  const [profileLoad, setProfileLoad] = useState(true);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followLoad,  setFollowLoad]  = useState(false);

  // Per-tab state held in a ref to avoid render churn
  const tabState = useRef(
    Object.fromEntries(TABS.map(t => [t, makeTabState()]))
  );
  const [activeTab, setActiveTab] = useState('posts');
  const [, forceUpdate] = useState(0);
  const bump = useCallback(() => forceUpdate(n => n + 1), []);

  const [peopleModal, setPeopleModal] = useState(null);

  // Ref-backed follow handler — always reads latest state, no stale closure
  const followStateRef = useRef({ isFollowing: false, followLoad: false });
  followStateRef.current = { isFollowing, followLoad };

  const scrollY       = useRef(new Animated.Value(0)).current;
  const headerOpacity = scrollY.interpolate({ inputRange: [0, 130], outputRange: [0, 1], extrapolate: 'clamp' });

  const [refreshing, setRefreshing] = useState(false);

  // ── Fetch profile ──────────────────────────────────────────────────────────
  const fetchProfile = useCallback(async () => {
    if (!userId) return;
    try {
      const res  = await fetch(BASE_URL + '/api/v1/users/view.php?user_id=' + userId,
        { headers: { Authorization: 'Bearer ' + token } });
      const json = await res.json();
      const p    = json?.data ?? json?.user ?? null;
      setProfile(p);
      setIsFollowing(!!(p?.is_following ?? p?.following ?? (p?.follow_status === 1)));
    } catch (e) { console.warn('fetchProfile', e); }
    setProfileLoad(false);
  }, [userId, token]);

  useEffect(() => { fetchProfile(); }, [fetchProfile]);

  // ── Follow / Unfollow ──────────────────────────────────────────────────────
  const toggleFollow = useCallback(async () => {
    const { isFollowing: curFollowing, followLoad: curLoad } = followStateRef.current;
    if (!userId || curLoad) return;
    const action = curFollowing ? 'unfollow' : 'follow';
    setFollowLoad(true);
    setIsFollowing(!curFollowing);
    try {
      const res  = await fetch(BASE_URL + '/api/v1/users/follow.php', {
        method: 'POST',
        headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: Number(userId), action }),
      });
      const json = await res.json();
      const ok   = json?.status === 'success' || json?.status === 200 || json?.status === '200';
      if (!ok) {
        setIsFollowing(curFollowing);
      } else {
        const delta = action === 'follow' ? 1 : -1;
        setProfile(p => p ? { ...p, followers_count: Math.max(0, Number(p.followers_count ?? 0) + delta) } : p);
      }
    } catch { setIsFollowing(curFollowing); }
    setFollowLoad(false);
  }, [userId, token]);

  // ── Tab endpoints ──────────────────────────────────────────────────────────
  const ENDPOINTS = useMemo(() => ({
    posts:       '/api/v1/users/user_feed.php?user_id=' + userId + '&limit=10&filter=all',
    media:       '/api/v1/users/user_feed.php?user_id=' + userId + '&limit=18&filter=media',
    communities: '/api/v1/users/user_communities.php?user_id=' + userId + '&limit=10',
    pages:       '/api/v1/users/user_pages.php?user_id='       + userId + '&limit=10',
  }), [userId]);

  // ── Fetch tab — uses total_pages from API ──────────────────────────────────
  const fetchTab = useCallback(async (tab, pg = 1) => {
    const s = tabState.current[tab];
    if (s.loading) return;
    if (pg > 1 && !s.hasMore) return;
    s.loading = true;
    bump();
    try {
      const url  = BASE_URL + ENDPOINTS[tab] + '&page=' + pg;
      const res  = await fetch(url, { headers: { Authorization: 'Bearer ' + token } });
      const json = await res.json();

      // Support both paginated wrapper and flat array responses
      const wrapper     = json?.data;
      const list        = Array.isArray(wrapper?.data)   ? wrapper.data
                        : Array.isArray(wrapper?.feeds)  ? wrapper.feeds
                        : Array.isArray(wrapper?.items)  ? wrapper.items
                        : Array.isArray(wrapper)         ? wrapper
                        : [];
      const totalPages  = wrapper?.total_pages != null ? Number(wrapper.total_pages) : null;

      if (list.length === 0) {
        s.hasMore = false;
      } else {
        s.data       = pg === 1 ? list : [...s.data, ...list];
        s.page       = pg;
        s.totalPages = totalPages;
        // hasMore: prefer API total_pages, fall back to "got a full page"
        s.hasMore    = totalPages != null ? pg < totalPages : list.length >= 5;
      }
    } catch (e) { console.warn('fetchTab(' + tab + ')', e); s.hasMore = false; }
    s.loading = false;
    bump();
  }, [ENDPOINTS, token, bump]);

  useEffect(() => {
    const s = tabState.current[activeTab];
    if (s.data.length === 0 && s.hasMore) fetchTab(activeTab, 1);
  }, [activeTab, fetchTab]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    tabState.current[activeTab] = makeTabState();
    await Promise.all([fetchProfile(), fetchTab(activeTab, 1)]);
    setRefreshing(false);
  }, [activeTab, fetchProfile, fetchTab]);

  // ── Derived values ─────────────────────────────────────────────────────────
  const displayName = decodeHtml(profile?.full_name ?? profile?.username ?? 'Profile');
  const handle      = profile?.username ?? '';
  const bio         = decodeHtml(profile?.bio ?? '');
  const avatar      = profile?.avatar ?? null;
  const cover       = profile?.cover ?? null;
  const postsCount  = fmtCount(profile?.posts_count ?? 0);
  const follCount   = fmtCount(profile?.followers_count ?? 0);
  const followCount = fmtCount(profile?.following_count ?? 0);
  const isVerified  = !!(profile?.verified ?? profile?.is_verified);
  // Ownership: compare authenticated user id against loaded profile id
  const isOwn       = !!(authUser?.id && profile?.id && String(authUser.id) === String(profile.id));

  const ts      = tabState.current[activeTab];
  const tabData = ts.data;
  const isMedia = activeTab === 'media';

  // ── Renderers ──────────────────────────────────────────────────────────────
  const renderPost = useCallback(({ item }) => (
    <FeedCard feed={item} />
  ), []);

  const renderMedia = useCallback(({ item }) => (
    <MediaCell
      item={item}
      onPress={() => navigation.navigate('PostDetail', { postId: item.id })}
    />
  ), [navigation]);

  const renderCommunity = useCallback(({ item }) => (
    <CommunityCard item={item} onPress={() => navigation.navigate('GroupDetails', { groupId: item.id })} />
  ), [navigation]);

  const renderPage = useCallback(({ item }) => (
    <PageCard item={item} onPress={() => navigation.navigate('BusinessDetails', { pageId: item.id })} />
  ), [navigation]);

  const renderItem = activeTab === 'posts'       ? renderPost
                   : activeTab === 'media'        ? renderMedia
                   : activeTab === 'communities'  ? renderCommunity
                   : renderPage;

  // ── List header — useCallback so FlatList treats it as a component (fresh renders) ──
  const ListHeader = useCallback(() => (
    <View>
      <View style={[ss.hero, { paddingTop: insets.top + 10 }]}>
        <View style={ss.blob1} /><View style={ss.blob2} />

        {hasRealImg(cover) && (
          <Image
            source={{ uri: cover }}
            style={[StyleSheet.absoluteFill, { opacity: 0.22 }]}
            resizeMode="cover"
          />
        )}

        <TouchableOpacity style={ss.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={20} color="#fff" />
        </TouchableOpacity>

        <View style={ss.avatarWrap}>
          {profileLoad
            ? <View style={[ss.avatar, ss.avatarFallback]} />
            : hasRealImg(avatar)
              ? <Image source={{ uri: avatar }} style={ss.avatar} />
              : <View style={[ss.avatar, ss.avatarFallback]}>
                  <Ionicons name="person" size={34} color={ACCENT} />
                </View>
          }
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12 }}>
          <Text style={ss.displayName}>{displayName}</Text>
          {isVerified && <Ionicons name="checkmark-circle" size={18} color={ACCENT} />}
        </View>
        {!!handle && <Text style={ss.handleTxt}>@{handle}</Text>}
        {!!bio    && <Text style={ss.bio}>{bio}</Text>}

        <View style={ss.statsRow}>
          <View style={ss.statItem}>
            <Text style={ss.statValue}>{postsCount}</Text>
            <Text style={ss.statLabel}>Posts</Text>
          </View>
          <TouchableOpacity
            style={ss.statItem}
            onPress={() => setPeopleModal({ title: 'Followers', endpoint: '/api/v1/users/user_followers.php' })}
          >
            <Text style={ss.statValue}>{follCount}</Text>
            <Text style={ss.statLabel}>Followers</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={ss.statItem}
            onPress={() => setPeopleModal({ title: 'Following', endpoint: '/api/v1/users/user_following.php' })}
          >
            <Text style={ss.statValue}>{followCount}</Text>
            <Text style={ss.statLabel}>Following</Text>
          </TouchableOpacity>
        </View>

        {!isOwn && !profileLoad && (
          <TouchableOpacity
            style={[ss.followBtn, isFollowing && ss.followingBtn]}
            activeOpacity={0.85}
            onPress={toggleFollow}
            disabled={followLoad}
          >
            {followLoad
              ? <ActivityIndicator size="small" color={isFollowing ? BRAND : '#fff'} />
              : <Text style={[ss.followBtnTxt, isFollowing && ss.followingBtnTxt]}>
                  {isFollowing ? '✓  Following' : '+ Follow'}
                </Text>
            }
          </TouchableOpacity>
        )}
      </View>

      <View style={ss.tabsBar}>
        {TABS.map(tab => {
          const active = activeTab === tab;
          return (
            <TouchableOpacity
              key={tab}
              style={[ss.tabBtn, active && ss.tabBtnActive]}
              onPress={() => setActiveTab(tab)}
            >
              <Text style={[ss.tabTxt, active && ss.tabTxtActive]}>
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  ), [profile, profileLoad, activeTab, isFollowing, followLoad, isOwn, insets.top, toggleFollow, navigation, cover, avatar, displayName, handle, bio, postsCount, follCount, followCount, isVerified]); // eslint-disable-line

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <View style={ss.root}>
      <StatusBar barStyle="light-content" />

      {/* Sticky compact header fades in on scroll */}
      <Animated.View style={[ss.stickyHeader, { paddingTop: insets.top + 6, opacity: headerOpacity }]}>
        <TouchableOpacity style={ss.stickyBack} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={18} color={DARK} />
        </TouchableOpacity>
        <Text style={ss.stickyName} numberOfLines={1}>{displayName}</Text>
        <View style={{ width: 38 }} />
      </Animated.View>

      <Animated.FlatList
        key={activeTab + (isMedia ? '-3' : '-1')}
        data={tabData}
        keyExtractor={(item, i) => String(item?.id ?? i)}
        numColumns={isMedia ? 3 : 1}
        ListHeaderComponent={ListHeader}
        renderItem={renderItem}
        ListEmptyComponent={
          tabData.length === 0
            ? (ts.loading
                ? <ActivityIndicator size="small" color={BRAND} style={{ marginTop: 36 }} />
                : (
                  <View style={ss.emptyWrap}>
                    <Ionicons name="file-tray-outline" size={40} color={MUTED} />
                    <Text style={ss.emptyTxt}>Nothing here yet</Text>
                  </View>
                ))
            : null
        }
        onEndReached={() => {
          if (ts.hasMore && !ts.loading) fetchTab(activeTab, ts.page + 1);
        }}
        onEndReachedThreshold={0.5}
        ListFooterComponent={
          ts.loading && tabData.length > 0
            ? <ActivityIndicator size="small" color={BRAND} style={{ padding: 20 }} />
            : <View style={{ height: 80 }} />
        }
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={BRAND} />
        }
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: false },
        )}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 30 }}
      />

      {!!peopleModal && (
        <PeopleModal
          visible
          title={peopleModal.title}
          userId={userId}
          endpoint={peopleModal.endpoint}
          token={token}
          navigation={navigation}
          onClose={() => setPeopleModal(null)}
        />
      )}
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const ss = StyleSheet.create({
  root: { flex: 1, backgroundColor: CREAM },

  stickyHeader: {
    position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10,
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff',
    paddingHorizontal: 14, paddingBottom: 12,
    borderBottomWidth: 1, borderBottomColor: BORDER,
  },
  stickyBack: { width: 38, height: 38, borderRadius: 19, backgroundColor: '#F5F7F8', alignItems: 'center', justifyContent: 'center' },
  stickyName: { flex: 1, fontSize: 16, fontWeight: '800', color: DARK, textAlign: 'center' },

  hero:        { backgroundColor: BRAND, paddingHorizontal: 20, paddingBottom: 24, alignItems: 'center', overflow: 'hidden' },
  blob1:       { position: 'absolute', width: 200, height: 200, borderRadius: 100, backgroundColor: 'rgba(19,194,150,0.12)', top: -20, right: -40 },
  blob2:       { position: 'absolute', width: 140, height: 140, borderRadius: 70,  backgroundColor: 'rgba(255,255,255,0.05)', bottom: -30, left: -20 },
  backBtn:     { alignSelf: 'flex-start', width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  avatarWrap:  { marginTop: 8 },
  avatar:      { width: 92, height: 92, borderRadius: 46, borderWidth: 3, borderColor: ACCENT },
  avatarFallback: { backgroundColor: '#13C29622', alignItems: 'center', justifyContent: 'center' },

  displayName: { fontSize: 22, fontWeight: '900', color: '#fff' },
  handleTxt:   { fontSize: 13, color: 'rgba(255,255,255,0.6)', marginTop: 3 },
  bio:         { marginTop: 10, fontSize: 13, color: 'rgba(255,255,255,0.75)', textAlign: 'center', lineHeight: 19 },

  statsRow:  { flexDirection: 'row', gap: 28, marginTop: 20 },
  statItem:  { alignItems: 'center' },
  statValue: { fontSize: 20, fontWeight: '900', color: '#fff' },
  statLabel: { fontSize: 11, color: 'rgba(255,255,255,0.6)' },

  followBtn:       { marginTop: 18, paddingHorizontal: 36, paddingVertical: 10, borderRadius: 999, backgroundColor: ACCENT },
  followingBtn:    { backgroundColor: 'rgba(255,255,255,0.15)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.4)' },
  followBtnTxt:    { fontSize: 14, fontWeight: '800', color: '#fff' },
  followingBtnTxt: { color: '#fff' },

  tabsBar:      { flexDirection: 'row', paddingHorizontal: 14, paddingVertical: 12, backgroundColor: CREAM, gap: 8 },
  tabBtn:       { flex: 1, paddingVertical: 10, borderRadius: 999, backgroundColor: '#fff', borderWidth: 1, borderColor: BORDER, alignItems: 'center' },
  tabBtnActive: { backgroundColor: BRAND, borderColor: BRAND },
  tabTxt:       { fontSize: 12, fontWeight: '800', color: MUTED },
  tabTxtActive: { color: '#fff' },

  mediaCell:         { width: CELL_SIZE, height: CELL_SIZE, margin: 1 },
  mediaCellImg:      { width: '100%', height: '100%' },
  mediaCellFallback: { flex: 1, backgroundColor: '#eee', alignItems: 'center', justifyContent: 'center' },
  mediaCellPlay:     { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.22)' },

  groupCard:       { backgroundColor: '#fff', borderRadius: 14, marginHorizontal: 14, marginTop: 10, borderWidth: 1, borderColor: BORDER, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 1 },
  groupBanner:     { width: '100%', height: 80 },
  groupBody:       { flexDirection: 'row', alignItems: 'center', padding: 12, gap: 12 },
  groupAvatarWrap: { marginTop: -28 },
  groupAvatar:     { width: 46, height: 46, borderRadius: 12, borderWidth: 2, borderColor: '#fff' },
  groupName:       { fontSize: 14, fontWeight: '800', color: DARK },
  groupSub:        { fontSize: 11, color: MUTED, marginTop: 2 },
  joinBtn:         { paddingHorizontal: 14, paddingVertical: 7, backgroundColor: BRAND, borderRadius: 999 },
  joinBtnTxt:      { fontSize: 12, fontWeight: '800', color: '#fff' },

  pageCard:   { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#fff', borderRadius: 14, marginHorizontal: 14, marginTop: 10, padding: 14, borderWidth: 1, borderColor: BORDER, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 1 },
  pageAvatar: { width: 52, height: 52, borderRadius: 14 },
  pageName:   { fontSize: 14, fontWeight: '800', color: DARK, flex: 1 },
  pageCat:    { fontSize: 11, color: ACCENT, marginTop: 2 },
  pageSub:    { fontSize: 11, color: MUTED, marginTop: 2 },
  viewBtn:    { paddingHorizontal: 14, paddingVertical: 7, backgroundColor: 'rgba(12,63,68,0.06)', borderRadius: 999 },
  viewBtnTxt: { fontSize: 12, fontWeight: '700', color: BRAND },

  emptyWrap: { alignItems: 'center', paddingTop: 48, gap: 10 },
  emptyTxt:  { fontSize: 14, color: MUTED },

  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' },
  modalSheet:   { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '75%' },
  modalHandle:  { width: 36, height: 4, borderRadius: 2, backgroundColor: BORDER, alignSelf: 'center', marginTop: 10 },
  modalHeader:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: BORDER },
  modalTitle:   { fontSize: 17, fontWeight: '900', color: DARK },

  peopleRow:    { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: BORDER },
  peopleAvatar: { width: 44, height: 44, borderRadius: 22 },
  peopleName:   { fontSize: 14, fontWeight: '700', color: DARK },
  peopleHandle: { fontSize: 12, color: MUTED, marginTop: 2 },
});
