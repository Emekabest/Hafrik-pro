import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  Image, Animated, RefreshControl, TextInput, StatusBar,
  Modal, ActivityIndicator,
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
const BRAND  = Colors.primaryDark;
const ACCENT = Colors.primary;
const DARK   = Colors.black;
const MUTED  = Colors.secondaryText;
const BG     = Colors.surfaceTint;
const WHITE  = Colors.white;
const BLACK  = Colors.black;
const DANGER = Colors.destructive;

/* ─── API helper ─────────────────────────────────────────────────────────── */
const api = async (path, token, opts = {}) => {
  const { headers: extraHeaders, ...rest } = opts;
  try {
    const res = await fetch(`${BASE_URL}${path}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
        'Content-Type': 'application/json',
        ...(extraHeaders ?? {}),
      },
      ...rest,
    });
    return await res.json();
  } catch { return null; }
};

/* ─── Helpers ─────────────────────────────────────────────────────────────── */
const timeAgo = (d) => {
  if (!d) return '';
  const s = Math.floor((Date.now() - new Date(d).getTime()) / 1000);
  if (s < 60)     return 'now';
  if (s < 3600)   return `${Math.floor(s / 60)}m`;
  if (s < 86400)  return `${Math.floor(s / 3600)}h`;
  if (s < 604800) return `${Math.floor(s / 86400)}d`;
  return new Date(d).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
};

const avatarUri = (u = {}, name = 'U') => {
  const av = u.avatar ?? u.user_picture ?? u.profile_picture ?? null;
  if (av && !String(av).includes('blank_profile') && !String(av).includes('/default.')) return av;
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(name || 'U')}&background=${BRAND.replace('#', '')}&color=fff`;
};

/* ─── Online dot ─────────────────────────────────────────────────────────── */
const OnlineDot = () => {
  const pulse = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    Animated.loop(Animated.sequence([
      Animated.timing(pulse, { toValue: 1.5, duration: 800, useNativeDriver: true }),
      Animated.timing(pulse, { toValue: 1,   duration: 800, useNativeDriver: true }),
    ])).start();
  }, []);
  return (
    <View style={s.onlineWrap}>
      <Animated.View style={[s.onlineRing, { transform: [{ scale: pulse }] }]} />
      <View style={s.onlineDot} />
    </View>
  );
};

/* ─── Conversation card ───────────────────────────────────────────────────── */
const ConvCard = React.memo(({ item, index, onDelete, onPin }) => {
  const navigation = useNavigation();
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(anim, {
      toValue: 1, delay: Math.min(index * 35, 250),
      useNativeDriver: true, tension: 80, friction: 10,
    }).start();
  }, []);

  // Fields come directly from conversations.php (no nested other_user object)
  const name    = item.user_name ?? 'User';
  const rawPic  = item.user_picture;
  const picUrl  = rawPic
    ? rawPic.startsWith('http') ? rawPic : `${BASE_URL}/${rawPic}`
    : `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=${BRAND.replace('#','')}&color=fff`;
  const avatar  = picUrl;
  const unread  = item.seen === '0' || item.seen === 0 || item.seen === false;
  const isOnline = false; // not in API yet
  const typing  = false;  // not in API yet
  const timeStr = timeAgo(item.time ?? item.last_time);
  const pinned  = item.pinned === 1;
  const convId  = item.conversation_id ?? item.id;

  // Pass the user info ThreadScreen needs
  const otherUser = {
    id: item.user_id,
    user_id: item.user_id,
    username: name,
    user_picture: rawPic ?? '',
  };

  const handlePress = () => {
    Haptics.selectionAsync();
    navigation.navigate('Thread', { conversationId: convId, otherUser });
  };

  const renderRightActions = () => (
    <View style={s.swipeActions}>
      <TouchableOpacity
        style={[s.swipeBtn, { backgroundColor: ACCENT }]}
        onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onPin(convId); }}
      >
        <Ionicons name={pinned ? 'pin' : 'pin-outline'} size={18} color={WHITE} />
        <Text style={s.swipeBtnTxt}>{pinned ? 'Unpin' : 'Pin'}</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[s.swipeBtn, { backgroundColor: DANGER }]}
        onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); onDelete(convId); }}
      >
        <Ionicons name="trash-outline" size={18} color={WHITE} />
        <Text style={s.swipeBtnTxt}>Delete</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <Animated.View style={{ opacity: anim, transform: [{ translateX: anim.interpolate({ inputRange: [0, 1], outputRange: [-20, 0] }) }] }}>
      <Swipeable renderRightActions={renderRightActions} overshootRight={false} friction={2}>
        <TouchableOpacity style={[s.card, unread && s.cardUnread]} activeOpacity={0.88} onPress={handlePress}>
          {unread && <View style={s.unreadStrip} />}

          {/* Avatar */}
          <View style={s.avatarWrap}>
            <Image source={{ uri: avatar }} style={s.avatar} />
            {isOnline && <OnlineDot />}
            {pinned && (
              <View style={s.pinnedBadge}>
                <Ionicons name="pin" size={9} color={WHITE} />
              </View>
            )}
          </View>

          {/* Content */}
          <View style={s.cardBody}>
            <View style={s.cardRow}>
              <Text style={[s.cardName, unread && s.cardNameBold]} numberOfLines={1}>{name}</Text>
              <Text style={[s.cardTime, unread && { color: ACCENT }]}>{timeStr}</Text>
            </View>
            <View style={s.cardRow}>
              <Text style={[s.cardPreview, typing && { color: ACCENT, fontStyle: 'italic' }]} numberOfLines={1}>
                {typing ? 'typing…' : (item.message || 'Say hello 👋')}
              </Text>
              {unread && <View style={s.unreadDot} />}
            </View>
          </View>
        </TouchableOpacity>
      </Swipeable>
    </Animated.View>
  );
});

