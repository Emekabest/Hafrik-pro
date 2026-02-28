import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View, Text, FlatList, Image, StyleSheet, TouchableOpacity,
  ActivityIndicator, StatusBar, Animated,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../../AuthContext';
import { getGroupMembers } from './services/groupApi';

const BRAND  = '#0C3F44';
const ACCENT = '#13C296';
const CREAM  = '#F5F7F7';
const DARK   = '#0D1B1E';
const MUTED  = '#7A9198';
const BORDER = 'rgba(12,63,68,0.09)';
const LIMIT  = 30;

const isRealImg = (url) =>
  typeof url === 'string' && url.trim().length > 6 &&
  !url.includes('default-avatar') && !url.includes('blank_profile');

const cleanText = (t = '') =>
  String(t).replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();

// ── Single member row ─────────────────────────────────────────────────────────
const MemberRow = React.memo(({ item, index }) => {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(anim, {
      toValue: 1,
      delay: Math.min(index * 25, 400),
      useNativeDriver: true,
      tension: 90,
      friction: 11,
    }).start();
  }, []);

  const name       = cleanText(item.full_name ?? item.username ?? 'Member');
  const username   = item.username ? `@${item.username}` : null;
  const bio        = cleanText(item.bio ?? '');
  const avatar     = item.avatar ?? item.profile_photo ?? null;
  const role       = (item.role ?? item.type ?? '').toLowerCase();
  const isAdmin    = role === 'admin' || role === 'owner';
  const isVerified = item.verified === true || item.verified === 1 ||
                     item.verified_value === 1 || item.is_verified === true;
  const isSelf     = item.is_current_user === true || item.is_current_user === 1;

  return (
    <Animated.View style={[
      s.row,
      isSelf && s.rowSelf,
      {
        opacity: anim,
        transform: [{ translateY: anim.interpolate({ inputRange: [0,1], outputRange: [14,0] }) }],
      },
    ]}>
      {/* Avatar */}
      {isRealImg(avatar) ? (
        <Image source={{ uri: avatar }} style={s.avatar} />
      ) : (
        <LinearGradient colors={[BRAND, '#1a6b75']} style={[s.avatar, s.avatarFb]}>
          <Ionicons name="person" size={20} color="#fff" />
        </LinearGradient>
      )}

      {/* Info */}
      <View style={s.info}>
        <View style={s.nameRow}>
          <Text style={s.name} numberOfLines={1}>{name}</Text>
          {isVerified && (
            <Ionicons name="checkmark-circle" size={14} color={ACCENT} style={{ marginLeft: 4 }} />
          )}
          {isSelf && (
            <View style={s.youPill}>
              <Text style={s.youTxt}>YOU</Text>
            </View>
          )}
        </View>
        {username && !isSelf && (
          <Text style={s.username} numberOfLines={1}>{username}</Text>
        )}
        {!!bio && (
          <Text style={s.bio} numberOfLines={2}>{bio}</Text>
        )}
      </View>

      {/* Role badge */}
      {isAdmin && (
        <View style={[s.rolePill, role === 'owner' && s.rolePillOwner]}>
          <Text style={s.roleTxt}>{role.toUpperCase()}</Text>
        </View>
      )}
    </Animated.View>
  );
});

