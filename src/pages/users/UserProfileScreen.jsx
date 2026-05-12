// src/pages/users/UserProfileScreen.jsx
import React, {
  useState, useEffect, useRef, useCallback, useMemo, memo,
} from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Image,
  FlatList, Modal, ActivityIndicator, RefreshControl,
  StatusBar, Dimensions, Animated, Alert, ScrollView,
  ActionSheetIOS, Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../../AuthContext';
import FeedCard from '../home/feeds/feedcard.jsx';
import CommentModal from '../home/feeds/comments/commentmodal.jsx';
import { Colors } from '../../theme/colors';
import { blockUser } from '../../api/feedApi';

const withOpacity = (hex, opacity) => {
  const normalized = (hex || "").replace("#", "");
  const alpha = Math.round(Math.max(0, Math.min(1, opacity)) * 255).toString(16).padStart(2, "0");
  return `#${normalized}${alpha}`;
};

const { width: SCREEN_W } = Dimensions.get('window');
const BASE_URL  = 'https://hafrik.com';
const CELL_SIZE = Math.floor((SCREEN_W - 6) / 3);
const COVER_H   = 210;
const AVATAR_S  = 90;
const AVATAR_OVERLAP = 44;

const BRAND  = Colors.primaryDark;
const ACCENT = Colors.primary;
const DARK   = Colors.deepSlate;
const MUTED  = Colors.secondaryText;
const BG     = '#eef6f7';
const BORDER = withOpacity(Colors.primaryDark, 0.09);
const TABS   = ['posts', 'reels', 'media', 'followers', 'communities'];

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

const getMediaThumb = (post) => {
  const first = post?.media?.[0] ?? null;
  if (!first) return { uri: null, isVideo: false };
  if (first.type === 'photo')              return { uri: first.url,                           isVideo: false };
  if (first.type === 'video' || first.type === 'reel')
                                            return { uri: first.thumbnail ?? first.video_url, isVideo: true  };
  return { uri: null, isVideo: false };
};

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
      <View style={ss.groupBannerWrap}>
        {hasRealImg(banner)
          ? <Image source={{ uri: banner }} style={ss.groupBanner} resizeMode="cover" />
          : <LinearGradient colors={[BRAND, ACCENT]} style={ss.groupBanner}>
              <Ionicons name="people" size={28} color={withOpacity(Colors.white, 0.4)} />
            </LinearGradient>
        }
        <LinearGradient
          colors={['transparent', withOpacity(Colors.black, 0.5)]}
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
        />
      </View>
      <View style={ss.groupBody}>
        <View style={ss.groupAvatarWrap}>
          {hasRealImg(avatar)
            ? <Image source={{ uri: avatar }} style={ss.groupAvatar} />
            : <View style={[ss.groupAvatar, ss.groupAvatarFallback]}>
                <Ionicons name="people-outline" size={18} color={ACCENT} />
              </View>
          }
        </View>
        <View style={{ flex: 1 }}>
          <Text numberOfLines={1} style={ss.groupName}>{name}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }}>
            <Ionicons name="people-outline" size={11} color={MUTED} />
            <Text style={ss.groupSub}>{members} members</Text>
          </View>
        </View>
        <View style={ss.viewChip}><Text style={ss.viewChipTxt}>View</Text></View>
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
        : <View style={[ss.pageAvatar, ss.pageAvatarFallback]}>
            <Ionicons name="business-outline" size={22} color={ACCENT} />
          </View>
      }
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
          <Text numberOfLines={1} style={ss.pageName}>{name}</Text>
          {!!item?.verified && <Ionicons name="checkmark-circle" size={14} color={ACCENT} />}
        </View>
        {!!cat && <Text style={ss.pageCat}>{cat}</Text>}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 3 }}>
          <Ionicons name="people-outline" size={11} color={MUTED} />
          <Text style={ss.pageSub}>{followers} followers</Text>
        </View>
      </View>
      <View style={ss.viewChip}><Text style={ss.viewChipTxt}>Visit</Text></View>
    </TouchableOpacity>
  );
});

