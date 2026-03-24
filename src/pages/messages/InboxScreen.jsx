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
  TextInput,
  StatusBar,
  Modal,
  ActivityIndicator,
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
const BG       = Colors.surfaceTint;
const WHITE    = Colors.white;
const BLACK    = Colors.black;
const DANGER   = Colors.destructive;

const apiFetch = async (path, token, opts = {}) => {
  try {
    const res = await fetch(`${BASE_URL}${path}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
        'Content-Type': 'application/json',
        ...(opts.headers ?? {}),
      },
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
  if (diff < 60)    return 'now';
  if (diff < 3600)  return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d`;
  return new Date(dateStr).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
};

/* ─── Online pulse dot ─── */
const OnlineDot = () => {
  const pulse = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.5, duration: 800, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 800, useNativeDriver: true }),
      ])
    ).start();
  }, []);
  return (
    <View style={styles.onlineDotWrap}>
      <Animated.View style={[styles.onlineDotRing, { transform: [{ scale: pulse }] }]} />
      <View style={styles.onlineDot} />
    </View>
  );
};

/* ─── Conversation card ─── */
const ConvCard = React.memo(({ item, index, onDelete, onPin }) => {
  const navigation = useNavigation();
  const anim       = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(anim, {
      toValue: 1,
      delay: Math.min(index * 35, 250),
      useNativeDriver: true,
      tension: 80,
      friction: 10,
    }).start();
  }, []);

  const other       = item.other_user ?? item.user ?? {};
  const avatar      = other.avatar ?? null;
  const name        = other.username ?? 'User';
  const unreadCount = Number(item.unread_count ?? 0);
  const unread      = unreadCount > 0;
  const isOnline    = item.online === 1;
  const typing      = item.typing === 1;
  const timeStr     = timeAgo(item.last_message_at ?? item.updated_at);
  const pinned      = item.pinned === 1;

  const handlePress = () => {
    Haptics.selectionAsync();
    navigation.navigate('Thread', {
      conversationId: item.conversation_id ?? item.id,
      otherUser: other,
    });
  };

  const renderRightActions = () => (
    <View style={styles.swipeActions}>
      <TouchableOpacity
        style={[styles.swipeBtn, { backgroundColor: ACCENT }]}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          onPin(item.conversation_id);
        }}
      >
        <Ionicons name={pinned ? 'pin' : 'pin-outline'} size={18} color={WHITE} />
        <Text style={styles.swipeBtnText}>{pinned ? 'Unpin' : 'Pin'}</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.swipeBtn, { backgroundColor: DANGER }]}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          onDelete(item.conversation_id);
        }}
      >
        <Ionicons name="trash-outline" size={18} color={WHITE} />
        <Text style={styles.swipeBtnText}>Delete</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <Animated.View
      style={{
        opacity: anim,
        transform: [{ translateX: anim.interpolate({ inputRange: [0, 1], outputRange: [-20, 0] }) }],
      }}
    >
      <Swipeable renderRightActions={renderRightActions} overshootRight={false} friction={2}>
        <TouchableOpacity
          style={[styles.card, unread && styles.cardUnread]}
          activeOpacity={0.88}
          onPress={handlePress}
        >
          {/* Avatar */}
          <View style={styles.avatarWrap}>
            <Image
              source={{ uri: avatar ?? 'https://ui-avatars.com/api/?name=U' }}
              style={styles.avatar}
            />
            {isOnline && <OnlineDot />}
            {pinned && (
              <View style={styles.pinnedBadge}>
                <Ionicons name="pin" size={9} color={WHITE} />
              </View>
            )}
          </View>

          {/* Content */}
          <View style={styles.cardContent}>
            <View style={styles.cardRow}>
              <Text style={[styles.cardName, unread && styles.cardNameBold]} numberOfLines={1}>
                {name}
              </Text>
              <Text style={[styles.cardTime, unread && { color: ACCENT }]}>{timeStr}</Text>
            </View>

            <View style={styles.cardRow}>
              <Text
                style={[styles.cardPreview, typing && { color: ACCENT, fontStyle: 'italic' }]}
                numberOfLines={1}
              >
                {typing ? 'typing…' : item.last_message ?? 'Say hello 👋'}
              </Text>

              {unreadCount > 0 && (
                <View style={[styles.badge, { backgroundColor: ACCENT }]}>
                  <Text style={styles.badgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
                </View>
              )}
            </View>
          </View>

          {/* Unread strip */}
          {unread && <View style={styles.unreadStrip} />}
        </TouchableOpacity>
      </Swipeable>
    </Animated.View>
  );
});

