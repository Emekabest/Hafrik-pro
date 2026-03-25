// src/pages/notifications/NotificationsScreen.jsx
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  Image, Animated, RefreshControl, StatusBar, ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Swipeable } from 'react-native-gesture-handler';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../../AuthContext';
import useStore from '../../repository/store';
import * as Haptics from 'expo-haptics';
import { Colors } from '../../theme';
import { useTheme } from '../../theme/ThemeContext';

const BASE_URL = 'https://hafrik.com';
const BRAND    = Colors.primaryDark;
const ACCENT   = Colors.primary;
const DARK     = Colors.black;
const MUTED    = Colors.secondaryText;
const BG       = Colors.background;
const CARD     = Colors.white;
const DANGER   = Colors.destructive;
const WHITE    = Colors.white;

const TYPE_META = {
  follow:     { icon: 'person-add',       color: ACCENT,         bg: ACCENT + '1F',         label: 'followed you'            },
  react_like: { icon: 'heart',            color: DANGER,         bg: DANGER + '1F',         label: 'liked your post'         },
  like:       { icon: 'heart',            color: DANGER,         bg: DANGER + '1F',         label: 'liked your post'         },
  comment:    { icon: 'chatbubble',       color: ACCENT,         bg: ACCENT + '1F',         label: 'commented on your post'   },
  reply:      { icon: 'return-down-back', color: Colors.warning, bg: Colors.warning + '26', label: 'replied to your comment' },
  mention:    { icon: 'at',               color: Colors.link,    bg: Colors.link + '1F',    label: 'mentioned you'             },
  message:    { icon: 'paper-plane',      color: Colors.link,    bg: Colors.link + '1F',    label: 'sent you a message'      },
  share:      { icon: 'arrow-redo',       color: ACCENT,         bg: ACCENT + '1F',         label: 'shared your post'        },
  system:     { icon: 'megaphone',        color: '#F59E0B',      bg: '#F59E0B1F',           label: 'system alert'            },
  admin:      { icon: 'shield-checkmark', color: '#8B5CF6',      bg: '#8B5CF61F',           label: 'from Hafrik'             },
  default:    { icon: 'notifications',    color: BRAND,          bg: BRAND + '1F',          label: 'sent a notification'      },
};
const getMeta = (action) =>
  TYPE_META[String(action ?? '').toLowerCase()] ?? TYPE_META.default;

const FILTER_TABS = [
  { id: 'All',      label: 'All',      icon: 'layers-outline'           },
  { id: 'Unread',   label: 'Unread',   icon: 'radio-button-on-outline'  },
  { id: 'Mentions', label: 'Mentions', icon: 'at-outline'               },
  { id: 'Messages', label: 'Messages', icon: 'paper-plane-outline'      },
];

// ── Helpers ────────────────────────────────────────────────────────────────
const apiFetch = async (path, token, opts = {}) => {
  try {
    const res = await fetch(`${BASE_URL}${path}`, {
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
      ...opts,
    });
    return await res.json();
  } catch { return null; }
};

const timeAgo = (d) => {
  if (!d) return '';
  const s = Math.floor((Date.now() - new Date(d).getTime()) / 1000);
  if (s < 60)     return 'now';
  if (s < 3600)   return `${Math.floor(s / 60)}m`;
  if (s < 86400)  return `${Math.floor(s / 3600)}h`;
  if (s < 604800) return `${Math.floor(s / 86400)}d`;
  return `${Math.floor(s / 604800)}w`;
};

const sectionize = (items) => {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const yest  = new Date(today); yest.setDate(yest.getDate() - 1);
  const week  = new Date(today); week.setDate(week.getDate() - 7);
  const g = { Today: [], Yesterday: [], 'This week': [], Earlier: [] };
  items.forEach((n) => {
    const t = new Date(n.created_at ?? n.time ?? 0).getTime();
    if      (t >= today.getTime()) g['Today'].push(n);
    else if (t >= yest.getTime())  g['Yesterday'].push(n);
    else if (t >= week.getTime())  g['This week'].push(n);
    else                            g['Earlier'].push(n);
  });
  return Object.entries(g).filter(([, d]) => d.length > 0).map(([title, data]) => ({ title, data }));
};

