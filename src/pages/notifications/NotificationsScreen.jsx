// src/pages/notifications/NotificationsScreen.jsx
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  Animated,
  RefreshControl,
  StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Swipeable } from 'react-native-gesture-handler';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../../AuthContext';
import useStore from '../../repository/store';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';

const BASE_URL = 'https://hafrik.com';
const BRAND = '#0C3F44';
const ACCENT = '#13C296';
const DARK = '#0D1B1E';
const MUTED = '#7A9198';
const BG = '#F0F4F4';
const CARD = '#FFFFFF';

const FILTER_TABS = ['All', 'Unread', 'Mentions'];

const TYPE_META = {
  follow: { icon: 'person-add', color: '#7C3AED', bg: '#EDE9FE' },
  react_like: { icon: 'heart', color: '#EF4444', bg: '#FEE2E2' },
  like: { icon: 'heart', color: '#EF4444', bg: '#FEE2E2' },
  comment: { icon: 'chatbubble', color: ACCENT, bg: '#D1FAF0' },
  reply: { icon: 'return-down-back', color: '#F59E0B', bg: '#FEF3C7' },
  mention: { icon: 'at', color: '#3B82F6', bg: '#DBEAFE' },
  default: { icon: 'notifications', color: BRAND, bg: '#D4E8EA' },
};

const getTypeMeta = (action) => TYPE_META[String(action || '').toLowerCase()] ?? TYPE_META.default;

const apiFetch = async (path, token, opts = {}) => {
  try {
    const res = await fetch(`${BASE_URL}${path}`, {
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
      ...opts,
    });
    return await res.json();
  } catch {
    return null;
  }
};

const timeAgo = (dateStr) => {
  if (!dateStr) return '';
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diff < 60) return 'now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  return `${Math.floor(diff / 86400)}d`;
};

const sectionize = (items) => {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const yest = today - 86400000;
  const sections = { Today: [], Yesterday: [], Earlier: [] };

  items.forEach((n) => {
    const t = new Date(n.created_at ?? n.time ?? 0).getTime();
    if (t >= today) sections.Today.push(n);
    else if (t >= yest) sections.Yesterday.push(n);
    else sections.Earlier.push(n);
  });

  return Object.entries(sections)
    .filter(([, data]) => data.length > 0)
    .map(([title, data]) => ({ title, data }));
};