/* ─── Filter tabs ─────────────────────────────────────────────────────────── */
const FilterTabs = ({ active, onChange }) => (
  <View style={s.filterRow}>
    {['All', 'Unread'].map((f) => (
      <TouchableOpacity key={f} style={[s.filterTab, active === f && s.filterTabOn]} onPress={() => onChange(f)} activeOpacity={0.8}>
        <Text style={[s.filterTabTxt, active === f && s.filterTabTxtOn]}>{f}</Text>
      </TouchableOpacity>
    ))}
  </View>
);

/* ─── Empty state ─────────────────────────────────────────────────────────── */
const EmptyState = () => (
  <View style={s.empty}>
    <View style={[s.emptyCircle, { backgroundColor: ACCENT + '1A' }]}>
      <Ionicons name="chatbubbles-outline" size={44} color={MUTED} />
    </View>
    <Text style={s.emptyTitle}>No conversations yet</Text>
    <Text style={s.emptySub}>Start a conversation with someone on Hafrik.</Text>
  </View>
);

/* ─── Section label ──────────────────────────────────────────────────────── */
const SectionLabel = ({ label }) => (
  <View style={s.sectionLabel}>
    <Ionicons name="pin" size={11} color={ACCENT} />
    <Text style={s.sectionLabelTxt}>{label}</Text>
  </View>
);