// ── Inline avatar ─────────────────────────────────────────────────────────
const Avatar = ({ url, name, size = 47 }) => {
  const r = size / 2;
  if (url && url.length > 8) {
    return <Image source={{ uri: url }} style={{ width: size, height: size, borderRadius: r }} />;
  }
  return (
    <View style={{ width: size, height: size, borderRadius: r, backgroundColor: BRAND, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ color: Colors.white, fontWeight: '900', fontSize: size * 0.38 }}>
        {(name ?? 'U').slice(0, 1).toUpperCase()}
      </Text>
    </View>
  );
};

// ── Follow button inside a notification row ───────────────────────────────
const InlineFollowBtn = React.memo(({ userId, initialFollowing, token }) => {
  const [following, setFollowing] = useState(Boolean(initialFollowing));
  const [loading,   setLoading]   = useState(false);

  const toggle = useCallback(async () => {
    if (loading || !userId) return;
    Haptics.selectionAsync().catch(() => {});
    const next = !following;
    setFollowing(next);
    setLoading(true);
    try {
      const res = await fetch('https://hafrik.com/api/v1/users/follow.php', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId }),
      });
      const json = await res.json().catch(() => null);
      const serverFollowing = json?.data?.is_following ?? json?.is_following;
      if (serverFollowing !== undefined) setFollowing(Boolean(serverFollowing));
    } catch {
      setFollowing(!next); // rollback
    }
    setLoading(false);
  }, [userId, following, loading, token]);

  return (
    <TouchableOpacity
      style={[ns.followBtn, following && ns.followBtnActive]}
      activeOpacity={0.8}
      onPress={toggle}
      disabled={loading}
    >
      {loading
        ? <ActivityIndicator size="small" color={following ? Colors.white : ACCENT} />
        : <Text style={[ns.followBtnTxt, following && ns.followBtnTxtActive]}>
            {following ? 'Following' : 'Follow'}
          </Text>
      }
    </TouchableOpacity>
  );
});

