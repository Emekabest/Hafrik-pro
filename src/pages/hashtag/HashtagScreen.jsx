import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ActivityIndicator,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useRoute, useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../AuthContext';
import FeedCard from '../home/feeds/feedcard';
import { Colors } from '../../theme/colors';

const BRAND  = Colors.primaryDark;
const ACCENT = Colors.primary;
const LIMIT  = 15;
const BASE   = 'https://hafrik.com/api/v1/hashtags/search.php';

export default function HashtagScreen() {
  const { params }  = useRoute();
  const navigation  = useNavigation();
  const { top }     = useSafeAreaInsets();
  const { token }   = useAuth();
  const hashtag     = (params?.hashtag || '').replace(/^#/, '');

  const [posts,       setPosts]       = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore,     setHasMore]     = useState(true);
  const [refreshing,  setRefreshing]  = useState(false);

  const pageRef    = useRef(1);
  const fetchingRef = useRef(false);

  const fetchPage = useCallback(async (page, mode = 'initial') => {
    if (!hashtag || fetchingRef.current) return;
    fetchingRef.current = true;

    try {
      const url = `${BASE}?tag=${encodeURIComponent(hashtag)}&page=${page}&limit=${LIMIT}`;
      const res  = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      const json = await res.json();

      if (json.status === 'success') {
        const posts = json.posts || [];
        if (mode === 'append') {
          setPosts(prev => [...prev, ...posts]);
        } else {
          setPosts(posts);
        }
        setHasMore(posts.length >= LIMIT);
        pageRef.current = page;
      } else {
        if (mode !== 'append') setPosts([]);
        setHasMore(false);
      }
    } catch (e) {
      console.log('[HASHTAG] error:', e?.name, e?.message);
      setHasMore(false);
    } finally {
      fetchingRef.current = false;
      setLoading(false);
      setLoadingMore(false);
      setRefreshing(false);
    }
  }, [hashtag, token]);

  // Initial load
  useEffect(() => {
    setLoading(true);
    setPosts([]);
    pageRef.current = 1;
    setHasMore(true);
    fetchPage(1, 'initial');
  }, [fetchPage]);

  // Pull-to-refresh
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setPosts([]);
    pageRef.current = 1;
    setHasMore(true);
    fetchPage(1, 'initial');
  }, [fetchPage]);

  // Infinite scroll
  const onEndReached = useCallback(() => {
    if (!hasMore || loadingMore || fetchingRef.current) return;
    const next = pageRef.current + 1;
    setLoadingMore(true);
    fetchPage(next, 'append');
  }, [hasMore, loadingMore, fetchPage]);

  // Hashtag API uses post_id / picture — normalise to what FeedCard expects
  const normalise = (p) => ({
    ...p,
    id:   p.id   ?? p.post_id,
    user: p.user ? { ...p.user, id: p.user.id ?? p.user.user_id, avatar: p.user.avatar ?? p.user.picture } : p.user,
  });

  const renderItem = useCallback(({ item }) => (
    <FeedCard feed={normalise(item)} />
  ), []);

  const keyExtractor = useCallback((item, i) => String(item?.id ?? item?.post_id ?? i), []);

  const renderFooter = useCallback(() => {
    if (!loadingMore) return null;
    return <ActivityIndicator style={{ marginVertical: 20 }} color={ACCENT} />;
  }, [loadingMore]);

  return (
    <View style={[styles.container, { paddingTop: top }]}>

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.8}>
          <Ionicons name="arrow-back" size={22} color={BRAND} />
        </TouchableOpacity>
        <Text style={styles.title} numberOfLines={1}>#{hashtag}</Text>
        <View style={{ width: 38 }} />
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={ACCENT} />
        </View>
      ) : posts.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="pricetag-outline" size={54} color={ACCENT + '55'} />
          <Text style={styles.emptyTitle}>No posts yet</Text>
          <Text style={styles.emptySub}>Be the first to post with #{hashtag}</Text>
        </View>
      ) : (
        <FlashList
          data={posts}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          estimatedItemSize={320}
          onEndReached={onEndReached}
          onEndReachedThreshold={0.4}
          ListFooterComponent={renderFooter}
          onRefresh={onRefresh}
          refreshing={refreshing}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 40 }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.white,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight ?? '#EBEBEB',
    backgroundColor: Colors.white,
  },
  backBtn: {
    width: 38, height: 38,
    borderRadius: 19,
    backgroundColor: Colors.surfaceTint ?? '#F5F5F5',
    alignItems: 'center', justifyContent: 'center',
  },
  title: {
    fontSize: 18, fontWeight: '800', color: BRAND,
    letterSpacing: -0.3, flex: 1, textAlign: 'center',
  },
  center: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    gap: 10, paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 17, fontWeight: '700', color: BRAND, marginTop: 4,
  },
  emptySub: {
    fontSize: 13, color: Colors.secondaryText,
    textAlign: 'center', lineHeight: 20,
  },
});