/* ─── New Message modal ───────────────────────────────────────────────────── */
const NewMessageModal = ({ visible, token, onClose, onSelect }) => {
  const [contacts,  setContacts]  = useState([]);
  const [loading,   setLoading]   = useState(false);
  const [opening,   setOpening]   = useState(null);
  const [search,    setSearch]    = useState('');
  const { top }                   = useSafeAreaInsets();

  useEffect(() => {
    if (!visible) return;
    setSearch('');
    setLoading(true);
    api('/api/v1/messages/contacts.php', token).then((res) => {
      const list =
        Array.isArray(res?.data?.contacts) ? res.data.contacts :
        Array.isArray(res?.data)           ? res.data : [];
      setContacts(list);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [visible, token]);

  const filtered = contacts.filter((c) => {
    const n = (c.username ?? c.full_name ?? '').toLowerCase();
    return n.includes(search.toLowerCase());
  });

  const handleSelect = async (contact) => {
    if (opening) return;
    const uid = contact.id ?? contact.user_id;
    setOpening(uid);
    // Use start.php to create/get a conversation
    const res = await api('/api/v1/messages/start.php', token, {
      method: 'POST',
      body: JSON.stringify({ user_id: uid }),
    });
    setOpening(null);
    const convId = res?.data?.conversation_id ?? res?.conversation_id;
    if (convId) { onClose(); onSelect({ conversationId: convId, otherUser: contact }); }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={[cm.root, { paddingTop: top }]}>
        <View style={cm.header}>
          <Text style={cm.title}>New Message</Text>
          <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Ionicons name="close" size={22} color={WHITE} />
          </TouchableOpacity>
        </View>

        <View style={cm.searchBar}>
          <Ionicons name="search" size={15} color={WHITE + '88'} />
          <TextInput
            style={cm.searchInput}
            placeholder="Search people…"
            placeholderTextColor={WHITE + '55'}
            value={search}
            onChangeText={setSearch}
          />
        </View>

        {loading ? (
          <View style={cm.loader}><ActivityIndicator color={ACCENT} size="large" /></View>
        ) : (
          <FlatList
            data={filtered}
            keyExtractor={(c, i) => `c-${c.id ?? c.user_id ?? i}`}
            renderItem={({ item: c }) => {
              const uid  = c.id ?? c.user_id;
              const name = c.username ?? c.full_name ?? 'User';
              const av   = avatarUri(c, name);
              return (
                <TouchableOpacity style={cm.row} activeOpacity={0.8} onPress={() => handleSelect(c)}>
                  <Image source={{ uri: av }} style={cm.avatar} />
                  <View style={{ flex: 1 }}>
                    <Text style={cm.name}>{name}</Text>
                    {c.bio ? <Text style={cm.bio} numberOfLines={1}>{c.bio}</Text> : null}
                  </View>
                  {opening === uid
                    ? <ActivityIndicator size="small" color={ACCENT} />
                    : <Ionicons name="chevron-forward" size={16} color={MUTED} />
                  }
                </TouchableOpacity>
              );
            }}
            ListEmptyComponent={<View style={cm.emptyWrap}><Text style={cm.emptyTxt}>No contacts found</Text></View>}
            contentContainerStyle={{ paddingBottom: 40 }}
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>
    </Modal>
  );
};

/* ─── Main screen ─────────────────────────────────────────────────────────── */
export default function InboxScreen() {
  const navigation   = useNavigation();
  const { top }      = useSafeAreaInsets();
  const { token }    = useAuth();
  const { colors: tc } = useTheme();
  const setMsgCount  = useStore((s) => s.setMessageCount);


  const [items,        setItems]        = useState([]);
  const [unreadItems,  setUnreadItems]  = useState([]);
  const [refreshing,   setRefreshing]   = useState(false);
  const [search,       setSearch]       = useState('');
  const [searchFocus,  setSearchFocus]  = useState(false);
  const [filter,       setFilter]       = useState('All');
  const [showCompose,  setShowCompose]  = useState(false);
  const [newBanner,    setNewBanner]    = useState(false);

  const pollRef    = useRef(null);
  const prevUnread = useRef(0);
  const hdrAnim    = useRef(new Animated.Value(0)).current;
  const bannerAnim = useRef(new Animated.Value(0)).current;

  /* ── Load conversations ─────────────────────────────────────────────────── */
  const load = useCallback(async () => {
    const res = await api('/api/v1/messages/conversations.php', token);
    const raw = Array.isArray(res?.data?.items) ? res.data.items
               : Array.isArray(res?.data)       ? res.data : [];

    const seenIds = new Set();
    const unique  = raw.filter((c) => {
      const id = c.conversation_id ?? c.id;
      if (seenIds.has(id)) return false;
      seenIds.add(id); return true;
    });
    setItems(unique);
    setRefreshing(false);
  }, [token]);

  /* ── Load unread conversations (Unread tab) ──────────────────────────────── */
  const loadUnread = useCallback(async () => {
    const res = await api('/api/v1/messages/conversations.php?filter=unread', token);
    const raw = Array.isArray(res?.data?.items) ? res.data.items
               : Array.isArray(res?.data)       ? res.data : [];
    const seenIds = new Set();
    const unique = raw.filter((c) => {
      const id = c.conversation_id ?? c.id;
      if (seenIds.has(id)) return false;
      seenIds.add(id); return true;
    });
    setUnreadItems(unique);
  }, [token]);

  /* ── Unread badge — dedicated endpoint ──────────────────────────────────── */
  const refreshUnread = useCallback(async () => {
    const res = await api('/api/v1/messages/unread-count.php', token);
    const count = Number(res?.data.unread ?? 0);
    console.log('Refreshing unread count…', count);

    setMsgCount(count);
    if (count > prevUnread.current) setNewBanner(true);
    prevUnread.current = count;
  }, [token, setMsgCount]);

  /* ── Init ──────────────────────────────────────────────────────────────── */
  useEffect(() => {
    Animated.timing(hdrAnim, { toValue: 1, duration: 500, useNativeDriver: true }).start();
    load();
    loadUnread();
    refreshUnread();
    pollRef.current = setInterval(() => { load(); loadUnread(); refreshUnread(); }, 7000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, []);

  /* ── Banner animation ───────────────────────────────────────────────────── */
  useEffect(() => {
    if (!newBanner) return;
    Animated.sequence([
      Animated.timing(bannerAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
      Animated.delay(3000),
      Animated.timing(bannerAnim, { toValue: 0, duration: 300, useNativeDriver: true }),
    ]).start(() => setNewBanner(false));
  }, [newBanner]);

  const onRefresh = () => { setRefreshing(true); load(); refreshUnread(); };

  /* ── Delete conversation — calls API + removes from list ────────────────── */
  const handleDelete = useCallback((id) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setItems((prev) => prev.filter((c) => (c.conversation_id ?? c.id) !== id));
    api('/api/v1/messages/delete-conversation.php', token, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `conversation_id=${encodeURIComponent(id)}`,
    });
  }, [token]);

  const handlePin = useCallback((id) => {
    setItems((prev) => prev.map((c) =>
      (c.conversation_id ?? c.id) === id ? { ...c, pinned: c.pinned === 1 ? 0 : 1 } : c
    ));
  }, []);

  const isUnread = (c) => c.seen === '0' || c.seen === 0 || c.seen === false;
  const totalUnread = items.filter(isUnread).length;

  /* ── Derived lists ──────────────────────────────────────────────────────── */
  const flatData = useMemo(() => {
    // Unread tab → use server-filtered list; All tab → use full list
    const source = filter === 'Unread' ? unreadItems : items;

    const searched = source.filter((c) => {
      const name = (c.user_name ?? c.other_user?.username ?? '').toLowerCase();
      return name.includes(search.toLowerCase());
    });

    const pinned = searched.filter((c) => c.pinned === 1);
    const normal = searched.filter((c) => c.pinned !== 1);

    const rows = [];
    if (pinned.length > 0) {
      rows.push({ _type: 'label', label: 'Pinned' });
      pinned.forEach((item, i) => rows.push({ _type: 'item', item, _i: i }));
    }
    if (normal.length > 0) {
      if (pinned.length > 0) rows.push({ _type: 'label', label: 'All Messages' });
      normal.forEach((item, i) => rows.push({ _type: 'item', item, _i: i }));
    }
    return rows;
  }, [items, unreadItems, filter, search]);

  const renderRow = ({ item: row }) => {
    if (row._type === 'label') return <SectionLabel label={row.label} />;
    return <ConvCard item={row.item} index={row._i} onDelete={handleDelete} onPin={handlePin} />;
  };

  return (
    <View style={[s.root, { backgroundColor: tc.background }]}>
      <StatusBar barStyle="light-content" />

      {/* ── Header ── */}
      <View style={[s.header, { paddingTop: top + 6 }]}>
        <Animated.View style={[s.headerRow, {
          opacity: hdrAnim,
          transform: [{ translateY: hdrAnim.interpolate({ inputRange: [0, 1], outputRange: [-12, 0] }) }],
        }]}>
          <View style={{ flex: 1 }}>
            <Text style={s.eyebrow}>HAFRIK</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Text style={s.headerTitle}>Messages</Text>
              {totalUnread > 0 && (
                <View style={s.titleBadge}>
                  <Text style={s.titleBadgeTxt}>{totalUnread > 9 ? '9+' : totalUnread}</Text>
                </View>
              )}
            </View>
            {items.length > 0 && <Text style={s.headerStat}>{items.length} conversations</Text>}
          </View>
          <TouchableOpacity style={s.composeBtn} activeOpacity={0.8} onPress={() => setShowCompose(true)}>
            <Ionicons name="create-outline" size={20} color={WHITE} />
          </TouchableOpacity>
        </Animated.View>

        {/* Search */}
        <View style={[s.searchBar, searchFocus && s.searchBarFocus]}>
          <Ionicons name="search" size={16} color={searchFocus ? ACCENT : WHITE + '88'} />
          <TextInput
            placeholder="Search messages…"
            value={search}
            onChangeText={setSearch}
            onFocus={() => setSearchFocus(true)}
            onBlur={() => setSearchFocus(false)}
            style={s.searchInput}
            placeholderTextColor={WHITE + '55'}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="close-circle" size={16} color={WHITE + '88'} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* ── New message banner ── */}
      {newBanner && (
        <Animated.View style={[s.banner, {
          opacity: bannerAnim,
          transform: [{ translateY: bannerAnim.interpolate({ inputRange: [0, 1], outputRange: [-40, 0] }) }],
        }]}>
          <Ionicons name="chatbubble-ellipses" size={15} color={WHITE} />
          <Text style={s.bannerTxt}>New message received</Text>
        </Animated.View>
      )}

      {/* ── List ── */}
      <FlatList
        data={flatData}
        keyExtractor={(row, i) =>
          row._type === 'label' ? `lbl-${row.label}` : `conv-${row.item?.conversation_id ?? i}`
        }
        renderItem={renderRow}
        ListHeaderComponent={<FilterTabs active={filter} onChange={setFilter} />}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={ACCENT} />}
        ListEmptyComponent={<EmptyState />}
        contentContainerStyle={{ paddingTop: 4, paddingBottom: 40, flexGrow: 1 }}
        showsVerticalScrollIndicator={false}
        removeClippedSubviews
      />

      {/* ── New message modal ── */}
      <NewMessageModal
        visible={showCompose}
        token={token}
        onClose={() => setShowCompose(false)}
        onSelect={({ conversationId, otherUser }) =>
          navigation.navigate('Thread', { conversationId, otherUser })
        }
      />
    </View>
  );
}

/* ─── Styles ─────────────────────────────────────────────────────────────── */
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },

  header: {
    backgroundColor: BRAND, paddingHorizontal: 16, paddingBottom: 16,
    shadowColor: BRAND, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.22, shadowRadius: 10, elevation: 8,
  },
  headerRow:  { flexDirection: 'row', alignItems: 'center', marginBottom: 14, gap: 10 },
  eyebrow:    { fontSize: 9, fontWeight: '800', letterSpacing: 2.5, color: ACCENT, marginBottom: 1 },
  headerTitle:{ fontSize: 22, fontWeight: '900', color: WHITE, letterSpacing: 0.2 },
  headerStat: { fontSize: 11, color: WHITE + '66', marginTop: 2 },
  titleBadge: { backgroundColor: ACCENT, borderRadius: 100, paddingHorizontal: 7, paddingVertical: 2, minWidth: 22, alignItems: 'center' },
  titleBadgeTxt: { color: WHITE, fontSize: 11, fontWeight: '900' },
  composeBtn: { width: 38, height: 38, borderRadius: 12, backgroundColor: ACCENT + '33', alignItems: 'center', justifyContent: 'center' },

  searchBar: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: WHITE + '1F', borderRadius: 14, paddingHorizontal: 14, height: 44,
    borderWidth: 1, borderColor: WHITE + '14',
  },
  searchBarFocus: { backgroundColor: WHITE + '2E', borderColor: ACCENT + '55' },
  searchInput:    { flex: 1, fontSize: 14, color: WHITE },

  banner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: ACCENT, paddingHorizontal: 16, paddingVertical: 10,
  },
  bannerTxt: { color: WHITE, fontSize: 13, fontWeight: '700' },

  filterRow: { flexDirection: 'row', paddingHorizontal: 16, paddingTop: 12, paddingBottom: 4, gap: 8 },
  filterTab: { paddingHorizontal: 16, paddingVertical: 7, borderRadius: 100, backgroundColor: BRAND + '0F', borderWidth: 1, borderColor: BRAND + '14' },
  filterTabOn:    { backgroundColor: BRAND, borderColor: BRAND },
  filterTabTxt:   { fontSize: 12, fontWeight: '700', color: DARK },
  filterTabTxtOn: { color: WHITE },

  sectionLabel: { flexDirection: 'row', alignItems: 'center', gap: 6, marginHorizontal: 16, marginTop: 16, marginBottom: 6 },
  sectionLabelTxt: { fontSize: 11, fontWeight: '900', color: MUTED, textTransform: 'uppercase', letterSpacing: 1.4 },

  card: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: WHITE, marginHorizontal: 16, marginBottom: 8,
    borderRadius: 18, padding: 14, overflow: 'hidden',
    shadowColor: BLACK, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 3,
  },
  cardUnread:    { backgroundColor: ACCENT + '12', shadowColor: ACCENT, shadowOpacity: 0.08 },
  unreadStrip:   { position: 'absolute', left: 0, top: 0, bottom: 0, width: 3.5, backgroundColor: ACCENT },
  avatarWrap:    { position: 'relative', marginRight: 14 },
  avatar:        { width: 54, height: 54, borderRadius: 27 },
  onlineWrap:    { position: 'absolute', bottom: 1, right: 1 },
  onlineRing:    { position: 'absolute', width: 14, height: 14, borderRadius: 7, backgroundColor: ACCENT + '40', top: -3, left: -3 },
  onlineDot:     { width: 12, height: 12, borderRadius: 6, backgroundColor: ACCENT, borderWidth: 2, borderColor: WHITE },
  pinnedBadge:   { position: 'absolute', top: -2, right: -2, width: 16, height: 16, borderRadius: 8, backgroundColor: ACCENT, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: WHITE },
  cardBody:      { flex: 1 },
  cardRow:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  cardName:      { fontSize: 15, fontWeight: '600', color: DARK, flex: 1, marginRight: 8 },
  cardNameBold:  { fontWeight: '800' },
  cardTime:      { fontSize: 11, color: MUTED, fontWeight: '500' },
  cardPreview:   { fontSize: 13, color: MUTED, flex: 1, marginRight: 8 },
  unreadDot:     { width: 10, height: 10, borderRadius: 5, backgroundColor: ACCENT, flexShrink: 0 },

  swipeActions:  { flexDirection: 'row', marginBottom: 8, gap: 6, paddingRight: 16 },
  swipeBtn:      { width: 64, borderRadius: 14, alignItems: 'center', justifyContent: 'center', gap: 4, paddingVertical: 8 },
  swipeBtnTxt:   { color: WHITE, fontSize: 10, fontWeight: '800' },

  empty:       { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 80, gap: 16 },
  emptyCircle: { width: 100, height: 100, borderRadius: 50, alignItems: 'center', justifyContent: 'center' },
  emptyTitle:  { fontSize: 18, fontWeight: '800', color: DARK },
  emptySub:    { fontSize: 13, color: MUTED, textAlign: 'center', maxWidth: 220, lineHeight: 20 },
});

/* ─── Modal styles ───────────────────────────────────────────────────────── */
const cm = StyleSheet.create({
  root:   { flex: 1, backgroundColor: BG },
  header: { backgroundColor: BRAND, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14 },
  title:  { fontSize: 18, fontWeight: '900', color: WHITE },
  searchBar: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: BRAND, paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: WHITE + '22' },
  searchInput: { flex: 1, fontSize: 14, color: WHITE, backgroundColor: WHITE + '1F', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8 },
  loader:  { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 60 },
  row:     { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 13, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: BRAND + '14', backgroundColor: WHITE },
  avatar:  { width: 46, height: 46, borderRadius: 23 },
  name:    { fontSize: 15, fontWeight: '700', color: DARK },
  bio:     { fontSize: 12, color: MUTED, marginTop: 2 },
  emptyWrap: { alignItems: 'center', paddingTop: 60 },
  emptyTxt:  { fontSize: 14, color: MUTED },
});
