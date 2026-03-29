import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, FlatList, StyleSheet,
  TouchableOpacity, ActivityIndicator,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../AuthContext';
import { PostCard } from '../../components/search/SearchCards';
import SearchSuggestionController from '../../controllers/searchsuggestioncontroller';
import { Colors } from '../../theme/colors';

const BRAND  = Colors.primaryDark;
const ACCENT = Colors.primary;

export default function HashtagScreen() {
  const { params }   = useRoute();
  const navigation   = useNavigation();
  const { top }      = useSafeAreaInsets();
  const { token }    = useAuth();
  const hashtag      = (params?.hashtag || '').replace(/^#/, '');

  const [posts,   setPosts]   = useState([]);
  const [loading, setLoading] = useState(true);
  const loadingRef = useRef(false);

  const fetchPosts = useCallback(async () => {
    if (!hashtag) return;
    loadingRef.current = true;
    setLoading(true);
    try {
      const res  = await SearchSuggestionController(`#${hashtag}`, token);
      const all  = res?.data?.results || [];
      const postTypes = new Set(['post', 'video', 'reel', 'article', 'poll', 'photos']);
      setPosts(all.filter(r => postTypes.has((r.type || '').toLowerCase())));
    } catch {
      setPosts([]);
    } finally {
      loadingRef.current = false;
      setLoading(false);
    }
  }, [hashtag, token]);

  useEffect(() => {
    setPosts([]);
    fetchPosts();
  }, [fetchPosts]);

  const handlePress = useCallback((item) => {
    const type = (item.type || '').toLowerCase();
    if (type === 'article') return navigation.navigate('ArticleDetails', { postId: item.id, title: item.title });
    if (type === 'reel' || type === 'video') {
      return navigation.navigate('Reels2', { initialReels: [item], startIndex: 0, initialReelId: item.id });
    }
    navigation.navigate('CommentScreen', { feedId: item.id });
  }, [navigation]);

  const renderItem   = useCallback(({ item }) => (
    <PostCard item={item} onPress={() => handlePress(item)} />
  ), [handlePress]);
  const keyExtract   = useCallback((item, i) => `${item.id ?? i}`, []);
  const renderFooter = useCallback(() => null, []);

  return (
    <View style={[styles.container, { paddingTop: top }]}>

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.8}>
          <Ionicons name="arrow-back" size={22} color={BRAND} />
        </TouchableOpacity>
        <Text style={styles.title}>#{hashtag}</Text>
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
        <FlatList
          data={posts}
          renderItem={renderItem}
          keyExtractor={keyExtract}
          ListFooterComponent={renderFooter}
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
    letterSpacing: -0.3,
  },
  center: {
    flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10,
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 17, fontWeight: '700', color: BRAND, marginTop: 4,
  },
  emptySub: {
    fontSize: 13, color: Colors.secondaryText,
    textAlign: 'center', lineHeight: 20,
  },
});