/* ─── Animated notification card ─── */
const NotifCard = React.memo(({ item, index, onDelete }) => {
  const navigation = useNavigation();
  const anim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.spring(anim, {
      toValue: 1,
      delay: Math.min(index * 40, 300),
      useNativeDriver: true,
      tension: 70,
      friction: 10,
    }).start();
  }, [anim, index]);

  // --- FIX: normalize fields without changing design ---
  const action = String(item.action ?? item.type ?? item.node_type ?? '').toLowerCase();
  const meta = getTypeMeta(action);

  // try multiple shapes (actor/user/from_user)
  const actor = item.actor ?? item.from_user ?? item.user ?? {};
  const name = actor.username ?? actor.full_name ?? actor.name ?? item.username ?? 'Someone';

  const avatarRaw = actor.avatar ?? actor.user_picture ?? item.avatar ?? null;
  const avatar = typeof avatarRaw === 'string' ? avatarRaw.trim() : null;

  const unread = !item.seen || item.seen === 0 || item.seen === '0';
  const timeStr = timeAgo(item.created_at ?? item.time);

  const handlePress = () => {
    Animated.sequence([
      Animated.spring(scaleAnim, { toValue: 0.97, useNativeDriver: true, tension: 300 }),
      Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, tension: 300 }),
    ]).start();

    Haptics.selectionAsync();

    // --- FIX: keep your routes, just correct params + fallbacks ---
    if (action === 'follow') {
      const userId = actor?.id ?? actor?.user_id ?? item?.from_user_id ?? item?.user_id;
      if (userId) navigation.navigate('UserProfile', { userId });
      return;
    }

    const postId = item.post_id ?? item.postId ?? item.node_id ?? item.notify_id;
    if (postId) {
      // IMPORTANT: your app earlier uses feedId for CommentScreen
      navigation.navigate('CommentScreen', { feedId: postId });
      return;
    }
  };

  const notifId = item.id ?? item.notification_id ?? item.notify_id;

  const renderSwipe = () => (
    <TouchableOpacity
      style={styles.swipeDelete}
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        onDelete(notifId);
      }}
      activeOpacity={0.9}
    >
      <View style={styles.swipeDeleteInner}>
        <Ionicons name="trash-outline" size={20} color="#fff" />
        <Text style={styles.swipeDeleteText}>Delete</Text>
      </View>
    </TouchableOpacity>
  );

  // optional post thumb: avoid empty string uri warnings
  const postImageRaw = item.post_image ?? item.postImage ?? item.post_thumbnail ?? null;
  const postImage = typeof postImageRaw === 'string' ? postImageRaw.trim() : null;

  return (
    <Animated.View
      style={{
        opacity: anim,
        transform: [
          { translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [24, 0] }) },
          { scale: scaleAnim },
        ],
      }}
    >
      <Swipeable renderRightActions={renderSwipe} overshootRight={false} friction={2}>
        <TouchableOpacity
          style={[styles.card, unread && styles.cardUnread]}
          activeOpacity={0.92}
          onPress={handlePress}
        >
          {/* Left type strip */}
          <View style={[styles.typeStrip, { backgroundColor: meta.color }]} />

          {/* Avatar + type icon */}
          <View style={styles.avatarBlock}>
            {/* FIX: never pass empty uri */}
            {avatar ? (
              <Image source={{ uri: avatar }} style={styles.avatar} />
            ) : (
              <Image
                source={{ uri: `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}` }}
                style={styles.avatar}
              />
            )}

            <View style={[styles.typeIcon, { backgroundColor: meta.bg }]}>
              <Ionicons name={meta.icon} size={11} color={meta.color} />
            </View>
          </View>

          {/* Content */}
          <View style={styles.content}>
            <View style={styles.contentRow}>
              <Text style={styles.notifName} numberOfLines={1}>
                {name}
              </Text>
              <Text style={styles.notifTime}>{timeStr}</Text>
            </View>

            <Text style={styles.notifBody} numberOfLines={2}>
              {item.message ?? item.text ?? item.notify_text ?? 'New notification'}
            </Text>

            {postImage ? <Image source={{ uri: postImage }} style={styles.postThumb} /> : null}
          </View>

          {/* Unread dot */}
          {unread && <View style={styles.unreadDot} />}
        </TouchableOpacity>
      </Swipeable>
    </Animated.View>
  );
});

/* ─── Section header ─── */
const SectionHead = ({ title }) => (
  <View style={styles.sectionHead}>
    <Text style={styles.sectionHeadText}>{title}</Text>
    <View style={styles.sectionLine} />
  </View>
);

/* ─── Empty state ─── */
const EmptyState = () => (
  <View style={styles.empty}>
    <LinearGradient colors={[ACCENT + '33', BRAND + '22']} style={styles.emptyCircle}>
      <Ionicons name="notifications-off-outline" size={44} color={MUTED} />
    </LinearGradient>
    <Text style={styles.emptyTitle}>All caught up!</Text>
    <Text style={styles.emptySubtitle}>No notifications yet. Check back later.</Text>
  </View>
);

/* ─── Filter tab ─── */
const FilterTab = ({ label, active, onPress, count }) => (
  <TouchableOpacity onPress={onPress} activeOpacity={0.8} style={styles.tabWrap}>
    {active ? (
      <LinearGradient
        colors={[ACCENT, '#0A8F6E']}
        style={styles.tabActive}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
      >
        <Text style={styles.tabTextActive}>{label}</Text>
        {count > 0 && (
          <View style={styles.tabBadge}>
            <Text style={styles.tabBadgeText}>{count > 9 ? '9+' : count}</Text>
          </View>
        )}
      </LinearGradient>
    ) : (
      <View style={styles.tabInactive}>
        <Text style={styles.tabTextInactive}>{label}</Text>
      </View>
    )}
  </TouchableOpacity>
);