// ── Notification row (TikTok-style) ──────────────────────────────────────
const NotifRow = React.memo(({ item, index, onDelete, token, currentUserId }) => {
  const navigation = useNavigation();
  const fade  = useRef(new Animated.Value(0)).current;
  const press = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.spring(fade, {
      toValue: 1, delay: Math.min(index * 35, 240),
      useNativeDriver: true, tension: 80, friction: 12,
    }).start();
  }, []);

  const action   = String(item.action ?? item.type ?? item.node_type ?? '').toLowerCase();
  const meta     = getMeta(action);
  const actor    = item.actor ?? item.from_user ?? item.user ?? {};
  const actorId  = actor?.id ?? actor?.user_id ?? item?.from_user_id ?? item?.user_id;
  const name     = actor.username ?? actor.full_name ?? actor.name ?? item.username ?? 'Someone';
  const avatar   = (actor.avatar ?? actor.user_picture ?? item.avatar ?? '').trim() || null;
  const unread   = !item.seen || item.seen === 0 || item.seen === '0';
  const ts       = timeAgo(item.created_at ?? item.time);
  const body     = item.message ?? item.text ?? item.notify_text ?? '';
  const postImg  = (() => { const v = item.post_image ?? item.postImage ?? item.post_thumbnail ?? null; return typeof v === 'string' && v.trim().length > 8 ? v.trim() : null; })();
  const notifId  = item.id ?? item.notification_id ?? item.notify_id;
  const isSystem = action === 'system' || action === 'admin' || !actorId;
  const isOwnNotif = actorId && String(actorId) === String(currentUserId);

  const handlePress = useCallback(() => {
    Animated.sequence([
      Animated.spring(press, { toValue: 0.97, useNativeDriver: true, tension: 300, friction: 10 }),
      Animated.spring(press, { toValue: 1,    useNativeDriver: true, tension: 300, friction: 10 }),
    ]).start();
    Haptics.selectionAsync().catch(() => {});
    if (action === 'follow') {
      if (actorId) navigation.navigate('UserProfile', { userId: actorId });
      return;
    }
    if (action === 'message') { navigation.navigate('Inbox'); return; }
    if (action === 'system' || action === 'admin') return;
    const pid = item.post_id ?? item.postId ?? item.node_id ?? item.notify_id;
    if (pid) navigation.navigate('PostDetail', { postId: pid });
  }, [action, actorId, item, navigation]);

  // System notifications have a different visual treatment
  if (isSystem) {
    const sysPid = item.post_id ?? item.postId ?? item.node_id ?? item.notify_id;
    return (
      <Animated.View style={{ opacity: fade, transform: [{ translateY: fade.interpolate({ inputRange: [0, 1], outputRange: [14, 0] }) }] }}>
        <Swipeable
          friction={2}
          overshootRight={false}
          renderRightActions={() => (
            <View style={ns.swipeBox}>
              <TouchableOpacity
                style={ns.swipeBtn}
                activeOpacity={0.9}
                onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {}); onDelete(notifId); }}
              >
                <Ionicons name="trash-outline" size={21} color={Colors.white} />
                <Text style={ns.swipeTxt}>Remove</Text>
              </TouchableOpacity>
            </View>
          )}
        >
          <TouchableOpacity
            activeOpacity={sysPid ? 0.7 : 1}
            onPress={() => { if (sysPid) navigation.navigate('PostDetail', { postId: sysPid }); }}
            style={[ns.systemRow, { borderLeftColor: meta.color }]}
          >
            <View style={[ns.systemIconWrap, { backgroundColor: meta.bg }]}>
              <Ionicons name={meta.icon} size={20} color={meta.color} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[ns.systemTitle, { color: meta.color }]}>{meta.label.toUpperCase()}</Text>
              <Text style={ns.systemBody} numberOfLines={3}>{body || 'A new alert from Hafrik.'}</Text>
            </View>
            <Text style={[ns.timeText, { marginLeft: 8, alignSelf: 'flex-start', marginTop: 2 }]}>{ts}</Text>
          </TouchableOpacity>
        </Swipeable>
      </Animated.View>
    );
  }

  return (
    <Animated.View style={{ opacity: fade, transform: [{ translateY: fade.interpolate({ inputRange: [0, 1], outputRange: [14, 0] }) }, { scale: press }] }}>
      <Swipeable
        friction={2}
        overshootRight={false}
        renderRightActions={() => (
          <View style={ns.swipeBox}>
            <TouchableOpacity
              style={ns.swipeBtn}
              activeOpacity={0.9}
              onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {}); onDelete(notifId); }}
            >
              <Ionicons name="trash-outline" size={21} color={Colors.white} />
              <Text style={ns.swipeTxt}>Remove</Text>
            </TouchableOpacity>
          </View>
        )}
      >
        <TouchableOpacity style={[ns.row, unread && ns.rowUnread]} activeOpacity={0.7} onPress={handlePress}>
          {unread && <View style={[ns.bar, { backgroundColor: meta.color }]} />}

          <View style={ns.avatarWrap}>
            <Avatar url={avatar} name={name} size={47} />
            <View style={[ns.actionBadge, { backgroundColor: meta.color }]}>
              <Ionicons name={meta.icon} size={9} color={Colors.white} />
            </View>
          </View>

          <View style={ns.textCol}>
            <View style={ns.topRow}>
              <Text style={ns.nameText} numberOfLines={1}>{name}</Text>
              <Text style={ns.timeText}>{ts}</Text>
            </View>
            <Text style={ns.bodyText} numberOfLines={2}>
              <Text style={ns.actionText}>{meta.label} </Text>
              {body && body !== meta.label ? body : ''}
            </Text>
          </View>

          {/* Follow button for follow-type, thumbnail/icon for others */}
          {action === 'follow' && !isOwnNotif ? (
            <InlineFollowBtn
              userId={actorId}
              initialFollowing={actor?.is_following ?? item?.is_following ?? false}
              token={token}
            />
          ) : postImg ? (
            <Image source={{ uri: postImg }} style={ns.postThumb} />
          ) : (
            <View style={[ns.iconBox, { backgroundColor: meta.bg }]}>
              <Ionicons name={meta.icon} size={16} color={meta.color} />
            </View>
          )}
        </TouchableOpacity>
      </Swipeable>
    </Animated.View>
  );
});

