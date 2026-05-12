import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../../AuthContext';
import { unblockUser } from '../../api/feedApi';
import { Colors } from '../../theme/colors';
import AppDetails from '../../helpers/appdetails';

const BRAND  = Colors.primaryDark;
const ACCENT = Colors.primary;
const MUTED  = Colors.secondaryText;
const BASE   = 'https://hafrik.com/api/v1';

const withOpacity = (hex, opacity) => {
  const normalized = (hex || '').replace('#', '');
  const alpha = Math.round(Math.max(0, Math.min(1, opacity)) * 255).toString(16).padStart(2, '0');
  return `#${normalized}${alpha}`;
};

const hasRealImg = (url) =>
  !!url &&
  !String(url).includes('blank_profile') &&
  !String(url).includes('/default.');

// ── Single blocked user row ───────────────────────────────────────────────────
const BlockedRow = ({ item, onUnblock }) => {
  const name   = item?.full_name ?? item?.username ?? 'User';
  const handle = item?.username ?? '';
  const avatar = item?.avatar ?? null;
  const [loading, setLoading] = useState(false);

  const handlePress = () => {
    Alert.alert(
      'Unblock User',
      `Unblock ${name}? They will be able to see your posts and interact with you again.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Unblock',
          onPress: async () => {
            setLoading(true);
            try {
              await unblockUser(item.id ?? item.user_id);
              onUnblock(item.id ?? item.user_id);
            } catch {
              Alert.alert('Error', 'Could not unblock user. Please try again.');
            }
            setLoading(false);
          },
        },
      ],
    );
  };

  return (
    <View style={styles.row}>
      {hasRealImg(avatar) ? (
        <Image source={{ uri: avatar }} style={styles.avatar} />
      ) : (
        <View style={[styles.avatar, styles.avatarFallback]}>
          <Ionicons name="person-outline" size={20} color={ACCENT} />
        </View>
      )}
      <View style={styles.rowInfo}>
        <Text style={styles.rowName} numberOfLines={1}>{name}</Text>
        {!!handle && <Text style={styles.rowHandle} numberOfLines={1}>@{handle}</Text>}
      </View>
      <TouchableOpacity
        style={styles.unblockBtn}
        activeOpacity={0.8}
        onPress={handlePress}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator size="small" color={BRAND} />
        ) : (
          <Text style={styles.unblockTxt}>Unblock</Text>
        )}
      </TouchableOpacity>
    </View>
  );
};

// ── Main screen ───────────────────────────────────────────────────────────────
export default function BlockedUsersScreen() {
  const navigation   = useNavigation();
  const insets       = useSafeAreaInsets();
  const { token }    = useAuth();

  const [items,   setItems]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [page,    setPage]    = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const loadingMore = useRef(false);

  const fetchPage = useCallback(async (pg) => {
    if (loadingMore.current && pg > 1) return;
    if (pg > 1) loadingMore.current = true;
    try {
      const res  = await fetch(`${BASE}/users/blocked-list.php?page=${pg}&limit=20`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      const list = json?.data?.data ?? json?.data ?? json?.blocked ?? [];
      if (!Array.isArray(list) || list.length === 0) {
        setHasMore(false);
      } else {
        setItems((prev) => pg === 1 ? list : [...prev, ...list]);
        setPage(pg);
        if (list.length < 20) setHasMore(false);
      }
    } catch {
      setHasMore(false);
    }
    if (pg === 1) setLoading(false);
    loadingMore.current = false;
  }, [token]);

  useEffect(() => { fetchPage(1); }, [fetchPage]);

  const handleUnblock = useCallback((removedId) => {
    setItems((prev) => prev.filter((u) => (u.id ?? u.user_id) !== removedId));
  }, []);

  const renderItem = useCallback(({ item }) => (
    <BlockedRow item={item} onUnblock={handleUnblock} />
  ), [handleUnblock]);

  return (
    <View style={styles.root}>
      {/* Header */}
      <LinearGradient
        colors={[BRAND, '#0f5060']}
        style={[styles.header, { paddingTop: insets.top + 12 }]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} activeOpacity={0.8}>
          <Ionicons name="arrow-back" size={20} color={Colors.white} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Blocked Users</Text>
          <Text style={styles.headerSub}>People you've blocked</Text>
        </View>
        <View style={styles.headerIconWrap}>
          <Ionicons name="ban-outline" size={20} color={Colors.white + '80'} />
        </View>
      </LinearGradient>

      {loading ? (
        <View style={styles.centeredWrap}>
          <ActivityIndicator size="large" color={BRAND} />
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item, i) => String(item?.id ?? item?.user_id ?? i)}
          renderItem={renderItem}
          onEndReached={() => hasMore && fetchPage(page + 1)}
          onEndReachedThreshold={0.4}
          contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 32 }]}
          ListEmptyComponent={
            <View style={styles.centeredWrap}>
              <Ionicons name="checkmark-circle-outline" size={52} color={MUTED} />
              <Text style={styles.emptyTitle}>No blocked users</Text>
              <Text style={styles.emptySub}>Users you block will appear here.</Text>
            </View>
          }
          ListFooterComponent={
            hasMore && items.length > 0 ? (
              <ActivityIndicator size="small" color={BRAND} style={{ padding: 16 }} />
            ) : null
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f5f7fa' },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 20,
    gap: 12,
  },
  backBtn: {
    width: 38, height: 38, borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center', justifyContent: 'center',
  },
  headerCenter: { flex: 1 },
  headerTitle: {
    fontSize: 20, fontWeight: '900', color: Colors.white,
    letterSpacing: -0.4,
    fontFamily: AppDetails?.fontFamily?.redex?.bold ?? 'System',
  },
  headerSub: {
    fontSize: 11, color: 'rgba(255,255,255,0.6)', marginTop: 1,
    fontFamily: AppDetails?.fontFamily?.inter?.regular ?? 'System',
  },
  headerIconWrap: {
    width: 38, height: 38, borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center', justifyContent: 'center',
  },

  list: { paddingTop: 16, paddingHorizontal: 14 },

  row: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: Colors.white,
    borderRadius: 16, padding: 14, marginBottom: 10,
    borderWidth: 1, borderColor: withOpacity(BRAND, 0.07),
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
  },
  avatar: {
    width: 46, height: 46, borderRadius: 23,
    backgroundColor: withOpacity(ACCENT, 0.1),
  },
  avatarFallback: { alignItems: 'center', justifyContent: 'center' },
  rowInfo: { flex: 1, minWidth: 0 },
  rowName: {
    fontSize: 14, fontWeight: '700', color: Colors.deepSlate,
    fontFamily: AppDetails?.fontFamily?.redex?.bold ?? 'System',
  },
  rowHandle: {
    fontSize: 12, color: MUTED, marginTop: 2,
    fontFamily: AppDetails?.fontFamily?.inter?.regular ?? 'System',
  },
  unblockBtn: {
    paddingHorizontal: 14, paddingVertical: 7,
    borderRadius: 20, borderWidth: 1.5, borderColor: BRAND,
    backgroundColor: withOpacity(BRAND, 0.06),
    minWidth: 78, alignItems: 'center',
  },
  unblockTxt: {
    fontSize: 13, fontWeight: '700', color: BRAND,
    fontFamily: AppDetails?.fontFamily?.redex?.bold ?? 'System',
  },

  centeredWrap: {
    flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 80, gap: 10,
  },
  emptyTitle: {
    fontSize: 17, fontWeight: '800', color: Colors.deepSlate,
    fontFamily: AppDetails?.fontFamily?.redex?.bold ?? 'System',
  },
  emptySub: {
    fontSize: 13, color: MUTED, textAlign: 'center',
    fontFamily: AppDetails?.fontFamily?.inter?.regular ?? 'System',
  },
});