/* ─── Main screen ─── */
export default function NotificationsScreen() {
  const navigation = useNavigation();
  const { top } = useSafeAreaInsets();
  const { token } = useAuth();
  const setNotifCount = useStore((s) => s.setNotificationCount);

  const [allItems, setAllItems] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState('All');
  const headerAnim = useRef(new Animated.Value(0)).current;

  const load = useCallback(async () => {
    const res = await apiFetch('/api/v1/notifications/list.php?page=1&limit=60', token);

    // FIX: accept either {data:[...]} or {data:{items:[...]}}
    let items = [];
    if (Array.isArray(res?.data?.items)) items = res.data.items;
    else if (Array.isArray(res?.data)) items = res.data;
    else if (Array.isArray(res?.items)) items = res.items;

    setAllItems(items);

    const unread = items.filter((n) => !n.seen || n.seen === 0 || n.seen === '0').length;
    setNotifCount(unread);

    setRefreshing(false);

    // keep your behavior: mark seen on load
    apiFetch('/api/v1/notifications/mark_seen.php', token, { method: 'POST' });
  }, [token, setNotifCount]);

  useEffect(() => {
    Animated.timing(headerAnim, { toValue: 1, duration: 500, useNativeDriver: true }).start();
    load();
  }, [load, headerAnim]);

  const onRefresh = () => {
    setRefreshing(true);
    load();
  };

  const handleDelete = useCallback((id) => {
    if (!id) return;
    setAllItems((prev) => prev.filter((n) => (n.id ?? n.notification_id ?? n.notify_id) !== id));
  }, []);

  const markAllRead = useCallback(async () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setAllItems((prev) => prev.map((n) => ({ ...n, seen: 1 })));
    setNotifCount(0);
    await apiFetch('/api/v1/notifications/mark_seen.php', token, { method: 'POST' });
  }, [token, setNotifCount]);

  const filtered = useMemo(() => {
    if (filter === 'Unread') return allItems.filter((n) => !n.seen || n.seen === 0 || n.seen === '0');
    if (filter === 'Mentions')
      return allItems.filter((n) => String(n.action ?? n.type ?? n.node_type).toLowerCase() === 'mention');
    return allItems;
  }, [allItems, filter]);

  const unreadCount = useMemo(
    () => allItems.filter((n) => !n.seen || n.seen === 0 || n.seen === '0').length,
    [allItems]
  );

  const mentionCount = useMemo(
    () => allItems.filter((n) => String(n.action ?? n.type ?? n.node_type).toLowerCase() === 'mention').length,
    [allItems]
  );

  const sections = useMemo(() => sectionize(filtered), [filtered]);

  const flatData = useMemo(() => {
    const rows = [];
    sections.forEach(({ title, data }) => {
      rows.push({ _type: 'header', title });
      data.forEach((item, i) => rows.push({ _type: 'item', item, _i: i }));
    });
    return rows;
  }, [sections]);

  const renderRow = ({ item: row }) => {
    if (row._type === 'header') return <SectionHead title={row.title} />;
    return <NotifCard item={row.item} index={row._i} onDelete={handleDelete} />;
  };

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" />

      {/* ── Header ── */}
      <LinearGradient
        colors={[BRAND, '#0A5560']}
        style={[styles.header, { paddingTop: top + 6 }]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <Animated.View
          style={[
            styles.headerRow,
            {
              opacity: headerAnim,
              transform: [
                { translateY: headerAnim.interpolate({ inputRange: [0, 1], outputRange: [-12, 0] }) },
              ],
            },
          ]}
        >
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.8}>
            <Ionicons name="arrow-back" size={20} color="#fff" />
          </TouchableOpacity>

          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>Notifications</Text>
            {unreadCount > 0 && (
              <View style={styles.headerBadge}>
                <Text style={styles.headerBadgeText}>{unreadCount}</Text>
              </View>
            )}
          </View>

          <TouchableOpacity style={styles.markBtn} onPress={markAllRead} activeOpacity={0.8}>
            <Ionicons name="checkmark-done" size={18} color={ACCENT} />
          </TouchableOpacity>
        </Animated.View>

        {/* Filter tabs */}
        <View style={styles.tabRow}>
          {FILTER_TABS.map((t) => (
            <FilterTab
              key={t}
              label={t}
              active={filter === t}
              onPress={() => setFilter(t)}
              count={t === 'Unread' ? unreadCount : t === 'Mentions' ? mentionCount : 0}
            />
          ))}
        </View>
      </LinearGradient>

      {/* ── List ── */}
      <FlatList
        data={flatData}
        // FIX: stable unique keys (prevents duplicates/omissions)
        keyExtractor={(row, i) => {
          if (row._type === 'header') return `hd-${row.title}`;
          const key = row.item?.id ?? row.item?.notification_id ?? row.item?.notify_id ?? `idx-${i}`;
          return `item-${key}`;
        }}
        renderItem={renderRow}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={ACCENT} />}
        ListEmptyComponent={<EmptyState />}
        contentContainerStyle={{ paddingTop: 8, paddingBottom: 40, flexGrow: 1 }}
        showsVerticalScrollIndicator={false}
        removeClippedSubviews
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },

  /* Header */
  header: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    shadowColor: BRAND,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 12,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.14)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: 0.3,
  },
  headerBadge: {
    backgroundColor: ACCENT,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  headerBadgeText: { color: '#fff', fontSize: 11, fontWeight: '900' },
  markBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: 'rgba(19,194,150,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* Filter tabs */
  tabRow: { flexDirection: 'row', gap: 8 },
  tabWrap: {},
  tabActive: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  tabInactive: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  tabTextActive: { color: '#fff', fontSize: 13, fontWeight: '800' },
  tabTextInactive: { color: 'rgba(255,255,255,0.55)', fontSize: 13, fontWeight: '600' },
  tabBadge: {
    backgroundColor: '#fff',
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  tabBadgeText: { color: BRAND, fontSize: 10, fontWeight: '900' },

  /* Section header */
  sectionHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginHorizontal: 16,
    marginTop: 20,
    marginBottom: 8,
  },
  sectionHeadText: {
    fontSize: 11,
    fontWeight: '900',
    color: MUTED,
    textTransform: 'uppercase',
    letterSpacing: 1.4,
  },
  sectionLine: { flex: 1, height: 1, backgroundColor: 'rgba(12,63,68,0.08)' },

  /* Card */
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: CARD,
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  cardUnread: {
    backgroundColor: '#EBF9F5',
    shadowColor: ACCENT,
    shadowOpacity: 0.1,
  },
  typeStrip: { width: 4, alignSelf: 'stretch' },

  avatarBlock: { marginHorizontal: 14, position: 'relative' },
  avatar: { width: 50, height: 50, borderRadius: 25 },
  typeIcon: {
    position: 'absolute',
    bottom: -2,
    right: -4,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: CARD,
  },

  content: { flex: 1, paddingVertical: 14, paddingRight: 14 },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  notifName: { fontSize: 14, fontWeight: '800', color: DARK, flex: 1, marginRight: 8 },
  notifTime: { fontSize: 11, color: MUTED, fontWeight: '500' },
  notifBody: { fontSize: 13, color: '#4A6063', lineHeight: 18 },
  postThumb: { width: 48, height: 48, borderRadius: 10, marginTop: 8, backgroundColor: BG },

  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: ACCENT,
    marginRight: 14,
    alignSelf: 'center',
  },

  /* Swipe delete */
  swipeDelete: {
    width: 80,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
    borderRadius: 16,
    overflow: 'hidden',
    marginRight: 16,
  },
  swipeDeleteInner: {
    flex: 1,
    width: '100%',
    backgroundColor: '#EF4444',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    borderRadius: 16,
  },
  swipeDeleteText: { color: '#fff', fontSize: 10, fontWeight: '800' },

  /* Empty */
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 80, gap: 16 },
  emptyCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: { fontSize: 18, fontWeight: '800', color: DARK },
  emptySubtitle: { fontSize: 13, color: MUTED, textAlign: 'center', maxWidth: 220, lineHeight: 20 },
});