// ── Section label ────────────────────────────────────────────────────────
const SectionLabel = ({ title }) => (
  <View style={ns.sectionRow}><Text style={ns.sectionTxt}>{title}</Text></View>
);

// ── Empty state ───────────────────────────────────────────────────────────
const Empty = () => {
  const pulse = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    Animated.loop(Animated.sequence([
      Animated.timing(pulse, { toValue: 1.1, duration: 900, useNativeDriver: true }),
      Animated.timing(pulse, { toValue: 1,   duration: 900, useNativeDriver: true }),
    ])).start();
  }, []);
  return (
    <View style={ns.emptyWrap}>
      <Animated.View style={{ transform: [{ scale: pulse }] }}>
        <View style={[ns.emptyCircle, { backgroundColor: ACCENT + '1A' }]}>
          <Ionicons name="notifications-off-outline" size={46} color={MUTED} />
        </View>
      </Animated.View>
      <Text style={ns.emptyTitle}>All caught up!</Text>
      <Text style={ns.emptySub}>Your notifications will show up here.</Text>
    </View>
  );
};

// ── Filter bar ────────────────────────────────────────────────────────────
const FilterBar = ({ tabs, active, onChange, counts }) => (
  <View style={ns.filterBar}>
    {tabs.map((t) => {
      const on  = active === t.id;
      const cnt = counts[t.id] ?? 0;
      return (
        <TouchableOpacity key={t.id} onPress={() => onChange(t.id)} activeOpacity={0.8} style={ns.filterTab}>
          {on && <View style={ns.filterLine} />}
          <Ionicons name={t.icon} size={14} color={on ? ACCENT : WHITE + '66'} />
          <Text style={[ns.filterTxt, on && ns.filterTxtOn]}>{t.label}</Text>
          {cnt > 0 && !on && (
            <View style={ns.filterBadge}><Text style={ns.filterBadgeTxt}>{cnt > 9 ? '9+' : cnt}</Text></View>
          )}
        </TouchableOpacity>
      );
    })}
  </View>
);