// ── GroupMembers screen ───────────────────────────────────────────────────────
export default function GroupMembers({ route }) {
  const { groupId, groupTitle } = route.params ?? {};
  const navigation = useNavigation();
  const { top }    = useSafeAreaInsets();
  const { token }  = useAuth();

  const [members,     setMembers]     = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [refreshing,  setRefreshing]  = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page,        setPage]        = useState(1);
  const [hasMore,     setHasMore]     = useState(true);

  useEffect(() => { loadPage(1, true); }, [groupId]);

  const loadPage = async (pageNum, replace = false) => {
    if (pageNum === 1) replace ? setLoading(true) : setRefreshing(true);
    else setLoadingMore(true);

    try {
      const res = await getGroupMembers(groupId, pageNum, LIMIT, token);
      if (res?.status === 'success') {
        const data = Array.isArray(res.data?.data) ? res.data.data
                   : Array.isArray(res.data)       ? res.data
                   : [];
        setMembers((prev) => replace || pageNum === 1 ? data : [...prev, ...data]);
        setPage(pageNum);
        setHasMore(data.length === LIMIT);
      }
    } catch { /* ignore */ }
    finally {
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    }
  };

  const onRefresh    = useCallback(() => loadPage(1, false), [groupId, token]);
  const loadMore     = useCallback(() => {
    if (!loadingMore && hasMore) loadPage(page + 1);
  }, [loadingMore, hasMore, page, groupId, token]);

  const renderItem = useCallback(
    ({ item, index }) => <MemberRow item={item} index={index} />,
    []
  );

  return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" />

      {/* Header */}
      <LinearGradient
        colors={[BRAND, '#0a5560']}
        style={[s.header, { paddingTop: top + 10 }]}
      >
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn} activeOpacity={0.85}>
          <Ionicons name="arrow-back" size={20} color="#fff" />
        </TouchableOpacity>
        <View style={s.headerCenter}>
          <Text style={s.headerTitle}>Members</Text>
          {!!groupTitle && (
            <Text style={s.headerSub} numberOfLines={1}>{cleanText(groupTitle)}</Text>
          )}
        </View>
        <View style={{ width: 38 }} />
      </LinearGradient>

      {loading ? (
        <View style={s.loaderWrap}>
          <ActivityIndicator size="large" color={ACCENT} />
          <Text style={s.loaderTxt}>Loading members…</Text>
        </View>
      ) : (
        <FlatList
          data={members}
          keyExtractor={(item, i) => String(item.id ?? item.user_id ?? i)}
          renderItem={renderItem}
          onRefresh={onRefresh}
          refreshing={refreshing}
          onEndReached={loadMore}
          onEndReachedThreshold={0.3}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={s.list}
          ListFooterComponent={
            loadingMore
              ? <ActivityIndicator size="small" color={ACCENT} style={{ marginVertical: 16 }} />
              : null
          }
          ListEmptyComponent={
            <View style={s.emptyWrap}>
              <LinearGradient colors={[ACCENT + '22', BRAND + '11']} style={s.emptyCircle}>
                <Ionicons name="people-outline" size={36} color={MUTED} />
              </LinearGradient>
              <Text style={s.emptyTxt}>No members yet</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: CREAM },

  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingBottom: 14, paddingHorizontal: 14, gap: 10,
  },
  backBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center', justifyContent: 'center',
  },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerTitle: { fontSize: 16, fontWeight: '900', color: '#fff', letterSpacing: 0.3 },
  headerSub:   { fontSize: 11, color: 'rgba(255,255,255,0.65)', marginTop: 1 },

  loaderWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loaderTxt:  { fontSize: 13, fontWeight: '600', color: MUTED },

  list: { paddingBottom: 100 },

  row: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#fff', paddingHorizontal: 16, paddingVertical: 13,
    borderBottomWidth: 1, borderBottomColor: BORDER,
  },
  rowSelf: { backgroundColor: ACCENT + '0D' },

  avatar:   { width: 48, height: 48, borderRadius: 15 },
  avatarFb: { alignItems: 'center', justifyContent: 'center' },

  info:    { flex: 1, gap: 2 },
  nameRow: { flexDirection: 'row', alignItems: 'center' },
  name:    { fontSize: 14, fontWeight: '800', color: DARK, flexShrink: 1 },
  username:{ fontSize: 12, color: MUTED },
  bio:     { fontSize: 12, color: '#5a7a80', lineHeight: 17 },

  youPill: {
    marginLeft: 6, backgroundColor: ACCENT + '22',
    borderRadius: 100, paddingHorizontal: 7, paddingVertical: 2,
  },
  youTxt: { fontSize: 9, fontWeight: '900', color: '#0a7a5a', letterSpacing: 0.5 },

  rolePill: {
    backgroundColor: ACCENT + '22', borderRadius: 100,
    paddingHorizontal: 9, paddingVertical: 4,
  },
  rolePillOwner: { backgroundColor: BRAND + '18' },
  roleTxt: { fontSize: 9, fontWeight: '900', color: '#0a7a5a', letterSpacing: 0.5 },

  emptyWrap:   { alignItems: 'center', paddingTop: 64, gap: 14 },
  emptyCircle: { width: 90, height: 90, borderRadius: 45, alignItems: 'center', justifyContent: 'center' },
  emptyTxt:    { fontSize: 15, fontWeight: '700', color: DARK },
});