// ── Person row ────────────────────────────────────────────────────────────────
const PeopleRow = memo(({ item, onPress, onFollow }) => {
  const name   = decodeHtml(item?.full_name ?? item?.username ?? 'User');
  const handle = item?.username ?? '';
  const avatar = item?.avatar ?? null;
  const isFollowing    = item?._isFollowing;
  const isLoadingFollow = item?._followLoading;
  return (
    <TouchableOpacity style={ss.peopleRow} activeOpacity={0.88} onPress={onPress}>
      {hasRealImg(avatar)
        ? <Image source={{ uri: avatar }} style={ss.peopleAvatar} />
        : <View style={[ss.peopleAvatar, ss.peopleAvatarFallback]}>
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
  const mountedRef = useRef(true);

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
            <TouchableOpacity onPress={onClose} style={ss.modalClose}>
              <Ionicons name="close" size={18} color={DARK} />
            </TouchableOpacity>
          </View>
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
            ListFooterComponent={loading ? <ActivityIndicator size="small" color={BRAND} style={{ padding: 16 }} /> : null}
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

const TAB_CONFIG = [
  { key: 'posts',       label: 'Posts',       icon: 'grid-outline',    activeIcon: 'grid'            },
  { key: 'reels',       label: 'Reels',       icon: 'play-circle-outline', activeIcon: 'play-circle' },
  { key: 'media',       label: 'Photos',      icon: 'image-outline',   activeIcon: 'image'           },
  { key: 'followers',   label: 'People',      icon: 'people-outline',  activeIcon: 'people'          },
  { key: 'communities', label: 'Communities', icon: 'globe-outline',   activeIcon: 'globe'           },
];

// ── MAIN SCREEN ───────────────────────────────────────────────────────────────
export default function UserProfileScreen({ navigation, route }) {
  const { token, user: authUser } = useAuth();
  const insets = useSafeAreaInsets();
  const userId = route?.params?.userId;

  const [profile,     setProfile]     = useState(null);
  const [profileLoad, setProfileLoad] = useState(true);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followLoad,  setFollowLoad]  = useState(false);

  const tabState = useRef(
    Object.fromEntries(TABS.filter(t => t !== 'followers').map(t => [t, makeTabState()]))
  );
  const [activeTab, setActiveTab] = useState('posts');
  const [, forceUpdate] = useState(0);
  const bump = useCallback(() => forceUpdate(n => n + 1), []);

  const [peopleModal, setPeopleModal] = useState(null);

  const [followersSubTab, setFollowersSubTab] = useState('followers');
  const [followersList,   setFollowersList]   = useState([]);
  const [followersLoading, setFollowersLoading] = useState(false);

  const followStateRef = useRef({ isFollowing: false, followLoad: false });
  followStateRef.current = { isFollowing, followLoad };

  const scrollY       = useRef(new Animated.Value(0)).current;
  const headerOpacity = scrollY.interpolate({ inputRange: [COVER_H - 60, COVER_H], outputRange: [0, 1], extrapolate: 'clamp' });
  const coverScale    = scrollY.interpolate({ inputRange: [-80, 0], outputRange: [1.3, 1], extrapolate: 'clamp' });

  const [refreshing, setRefreshing] = useState(false);

  // ── Fetch profile ──────────────────────────────────────────────────────────
  const fetchProfile = useCallback(async () => {
    if (!userId) return;
    try {
      const res  = await fetch(
        BASE_URL + '/api/v1/users/profile.php?user_id=' + userId,
        { headers: { Authorization: 'Bearer ' + token } },
      );
      if (res.status === 401) { navigation.replace('Login'); return; }
      const json    = await res.json();
      const payload = json?.data ?? json;
      const user    = payload?.user ?? payload ?? null;
      const counts  = payload?.counts ?? {};
      const viewer  = payload?.viewer ?? {};
      const merged  = {
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

  // ── Block user ─────────────────────────────────────────────────────────────
  const handleBlockUser = useCallback(() => {
    const options = ['Block User', 'Cancel'];
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        { options, destructiveButtonIndex: 0, cancelButtonIndex: 1 },
        (idx) => {
          if (idx === 0) confirmBlock();
        },
      );
    } else {
      confirmBlock();
    }

    function confirmBlock() {
      Alert.alert(
        'Block User',
        `Block ${displayName}? They will no longer be able to see your posts or interact with you.`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Block',
            style: 'destructive',
            onPress: async () => {
              try {
                await blockUser(userId);
                Alert.alert('Blocked', 'User has been blocked.', [
                  { text: 'OK', onPress: () => navigation.goBack() },
                ]);
              } catch {
                Alert.alert('Error', 'Could not block user. Please try again.');
              }
            },
          },
        ],
      );
    }
  }, [userId, displayName, navigation]);

  // ── Chat / Message ─────────────────────────────────────────────────────────
  const [chatLoading, setChatLoading] = useState(false);

  const startChat = useCallback(async () => {
    if (!userId || chatLoading) return;
    setChatLoading(true);
    try {
      const res  = await fetch(BASE_URL + '/api/v1/messages/start.php', {
        method: 'POST',
        headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId }),
      });
      const json  = await res.json();
      const convId =
        json?.data?.conversation_id ??
        json?.data?.id              ??
        json?.conversation_id       ??
        json?.id                    ?? null;

      if (convId) {
        const chatUser = {
          id:           profile?.id ?? userId,
          user_id:      profile?.id ?? userId,
          full_name:    profile?.full_name  ?? null,
          username:     profile?.username   ?? null,
          user_name:    profile?.username   ?? null,
          avatar:       profile?.avatar     ?? null,
          user_picture: profile?.avatar     ?? null,
        };
        setChatLoading(false);
        navigation.navigate('Thread', { conversationId: convId, otherUser: chatUser });
      } else {
        setChatLoading(false);
        Alert.alert('Error', json?.message ?? 'Could not start conversation. Please try again.');
      }
    } catch {
      setChatLoading(false);
      Alert.alert('Error', 'Network error. Please try again.');
    }
  }, [userId, token, profile, chatLoading, navigation]);

  // ── Fetch followers tab ────────────────────────────────────────────────────
  const fetchFollowersTab = useCallback(async (subTab) => {
    if (!userId) return;
    setFollowersLoading(true);
    try {
      const ep  = subTab === 'following' ? 'user_following.php' : 'user_followers.php';
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
    reels:       '/api/v1/users/user_media.php?user_id=' + userId + '&limit=30',
    media:       '/api/v1/users/user_media.php?user_id=' + userId + '&limit=30',
    communities: '/api/v1/users/user_communities.php?user_id=' + userId + '&limit=10',
    pages:       '/api/v1/users/user_pages.php?user_id='       + userId + '&limit=10',
  }), [userId]);

  // ── Fetch tab ──────────────────────────────────────────────────────────────
  const fetchTab = useCallback(async (tab, pg = 1) => {
    if (tab === 'followers') return;
    const s = tabState.current[tab];
    if (!s || s.loading) return;
    if (pg > 1 && !s.hasMore) return;
    s.loading = true;
    bump();
    try {
      const url  = BASE_URL + ENDPOINTS[tab] + '&page=' + pg;
      const res  = await fetch(url, { headers: { Authorization: 'Bearer ' + token } });
      const text = await res.text();
      if (!res.ok || text.trimStart().startsWith('<')) {
        s.hasMore = false; s.loading = false; bump(); return;
      }
      const json    = JSON.parse(text);
      const wrapper = json?.data;
      let list      = Array.isArray(wrapper?.data)   ? wrapper.data
                    : Array.isArray(wrapper?.feeds)  ? wrapper.feeds
                    : Array.isArray(wrapper?.items)  ? wrapper.items
                    : Array.isArray(wrapper)         ? wrapper
                    : [];

      if (tab === 'reels') {
        list = list.filter(item => {
          const t = (item?.type ?? '').toLowerCase();
          return t === 'reel' || t === 'video';
        });
      }

      const totalPages = wrapper?.total_pages != null ? Number(wrapper.total_pages) : null;
      if (list.length === 0) {
        s.hasMore = false;
      } else {
        s.data       = pg === 1 ? list : [...s.data, ...list];
        s.page       = pg;
        s.totalPages = totalPages;
        s.hasMore    = totalPages != null ? pg < totalPages : list.length >= 5;
      }
    } catch (e) { console.warn('fetchTab(' + tab + ')', e); s.hasMore = false; }
    s.loading = false;
    bump();
  }, [ENDPOINTS, token, bump]);

  useEffect(() => {
    if (activeTab === 'followers') return;
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
  const _locRaw  = profile?.location;
  const location = typeof _locRaw === 'string'
    ? _locRaw
    : (_locRaw && typeof _locRaw === 'object')
      ? (_locRaw.current_city ?? _locRaw.hometown ?? '')
      : (profile?.city ?? '');
  const postsCount  = fmtCount(profile?.posts_count ?? 0);
  const follCount   = fmtCount(profile?.followers_count ?? 0);
  const followCount = fmtCount(profile?.following_count ?? 0);
  const isVerified  = !!(profile?.verified ?? profile?.is_verified);
  const isOwn       = !!(profile?.is_owner ?? (authUser?.id && profile?.id && String(authUser.id) === String(profile.id)));

  const ts      = activeTab !== 'followers' && tabState.current[activeTab] ? tabState.current[activeTab] : { data: [], loading: false, hasMore: false, page: 1 };
  const tabData = activeTab === 'followers' ? followersList : ts.data;
  const isGrid  = activeTab === 'media' || activeTab === 'reels';
  const isFollowersTab = activeTab === 'followers';

  const [visiblePostId, setVisiblePostId] = useState(null);
  const activeTabRef = useRef(activeTab);

  useEffect(() => {
    activeTabRef.current = activeTab;
    if (activeTab !== 'posts') setVisiblePostId(null);
  }, [activeTab]);

  const onViewableItemsChanged = useRef(({ viewableItems }) => {
    if (activeTabRef.current !== 'posts') { setVisiblePostId(null); return; }
    const nextVisibleId = viewableItems.find((e) => e?.isViewable && e?.item?.id)?.item?.id ?? null;
    setVisiblePostId((prev) => (prev === nextVisibleId ? prev : nextVisibleId));
  });

  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 70, waitForInteraction: false });

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
            navigation.navigate('Reels2', { initialReels: [item], startIndex: 0, initialReelId: item.id });
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
        if (uid) navigation.push('UserProfile', { userId: uid });
      }}
    />
  ), [navigation, authUser, handleFollowInList]);

  const renderItem = activeTab === 'posts'       ? renderPost
                   : activeTab === 'reels'        ? renderMedia
                   : activeTab === 'media'        ? renderMedia
                   : activeTab === 'followers'    ? renderFollower
                   : activeTab === 'communities'  ? renderCommunity
                   : renderPage;

  // ── List header ────────────────────────────────────────────────────────────
  const ListHeader = useCallback(() => (
    <View>
      {/* ── Cover photo area ── */}
      <View style={[ss.coverArea, { paddingTop: insets.top + 10 }]}>
        <View style={ss.coverBlobOne} pointerEvents="none" />
        <View style={ss.coverBlobTwo} pointerEvents="none" />
        <Animated.View style={[ss.coverImgWrap, { transform: [{ scale: coverScale }] }]}>
          {hasRealImg(cover)
            ? <Image source={{ uri: cover }} style={ss.coverImg} resizeMode="cover" />
            : <LinearGradient
                colors={[BRAND, withOpacity(BRAND, 0.7), ACCENT]}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                style={ss.coverImg}
              />
          }
        </Animated.View>
        {/* Gradient overlay for legibility */}
        <LinearGradient
          colors={[withOpacity(BRAND, 0.15), withOpacity(BRAND, 0.46), withOpacity(Colors.black, 0.72)]}
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
        />
        {/* Back button */}
        <TouchableOpacity style={[ss.backBtn, { marginTop: insets.top > 0 ? 8 : 12 }]} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={20} color={Colors.white} />
        </TouchableOpacity>
        <View style={[ss.coverBadge, { marginTop: insets.top > 0 ? 8 : 12 }]}>
          <Ionicons name="person-circle-outline" size={13} color={Colors.white} />
          <Text style={ss.coverBadgeTxt}>Hafrik Profile</Text>
        </View>
      </View>

      {/* ── Floating profile card ── */}
      <View style={ss.infoCard}>
        {/* Avatar — overlaps cover */}
        <View style={ss.avatarArea}>
          <View style={ss.avatarRing}>
            {profileLoad
              ? <View style={[ss.avatar, { backgroundColor: Colors.neutral175 }]} />
              : hasRealImg(avatar)
                ? <Image source={{ uri: avatar }} style={ss.avatar} />
                : <View style={[ss.avatar, ss.avatarFallback]}>
                    <Ionicons name="person" size={36} color={ACCENT} />
                  </View>
            }
          </View>
          {/* Verified badge floating on avatar */}
          {isVerified && (
            <View style={ss.verifiedBadge}>
              <Ionicons name="checkmark-circle" size={20} color={ACCENT} />
            </View>
          )}
        </View>

        {/* Name + handle */}
        <View style={ss.nameRow}>
          <Text style={ss.displayName}>{profileLoad ? '—' : displayName}</Text>
        </View>
        {!!handle && <Text style={ss.handleTxt}>@{handle}</Text>}

        <View style={ss.profilePillRow}>
          {isVerified && (
            <View style={ss.profilePill}>
              <Ionicons name="checkmark-circle" size={13} color={ACCENT} />
              <Text style={ss.profilePillTxt}>Verified</Text>
            </View>
          )}
          {isFollowing && !isOwn && (
            <View style={ss.profilePill}>
              <Ionicons name="people-circle-outline" size={13} color={ACCENT} />
              <Text style={ss.profilePillTxt}>Following</Text>
            </View>
          )}
          {!!location && (
            <View style={ss.profilePill}>
              <Ionicons name="location-outline" size={13} color={ACCENT} />
              <Text style={ss.profilePillTxt} numberOfLines={1}>{location}</Text>
            </View>
          )}
        </View>

        {/* Bio */}
        {!!bio && <Text style={ss.bio}>{bio}</Text>}

        {/* Stats */}
        <View style={ss.statsRow}>
          <TouchableOpacity style={ss.statBox} onPress={() => {}}>
            <Text style={ss.statValue}>{postsCount}</Text>
            <Text style={ss.statLabel}>Posts</Text>
          </TouchableOpacity>
          <View style={ss.statDivider} />
          <TouchableOpacity style={ss.statBox} onPress={() => setActiveTab('followers')}>
            <Text style={ss.statValue}>{follCount}</Text>
            <Text style={ss.statLabel}>Followers</Text>
          </TouchableOpacity>
          <View style={ss.statDivider} />
          <TouchableOpacity style={ss.statBox} onPress={() => { setFollowersSubTab('following'); setActiveTab('followers'); }}>
            <Text style={ss.statValue}>{followCount}</Text>
            <Text style={ss.statLabel}>Following</Text>
          </TouchableOpacity>
        </View>

        {/* CTA buttons */}
        {!isOwn && !profileLoad && (
          <View style={ss.actionRow}>
            <TouchableOpacity
              style={[ss.followBtn, isFollowing && ss.followingBtn]}
              activeOpacity={0.85}
              onPress={toggleFollow}
              disabled={followLoad}
            >
              {followLoad ? (
                <ActivityIndicator size="small" color={isFollowing ? BRAND : Colors.white} />
              ) : (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Ionicons
                    name={isFollowing ? 'checkmark' : 'person-add-outline'}
                    size={16}
                    color={isFollowing ? BRAND : Colors.white}
                  />
                  <Text style={[ss.followBtnTxt, isFollowing && ss.followingBtnTxt]}>
                    {isFollowing ? 'Following' : 'Follow'}
                  </Text>
                </View>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={ss.msgBtn}
              activeOpacity={0.85}
              onPress={startChat}
              disabled={chatLoading}
            >
              {chatLoading
                ? <ActivityIndicator size="small" color={BRAND} />
                : <>
                    <Ionicons name="chatbubble-ellipses-outline" size={16} color={BRAND} />
                    <Text style={ss.msgBtnTxt}>Message</Text>
                  </>
              }
            </TouchableOpacity>

            <TouchableOpacity
              style={ss.moreBtn}
              activeOpacity={0.85}
              onPress={handleBlockUser}
            >
              <Ionicons name="ellipsis-horizontal" size={18} color={BRAND} />
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* ── Tab bar ── */}
      <View style={ss.tabsBar}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={ss.tabsScroll}>
          {TAB_CONFIG.map(({ key, label, icon, activeIcon }) => {
            const active = activeTab === key;
            return (
              <TouchableOpacity
                key={key}
                style={[ss.tabBtn, active && ss.tabBtnActive]}
                onPress={() => setActiveTab(key)}
                activeOpacity={0.7}
              >
                <Ionicons name={active ? activeIcon : icon} size={16} color={active ? Colors.white : MUTED} />
                <Text style={[ss.tabTxt, active && ss.tabTxtActive]}>{label}</Text>
                {active && <View style={ss.tabUnderline} />}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
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
                <Text style={[ss.followersSubTabTxt, isActive && ss.followersSubTabTxtActive]}>
                  {st.charAt(0).toUpperCase() + st.slice(1)}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      )}
    </View>
  ), [
    profile, profileLoad, activeTab, isFollowing, followLoad, isOwn,
    insets.top, toggleFollow, startChat, chatLoading, navigation, coverScale,
    cover, avatar, displayName, handle, bio, location, postsCount, follCount,
    followCount, isVerified, followersSubTab,
  ]); // eslint-disable-line

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <View style={ss.root}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      {/* Sticky compact header — fades in as user scrolls past cover */}
      <Animated.View style={[ss.stickyHeader, { paddingTop: insets.top + 8, opacity: headerOpacity }]}>
        <TouchableOpacity style={ss.stickyBack} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={18} color={Colors.white} />
        </TouchableOpacity>
        <Text style={ss.stickyName} numberOfLines={1}>{displayName}</Text>
        <View style={{ width: 38 }} />
      </Animated.View>

      <Animated.FlatList
        key={activeTab + (isGrid ? '-3' : '-1')}
        data={tabData}
        keyExtractor={(item, i) => String(item?.id ?? item?.user_id ?? i)}
        numColumns={isGrid ? 3 : 1}
        ListHeaderComponent={ListHeader}
        renderItem={renderItem}
        ListEmptyComponent={
          tabData.length === 0
            ? ((isFollowersTab ? followersLoading : ts.loading)
                ? <ActivityIndicator size="small" color={BRAND} style={{ marginTop: 36 }} />
                : (
                  <View style={ss.emptyWrap}>
                    <View style={ss.emptyIcon}>
                      <Ionicons name={isFollowersTab ? "people-outline" : activeTab === 'reels' ? "play-circle-outline" : "file-tray-outline"} size={34} color={MUTED} />
                    </View>
                    <Text style={ss.emptyTitle}>
                      {isFollowersTab
                        ? (followersSubTab === 'followers' ? 'No followers yet' : 'Not following anyone')
                        : 'Nothing here yet'}
                    </Text>
                    <Text style={ss.emptySubtitle}>Content will appear here when available</Text>
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
      <CommentModal />
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const ss = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },

  // ── Sticky header ──────────────────────────────────────────────────────────
  stickyHeader: {
    position: 'absolute', top: 0, left: 0, right: 0, zIndex: 20,
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: withOpacity(BRAND, 0.96),
    paddingHorizontal: 14, paddingBottom: 12,
    shadowColor: BRAND, shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.22, shadowRadius: 12, elevation: 8,
  },
  stickyBack: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: withOpacity(Colors.white, 0.16),
    alignItems: 'center', justifyContent: 'center',
  },
  stickyName: { flex: 1, fontSize: 16, fontWeight: '900', color: Colors.white, textAlign: 'center', marginHorizontal: 8 },

  // ── Cover ──────────────────────────────────────────────────────────────────
  coverArea: {
    height: COVER_H + 34,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: BRAND,
  },
  coverBlobOne: {
    position: 'absolute', right: -64, top: -42,
    width: 210, height: 210, borderRadius: 105,
    backgroundColor: withOpacity(Colors.white, 0.08),
    zIndex: 1,
  },
  coverBlobTwo: {
    position: 'absolute', left: -58, bottom: 8,
    width: 160, height: 160, borderRadius: 80,
    backgroundColor: withOpacity(ACCENT, 0.22),
    zIndex: 1,
  },
  coverImgWrap: {
    ...StyleSheet.absoluteFillObject,
  },
  coverImg: {
    width: '100%',
    height: '100%',
  },
  backBtn: {
    position: 'absolute',
    top: 12, left: 16,
    width: 42, height: 42,
    borderRadius: 16,
    backgroundColor: withOpacity(Colors.white, 0.18),
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1,
    borderColor: withOpacity(Colors.white, 0.22),
    zIndex: 3,
  },
  coverBadge: {
    position: 'absolute',
    top: 12, right: 16,
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: withOpacity(Colors.white, 0.16),
    borderWidth: 1,
    borderColor: withOpacity(Colors.white, 0.22),
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 9,
    zIndex: 3,
  },
  coverBadgeTxt: { color: Colors.white, fontSize: 11, fontWeight: '900', letterSpacing: 0.5 },

  // ── Info card ──────────────────────────────────────────────────────────────
  infoCard: {
    backgroundColor: Colors.white,
    marginHorizontal: 14,
    marginTop: -42,
    paddingHorizontal: 18,
    paddingBottom: 16,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: withOpacity(BRAND, 0.08),
    shadowColor: BRAND,
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 8,
  },

  // ── Avatar ─────────────────────────────────────────────────────────────────
  avatarArea: {
    marginTop: -(AVATAR_OVERLAP),
    alignSelf: 'flex-start',
    marginBottom: 14,
  },
  avatarRing: {
    width:  AVATAR_S + 10,
    height: AVATAR_S + 10,
    borderRadius: (AVATAR_S + 10) / 2,
    backgroundColor: ACCENT,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    borderColor: Colors.white,
    shadowColor: ACCENT,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.28,
    shadowRadius: 16,
    elevation: 10,
  },
  avatar: {
    width: AVATAR_S, height: AVATAR_S,
    borderRadius: AVATAR_S / 2,
  },
  avatarFallback: {
    backgroundColor: withOpacity(ACCENT, 0.1),
    alignItems: 'center', justifyContent: 'center',
  },
  verifiedBadge: {
    position: 'absolute',
    bottom: 2, right: -4,
    backgroundColor: Colors.white,
    borderRadius: 14,
    padding: 2,
    shadowColor: ACCENT,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.18,
    shadowRadius: 6,
    elevation: 3,
  },

  // ── Name / handle / bio ────────────────────────────────────────────────────
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 },
  displayName: { fontSize: 24, fontWeight: '900', color: DARK, letterSpacing: -0.6 },
  handleTxt:   { fontSize: 13.5, color: ACCENT, marginBottom: 10, fontWeight: '800' },
  profilePillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 10,
  },
  profilePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    maxWidth: '100%',
    backgroundColor: withOpacity(ACCENT, 0.1),
    borderWidth: 1,
    borderColor: withOpacity(ACCENT, 0.18),
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  profilePillTxt: { color: BRAND, fontSize: 11.5, fontWeight: '800' },
  bio: {
    fontSize: 14.5, color: withOpacity(DARK, 0.84), lineHeight: 22,
    marginBottom: 10,
  },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 8 },
  locationTxt: { fontSize: 12.5, color: MUTED },

  // ── Stats ──────────────────────────────────────────────────────────────────
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: BRAND,
    borderRadius: 22,
    paddingVertical: 15,
    marginVertical: 14,
    borderWidth: 1,
    borderColor: withOpacity(Colors.white, 0.1),
    shadowColor: BRAND,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.16,
    shadowRadius: 14,
    elevation: 5,
  },
  statBox:    { flex: 1, alignItems: 'center' },
  statDivider: { width: 1, height: 30, backgroundColor: withOpacity(Colors.white, 0.16) },
  statValue:  { fontSize: 20, fontWeight: '900', color: Colors.white, letterSpacing: -0.5 },
  statLabel:  { fontSize: 11.5, color: withOpacity(Colors.white, 0.68), marginTop: 2, fontWeight: '700' },

  // ── Action buttons ─────────────────────────────────────────────────────────
  actionRow: { flexDirection: 'row', gap: 10, marginBottom: 2 },
  followBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 13, borderRadius: 16,
    backgroundColor: BRAND, gap: 6,
    shadowColor: BRAND, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.24, shadowRadius: 14, elevation: 5,
  },
  followingBtn: {
    backgroundColor: withOpacity(BRAND, 0.07),
    shadowOpacity: 0, elevation: 0,
    borderWidth: 1.5, borderColor: withOpacity(BRAND, 0.2),
  },
  followBtnTxt:    { fontSize: 14.5, fontWeight: '800', color: Colors.white },
  followingBtnTxt: { color: BRAND },
  msgBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 13, borderRadius: 16, gap: 6,
    backgroundColor: withOpacity(BRAND, 0.06),
    borderWidth: 1.5, borderColor: withOpacity(BRAND, 0.16),
  },
  msgBtnTxt: { fontSize: 14.5, fontWeight: '700', color: BRAND },
  moreBtn: {
    width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center',
    backgroundColor: withOpacity(BRAND, 0.06),
    borderWidth: 1.5, borderColor: withOpacity(BRAND, 0.16),
  },

  // ── Tab bar ────────────────────────────────────────────────────────────────
  tabsBar: {
    backgroundColor: BG,
    paddingTop: 14,
    paddingBottom: 6,
  },
  tabsScroll: { paddingHorizontal: 14, gap: 8 },
  tabBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingHorizontal: 14, paddingVertical: 10,
    position: 'relative',
    backgroundColor: Colors.white,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: withOpacity(BRAND, 0.08),
  },
  tabBtnActive: {
    backgroundColor: BRAND,
    borderColor: BRAND,
    shadowColor: BRAND,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.14,
    shadowRadius: 10,
    elevation: 3,
  },
  tabTxt:       { fontSize: 13, fontWeight: '700', color: MUTED },
  tabTxtActive: { color: Colors.white },
  tabUnderline: {
    position: 'absolute', bottom: -6, left: '30%', right: '30%', height: 3,
    backgroundColor: ACCENT, borderRadius: 99,
  },

  // ── Followers sub-tabs ─────────────────────────────────────────────────────
  followersSubTabs: {
    flexDirection: 'row', paddingHorizontal: 14, paddingVertical: 10, gap: 10,
    backgroundColor: BG,
  },
  followersSubTab: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    paddingVertical: 9, borderRadius: 10,
    backgroundColor: Colors.white,
    borderWidth: 1, borderColor: withOpacity(BRAND, 0.08),
  },
  followersSubTabActive: { backgroundColor: BRAND, borderColor: BRAND },
  followersSubTabTxt: { fontSize: 13, fontWeight: '700', color: MUTED },
  followersSubTabTxtActive: { color: Colors.white },

  // ── Media grid ─────────────────────────────────────────────────────────────
  mediaCell: { width: CELL_SIZE, height: CELL_SIZE, margin: 1 },
  mediaCellImg:      { width: '100%', height: '100%' },
  mediaCellFallback: { flex: 1, backgroundColor: Colors.neutral175, alignItems: 'center', justifyContent: 'center' },
  mediaCellPlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: withOpacity(Colors.black, 0.18),
  },

  // ── Community card ─────────────────────────────────────────────────────────
  groupCard: {
    backgroundColor: Colors.white, borderRadius: 16,
    marginHorizontal: 14, marginTop: 12,
    borderWidth: 1, borderColor: BORDER,
    overflow: 'hidden',
    shadowColor: Colors.black, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2,
  },
  groupBannerWrap: { width: '100%', height: 90, overflow: 'hidden' },
  groupBanner:     { width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' },
  groupBody: { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12 },
  groupAvatarWrap: { marginTop: -30 },
  groupAvatar: {
    width: 48, height: 48, borderRadius: 14,
    borderWidth: 2.5, borderColor: Colors.white,
  },
  groupAvatarFallback: { backgroundColor: withOpacity(ACCENT, 0.12), alignItems: 'center', justifyContent: 'center' },
  groupName: { fontSize: 14.5, fontWeight: '800', color: DARK },
  groupSub:  { fontSize: 12, color: MUTED },

  // ── Page card ──────────────────────────────────────────────────────────────
  pageCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: Colors.white, borderRadius: 16,
    marginHorizontal: 14, marginTop: 12,
    padding: 14, borderWidth: 1, borderColor: BORDER,
    shadowColor: BRAND, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.06, shadowRadius: 12, elevation: 2,
  },
  pageAvatar: { width: 54, height: 54, borderRadius: 14 },
  pageAvatarFallback: { backgroundColor: withOpacity(ACCENT, 0.12), alignItems: 'center', justifyContent: 'center' },
  pageName: { fontSize: 14.5, fontWeight: '800', color: DARK, flex: 1 },
  pageCat:  { fontSize: 11.5, color: ACCENT, marginTop: 2, fontWeight: '600' },
  pageSub:  { fontSize: 12, color: MUTED },

  // ── Shared chip ───────────────────────────────────────────────────────────
  viewChip: {
    paddingHorizontal: 14, paddingVertical: 7,
    backgroundColor: withOpacity(BRAND, 0.07),
    borderRadius: 999, borderWidth: 1, borderColor: withOpacity(BRAND, 0.12),
  },
  viewChipTxt: { fontSize: 12, fontWeight: '700', color: BRAND },

  // ── People row ─────────────────────────────────────────────────────────────
  peopleRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    marginHorizontal: 14,
    marginTop: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: withOpacity(BRAND, 0.08),
    backgroundColor: Colors.white,
    shadowColor: BRAND,
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 1,
  },
  peopleAvatar: { width: 46, height: 46, borderRadius: 23 },
  peopleAvatarFallback: { backgroundColor: withOpacity(ACCENT, 0.1), alignItems: 'center', justifyContent: 'center' },
  peopleName:   { fontSize: 14.5, fontWeight: '700', color: DARK },
  peopleHandle: { fontSize: 12.5, color: MUTED, marginTop: 2 },
  peopleFollowBtn: {
    paddingHorizontal: 16, paddingVertical: 8, borderRadius: 999,
    backgroundColor: BRAND, minWidth: 84, alignItems: 'center',
  },
  peopleFollowingBtn: { backgroundColor: withOpacity(ACCENT, 0.1), borderWidth: 1, borderColor: withOpacity(ACCENT, 0.3) },
  peopleFollowTxt:    { fontSize: 12.5, fontWeight: '700', color: Colors.white },
  peopleFollowingTxt: { color: ACCENT },

  // ── Empty states ───────────────────────────────────────────────────────────
  emptyWrap:     { alignItems: 'center', paddingTop: 52, paddingHorizontal: 32, gap: 10 },
  emptyIcon:     { width: 72, height: 72, borderRadius: 36, backgroundColor: withOpacity(ACCENT, 0.1), alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  emptyTitle:    { fontSize: 15.5, fontWeight: '800', color: DARK },
  emptySubtitle: { fontSize: 13, color: MUTED, textAlign: 'center', lineHeight: 19 },
  emptyTxt:      { fontSize: 14, color: MUTED },

  // ── Followers/following modal ──────────────────────────────────────────────
  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: withOpacity(Colors.black, 0.4) },
  modalSheet:   { backgroundColor: Colors.white, borderTopLeftRadius: 26, borderTopRightRadius: 26, maxHeight: '75%' },
  modalHandle:  { width: 36, height: 4, borderRadius: 2, backgroundColor: BORDER, alignSelf: 'center', marginTop: 10 },
  modalHeader:  {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: BORDER,
  },
  modalTitle:   { fontSize: 17, fontWeight: '900', color: DARK },
  modalClose:   { width: 32, height: 32, borderRadius: 16, backgroundColor: Colors.neutral150, alignItems: 'center', justifyContent: 'center' },
  modalSubTabs: { flexDirection: 'row', paddingHorizontal: 16, paddingTop: 10, paddingBottom: 6, gap: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: BORDER },
  modalSubTab: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    paddingVertical: 10, borderRadius: 10,
    backgroundColor: Colors.neutral150, borderWidth: 1, borderColor: withOpacity(BRAND, 0.08),
  },
  modalSubTabActive: { backgroundColor: BRAND, borderColor: BRAND },
  modalSubTabTxt: { fontSize: 13, fontWeight: '700', color: MUTED },
  modalSubTabTxtActive: { color: Colors.white },
});