/* ─── Filter tabs (All / Unread) ─── */
const FilterTabs = ({ active, onChange }) => (
  <View style={styles.filterRow}>
    {['All', 'Unread'].map((f) => (
      <TouchableOpacity
        key={f}
        style={[styles.filterTab, active === f && styles.filterTabOn]}
        onPress={() => onChange(f)}
        activeOpacity={0.8}
      >
        <Text style={[styles.filterTabTxt, active === f && styles.filterTabTxtOn]}>{f}</Text>
      </TouchableOpacity>
    ))}
  </View>
);

/* ─── Online story bubble ─── */
const StoryBubble = ({ item }) => {
  const other = item.other_user ?? item.user ?? {};
  const name  = (other.username ?? 'User').split(' ')[0];
  return (
    <View style={styles.storyWrap}>
      <View style={styles.storyRing}>
        <Image
          source={{ uri: other.avatar ?? `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=${BRAND.replace('#', '')}&color=${WHITE.replace('#', '')}` }}
          style={styles.storyAvatar}
        />
        <View style={styles.storyDot} />
      </View>
      <Text style={styles.storyName} numberOfLines={1}>{name}</Text>
    </View>
  );
};

/* ─── Section label ─── */
const SectionLabel = ({ label }) => (
  <View style={styles.sectionLabel}>
    <Ionicons name="pin" size={11} color={ACCENT} />
    <Text style={styles.sectionLabelText}>{label}</Text>
  </View>
);

/* ─── Empty state ─── */
const EmptyState = () => (
  <View style={styles.empty}>
    <View style={[styles.emptyCircle, { backgroundColor: ACCENT + '1A' }]}>
      <Ionicons name="chatbubbles-outline" size={44} color={MUTED} />
    </View>
    <Text style={styles.emptyTitle}>No conversations yet</Text>
    <Text style={styles.emptySubtitle}>Start a conversation with someone on Hafrik.</Text>
  </View>
);

