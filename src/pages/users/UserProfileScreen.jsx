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
import { Colors } from '../../theme/colors';

const withOpacity = (hex, opacity) => {
  const normalized = (hex || "").replace("#", "");
  const alpha = Math.round(Math.max(0, Math.min(1, opacity)) * 255).toString(16).padStart(2, "0");
  return `#${normalized}${alpha}`;
};


const { width: SCREEN_W } = Dimensions.get('window');
const BASE_URL  = 'https://hafrik.com';
const CELL_SIZE = Math.floor((SCREEN_W - 6) / 3);
const BRAND  = Colors.primaryDark;
const ACCENT = Colors.primary;
const CREAM  = Colors.surfaceTint;
const DARK   = Colors.deepSlate;
const MUTED  = Colors.secondaryText;
const BORDER = withOpacity(Colors.primaryDark, 0.09);
const TABS   = ['posts', 'followers', 'media', 'communities'];

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
  const apiType = item?.type ?? '';
  const isReel = apiType === 'reel' || (isVideo && apiType !== 'photos');
  return (
    <TouchableOpacity style={ss.mediaCell} activeOpacity={0.85} onPress={onPress}>
      {hasRealImg(uri)
        ? <Image source={{ uri }} style={ss.mediaCellImg} resizeMode="cover" />
        : <View style={ss.mediaCellFallback}><Ionicons name="image-outline" size={22} color={MUTED} /></View>
      }
      {isVideo && (
        <View style={ss.mediaCellPlay}>
          <Ionicons name={isReel ? "videocam" : "play-circle"} size={24} color={Colors.white} />
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
const PeopleRow = memo(({ item, onPress, onFollow, isOwnProfile }) => {
  const name   = decodeHtml(item?.full_name ?? item?.username ?? 'User');
  const handle = item?.username ?? '';
  const avatar = item?.avatar ?? null;
  const isFollowing = item?._isFollowing;
  const isLoadingFollow = item?._followLoading;
  return (
    <TouchableOpacity style={ss.peopleRow} activeOpacity={0.88} onPress={onPress}>
      {hasRealImg(avatar)
        ? <Image source={{ uri: avatar }} style={ss.peopleAvatar} />
        : <View style={[ss.peopleAvatar, { backgroundColor: ACCENT + '22', alignItems: 'center', justifyContent: 'center' }]}>
            <Ionicons name="person-outline" size={18} color={ACCENT} />
          </View>
      }
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <Text numberOfLines={1} style={ss.peopleName}>{name}</Text>
          {!!item?.verified && <Ionicons name="checkmark-circle" size={13} color={ACCENT} />}
        </View>
        {!!handle && <Text style={ss.peopleHandle}>@{handle}</Text>}
      </View>
      {onFollow && (
        <TouchableOpacity
          style={[ss.peopleFollowBtn, isFollowing && ss.peopleFollowingBtn]}
          onPress={() => onFollow(item)}
          activeOpacity={0.7}
          disabled={isLoadingFollow}
        >
          {isLoadingFollow ? (
            <ActivityIndicator size="small" color={isFollowing ? ACCENT : Colors.white} />
          ) : (
            <Text style={[ss.peopleFollowTxt, isFollowing && ss.peopleFollowingTxt]}>
              {isFollowing ? 'Following' : 'Follow'}
            </Text>
          )}
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );
});

// ── Followers / Following modal ───────────────────────────────────────────────
const PeopleModal = ({ visible, title, userId, endpoint, token, navigation, onClose, authUserId }) => {
  const [items,   setItems]   = useState([]);
  const [page,    setPage]    = useState(1);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [activeSubTab, setActiveSubTab] = useState(title === 'Following' ? 'following' : 'followers');
  const mountedRef             = useRef(true);

  useEffect(() => () => { mountedRef.current = false; }, []);

  const currentEndpoint = activeSubTab === 'following'
    ? '/api/v1/users/user_following.php'
    : '/api/v1/users/user_followers.php';

  const fetchPage = useCallback(async (pg, ep) => {
    if (loading) return;
    setLoading(true);
    try {
      const url  = BASE_URL + ep + '?user_id=' + userId + '&page=' + pg + '&limit=20';
      const res  = await fetch(url, { headers: { Authorization: 'Bearer ' + token } });
      const json = await res.json();
      const list = json?.data?.data ?? json?.data ?? [];
      if (!mountedRef.current) return;
      if (!Array.isArray(list) || list.length === 0) {
        setHasMore(false);
        if (pg === 1) setItems([]);
      } else {
        const enriched = list.map(item => ({
          ...item,
          _isFollowing: !!(item.is_following ?? item.following ?? (item.follow_status === 1)),
          _followLoading: false,
        }));
        setItems(prev => pg === 1 ? enriched : [...prev, ...enriched]);
        setPage(pg);
        const totalPages = json?.data?.total_pages ?? null;
        if (totalPages != null) setHasMore(pg < totalPages);
        else if (list.length < 20) setHasMore(false);
      }
    } catch {}
    if (mountedRef.current) setLoading(false);
  }, [loading, userId, token]); // eslint-disable-line

  useEffect(() => {
    if (visible) { setItems([]); setPage(1); setHasMore(true); fetchPage(1, currentEndpoint); }
  }, [visible, activeSubTab]); // eslint-disable-line

  const handleFollow = useCallback(async (targetUser) => {
    const targetId = targetUser.id || targetUser.user_id;
    if (!targetId) return;

    const wasFollowing = targetUser._isFollowing;
    setItems(prev => prev.map(it => {
      if ((it.id || it.user_id) === targetId) return { ...it, _isFollowing: !it._isFollowing, _followLoading: true };
      return it;
    }));

    try {
      const res = await fetch(BASE_URL + '/api/v1/users/follow.php', {
        method: 'POST',
        headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: targetId }),
      });
      const json = await res.json();
      const ok = json?.status === 'success' || json?.status === 200 || json?.status === '200';
      if (!ok && mountedRef.current) {
        setItems(prev => prev.map(it => {
          if ((it.id || it.user_id) === targetId) return { ...it, _isFollowing: wasFollowing };
          return it;
        }));
      }
    } catch {
      if (mountedRef.current) {
        setItems(prev => prev.map(it => {
          if ((it.id || it.user_id) === targetId) return { ...it, _isFollowing: wasFollowing };
          return it;
        }));
      }
    } finally {
      if (mountedRef.current) {
        setItems(prev => prev.map(it => {
          if ((it.id || it.user_id) === targetId) return { ...it, _followLoading: false };
          return it;
        }));
      }
    }
  }, [token]);

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={ss.modalOverlay}>
        <View style={ss.modalSheet}>
          <View style={ss.modalHandle} />
          <View style={ss.modalHeader}>
            <Text style={ss.modalTitle}>{activeSubTab === 'following' ? 'Following' : 'Followers'}</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={22} color={DARK} />
            </TouchableOpacity>
          </View>

          {/* Sub-tabs */}
          <View style={ss.modalSubTabs}>
            {['followers', 'following'].map(tab => {
              const isActive = activeSubTab === tab;
              return (
                <TouchableOpacity
                  key={tab}
                  style={[ss.modalSubTab, isActive && ss.modalSubTabActive]}
                  onPress={() => setActiveSubTab(tab)}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name={tab === 'followers' ? 'people-outline' : 'person-add-outline'}
                    size={15}
                    color={isActive ? Colors.white : MUTED}
                  />
                  <Text style={[ss.modalSubTabTxt, isActive && ss.modalSubTabTxtActive]}>
                    {tab.charAt(0).toUpperCase() + tab.slice(1)}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <FlatList
            data={items}
            keyExtractor={(it, i) => String(it?.id ?? it?.user_id ?? i)}
            renderItem={({ item }) => (
              <PeopleRow
                item={item}
                onFollow={String(item.id || item.user_id) !== String(authUserId) ? handleFollow : undefined}
                onPress={() => { onClose(); navigation.push('UserProfile', { userId: item.id ?? item.user_id }); }}
              />
            )}
            onEndReached={() => hasMore && !loading && fetchPage(page + 1, currentEndpoint)}
            onEndReachedThreshold={0.4}
            ListFooterComponent={loading
              ? <ActivityIndicator size="small" color={BRAND} style={{ padding: 16 }} />
              : null}
            ListEmptyComponent={!loading ? (
              <View style={ss.emptyWrap}>
                <Ionicons name={activeSubTab === 'followers' ? 'people-outline' : 'person-add-outline'} size={40} color={MUTED} />
                <Text style={ss.emptyTxt}>
                  {activeSubTab === 'followers' ? 'No followers yet' : 'Not following anyone'}
                </Text>
              </View>
            ) : null}
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
    Object.fromEntries(TABS.filter(t => t !== 'followers').map(t => [t, makeTabState()]))
  );
  const [activeTab, setActiveTab] = useState('posts');
  const [, forceUpdate] = useState(0);
  const bump = useCallback(() => forceUpdate(n => n + 1), []);

  const [peopleModal, setPeopleModal] = useState(null);

  // Followers tab state
  const [followersSubTab, setFollowersSubTab] = useState('followers');
  const [followersList, setFollowersList] = useState([]);
  const [followersLoading, setFollowersLoading] = useState(false);

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
      const res  = await fetch(
        BASE_URL + '/api/v1/users/profile.php?user_id=' + userId,
        { headers: { Authorization: 'Bearer ' + token } },
      );

      // Unauthorized → redirect to login
      if (res.status === 401) {
        navigation.replace('Login');
        return;
      }

      const json = await res.json();

      // Normalize: handle { data: { user, counts, viewer } } and { user, counts, viewer }
      const payload  = json?.data ?? json;
      const user     = payload?.user ?? payload ?? null;
      const counts   = payload?.counts ?? {};
      const viewer   = payload?.viewer ?? {};

      // Merge everything into one flat object so existing field references still work
      const merged = {
        ...user,
        posts_count:     counts?.posts     ?? user?.posts_count     ?? 0,
        followers_count: counts?.followers ?? user?.followers_count ?? 0,
        following_count: counts?.following ?? user?.following_count ?? 0,
        is_following:    viewer?.is_following ?? false,
        is_owner:        viewer?.is_owner     ?? false,
        is_mutual:       viewer?.is_mutual    ?? false,
      };

      setProfile(merged);
      setIsFollowing(!!merged.is_following);
    } catch (e) { console.warn('fetchProfile', e); }
    setProfileLoad(false);
  }, [userId, token, navigation]);

  useEffect(() => { fetchProfile(); }, [fetchProfile]);

  // ── Follow / Unfollow ──────────────────────────────────────────────────────
  const toggleFollow = useCallback(async () => {
    const { isFollowing: curFollowing, followLoad: curLoad } = followStateRef.current;
    if (!userId || curLoad) return;
    setFollowLoad(true);
    setIsFollowing(!curFollowing);
    try {
      const res  = await fetch(BASE_URL + '/api/v1/users/follow.php', {
        method: 'POST',
        headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId }),
      });
      const json = await res.json();
      const ok   = json?.status === 'success' || json?.status === 200 || json?.status === '200';
      if (!ok) {
        setIsFollowing(curFollowing);
      } else {
        const delta = curFollowing ? -1 : 1;
        setProfile(p => p ? { ...p, followers_count: Math.max(0, Number(p.followers_count ?? 0) + delta) } : p);
      }
    } catch { setIsFollowing(curFollowing); }
    setFollowLoad(false);
  }, [userId, token]);

  // ── Fetch followers/following for inline tab ───────────────────────────────
  const fetchFollowersTab = useCallback(async (subTab) => {
    if (!userId) return;
    setFollowersLoading(true);
    try {
      const ep = subTab === 'following' ? 'user_following.php' : 'user_followers.php';
      const url = BASE_URL + '/api/v1/users/' + ep + '?user_id=' + userId + '&limit=50';
      const res = await fetch(url, { headers: { Authorization: 'Bearer ' + token } });
      const json = await res.json();
      const list = json?.data?.data ?? json?.data ?? [];
      if (Array.isArray(list)) {
        setFollowersList(list.map(item => ({
          ...item,
          _isFollowing: !!(item.is_following ?? item.following ?? (item.follow_status === 1)),
          _followLoading: false,
        })));
      } else {
        setFollowersList([]);
      }
    } catch { setFollowersList([]); }
    setFollowersLoading(false);
  }, [userId, token]);

  useEffect(() => {
    if (activeTab === 'followers') fetchFollowersTab(followersSubTab);
  }, [activeTab, followersSubTab, fetchFollowersTab]);

  const handleFollowInList = useCallback(async (targetUser) => {
    const targetId = targetUser.id || targetUser.user_id;
    if (!targetId) return;
    const wasFollowing = targetUser._isFollowing;
    setFollowersList(prev => prev.map(it =>
      (it.id || it.user_id) === targetId ? { ...it, _isFollowing: !it._isFollowing, _followLoading: true } : it
    ));
    try {
      const res = await fetch(BASE_URL + '/api/v1/users/follow.php', {
        method: 'POST',
        headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: targetId }),
      });
      const json = await res.json();
      const ok = json?.status === 'success' || json?.status === 200 || json?.status === '200';
      if (!ok) {
        setFollowersList(prev => prev.map(it =>
          (it.id || it.user_id) === targetId ? { ...it, _isFollowing: wasFollowing } : it
        ));
      }
    } catch {
      setFollowersList(prev => prev.map(it =>
        (it.id || it.user_id) === targetId ? { ...it, _isFollowing: wasFollowing } : it
      ));
    } finally {
      setFollowersList(prev => prev.map(it =>
        (it.id || it.user_id) === targetId ? { ...it, _followLoading: false } : it
      ));
    }
  }, [token]);

  // ── Tab endpoints ──────────────────────────────────────────────────────────
  const ENDPOINTS = useMemo(() => ({
    posts:       '/api/v1/users/user_feed.php?user_id=' + userId + '&limit=10&filter=all',
    media:       '/api/v1/users/user_media.php?user_id=' + userId + '&limit=30',
    communities: '/api/v1/users/user_communities.php?user_id=' + userId + '&limit=10',
    pages:       '/api/v1/users/user_pages.php?user_id='       + userId + '&limit=10',
  }), [userId]);

  // ── Fetch tab — uses total_pages from API ──────────────────────────────────
  const fetchTab = useCallback(async (tab, pg = 1) => {
    if (tab === 'followers') return; // handled separately
    const s = tabState.current[tab];
    if (!s || s.loading) return;
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
    if (activeTab === 'followers') return; // handled separately
    const s = tabState.current[activeTab];
    if (s && s.data.length === 0 && s.hasMore) fetchTab(activeTab, 1);
  }, [activeTab, fetchTab]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    if (activeTab === 'followers') {
      await Promise.all([fetchProfile(), fetchFollowersTab(followersSubTab)]);
    } else {
      tabState.current[activeTab] = makeTabState();
      await Promise.all([fetchProfile(), fetchTab(activeTab, 1)]);
    }
    setRefreshing(false);
  }, [activeTab, followersSubTab, fetchProfile, fetchTab, fetchFollowersTab]);

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
  // Ownership: prefer viewer.is_owner from API, fall back to ID comparison
  const isOwn       = !!(profile?.is_owner ?? (authUser?.id && profile?.id && String(authUser.id) === String(profile.id)));

  const ts      = activeTab !== 'followers' && tabState.current[activeTab] ? tabState.current[activeTab] : { data: [], loading: false, hasMore: false, page: 1 };
  const tabData = activeTab === 'followers' ? followersList : ts.data;
  const isMedia = activeTab === 'media';
  const isFollowersTab = activeTab === 'followers';
  const [visiblePostId, setVisiblePostId] = useState(null);
  const activeTabRef = useRef(activeTab);

  useEffect(() => {
    activeTabRef.current = activeTab;
    if (activeTab !== 'posts') setVisiblePostId(null);
  }, [activeTab]);

  const onViewableItemsChanged = useRef(({ viewableItems }) => {
    if (activeTabRef.current !== 'posts') {
      setVisiblePostId(null);
      return;
    }

    const nextVisibleId = viewableItems.find((entry) => entry?.isViewable && entry?.item?.id)?.item?.id ?? null;
    setVisiblePostId((prev) => (prev === nextVisibleId ? prev : nextVisibleId));
  });

  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 70,
    waitForInteraction: false,
  });

  // ── Renderers ──────────────────────────────────────────────────────────────
  const renderPost = useCallback(({ item }) => (
    <FeedCard feed={item} isVisible={visiblePostId === item?.id} />
  ), [visiblePostId]);

  const renderMedia = useCallback(({ item }) => {
    const apiType = item?.type ?? '';
    const isReel = apiType === 'reel';
    return (
      <MediaCell
        item={item}
        onPress={() => {
          if (isReel) {
            navigation.navigate('Reels2', {
              initialReels: [item],
              startIndex: 0,
              initialReelId: item.id,
            });
          } else {
            navigation.navigate('PostDetail', { postId: item.id });
          }
        }}
      />
    );
  }, [navigation]);

  const renderCommunity = useCallback(({ item }) => (
    <CommunityCard item={item} onPress={() => navigation.navigate('GroupDetails', { groupId: item.id })} />
  ), [navigation]);

  const renderPage = useCallback(({ item }) => (
    <PageCard item={item} onPress={() => navigation.navigate('BusinessDetails', { pageId: item.id })} />
  ), [navigation]);

  const renderFollower = useCallback(({ item }) => (
    <PeopleRow
      item={item}
      onFollow={String(item.id || item.user_id) !== String(authUser?.id) ? handleFollowInList : undefined}
      onPress={() => {
        const uid = item.id || item.user_id;
        if (uid) {
          navigation.push('UserProfile', { userId: uid });
        }
      }}
    />
  ), [navigation, authUser, handleFollowInList]);

  const renderItem = activeTab === 'posts'       ? renderPost
                   : activeTab === 'media'        ? renderMedia
                   : activeTab === 'followers'    ? renderFollower
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
          <Ionicons name="arrow-back" size={20} color={Colors.white} />
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
            onPress={() => setActiveTab('followers')}
          >
            <Text style={ss.statValue}>{follCount}</Text>
            <Text style={ss.statLabel}>Followers</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={ss.statItem}
            onPress={() => { setFollowersSubTab('following'); setActiveTab('followers'); }}
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
              ? <ActivityIndicator size="small" color={isFollowing ? BRAND : Colors.white} />
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
          const iconMap = { posts: 'home-outline', followers: 'people-outline', media: 'images-outline', communities: 'globe-outline', pages: 'flag-outline' };
          return (
            <TouchableOpacity
              key={tab}
              style={[ss.tabBtn, active && ss.tabBtnActive]}
              onPress={() => setActiveTab(tab)}
            >
              <Ionicons name={iconMap[tab] || 'ellipse-outline'} size={15} color={active ? Colors.white : MUTED} />
              <Text style={[ss.tabTxt, active && ss.tabTxtActive]}>
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Followers sub-tabs */}
      {activeTab === 'followers' && (
        <View style={ss.followersSubTabs}>
          {['followers', 'following'].map(st => {
            const isActive = followersSubTab === st;
            return (
              <TouchableOpacity
                key={st}
                style={[ss.followersSubTab, isActive && ss.followersSubTabActive]}
                onPress={() => setFollowersSubTab(st)}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={st === 'followers' ? 'people-outline' : 'person-add-outline'}
                  size={15} color={isActive ? Colors.white : MUTED}
                />
                <Text style={[ss.followersSubTabTxt, isActive && ss.followersSubTabTxtActive]}>
                  {st.charAt(0).toUpperCase() + st.slice(1)}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      )}
    </View>
  ), [profile, profileLoad, activeTab, isFollowing, followLoad, isOwn, insets.top, toggleFollow, navigation, cover, avatar, displayName, handle, bio, postsCount, follCount, followCount, isVerified, followersSubTab]); // eslint-disable-line

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
        keyExtractor={(item, i) => String(item?.id ?? item?.user_id ?? i)}
        numColumns={isMedia ? 3 : 1}
        ListHeaderComponent={ListHeader}
        renderItem={renderItem}
        ListEmptyComponent={
          tabData.length === 0
            ? ((isFollowersTab ? followersLoading : ts.loading)
                ? <ActivityIndicator size="small" color={BRAND} style={{ marginTop: 36 }} />
                : (
                  <View style={ss.emptyWrap}>
                    <Ionicons name={isFollowersTab ? "people-outline" : "file-tray-outline"} size={40} color={MUTED} />
                    <Text style={ss.emptyTxt}>
                      {isFollowersTab
                        ? (followersSubTab === 'followers' ? 'No followers yet' : 'Not following anyone')
                        : 'Nothing here yet'}
                    </Text>
                  </View>
                ))
            : null
        }
        onEndReached={() => {
          if (!isFollowersTab && ts.hasMore && !ts.loading) fetchTab(activeTab, ts.page + 1);
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
        onViewableItemsChanged={onViewableItemsChanged.current}
        viewabilityConfig={viewabilityConfig.current}
        extraData={visiblePostId}
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
          authUserId={authUser?.id}
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
    flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.white,
    paddingHorizontal: 14, paddingBottom: 12,
    borderBottomWidth: 1, borderBottomColor: BORDER,
  },
  stickyBack: { width: 38, height: 38, borderRadius: 19, backgroundColor: Colors.surfaceBase, alignItems: 'center', justifyContent: 'center' },
  stickyName: { flex: 1, fontSize: 16, fontWeight: '800', color: DARK, textAlign: 'center' },

  hero:        { backgroundColor: BRAND, paddingHorizontal: 20, paddingBottom: 24, alignItems: 'center', overflow: 'hidden' },
  blob1:       { position: 'absolute', width: 200, height: 200, borderRadius: 100, backgroundColor: withOpacity(Colors.tealAccent, 0.12), top: -20, right: -40 },
  blob2:       { position: 'absolute', width: 140, height: 140, borderRadius: 70,  backgroundColor: withOpacity(Colors.white, 0.05), bottom: -30, left: -20 },
  backBtn:     { alignSelf: 'flex-start', width: 38, height: 38, borderRadius: 19, backgroundColor: withOpacity(Colors.white, 0.15), alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  avatarWrap:  { marginTop: 8 },
  avatar:      { width: 92, height: 92, borderRadius: 46, borderWidth: 3, borderColor: ACCENT },
  avatarFallback: { backgroundColor: withOpacity(Colors.tealAccent, 0.1333), alignItems: 'center', justifyContent: 'center' },

  displayName: { fontSize: 22, fontWeight: '900', color: Colors.white },
  handleTxt:   { fontSize: 13, color: withOpacity(Colors.white, 0.6), marginTop: 3 },
  bio:         { marginTop: 10, fontSize: 13, color: withOpacity(Colors.white, 0.75), textAlign: 'center', lineHeight: 19 },

  statsRow:  { flexDirection: 'row', gap: 28, marginTop: 20 },
  statItem:  { alignItems: 'center' },
  statValue: { fontSize: 20, fontWeight: '900', color: Colors.white },
  statLabel: { fontSize: 11, color: withOpacity(Colors.white, 0.6) },

  followBtn:       { marginTop: 18, paddingHorizontal: 36, paddingVertical: 10, borderRadius: 999, backgroundColor: ACCENT },
  followingBtn:    { backgroundColor: withOpacity(Colors.white, 0.15), borderWidth: 1, borderColor: withOpacity(Colors.white, 0.4) },
  followBtnTxt:    { fontSize: 14, fontWeight: '800', color: Colors.white },
  followingBtnTxt: { color: Colors.white },

  tabsBar:      { flexDirection: 'row', paddingHorizontal: 14, paddingVertical: 12, backgroundColor: CREAM, gap: 6, flexWrap: 'wrap' },
  tabBtn:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 999, backgroundColor: Colors.white, borderWidth: 1, borderColor: BORDER },
  tabBtnActive: { backgroundColor: BRAND, borderColor: BRAND },
  tabTxt:       { fontSize: 11, fontWeight: '800', color: MUTED },
  tabTxtActive: { color: Colors.white },

  followersSubTabs: { flexDirection: 'row', paddingHorizontal: 14, paddingVertical: 8, gap: 10, backgroundColor: Colors.white, borderBottomWidth: 1, borderBottomColor: BORDER },
  followersSubTab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingVertical: 9, borderRadius: 999, backgroundColor: withOpacity(Colors.primaryDark, 0.04), borderWidth: 1, borderColor: withOpacity(Colors.primaryDark, 0.08) },
  followersSubTabActive: { backgroundColor: BRAND, borderColor: BRAND },
  followersSubTabTxt: { fontSize: 12.5, fontWeight: '700', color: MUTED },
  followersSubTabTxtActive: { color: Colors.white },

  mediaCell:         { width: CELL_SIZE, height: CELL_SIZE, margin: 1 },
  mediaCellImg:      { width: '100%', height: '100%' },
  mediaCellFallback: { flex: 1, backgroundColor: Colors.neutral180, alignItems: 'center', justifyContent: 'center' },
  mediaCellPlay:     { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center', backgroundColor: withOpacity(Colors.black, 0.22) },

  groupCard:       { backgroundColor: Colors.white, borderRadius: 14, marginHorizontal: 14, marginTop: 10, borderWidth: 1, borderColor: BORDER, overflow: 'hidden', shadowColor: Colors.black, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 1 },
  groupBanner:     { width: '100%', height: 80 },
  groupBody:       { flexDirection: 'row', alignItems: 'center', padding: 12, gap: 12 },
  groupAvatarWrap: { marginTop: -28 },
  groupAvatar:     { width: 46, height: 46, borderRadius: 12, borderWidth: 2, borderColor: Colors.white },
  groupName:       { fontSize: 14, fontWeight: '800', color: DARK },
  groupSub:        { fontSize: 11, color: MUTED, marginTop: 2 },
  joinBtn:         { paddingHorizontal: 14, paddingVertical: 7, backgroundColor: BRAND, borderRadius: 999 },
  joinBtnTxt:      { fontSize: 12, fontWeight: '800', color: Colors.white },

  pageCard:   { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: Colors.white, borderRadius: 14, marginHorizontal: 14, marginTop: 10, padding: 14, borderWidth: 1, borderColor: BORDER, shadowColor: Colors.black, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 1 },
  pageAvatar: { width: 52, height: 52, borderRadius: 14 },
  pageName:   { fontSize: 14, fontWeight: '800', color: DARK, flex: 1 },
  pageCat:    { fontSize: 11, color: ACCENT, marginTop: 2 },
  pageSub:    { fontSize: 11, color: MUTED, marginTop: 2 },
  viewBtn:    { paddingHorizontal: 14, paddingVertical: 7, backgroundColor: withOpacity(Colors.primaryDark, 0.06), borderRadius: 999 },
  viewBtnTxt: { fontSize: 12, fontWeight: '700', color: BRAND },

  emptyWrap: { alignItems: 'center', paddingTop: 48, gap: 10 },
  emptyTxt:  { fontSize: 14, color: MUTED },

  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: withOpacity(Colors.black, 0.4) },
  modalSheet:   { backgroundColor: Colors.white, borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '75%' },
  modalHandle:  { width: 36, height: 4, borderRadius: 2, backgroundColor: BORDER, alignSelf: 'center', marginTop: 10 },
  modalHeader:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: BORDER },
  modalTitle:   { fontSize: 17, fontWeight: '900', color: DARK },

  peopleRow:    { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: BORDER },
  peopleAvatar: { width: 44, height: 44, borderRadius: 22 },
  peopleName:   { fontSize: 14, fontWeight: '700', color: DARK },
  peopleHandle: { fontSize: 12, color: MUTED, marginTop: 2 },
  peopleFollowBtn: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 999, backgroundColor: ACCENT, minWidth: 80, alignItems: 'center' },
  peopleFollowingBtn: { backgroundColor: withOpacity(ACCENT, 0.1), borderWidth: 1, borderColor: withOpacity(ACCENT, 0.3) },
  peopleFollowTxt: { fontSize: 12, fontWeight: '700', color: Colors.white },
  peopleFollowingTxt: { color: ACCENT },

  modalSubTabs: { flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 8, gap: 8, borderBottomWidth: 1, borderBottomColor: BORDER },
  modalSubTab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingVertical: 8, borderRadius: 999, backgroundColor: withOpacity(Colors.primaryDark, 0.04), borderWidth: 1, borderColor: withOpacity(Colors.primaryDark, 0.08) },
  modalSubTabActive: { backgroundColor: BRAND, borderColor: BRAND },
  modalSubTabTxt: { fontSize: 12, fontWeight: '700', color: MUTED },
  modalSubTabTxtActive: { color: Colors.white },
});
