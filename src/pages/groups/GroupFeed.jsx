import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  ActivityIndicator,
  StyleSheet,
  TouchableOpacity,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { getGroupFeed } from "./services/groupApi";
import { useAuth } from '../../AuthContext';
import FeedCard from "../home/feeds/feedcard";
import { Colors } from '../../theme';

const ACCENT     = Colors.primary;
const BG         = Colors.surfaceTint;
const CARD       = Colors.white;
const BORDER     = Colors.border;
const BRAND      = Colors.primaryDark;
const TEXT_MUTED = Colors.secondaryText;

export default function GroupFeed({ route }) {
  const { groupId } = route.params || {};
  const navigation  = useNavigation();
  const { token }   = useAuth();

  const [posts,       setPosts]       = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page,        setPage]        = useState(1);
  const [hasMore,     setHasMore]     = useState(true);

  useEffect(() => {
    if (groupId) loadFeed(1);
  }, [groupId]);

  const loadFeed = async (pageNum) => {
    if (pageNum === 1) setLoading(true);
    else setLoadingMore(true);

    try {
      const payload = await getGroupFeed(groupId, pageNum, 10, token);
      console.log("GROUP FEED:", JSON.stringify(payload));

      if (payload?.status === "success") {
        const feedPosts = Array.isArray(payload.data?.data)
          ? payload.data.data
          : Array.isArray(payload.data)
          ? payload.data
          : [];

        setPosts(prev => pageNum === 1 ? feedPosts : [...prev, ...feedPosts]);
        if (feedPosts.length < 10) setHasMore(false);
      }
    } catch (e) {
      console.log("GroupFeed error:", e);
    }

    setLoading(false);
    setLoadingMore(false);
  };

  const handleLoadMore = useCallback(() => {
    if (loadingMore || !hasMore) return;
    const next = page + 1;
    setPage(next);
    loadFeed(next);
  }, [page, loadingMore, hasMore]);

  if (loading) {
    return (
      <View style={styles.loaderScreen}>
        <ActivityIndicator size="large" color={ACCENT} />
        <Text style={styles.loaderText}>Loading feed...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backCircle} activeOpacity={0.85}>
          <Ionicons name="arrow-back" size={18} color={BRAND} />
        </TouchableOpacity>
        <View style={styles.headerTitleRow}>
          <View style={styles.sectionDot} />
          <Text style={styles.headerText}>COMMUNITY FEED</Text>
        </View>
      </View>

      <FlatList
        data={posts}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => <FeedCard feed={item} />}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.5}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        ListFooterComponent={
          loadingMore
            ? <ActivityIndicator size="small" color={ACCENT} style={{ paddingVertical: 20 }} />
            : null
        }
        ListEmptyComponent={
          <View style={styles.emptyFeed}>
            <Ionicons name="chatbubbles-outline" size={40} color={BORDER} />
            <Text style={styles.emptyText}>No posts yet</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container:    { flex: 1, backgroundColor: BG },
  listContent:  { paddingBottom: 100 },

  loaderScreen: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: BG, rowGap: 12 },
  loaderText:   { color: TEXT_MUTED, fontSize: 14, fontWeight: "500" },

  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 56,
    paddingBottom: 14,
    backgroundColor: CARD,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
    columnGap: 14,
  },
  backCircle: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: BG,
    justifyContent: "center", alignItems: "center",
    borderWidth: 1, borderColor: BORDER,
  },
  headerTitleRow: { flexDirection: "row", alignItems: "center" },
  sectionDot:     { width: 6, height: 6, borderRadius: 3, backgroundColor: ACCENT, marginRight: 8 },
  headerText:     { fontSize: 11, fontWeight: "700", color: TEXT_MUTED, letterSpacing: 2 },

  emptyFeed: { alignItems: "center", paddingVertical: 60, rowGap: 10 },
  emptyText: { fontSize: 14, color: TEXT_MUTED, fontWeight: "500" },
});