/* ─── Contacts modal ─── */
const ContactsModal = ({ visible, token, onClose, onSelect }) => {
  const [contacts, setContacts]   = useState([]);
  const [loading, setLoading]     = useState(false);
  const [opening, setOpening]     = useState(null); // user_id being opened
  const [search, setSearch]       = useState('');
  const { top }                   = useSafeAreaInsets();

  useEffect(() => {
    if (!visible) return;
    setSearch('');
    setLoading(true);
    apiFetch('/api/v1/messages/contacts.php', token).then((res) => {
      const list =
        Array.isArray(res?.data?.contacts) ? res.data.contacts :
        Array.isArray(res?.data)           ? res.data :
        [];
      setContacts(list);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [visible, token]);

  const filtered = contacts.filter((c) => {
    const name = (c.username ?? c.full_name ?? '').toLowerCase();
    return name.includes(search.toLowerCase());
  });

  const handleSelect = async (contact) => {
    if (opening) return;
    const uid = contact.id ?? contact.user_id;
    setOpening(uid);
    const res = await apiFetch('/api/v1/messages/open.php', token, {
      method: 'POST',
      body: JSON.stringify({ user_id: uid }),
    });
    setOpening(null);
    const convId = res?.data?.conversation_id ?? res?.conversation_id;
    if (convId) {
      onClose();
      onSelect({ conversationId: convId, otherUser: contact });
    }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={[cm.root, { paddingTop: top }]}>
        {/* Header */}
        <View style={cm.header}>
          <Text style={cm.title}>New Message</Text>
          <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Ionicons name="close" size={22} color={WHITE} />
          </TouchableOpacity>
        </View>

        {/* Search */}
        <View style={cm.searchBar}>
          <Ionicons name="search" size={15} color={WHITE + '88'} />
          <TextInput
            style={cm.searchInput}
            placeholder="Search people…"
            placeholderTextColor={WHITE + '55'}
            value={search}
            onChangeText={setSearch}
            autoCorrect={false}
          />
        </View>

        {/* List */}
        {loading ? (
          <View style={cm.loader}>
            <ActivityIndicator color={ACCENT} size="large" />
          </View>
        ) : (
          <FlatList
            data={filtered}
            keyExtractor={(c, i) => `contact-${c.id ?? c.user_id ?? i}`}
            renderItem={({ item: c }) => {
              const uid  = c.id ?? c.user_id;
              const name = c.username ?? c.full_name ?? 'User';
              const av   = c.avatar ?? null;
              const busy = opening === uid;
              return (
                <TouchableOpacity style={cm.contactRow} activeOpacity={0.8} onPress={() => handleSelect(c)}>
                  <Image
                    source={{ uri: av ?? `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}` }}
                    style={cm.avatar}
                  />
                  <View style={{ flex: 1 }}>
                    <Text style={cm.name}>{name}</Text>
                    {c.bio ? <Text style={cm.bio} numberOfLines={1}>{c.bio}</Text> : null}
                  </View>
                  {busy
                    ? <ActivityIndicator size="small" color={ACCENT} />
                    : <Ionicons name="chevron-forward" size={16} color={MUTED} />
                  }
                </TouchableOpacity>
              );
            }}
            ListEmptyComponent={
              <View style={cm.emptyWrap}>
                <Text style={cm.emptyTxt}>No contacts found</Text>
              </View>
            }
            contentContainerStyle={{ paddingBottom: 40 }}
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>
    </Modal>
  );
};

/* ─── Main screen ─── */
export default function InboxScreen() {
  const navigation    = useNavigation();
  const { top }       = useSafeAreaInsets();
  const { token }     = useAuth();
  const { colors: tc } = useTheme();
  const setMsgCount   = useStore((s) => s.setMessageCount);

  const [items,        setItems]        = useState([]);
  const [refreshing,   setRefreshing]   = useState(false);
  const [search,       setSearch]       = useState('');
  const [searchFocus,  setSearchFocus]  = useState(false);
  const [filter,       setFilter]       = useState('All');
  const [showContacts, setShowContacts] = useState(false);
  const [newBanner,    setNewBanner]    = useState(false);

  const pollRef      = useRef(null);
  const prevUnread   = useRef(0);
  const headerAnim   = useRef(new Animated.Value(0)).current;
  const bannerAnim   = useRef(new Animated.Value(0)).current;
  const searchWidth  = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(headerAnim, { toValue: 1, duration: 500, useNativeDriver: true }).start();
    load();
    // Poll every 7 seconds for new messages
    pollRef.current = setInterval(load, 7000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  useEffect(() => {
    Animated.spring(searchWidth, {
      toValue: searchFocus ? 1 : 0,
      useNativeDriver: false,
      tension: 80,
      friction: 10,
    }).start();
  }, [searchFocus]);

  // Banner animation
  useEffect(() => {
    if (newBanner) {
      Animated.sequence([
        Animated.timing(bannerAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.delay(3000),
        Animated.timing(bannerAnim, { toValue: 0, duration: 300, useNativeDriver: true }),
      ]).start(() => setNewBanner(false));
    }
  }, [newBanner]);

  const load = useCallback(async () => {
    const res = await apiFetch('/api/v1/messages/conversations.php?page=1&limit=30', token);

    const raw = Array.isArray(res?.data?.items)
      ? res.data.items
      : Array.isArray(res?.data)
      ? res.data
      : [];

    const seen = new Set();
    const unique = raw.filter((c) => {
      const id = c.conversation_id ?? c.id;
      if (seen.has(id)) return false;
      seen.add(id);
      return true;
    });

    setItems(unique);

    const totalUnread = unique.reduce((sum, c) => sum + Number(c.unread_count ?? 0), 0);
    setMsgCount(totalUnread);

    // Show "new message" banner if unread count increased since last poll
    if (totalUnread > prevUnread.current) {
      setNewBanner(true);
    }
    prevUnread.current = totalUnread;
    setRefreshing(false);
  }, [token]);

  const onRefresh = () => { setRefreshing(true); load(); };

  const handleDelete = useCallback((id) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setItems((prev) => prev.filter((i) => i.conversation_id !== id));
  }, []);

  const handlePin = useCallback((id) => {
    setItems((prev) =>
      prev.map((c) =>
        c.conversation_id === id ? { ...c, pinned: c.pinned === 1 ? 0 : 1 } : c
      )
    );
  }, []);

  const filtered = useMemo(() => {
    return items.filter((c) => {
      const other = c.other_user ?? c.user ?? {};
      return (other.username ?? '').toLowerCase().includes(search.toLowerCase());
    });
  }, [items, search]);

  const pinned = filtered.filter((c) => c.pinned === 1);
  const normal = filtered.filter((c) => c.pinned !== 1);

  const applyFilter = (arr) =>
    filter === 'Unread' ? arr.filter((c) => Number(c.unread_count ?? 0) > 0) : arr;

  const activeConvs = items.filter((c) => c.online === 1).slice(0, 12);

  const totalUnreadDisplay = items.reduce((sum, c) => sum + Number(c.unread_count ?? 0), 0);

  const flatData = useMemo(() => {
    const rows = [];
    const pinnedF = applyFilter(pinned);
    const normalF = applyFilter(normal);
    if (pinnedF.length > 0) {
      rows.push({ _type: 'label', label: 'Pinned' });
      pinnedF.forEach((item, i) => rows.push({ _type: 'item', item, _i: i }));
    }
    if (normalF.length > 0) {
      if (pinnedF.length > 0) rows.push({ _type: 'label', label: 'All Messages' });
      normalF.forEach((item, i) => rows.push({ _type: 'item', item, _i: i }));
    }
    return rows;
  }, [pinned, normal, filter]);

  const renderRow = ({ item: row }) => {
    if (row._type === 'label') return <SectionLabel label={row.label} />;
    return (
      <ConvCard
        item={row.item}
        index={row._i}
        onDelete={handleDelete}
        onPin={handlePin}
      />
    );
  };

  return (
    <View style={[styles.root, { backgroundColor: tc.background }]}>
      <StatusBar barStyle="light-content" />

      {/* ── Header ── */}
      <View style={[styles.header, { paddingTop: top + 6 }]}>
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
          <View style={{ flex: 1 }}>
            <Text style={styles.headerEyebrow}>HAFRIK</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Text style={styles.headerTitle}>Messages</Text>
              {totalUnreadDisplay > 0 && (
                <View style={styles.titleUnreadBadge}>
                  <Text style={styles.titleUnreadTxt}>
                    {totalUnreadDisplay > 9 ? '9+' : totalUnreadDisplay}
                  </Text>
                </View>
              )}
            </View>
            {items.length > 0 && (
              <Text style={styles.headerStat}>{items.length} conversations</Text>
            )}
          </View>

          <TouchableOpacity style={styles.composeBtn} activeOpacity={0.8}
            onPress={() => setShowContacts(true)}
          >
            <Ionicons name="create-outline" size={20} color={WHITE} />
          </TouchableOpacity>
        </Animated.View>

        {/* Search bar */}
        <View style={[styles.searchBar, searchFocus && styles.searchBarFocused]}>
          <Ionicons name="search" size={16} color={searchFocus ? ACCENT : WHITE + '88'} />
          <TextInput
            placeholder="Search messages…"
            value={search}
            onChangeText={setSearch}
            onFocus={() => setSearchFocus(true)}
            onBlur={() => setSearchFocus(false)}
            style={styles.searchInput}
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
        <Animated.View
          style={[
            styles.banner,
            { opacity: bannerAnim, transform: [{ translateY: bannerAnim.interpolate({ inputRange: [0, 1], outputRange: [-40, 0] }) }] },
          ]}
        >
          <Ionicons name="chatbubble-ellipses" size={15} color={WHITE} />
          <Text style={styles.bannerText}>New message received</Text>
        </Animated.View>
      )}

      {/* ── List ── */}
      <FlatList
        data={flatData}
        keyExtractor={(row, i) =>
          row._type === 'label' ? `lbl-${row.label}` : `conv-${row.item?.conversation_id ?? i}`
        }
        renderItem={renderRow}
        ListHeaderComponent={
          <>
            {/* Active now stories */}
            {activeConvs.length > 0 && (
              <View>
                <View style={styles.activeLabelRow}>
                  <View style={styles.activeDot} />
                  <Text style={styles.activeLabel}>Active Now</Text>
                </View>
                <FlatList
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  data={activeConvs}
                  keyExtractor={(c, i) => `story-${c.conversation_id ?? i}`}
                  renderItem={({ item }) => <StoryBubble item={item} />}
                  contentContainerStyle={{ paddingHorizontal: 14, paddingBottom: 12, gap: 12 }}
                />
              </View>
            )}
            {/* Filter tabs */}
            <FilterTabs active={filter} onChange={setFilter} />
          </>
        }
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={ACCENT} />
        }
        ListEmptyComponent={<EmptyState />}
        contentContainerStyle={{ paddingTop: 12, paddingBottom: 40, flexGrow: 1 }}
        showsVerticalScrollIndicator={false}
        removeClippedSubviews
      />

      {/* ── Contacts modal ── */}
      <ContactsModal
        visible={showContacts}
        token={token}
        onClose={() => setShowContacts(false)}
        onSelect={({ conversationId, otherUser }) => {
          navigation.navigate('Thread', { conversationId, otherUser });
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },

  /* Header */
  header: {
    backgroundColor: BRAND,
    paddingHorizontal: 16,
    paddingBottom: 16,
    shadowColor: BRAND,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.22,
    shadowRadius: 10,
    elevation: 8,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
    gap: 10,
  },
  backBtn: {
    width: 38, height: 38, borderRadius: 12,
    backgroundColor: WHITE + '24',
    alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 22, fontWeight: '900', color: WHITE, letterSpacing: 0.2,
  },
  titleUnreadBadge: {
    backgroundColor: ACCENT, borderRadius: 100,
    paddingHorizontal: 7, paddingVertical: 2, minWidth: 22, alignItems: 'center',
  },
  titleUnreadTxt: { color: WHITE, fontSize: 11, fontWeight: '900' },
  headerStat:     { fontSize: 11, color: WHITE + '66', marginTop: 2 },
  composeBtn: {
    width: 38, height: 38, borderRadius: 12,
    backgroundColor: ACCENT + '33',
    alignItems: 'center', justifyContent: 'center',
  },

  /* Search */
  searchBar: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: WHITE + '1F',
    borderRadius: 14, paddingHorizontal: 14, height: 44,
    borderWidth: 1, borderColor: WHITE + '14',
  },
  searchBarFocused: {
    backgroundColor: WHITE + '2E',
    borderColor: ACCENT + '55',
  },
  searchInput: {
    flex: 1, fontSize: 14, color: WHITE,
  },

  /* New message banner */
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: ACCENT,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  bannerText: { color: WHITE, fontSize: 13, fontWeight: '700' },

  /* Section label */
  sectionLabel: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    marginHorizontal: 16, marginTop: 16, marginBottom: 6,
  },
  sectionLabelText: {
    fontSize: 11, fontWeight: '900', color: MUTED,
    textTransform: 'uppercase', letterSpacing: 1.4,
  },

  /* Card */
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: WHITE,
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 18,
    padding: 14,
    shadowColor: BLACK,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
    overflow: 'hidden',
  },
  cardUnread: {
    backgroundColor: ACCENT + '1F',
    shadowColor: ACCENT,
    shadowOpacity: 0.1,
  },

  /* Avatar */
  avatarWrap: { position: 'relative', marginRight: 14 },
  avatar: { width: 56, height: 56, borderRadius: 28 },

  onlineDotWrap: { position: 'absolute', bottom: 1, right: 1 },
  onlineDotRing: {
    position: 'absolute',
    width: 14, height: 14, borderRadius: 7,
    backgroundColor: ACCENT + '40',
    top: -3, left: -3,
  },
  onlineDot: {
    width: 12, height: 12, borderRadius: 6,
    backgroundColor: ACCENT,
    borderWidth: 2, borderColor: WHITE,
  },

  pinnedBadge: {
    position: 'absolute', top: -2, right: -2,
    width: 16, height: 16, borderRadius: 8,
    backgroundColor: ACCENT,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, borderColor: WHITE,
  },

  /* Card content */
  cardContent: { flex: 1 },
  cardRow: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', marginBottom: 5,
  },
  cardName: { fontSize: 15, fontWeight: '600', color: DARK, flex: 1, marginRight: 8 },
  cardNameBold: { fontWeight: '800' },
  cardTime: { fontSize: 11, color: MUTED, fontWeight: '500' },
  cardPreview: { fontSize: 13, color: MUTED, flex: 1, marginRight: 8 },

  badge: {
    minWidth: 22, height: 22, borderRadius: 11,
    alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6,
  },
  badgeText: { color: WHITE, fontSize: 11, fontWeight: '900' },

  unreadStrip: {
    position: 'absolute', left: 0, top: 0, bottom: 0,
    width: 3.5, backgroundColor: ACCENT, borderRadius: 2,
  },

  /* Swipe actions */
  swipeActions: { flexDirection: 'row', marginBottom: 8, gap: 6, paddingRight: 16 },
  swipeBtn: {
    width: 64, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center', gap: 4, paddingVertical: 8,
  },
  swipeBtnText: { color: WHITE, fontSize: 10, fontWeight: '800' },

  /* Empty */
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 80, gap: 16 },
  emptyCircle: {
    width: 100, height: 100, borderRadius: 50,
    alignItems: 'center', justifyContent: 'center',
  },
  emptyTitle:    { fontSize: 18, fontWeight: '800', color: DARK },
  emptySubtitle: { fontSize: 13, color: MUTED, textAlign: 'center', maxWidth: 220, lineHeight: 20 },

  /* Header eyebrow */
  headerEyebrow: { fontSize: 9, fontWeight: '800', letterSpacing: 2.5, color: ACCENT, marginBottom: 1 },

  /* Filter tabs */
  filterRow: {
    flexDirection: 'row', paddingHorizontal: 16, paddingTop: 10, paddingBottom: 4, gap: 8,
  },
  filterTab: {
    paddingHorizontal: 16, paddingVertical: 7, borderRadius: 100,
    backgroundColor: BRAND + '0F', borderWidth: 1, borderColor: BRAND + '14',
  },
  filterTabOn:    { backgroundColor: BRAND, borderColor: BRAND },
  filterTabTxt:   { fontSize: 12, fontWeight: '700', color: DARK },
  filterTabTxtOn: { color: WHITE },

  /* Active now stories */
  activeLabelRow: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 16, paddingTop: 14, paddingBottom: 10,
  },
  activeDot: {
    width: 8, height: 8, borderRadius: 4, backgroundColor: ACCENT,
  },
  activeLabel: {
    fontSize: 11, fontWeight: '900', color: MUTED,
    textTransform: 'uppercase', letterSpacing: 1.4,
  },
  storyWrap:   { alignItems: 'center', width: 62, gap: 5 },
  storyRing: {
    width: 58, height: 58, borderRadius: 29, position: 'relative',
    borderWidth: 2.5, borderColor: ACCENT,
    padding: 2,
  },
  storyAvatar: { width: '100%', height: '100%', borderRadius: 26 },
  storyDot: {
    position: 'absolute', bottom: 0, right: 0,
    width: 14, height: 14, borderRadius: 7,
    backgroundColor: ACCENT, borderWidth: 2.5, borderColor: WHITE,
  },
  storyName: { fontSize: 10, fontWeight: '600', color: DARK, textAlign: 'center' },
});

/* ─── ContactsModal styles ─── */
const cm = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },
  header: {
    backgroundColor: BRAND,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    paddingBottom: 10,
  },
  title: { fontSize: 18, fontWeight: '900', color: WHITE },
  searchBar: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: BRAND,
    paddingHorizontal: 16, paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: WHITE + '22',
  },
  searchInput: {
    flex: 1, fontSize: 14, color: WHITE,
    backgroundColor: WHITE + '1F',
    borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8,
  },
  loader: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 60 },
  contactRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 16, paddingVertical: 13,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: BRAND + '14',
    backgroundColor: WHITE,
  },
  avatar: { width: 46, height: 46, borderRadius: 23 },
  name:   { fontSize: 15, fontWeight: '700', color: DARK },
  bio:    { fontSize: 12, color: MUTED, marginTop: 2 },
  emptyWrap: { alignItems: 'center', paddingTop: 60 },
  emptyTxt:  { fontSize: 14, color: MUTED },
});
