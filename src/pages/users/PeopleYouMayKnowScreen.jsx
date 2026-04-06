import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../../AuthContext';
import { Colors } from '../../theme/colors';

const BASE_URL = 'https://hafrik.com';
const BRAND = Colors.primaryDark;
const ACCENT = Colors.primary;
const MUTED = Colors.secondaryText;

const isRealImage = (url) =>
  typeof url === 'string' && url.trim().length > 6 &&
  !url.includes('blank_profile') && !url.includes('default.');

const PersonCard = ({ item, onFollow, onPress }) => {
  const avatar = item?.avatar ?? item?.profile_picture ?? item?.image ?? null;
  const name = item?.full_name ?? item?.name ?? item?.username ?? item?.user_name ?? 'User';
  const mutual = item?.mutual_friends;
  const followers = item?.followers_count ?? item?.followers ?? 0;
  const isFollowing = !!item?.is_follow;

  return (
    <TouchableOpacity style={styles.card} activeOpacity={0.88} onPress={onPress}>
      {/* Avatar */}
      {isRealImage(avatar) ? (
        <Image source={{ uri: avatar }} style={styles.avatar} />
      ) : (
        <View style={[styles.avatar, styles.avatarFallback]}>
          <Ionicons name="person-outline" size={28} color={BRAND} />
        </View>
      )}

      {/* Info */}
      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={1}>{name}</Text>
        {!!mutual ? (
          <Text style={styles.meta}>{mutual} mutual connections</Text>
        ) : (
          <Text style={styles.meta}>{Number(followers).toLocaleString()} followers</Text>
        )}
      </View>

      {/* Follow button */}
      <TouchableOpacity
        style={[styles.followBtn, isFollowing && styles.followingBtn]}
        activeOpacity={0.85}
        onPress={(e) => { e.stopPropagation?.(); onFollow?.(); }}
      >
        {isFollowing ? (
          <Text style={[styles.followBtnText, styles.followingBtnText]}>Following</Text>
        ) : (
          <>
            <Ionicons name="person-add-outline" size={12} color={Colors.white} style={{ marginRight: 4 }} />
            <Text style={styles.followBtnText}>Connect</Text>
          </>
        )}
      </TouchableOpacity>
    </TouchableOpacity>
  );
};

const PeopleYouMayKnowScreen = () => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { token } = useAuth();

  const [people, setPeople] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const followStates = useRef({});

  const fetchPeople = useCallback(async (pageNum = 1, append = false) => {
    try {
      const res = await fetch(`${BASE_URL}/api/v1/people/new_user.php?page=${pageNum}&limit=20`, {
        headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
      });
      const data = await res.json();
      const list = Array.isArray(data?.data?.data) ? data.data.data : Array.isArray(data?.data) ? data.data : Array.isArray(data) ? data : [];

      if (append) {
        setPeople(prev => [...prev, ...list]);
      } else {
        setPeople(list);
      }

      setHasMore(list.length >= 20);
      setPage(pageNum);
    } catch {
      // silent
    }
  }, [token]);

  useEffect(() => {
    setLoading(true);
    fetchPeople(1, false).finally(() => setLoading(false));
  }, [fetchPeople]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchPeople(1, false);
    setRefreshing(false);
  }, [fetchPeople]);

  const onLoadMore = useCallback(async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    await fetchPeople(page + 1, true);
    setLoadingMore(false);
  }, [loadingMore, hasMore, page, fetchPeople]);

  const handleFollow = useCallback(async (person) => {
    const id = person.id;
    const isFollowing = !!(followStates.current[id] ?? person.is_follow);

    // Optimistic update
    followStates.current[id] = !isFollowing;
    setPeople(prev => prev.map(p => p.id === id ? { ...p, is_follow: !isFollowing } : p));

    try {
      const endpoint = isFollowing
        ? `${BASE_URL}/api/v1/users/unfollow.php`
        : `${BASE_URL}/api/v1/users/follow.php`;
      await fetch(endpoint, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({ user_id: id }),
      });
    } catch {
      // Revert on failure
      followStates.current[id] = isFollowing;
      setPeople(prev => prev.map(p => p.id === id ? { ...p, is_follow: isFollowing } : p));
    }
  }, [token]);

  const renderItem = useCallback(({ item }) => (
    <PersonCard
      item={item}
      onPress={() => navigation.navigate('UserProfile', { userId: item.id })}
      onFollow={() => handleFollow(item)}
    />
  ), [navigation, handleFollow]);

  const renderFooter = () => {
    if (!loadingMore) return null;
    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator size="small" color={BRAND} />
      </View>
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="light-content" backgroundColor={BRAND} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.8}>
          <Ionicons name="arrow-back" size={22} color={Colors.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>People You May Know</Text>
        <View style={{ width: 40 }} />
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={BRAND} />
        </View>
      ) : (
        <FlatList
          data={people}
          keyExtractor={(item, idx) => String(item.id ?? idx)}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          onRefresh={onRefresh}
          refreshing={refreshing}
          onEndReached={onLoadMore}
          onEndReachedThreshold={0.3}
          ListFooterComponent={renderFooter}
          ListEmptyComponent={
            <View style={styles.center}>
              <Ionicons name="people-outline" size={48} color={Colors.border} />
              <Text style={styles.emptyText}>No suggestions available</Text>
            </View>
          }
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.white,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: BRAND,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
    backgroundColor: Colors.white + '1A',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.white,
    flex: 1,
    textAlign: 'center',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 32,
    gap: 10,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    marginRight: 12,
  },
  avatarFallback: {
    backgroundColor: BRAND + '14',
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: {
    flex: 1,
    marginRight: 10,
  },
  name: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.black,
    marginBottom: 3,
  },
  meta: {
    fontSize: 12,
    color: MUTED,
  },
  followBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: BRAND,
    borderRadius: 100,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  followingBtn: {
    backgroundColor: Colors.white,
    borderWidth: 1.5,
    borderColor: BRAND,
  },
  followBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.white,
  },
  followingBtnText: {
    color: BRAND,
  },
  footerLoader: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 80,
    gap: 12,
  },
  emptyText: {
    fontSize: 15,
    color: MUTED,
    fontWeight: '500',
  },
});

export default PeopleYouMayKnowScreen;