// ── Main screen ───────────────────────────────────────────────────────────
export default function NotificationsScreen() {
  const navigation    = useNavigation();
  const { top }       = useSafeAreaInsets();
  const { token, user } = useAuth();
  const { colors: tc } = useTheme();
  const setNotifCount = useStore((s) => s.setNotificationCount);

  const [allItems,      setAllItems]      = useState([]);
  const [refreshing,    setRefreshing]    = useState(false);
  const [filter,        setFilter]        = useState('All');
  const [page,          setPage]          = useState(1);
  const [hasMore,       setHasMore]       = useState(true);
  const [loadingMore,   setLoadingMore]   = useState(false);
  const [apiUnreadCount, setApiUnreadCount] = useState(0);
  const hdrAnim = useRef(new Animated.Value(0)).current;

  const fetchCount = useCallback(async () => {
    const res = await apiFetch('/api/v1/notifications/count.php', token);
    const count = Number(res?.data?.count ?? res?.count ?? 0);
    setApiUnreadCount(count);
    setNotifCount(count);
  }, [token, setNotifCount]);

  const load = useCallback(async (pageNum = 1, append = false) => {
    if (!append) setRefreshing(pageNum === 1); else setLoadingMore(true);
    const res = await apiFetch(`/api/v1/notifications/get.php?page=${pageNum}&limit=20`, token);
    let items = [];
    if (Array.isArray(res?.data?.items)) items = res.data.items;
    else if (Array.isArray(res?.data))   items = res.data;
    else if (Array.isArray(res?.items))  items = res.items;
    if (append) setAllItems((p) => [...p, ...items]); else setAllItems(items);
    setHasMore(items.length >= 20);
    setRefreshing(false); setLoadingMore(false);
    if (pageNum === 1) {
      apiFetch('/api/v1/notifications/read.php', token, { method: 'POST' });
      setApiUnreadCount(0);
      setNotifCount(0);
    }
  }, [token, setNotifCount]);

  useEffect(() => {
    Animated.timing(hdrAnim, { toValue: 1, duration: 450, useNativeDriver: true }).start();
    fetchCount();
    load();
  }, []);

  const onRefresh   = useCallback(() => { setPage(1); setHasMore(true); load(1, false); }, [load]);
  const loadMore    = useCallback(() => { if (!hasMore || loadingMore || refreshing) return; const n = page + 1; setPage(n); load(n, true); }, [hasMore, loadingMore, refreshing, page, load]);
  const handleDel   = useCallback((id) => { if (!id) return; setAllItems((p) => p.filter((n) => (n.id ?? n.notification_id ?? n.notify_id) !== id)); }, []);
  const markAllRead = useCallback(async () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    setAllItems((p) => p.map((n) => ({ ...n, seen: 1 })));
    setApiUnreadCount(0);
    setNotifCount(0);
    apiFetch('/api/v1/notifications/read.php', token, { method: 'POST' });
  }, [token, setNotifCount]);

  const unread   = apiUnreadCount;
  const mentions = useMemo(() => allItems.filter((n) => String(n.action ?? n.type ?? n.node_type ?? '').toLowerCase() === 'mention').length, [allItems]);
  const messages = useMemo(() => allItems.filter((n) => String(n.action ?? n.type ?? n.node_type ?? '').toLowerCase() === 'message').length, [allItems]);

  const filtered = useMemo(() => {
    if (filter === 'Unread')   return allItems.filter((n) => !n.seen || n.seen === 0 || n.seen === '0');
    if (filter === 'Mentions') return allItems.filter((n) => String(n.action ?? n.type ?? n.node_type ?? '').toLowerCase() === 'mention');
    if (filter === 'Messages') return allItems.filter((n) => String(n.action ?? n.type ?? n.node_type ?? '').toLowerCase() === 'message');
    return allItems;
  }, [allItems, filter]);

  const flatData = useMemo(() => {
    const rows = [];
    sectionize(filtered).forEach(({ title, data }) => {
      rows.push({ _type: 'header', title });
      data.forEach((item, i) => rows.push({ _type: 'item', item, _i: i }));
    });
    return rows;
  }, [filtered]);

  const renderRow = useCallback(({ item: row }) => {
    if (row._type === 'header') return <SectionLabel title={row.title} />;
    return (
      <NotifRow
        item={row.item}
        index={row._i}
        onDelete={handleDel}
        token={token}
        currentUserId={user?.id}
      />
    );
  }, [handleDel, token, user?.id]);

  return (
    <View style={[ns.root, { backgroundColor: tc.background }]}>
      <StatusBar barStyle="light-content" />

      {/* ── Header ── */}
      <View style={[ns.header, { paddingTop: top + 8 }]}>
        <View style={ns.decorCircle} pointerEvents="none" />

        <Animated.View style={[ns.headerRow, { opacity: hdrAnim, transform: [{ translateY: hdrAnim.interpolate({ inputRange: [0, 1], outputRange: [-10, 0] }) }] }]}>
          <TouchableOpacity style={ns.hBtn} activeOpacity={0.8}
            onPress={() => navigation.canGoBack() && navigation.goBack()}>
            <Ionicons name="arrow-back" size={20} color={Colors.white} />
          </TouchableOpacity>

          <View style={ns.titleRow}>
            <Text style={ns.titleEyebrow}>HAFRIK</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              <Text style={ns.title}>Notifications</Text>
              {unread > 0 && (
                <View style={ns.titleBadge}><Text style={ns.titleBadgeTxt}>{unread > 99 ? '99+' : unread}</Text></View>
              )}
            </View>
          </View>

          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TouchableOpacity style={ns.hBtn} activeOpacity={0.8} onPress={() => navigation.navigate('Inbox')}>
              <Ionicons name="chatbubbles-outline" size={20} color={Colors.white} />
              {messages > 0 && <View style={ns.hBtnDot}><Text style={ns.hBtnDotTxt}>{messages > 9 ? '9+' : messages}</Text></View>}
            </TouchableOpacity>
            <TouchableOpacity style={[ns.hBtn, { backgroundColor: ACCENT + '2E' }]} activeOpacity={0.8} onPress={markAllRead}>
              <Ionicons name="checkmark-done" size={18} color={ACCENT} />
            </TouchableOpacity>
          </View>
        </Animated.View>

        <FilterBar
          tabs={FILTER_TABS}
          active={filter}
          onChange={setFilter}
          counts={{ Unread: apiUnreadCount, Mentions: mentions, Messages: messages }}
        />
      </View>

      {/* ── List ── */}
      <FlatList
        data={flatData}
        keyExtractor={(row, i) =>
          row._type === 'header'
            ? `hdr-${row.title}`
            : `n-${row.item?.id ?? row.item?.notification_id ?? row.item?.notify_id ?? i}`
        }
        renderItem={renderRow}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={ACCENT} colors={[ACCENT]} />}
        ListEmptyComponent={<Empty />}
        ListFooterComponent={loadingMore
          ? () => (
              <View style={{ paddingVertical: 22, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 6 }}>
                {[0, 1, 2].map((i) => <View key={i} style={[ns.dot, { opacity: 0.3 + i * 0.2 }]} />)}
              </View>
            )
          : null
        }
        onEndReached={loadMore}
        onEndReachedThreshold={0.3}
        contentContainerStyle={{ paddingBottom: 60, flexGrow: 1 }}
        showsVerticalScrollIndicator={false}
        removeClippedSubviews
      />
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────
const ns = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },

  // Header
  header: {
    backgroundColor: BRAND,
    paddingHorizontal: 16, paddingBottom: 0, overflow: 'hidden',
    shadowColor: BRAND, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.22, shadowRadius: 10, elevation: 8,
  },
  decorCircle: {
    position: 'absolute', width: 220, height: 220, borderRadius: 110,
    backgroundColor: WHITE + '0A', top: -90, right: -70,
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 18 },
  hBtn: {
    width: 38, height: 38, borderRadius: 12,
    backgroundColor: WHITE + '1F', alignItems: 'center', justifyContent: 'center',
  },
  hBtnDot: {
    position: 'absolute', top: -4, right: -4,
    backgroundColor: DANGER, borderRadius: 8, minWidth: 14, height: 14,
    alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3,
    borderWidth: 1.5, borderColor: BRAND,
  },
  hBtnDotTxt: { color: Colors.white, fontSize: 8, fontWeight: '900' },
  titleRow:     { flex: 1, flexDirection: 'column', alignItems: 'center', justifyContent: 'center' },
  titleEyebrow: { fontSize: 9, fontWeight: '800', letterSpacing: 2.5, color: ACCENT, marginBottom: 2 },
  title: { fontSize: 18, fontWeight: '800', color: Colors.white, letterSpacing: 0.2 },
  titleBadge: {
    backgroundColor: ACCENT, borderRadius: 10, minWidth: 22, height: 20,
    alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6,
  },
  titleBadgeTxt: { color: Colors.white, fontSize: 10, fontWeight: '900' },

  // Filter
  filterBar: {
    flexDirection: 'row',
    borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: WHITE + '1A',
  },
  filterTab: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 4, paddingVertical: 13, position: 'relative',
  },
  filterLine: {
    position: 'absolute', bottom: 0, left: '15%', right: '15%',
    height: 2.5, borderRadius: 99, backgroundColor: ACCENT,
  },
  filterTxt:   { fontSize: 11, fontWeight: '600', color: WHITE + '6B' },
  filterTxtOn: { color: Colors.white, fontWeight: '800' },
  filterBadge: {
    backgroundColor: DANGER, borderRadius: 8, minWidth: 14, height: 14,
    alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3,
  },
  filterBadgeTxt: { color: Colors.white, fontSize: 8, fontWeight: '900' },

  // Section
  sectionRow:  { paddingHorizontal: 18, paddingTop: 22, paddingBottom: 8 },
  sectionTxt:  { fontSize: 11, fontWeight: '800', color: MUTED, letterSpacing: 1.2, textTransform: 'uppercase' },

  // Row
  row: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 13,
    backgroundColor: CARD,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: BRAND + '12',
  },
  rowUnread: { backgroundColor: ACCENT + '14' },
  bar: { position: 'absolute', left: 0, top: 14, bottom: 14, width: 3, borderRadius: 99 },

  // Avatar
  avatarWrap: { marginRight: 13, position: 'relative' },
  actionBadge: {
    position: 'absolute', bottom: -3, right: -3,
    width: 19, height: 19, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: CARD,
  },

  // Text
  textCol:    { flex: 1, paddingRight: 10 },
  topRow:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 3 },
  nameText:   { fontSize: 14, fontWeight: '800', color: DARK, flex: 1, marginRight: 8 },
  timeText:   { fontSize: 11, color: MUTED, fontWeight: '500' },
  bodyText:   { fontSize: 13, color: DARK + 'B3', lineHeight: 18 },
  actionText: { fontWeight: '600', color: BRAND },

  // Right element
  postThumb: { width: 50, height: 50, borderRadius: 10, backgroundColor: BG },
  iconBox:   { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },

  // Inline follow button
  followBtn: {
    paddingHorizontal: 14, paddingVertical: 7,
    borderRadius: 20, borderWidth: 1.5, borderColor: ACCENT,
    minWidth: 84, alignItems: 'center', justifyContent: 'center',
  },
  followBtnActive: { backgroundColor: ACCENT, borderColor: ACCENT },
  followBtnTxt:    { fontSize: 12, fontWeight: '800', color: ACCENT },
  followBtnTxtActive: { color: Colors.white },

  // System alert row
  systemRow: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 12,
    paddingHorizontal: 16, paddingVertical: 14,
    backgroundColor: '#FFFBEB',
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#F59E0B26',
    borderLeftWidth: 4,
  },
  systemIconWrap: {
    width: 42, height: 42, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  systemTitle: { fontSize: 10, fontWeight: '900', letterSpacing: 1.2, marginBottom: 3 },
  systemBody:  { fontSize: 13, color: DARK + 'CC', lineHeight: 18, flexShrink: 1 },

  // Swipe
  swipeBox: { width: 80, justifyContent: 'center', alignItems: 'center' },
  swipeBtn: { flex: 1, width: '100%', backgroundColor: DANGER, alignItems: 'center', justifyContent: 'center', gap: 4 },
  swipeTxt: { color: Colors.white, fontSize: 10, fontWeight: '800' },

  // Empty
  emptyWrap:  { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 100, gap: 14 },
  emptyCircle:{ width: 104, height: 104, borderRadius: 52, alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { fontSize: 18, fontWeight: '800', color: DARK },
  emptySub:   { fontSize: 13, color: MUTED, textAlign: 'center', maxWidth: 230, lineHeight: 20 },

  // Loading dots
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: ACCENT },
});
