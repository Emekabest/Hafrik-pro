import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  Image, Animated, RefreshControl, TextInput, StatusBar,
  Modal, ActivityIndicator, Platform, Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Swipeable } from 'react-native-gesture-handler';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../../AuthContext';
import useStore from '../../repository/store';
import * as Haptics from 'expo-haptics';
import { Colors } from '../../theme';
import { useTheme } from '../../theme/ThemeContext';

const BASE_URL = 'https://hafrik.com';
const BRAND    = Colors.primaryDark;   // #0c3f44
const ACCENT   = Colors.primary;       // #1f8e93
const DARK     = Colors.black;
const MUTED    = Colors.secondaryText;
const WHITE    = Colors.white;
const DANGER   = Colors.destructive;
const UNREAD_CLR = '#1f8e93';

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
  if (av && !String(av).includes('blank_profile') && !String(av).includes('/default.')) {
    return String(av).startsWith('http') ? av : `${BASE_URL}/${av}`;
  }
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(name || 'U')}&background=${BRAND.replace('#', '')}&color=fff`;
};

/* ─── Conversation row ────────────────────────────────────────────────────── */
const ConvCard = React.memo(({ item, index, onDelete, onPin, onMarkSeen }) => {
  const navigation = useNavigation();
  const slideAnim  = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(slideAnim, {
      toValue: 1, duration: 280, delay: Math.min(index * 30, 180), useNativeDriver: true,
    }).start();
  }, []);

  const name    = item.full_name ?? item.name ?? item.user_name ?? item.username ?? 'User';
  const rawPic  = item.user_picture;
  const avatar  = rawPic
    ? (rawPic.startsWith('http') ? rawPic : `${BASE_URL}/${rawPic}`)
    : `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=${BRAND.replace('#', '')}&color=fff`;
  const unread   = item.seen === '0' || item.seen === 0 || item.seen === false;
  const pinned   = item.pinned === 1;
  const convId   = item.conversation_id ?? item.id;
  const timeStr  = timeAgo(item.time ?? item.last_time);
  const preview  = item.message || '';

  const otherUser = {
    id: item.user_id, user_id: item.user_id,
    full_name: name, username: item.username ?? name,
    user_picture: rawPic ?? '',
  };

  const handlePress = () => {
    Haptics.selectionAsync();
    onMarkSeen?.(convId);
    navigation.navigate('Thread', { conversationId: convId, otherUser });
  };

  const renderRightActions = () => (
    <View style={s.swipeWrap}>
      <TouchableOpacity
        style={[s.swipeBtn, { backgroundColor: ACCENT }]}
        onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onPin(convId); }}
      >
        <Ionicons name={pinned ? 'pin' : 'pin-outline'} size={20} color={WHITE} />
        <Text style={s.swipeTxt}>{pinned ? 'Unpin' : 'Pin'}</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[s.swipeBtn, { backgroundColor: DANGER }]}
        onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); onDelete(convId); }}
      >
        <Ionicons name="trash-outline" size={20} color={WHITE} />
        <Text style={s.swipeTxt}>Delete</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <Animated.View style={{
      opacity: slideAnim,
      transform: [{ translateY: slideAnim.interpolate({ inputRange: [0, 1], outputRange: [16, 0] }) }],
    }}>
      <Swipeable renderRightActions={renderRightActions} overshootRight={false} friction={2}>
        <TouchableOpacity
          style={[s.row, unread && s.rowUnread]}
          activeOpacity={0.7}
          onPress={handlePress}
        >
          {/* Avatar */}
          <View style={s.avWrap}>
            <Image source={{ uri: avatar }} style={[s.av, unread && s.avUnread]} />
            {pinned && (
              <View style={s.pinBadge}>
                <Ionicons name="pin" size={8} color={WHITE} />
              </View>
            )}
          </View>

          {/* Body */}
          <View style={s.rowBody}>
            <View style={s.rowTop}>
              <Text style={[s.rowName, unread && s.rowNameBold]} numberOfLines={1}>
                {name}
              </Text>
              <Text style={[s.rowTime, unread && s.rowTimeUnread]}>{timeStr}</Text>
            </View>
            <View style={s.rowBottom}>
              <Text style={[s.rowPreview, unread && s.rowPreviewBold]} numberOfLines={1}>
                {preview || 'Say hello 👋'}
              </Text>
              {unread && <View style={s.unreadBadge}><View style={s.unreadDot} /></View>}
            </View>
          </View>
        </TouchableOpacity>
        {/* Divider */}
        <View style={s.divider} />
      </Swipeable>
    </Animated.View>
  );
});

/* ─── Empty state ─────────────────────────────────────────────────────────── */
const EmptyState = ({ filtered }) => (
  <View style={s.empty}>
    <View style={s.emptyIcon}>
      <Ionicons name={filtered ? 'search-outline' : 'chatbubbles-outline'} size={40} color={ACCENT + '88'} />
    </View>
    <Text style={s.emptyTitle}>{filtered ? 'No results' : 'No messages yet'}</Text>
    <Text style={s.emptySub}>
      {filtered ? 'Try a different search term.' : 'Start a conversation with someone on Hafrik.'}
    </Text>
  </View>
);

/* ─── New Message modal ───────────────────────────────────────────────────── */
const NewMessageModal = ({ visible, token, onClose, onSelect }) => {
  const { user }                = useAuth();
  const myId                    = user?.id ?? user?.user_id;
  const [contacts, setContacts] = useState([]);
  const [loading,  setLoading]  = useState(false);
  const [opening,  setOpening]  = useState(null);
  const [search,   setSearch]   = useState('');
  const { top }                 = useSafeAreaInsets();
  const searchRef               = useRef(null);

  useEffect(() => {
    if (!visible || !myId) return;
    setSearch('');
    setLoading(true);
    setTimeout(() => searchRef.current?.focus(), 400);
    // Only show people the current user follows (friends)
    api(`/api/v1/users/user_following.php?user_id=${myId}&limit=200`, token).then((res) => {
      const list =
        Array.isArray(res?.data?.data) ? res.data.data :
        Array.isArray(res?.data)       ? res.data : [];
      setContacts(list);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [visible, token, myId]);

  const filtered = contacts.filter((c) => {
    const n = (c.full_name ?? c.name ?? c.username ?? c.user_name ?? '').toLowerCase();
    return n.includes(search.toLowerCase());
  });

  const handleSelect = async (contact) => {
    if (opening) return;
    const uid = contact.id ?? contact.user_id;
    if (!uid) { Alert.alert('Error', 'Invalid contact.'); return; }
    setOpening(uid);
    try {
      const rawRes = await fetch(`${BASE_URL}/api/v1/messages/start.php`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ user_id: uid }),
      });
      const rawText = await rawRes.text();
      console.log('[handleSelect] start.php status:', rawRes.status, '| body:', rawText);
      let res = null;
      try { res = JSON.parse(rawText); } catch { /* not JSON */ }
      const convId =
        res?.data?.conversation_id ??
        res?.data?.id ??
        res?.data?.conversation?.id ??
        res?.conversation_id ??
        res?.conversation?.id ??
        res?.id ??
        null;
      if (convId) {
        onClose();
        onSelect({ conversationId: convId, otherUser: {
          ...contact,
          full_name: contact.full_name ?? contact.name ?? contact.username ?? contact.user_name,
        }});
      } else {
        Alert.alert('Error', res?.message ?? res?.data?.message ?? `Server error (${rawRes.status})`);
      }
    } catch (e) {
      Alert.alert('Error', 'Network error. Please try again.');
    } finally {
      setOpening(null);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={[nm.root, { paddingTop: top }]}>

        {/* ── Header ── */}
        <LinearGradient
          colors={[Colors.brandDeep ?? '#0a2e32', BRAND, ACCENT + 'DD']}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          style={nm.header}
        >
          <TouchableOpacity onPress={onClose} style={nm.backBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Ionicons name="chevron-down" size={22} color={WHITE} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={nm.headerTitle}>New Message</Text>
            <Text style={nm.headerSub}>{contacts.length > 0 ? `${contacts.length} contacts` : 'Select someone to chat'}</Text>
          </View>
        </LinearGradient>

        {/* ── Search bar ── */}
        <View style={nm.searchSection}>
          <View style={nm.toRow}>
            <Text style={nm.toLabel}>To:</Text>
            <TextInput
              ref={searchRef}
              style={nm.toInput}
              placeholder="Search by name or username…"
              placeholderTextColor={MUTED}
              value={search}
              onChangeText={setSearch}
              autoCapitalize="none"
              autoCorrect={false}
            />
            {search.length > 0 && (
              <TouchableOpacity onPress={() => setSearch('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Ionicons name="close-circle" size={18} color={MUTED} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* ── Contacts ── */}
        {loading ? (
          <View style={nm.loader}>
            <ActivityIndicator color={ACCENT} size="large" />
            <Text style={nm.loadingTxt}>Loading contacts…</Text>
          </View>
        ) : (
          <>
            {!search && filtered.length > 0 && (
              <Text style={nm.sectionTitle}>Suggested</Text>
            )}
            <FlatList
              data={filtered}
              keyExtractor={(c, i) => `c-${c.id ?? c.user_id ?? i}`}
              renderItem={({ item: c }) => {
                const uid      = c.id ?? c.user_id;
                const fullName = c.full_name ?? c.name ?? c.username ?? c.user_name ?? 'User';
                const handle   = c.username ?? c.user_name ?? '';
                const av       = avatarUri(c, fullName);
                const isOpening = opening === uid;
                return (
                  <TouchableOpacity
                    style={nm.row}
                    activeOpacity={0.75}
                    onPress={() => handleSelect(c)}
                    disabled={!!opening}
                  >
                    {/* Avatar */}
                    <View style={nm.avWrap}>
                      <Image source={{ uri: av }} style={nm.av} />
                    </View>

                    {/* Info */}
                    <View style={nm.info}>
                      <Text style={nm.name} numberOfLines={1}>{fullName}</Text>
                      {!!handle && <Text style={nm.handle} numberOfLines={1}>@{handle}</Text>}
                    </View>

                    {/* Action */}
                    {isOpening ? (
                      <ActivityIndicator size="small" color={ACCENT} />
                    ) : (
                      <View style={nm.msgBtn}>
                        <Ionicons name="chatbubble-ellipses" size={15} color={WHITE} />
                        <Text style={nm.msgBtnTxt}>Message</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                );
              }}
              ItemSeparatorComponent={() => <View style={nm.divider} />}
              ListEmptyComponent={
                <View style={nm.empty}>
                  <View style={nm.emptyIcon}>
                    <Ionicons name={search ? 'search-outline' : 'people-outline'} size={36} color={ACCENT + '88'} />
                  </View>
                  <Text style={nm.emptyTitle}>{search ? 'No results found' : 'No contacts yet'}</Text>
                  <Text style={nm.emptySub}>{search ? 'Try a different name.' : 'People you follow will appear here.'}</Text>
                </View>
              }
              contentContainerStyle={{ paddingBottom: 50 }}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            />
          </>
        )}
      </View>
    </Modal>
  );
};

/* ─── Main screen ─────────────────────────────────────────────────────────── */
export default function InboxScreen() {
  const navigation  = useNavigation();
  const { top }     = useSafeAreaInsets();
  const { token }   = useAuth();
  const setMsgCount = useStore((s) => s.setMessageCount);

  const [items,       setItems]       = useState([]);
  const [unreadItems, setUnreadItems] = useState([]);
  const [refreshing,  setRefreshing]  = useState(false);
  const [search,      setSearch]      = useState('');
  const [searchFocus, setSearchFocus] = useState(false);
  const [filter,      setFilter]      = useState('All');
  const [showCompose, setShowCompose] = useState(false);
  const [newBanner,   setNewBanner]   = useState(false);

  const pollRef       = useRef(null);
  const prevUnread    = useRef(0);
  const bannerAnim    = useRef(new Animated.Value(0)).current;
  // Tracks conversations the user has locally opened — survives polls
  const localSeenRef  = useRef(new Set());

  /* ── Data fetching ────────────────────────────────────────────────────────── */
  const load = useCallback(async () => {
    const res = await api('/api/v1/messages/conversations.php', token);
    const raw = Array.isArray(res?.data?.items) ? res.data.items
               : Array.isArray(res?.data)       ? res.data : [];
    const dedupIds = new Set();
    const unique   = raw
      .filter((c) => {
        const id = String(c.conversation_id ?? c.id);
        if (dedupIds.has(id)) return false;
        dedupIds.add(id); return true;
      })
      // Preserve local seen state even if backend hasn't updated yet
      .map((c) => {
        const id = String(c.conversation_id ?? c.id);
        return localSeenRef.current.has(id) ? { ...c, seen: 1 } : c;
      });
    setItems(unique);
    setRefreshing(false);
  }, [token]);

  const loadUnread = useCallback(async () => {
    const res = await api('/api/v1/messages/conversations.php?filter=unread', token);
    const raw = Array.isArray(res?.data?.items) ? res.data.items
               : Array.isArray(res?.data)       ? res.data : [];
    const seenIds = new Set();
    const unique  = raw.filter((c) => {
      const id = c.conversation_id ?? c.id;
      if (seenIds.has(id)) return false;
      seenIds.add(id); return true;
    }).filter((c) => {
      // Remove any that were locally marked as seen
      const id = String(c.conversation_id ?? c.id);
      return !localSeenRef.current.has(id);
    });
    setUnreadItems(unique);
  }, [token]);

  const refreshUnread = useCallback(async () => {
    const res         = await api('/api/v1/messages/unread-count.php', token);
    const serverCount = Number(res?.data?.unread ?? 0);
    // Subtract locally-seen convos that backend may not have updated yet
    const localSeenCount = localSeenRef.current.size;
    const count = Math.max(0, serverCount - localSeenCount);
    // Only update if server says MORE than our optimistic count — prevents overwriting decrements
    setMsgCount((prev) => {
      if (serverCount > (prev ?? 0)) return serverCount; // new message arrived
      return Math.min(prev ?? 0, count);                 // take the lower value
    });
    if (serverCount > prevUnread.current) setNewBanner(true);
    prevUnread.current = serverCount;
  }, [token, setMsgCount]);

  useEffect(() => {
    load(); loadUnread(); refreshUnread();
    pollRef.current = setInterval(() => { load(); loadUnread(); refreshUnread(); }, 7000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, []);

  useEffect(() => {
    if (!newBanner) return;
    Animated.sequence([
      Animated.timing(bannerAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
      Animated.delay(3000),
      Animated.timing(bannerAnim, { toValue: 0, duration: 300, useNativeDriver: true }),
    ]).start(() => setNewBanner(false));
  }, [newBanner]);

  /* ── Actions ──────────────────────────────────────────────────────────────── */
  const onRefresh = () => { setRefreshing(true); load(); refreshUnread(); };

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

  const handleMarkSeen = useCallback((convId) => {
    const id = String(convId);
    localSeenRef.current.add(id);   // persist through polls
    setItems((prev) => prev.map((c) =>
      String(c.conversation_id ?? c.id) === id ? { ...c, seen: 1 } : c
    ));
    setUnreadItems((prev) => prev.filter((c) => String(c.conversation_id ?? c.id) !== id));
    // Immediately decrement tab badge without waiting for next poll
    setMsgCount((prev) => Math.max(0, (prev ?? 1) - 1));
  }, [setMsgCount]);

  /* ── Derived ──────────────────────────────────────────────────────────────── */
  const isUnread     = (c) => c.seen === '0' || c.seen === 0 || c.seen === false;
  const totalUnread  = items.filter(isUnread).length;

  const flatData = useMemo(() => {
    const source   = filter === 'Unread' ? unreadItems : items;
    const searched = source.filter((c) => {
      const n = (c.full_name ?? c.name ?? c.user_name ?? c.username ?? '').toLowerCase();
      return n.includes(search.toLowerCase());
    });
    const pinned = searched.filter((c) => c.pinned === 1);
    const normal = searched.filter((c) => c.pinned !== 1);
    const rows   = [];
    pinned.forEach((item, i) => rows.push({ _type: 'item', item, _i: i, _pinned: true }));
    normal.forEach((item, i) => rows.push({ _type: 'item', item, _i: i + pinned.length }));
    return rows;
  }, [items, unreadItems, filter, search]);

  const renderRow = ({ item: row }) => (
    <ConvCard
      item={row.item}
      index={row._i}
      onDelete={handleDelete}
      onPin={handlePin}
      onMarkSeen={handleMarkSeen}
    />
  );

  const listIsEmpty   = flatData.length === 0;
  const isSearching   = search.length > 0;

  return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" backgroundColor={BRAND} translucent />

      {/* ── Gradient header ── */}
      <LinearGradient
        colors={[Colors.brandDeep ?? '#0a2e32', BRAND, ACCENT + 'CC']}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        style={[s.header, { paddingTop: top + 8 }]}
      >
        {/* Title row */}
        <View style={s.titleRow}>
          <View style={{ flex: 1 }}>
            <Text style={s.headerTitle}>Messages</Text>
            {totalUnread > 0 && (
              <Text style={s.headerSub}>{totalUnread} unread</Text>
            )}
          </View>
          <TouchableOpacity style={s.composeBtn} onPress={() => setShowCompose(true)} activeOpacity={0.85}>
            <Ionicons name="create-outline" size={20} color={WHITE} />
          </TouchableOpacity>
        </View>

        {/* Search */}
        <View style={[s.searchBar, searchFocus && s.searchFocused]}>
          <Ionicons name="search" size={15} color={searchFocus ? ACCENT : MUTED} />
          <TextInput
            style={s.searchInput}
            placeholder="Search conversations…"
            placeholderTextColor={MUTED}
            value={search}
            onChangeText={setSearch}
            onFocus={() => setSearchFocus(true)}
            onBlur={() => setSearchFocus(false)}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="close-circle" size={16} color={MUTED} />
            </TouchableOpacity>
          )}
        </View>

        {/* Filter chips */}
        <View style={s.filterRow}>
          {['All', 'Unread'].map((f) => {
            const active = filter === f;
            return (
              <TouchableOpacity
                key={f}
                style={[s.chip, active && s.chipActive]}
                onPress={() => setFilter(f)}
                activeOpacity={0.8}
              >
                {f === 'Unread' && totalUnread > 0 && (
                  <View style={s.chipBadge}>
                    <Text style={s.chipBadgeTxt}>{totalUnread > 9 ? '9+' : totalUnread}</Text>
                  </View>
                )}
                <Text style={[s.chipTxt, active && s.chipTxtActive]}>{f}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </LinearGradient>

      {/* ── New message toast ── */}
      {newBanner && (
        <Animated.View style={[s.toast, {
          opacity: bannerAnim,
          transform: [{ translateY: bannerAnim.interpolate({ inputRange: [0, 1], outputRange: [-48, 0] }) }],
        }]}>
          <View style={s.toastDot} />
          <Text style={s.toastTxt}>New message received</Text>
        </Animated.View>
      )}

      {/* ── Conversation list ── */}
      <FlatList
        data={flatData}
        keyExtractor={(row, i) => `conv-${row.item?.conversation_id ?? i}`}
        renderItem={renderRow}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={ACCENT} />}
        ListEmptyComponent={<EmptyState filtered={isSearching || filter === 'Unread'} />}
        contentContainerStyle={listIsEmpty ? { flex: 1 } : { paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
        removeClippedSubviews
        style={s.list}
      />

      {/* ── Compose FAB ── */}
      <TouchableOpacity style={s.fab} onPress={() => setShowCompose(true)} activeOpacity={0.85}>
        <LinearGradient colors={[ACCENT, BRAND]} style={s.fabGrad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
          <Ionicons name="chatbubble-ellipses" size={22} color={WHITE} />
        </LinearGradient>
      </TouchableOpacity>

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

/* ─── Styles ──────────────────────────────────────────────────────────────── */
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f7f9fb' },

  /* Header */
  header: { paddingHorizontal: 20, paddingBottom: 16 },
  titleRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  headerTitle: { fontSize: 26, fontWeight: '900', color: WHITE, letterSpacing: 0.3 },
  headerSub:   { fontSize: 12, color: WHITE + '99', marginTop: 2, fontWeight: '600' },
  composeBtn:  {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: WHITE + '22', alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: WHITE + '30',
  },

  /* Search */
  searchBar: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: WHITE, borderRadius: 14,
    paddingHorizontal: 14, height: 44,
    borderWidth: 1.5, borderColor: 'transparent',
    marginBottom: 12,
  },
  searchFocused: { borderColor: ACCENT },
  searchInput:   { flex: 1, fontSize: 14, color: DARK },

  /* Filter chips */
  filterRow: { flexDirection: 'row', gap: 8 },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 16, paddingVertical: 7,
    borderRadius: 100, backgroundColor: WHITE + '22',
    borderWidth: 1, borderColor: WHITE + '30',
  },
  chipActive:    { backgroundColor: WHITE, borderColor: WHITE },
  chipTxt:       { fontSize: 13, fontWeight: '700', color: WHITE + 'CC' },
  chipTxtActive: { color: BRAND },
  chipBadge:     { backgroundColor: DANGER, borderRadius: 100, minWidth: 18, height: 18, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  chipBadgeTxt:  { fontSize: 10, fontWeight: '900', color: WHITE },

  /* Toast */
  toast: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: BRAND, paddingHorizontal: 18, paddingVertical: 11,
    borderRadius: 100, marginHorizontal: 20, marginTop: 10,
    alignSelf: 'flex-start',
    shadowColor: BRAND, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 10, elevation: 6,
  },
  toastDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#22c55e' },
  toastTxt: { color: WHITE, fontSize: 13, fontWeight: '700' },

  /* List */
  list: { flex: 1 },

  /* Conversation row */
  row: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: WHITE, paddingHorizontal: 20, paddingVertical: 14,
  },
  rowUnread: { backgroundColor: ACCENT + '08' },

  avWrap:  { position: 'relative', marginRight: 14 },
  av:      { width: 54, height: 54, borderRadius: 27, backgroundColor: BRAND + '22' },
  avUnread:{ borderWidth: 2.5, borderColor: ACCENT },
  pinBadge:{ position: 'absolute', bottom: 0, right: 0, width: 18, height: 18, borderRadius: 9, backgroundColor: ACCENT, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: WHITE },

  rowBody:   { flex: 1 },
  rowTop:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 5 },
  rowBottom: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },

  rowName:        { fontSize: 15, fontWeight: '600', color: DARK, flex: 1, marginRight: 8 },
  rowNameBold:    { fontWeight: '800', color: '#111' },
  rowTime:        { fontSize: 12, color: MUTED, fontWeight: '500' },
  rowTimeUnread:  { color: ACCENT, fontWeight: '700' },
  rowPreview:     { fontSize: 13, color: MUTED, flex: 1, marginRight: 8 },
  rowPreviewBold: { color: '#444', fontWeight: '600' },

  unreadBadge: { alignItems: 'center', justifyContent: 'center' },
  unreadDot:   { width: 10, height: 10, borderRadius: 5, backgroundColor: UNREAD_CLR },

  divider: { height: StyleSheet.hairlineWidth, backgroundColor: '#e8edf0', marginLeft: 88 },

  /* Swipe actions */
  swipeWrap: { flexDirection: 'row', alignItems: 'center', paddingRight: 12, gap: 6 },
  swipeBtn:  { width: 68, alignSelf: 'stretch', borderRadius: 16, alignItems: 'center', justifyContent: 'center', gap: 4, marginVertical: 2 },
  swipeTxt:  { color: WHITE, fontSize: 11, fontWeight: '800' },

  /* FAB */
  fab: {
    position: 'absolute', bottom: 28, right: 20,
    borderRadius: 28,
    shadowColor: BRAND, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.35, shadowRadius: 12, elevation: 8,
  },
  fabGrad: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },

  /* Empty */
  empty:      { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  emptyIcon:  { width: 88, height: 88, borderRadius: 44, backgroundColor: ACCENT + '12', alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  emptyTitle: { fontSize: 18, fontWeight: '800', color: DARK },
  emptySub:   { fontSize: 13, color: MUTED, textAlign: 'center', maxWidth: 240, lineHeight: 20 },
});

/* ─── New Message modal styles ────────────────────────────────────────────── */
const nm = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f7f9fb' },

  // Header
  header:      { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 18, paddingVertical: 18 },
  backBtn:     { width: 36, height: 36, borderRadius: 18, backgroundColor: WHITE + '22', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 20, fontWeight: '900', color: WHITE },
  headerSub:   { fontSize: 12, color: WHITE + '88', marginTop: 2 },

  // Search / To: row
  searchSection: {
    backgroundColor: WHITE,
    borderBottomWidth: 1, borderBottomColor: '#e8edf0',
    paddingHorizontal: 18, paddingVertical: 10,
  },
  toRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  toLabel: { fontSize: 15, fontWeight: '700', color: ACCENT, minWidth: 28 },
  toInput: { flex: 1, fontSize: 15, color: DARK, paddingVertical: 6 },

  sectionTitle: {
    fontSize: 12, fontWeight: '800', color: MUTED,
    textTransform: 'uppercase', letterSpacing: 1.2,
    paddingHorizontal: 18, paddingTop: 20, paddingBottom: 8,
  },

  loader:     { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, paddingTop: 60 },
  loadingTxt: { fontSize: 14, color: MUTED },

  // Contact row
  row: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: WHITE, paddingHorizontal: 18, paddingVertical: 13,
  },
  avWrap: { position: 'relative' },
  av:     { width: 50, height: 50, borderRadius: 25, backgroundColor: BRAND + '22' },
  info:   { flex: 1 },
  name:   { fontSize: 15, fontWeight: '700', color: DARK },
  handle: { fontSize: 12, color: MUTED, marginTop: 2 },

  msgBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: ACCENT, borderRadius: 100,
    paddingHorizontal: 12, paddingVertical: 7,
  },
  msgBtnTxt: { fontSize: 12, fontWeight: '800', color: WHITE },

  divider: { height: StyleSheet.hairlineWidth, backgroundColor: '#e8edf0', marginLeft: 82 },

  // Empty
  empty:     { alignItems: 'center', paddingTop: 72, gap: 12, paddingHorizontal: 40 },
  emptyIcon: { width: 80, height: 80, borderRadius: 40, backgroundColor: ACCENT + '12', alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  emptyTitle:{ fontSize: 17, fontWeight: '800', color: DARK },
  emptySub:  { fontSize: 13, color: MUTED, textAlign: 'center', lineHeight: 20 },
});
