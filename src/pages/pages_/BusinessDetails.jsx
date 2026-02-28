import React, { useEffect, useState, useRef, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  ActivityIndicator,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useNavigation } from "@react-navigation/native";
import { Image as ExpoImage } from "expo-image";
import { useAuth } from "../../AuthContext";
import { getBusinessDetails, getBusinessFeed, toggleFollowBusiness } from "./Businessapi";
import FeedCard from "../home/feeds/feedcard.jsx";



const BRAND      = '#0C3F44';
const ACCENT     = '#13C296';
const LIME       = '#A8E063';
const BG         = '#F0F5F5';
const CARD       = '#FFFFFF';
const BORDER     = '#EEF3F3';
const TEXT_HEAD  = '#0A1F22';
const TEXT_BODY  = '#1A1A2E';
const TEXT_MUTED = '#8A9BA8';

const { width: SCREEN_W } = Dimensions.get("window");
const COVER_HEIGHT = 220;
const AVATAR_SIZE  = 76;

const defaultAvatar = "https://hafrik.com/default-avatar.png";

const StatPill = ({ value, label }) => (
  <View style={styles.statPill}>
    <Text style={styles.statValue}>{value?.toLocaleString?.() ?? value ?? 0}</Text>
    <Text style={styles.statLabel}>{label}</Text>
  </View>
);

export default function BusinessDetails({ route }) {
  const { pageId } = route.params || {};
  const navigation  = useNavigation();
  const { token }   = useAuth();

  const [page,         setPageData]    = useState(null);
  const [posts,        setPosts]       = useState([]);
  const [loadingPage,  setLoadingPage] = useState(true);
  const [loadingFeed,  setLoadingFeed] = useState(true);
  const [loadingMore,  setLoadingMore] = useState(false);
  const [pageNum,      setPageNum]     = useState(1);
  const [hasMore,      setHasMore]     = useState(true);
  const [following,    setFollowing]   = useState(false);
  const [followers,    setFollowers]   = useState(0);
  const [followLoading,setFollowLoading] = useState(false);

  // Ref so handleFollow never has stale closure issues
  const followRef = useRef({ following: false, followLoading: false });
  followRef.current = { following, followLoading };

  const scrollY      = useRef(new Animated.Value(0)).current;
  const coverScale   = scrollY.interpolate({ inputRange: [-80, 0], outputRange: [1.25, 1], extrapolate: "clamp" });
  const coverOpacity = scrollY.interpolate({ inputRange: [0, COVER_HEIGHT * 0.6], outputRange: [1, 0.3], extrapolate: "clamp" });

  useEffect(() => {
    if (pageId) {
      loadPage();
      loadFeed(1);
    }
  }, [pageId]);

  const loadPage = async () => {
    try {
      const payload = await getBusinessDetails(pageId, token);
      if (payload?.status === "success") {
        setPageData(payload.data);
        setFollowing(!!(payload.data.is_following));
        setFollowers(payload.data.followers_count ?? 0);
      }
    } catch (e) { console.log("loadPage error:", e); }
    setLoadingPage(false);
  };

  const loadFeed = async (pNum) => {
    if (pNum === 1) setLoadingFeed(true);
    else setLoadingMore(true);

    try {
      const payload = await getBusinessFeed(pageId, pNum, 10, token);
      if (payload?.status === "success") {
        const feedPosts = Array.isArray(payload.data?.data)
          ? payload.data.data
          : Array.isArray(payload.data)
          ? payload.data
          : [];
        setPosts(prev => pNum === 1 ? feedPosts : [...prev, ...feedPosts]);

        // Sync follow state + followers_count from feed response (page 1 only)
        if (pNum === 1) {
          if (payload.data?.is_following != null)
            setFollowing(!!(payload.data.is_following));
          if (payload.data?.followers_count != null)
            setFollowers(Number(payload.data.followers_count));
        }

        const total_pages = payload.data?.total_pages ?? null;
        if (total_pages != null) setHasMore(pNum < total_pages);
        else if (feedPosts.length < 10) setHasMore(false);
      }
    } catch (e) { console.log("loadFeed error:", e); }

    setLoadingFeed(false);
    setLoadingMore(false);
  };

  const handleLoadMore = useCallback(() => {
    if (loadingMore || !hasMore) return;
    const next = pageNum + 1;
    setPageNum(next);
    loadFeed(next);
  }, [pageNum, loadingMore, hasMore]);

  const handleFollow = async () => {
    const { followLoading: curLoad, following: curFollowing } = followRef.current;
    if (curLoad) return;
    setFollowLoading(true);
    // Optimistic update
    setFollowing(!curFollowing);
    setFollowers(f => curFollowing ? Math.max(0, f - 1) : f + 1);
    try {
      const res = await toggleFollowBusiness(pageId, token);
      // Server tells us the new real state
      if (res?.data?.is_following != null) setFollowing(!!(res.data.is_following));
      if (res?.data?.followers_count != null) setFollowers(Number(res.data.followers_count));
    } catch (e) {
      console.log("follow error:", e);
      // Roll back optimistic update
      setFollowing(curFollowing);
      setFollowers(f => curFollowing ? f + 1 : Math.max(0, f - 1));
    }
    setFollowLoading(false);
  };

  const ListHeader = () => {
    if (loadingPage) {
      return (
        <View style={styles.pageLoader}>
          <ActivityIndicator size="large" color={ACCENT} />
          <Text style={styles.loaderText}>Loading page...</Text>
        </View>
      );
    }
    if (!page) return null;

    return (
      <View style={styles.headerBlock}>

        {/* Cover */}
        <Animated.View style={[styles.coverWrapper, { transform: [{ scale: coverScale }], opacity: coverOpacity }]}>
          {page.cover ? (
            <ExpoImage source={{ uri: page.cover }} style={styles.cover} contentFit="cover" />
          ) : (
            <LinearGradient colors={[BRAND, '#073b40', '#0B8557']} style={styles.cover} />
          )}
          <LinearGradient
            colors={['transparent', 'rgba(10,31,34,0.75)']}
            style={StyleSheet.absoluteFillObject}
          />
        </Animated.View>

        {/* Info card */}
        <View style={styles.infoCard}>
          <View style={styles.avatarContainer}>
            <ExpoImage
              source={{ uri: page.avatar || defaultAvatar }}
              style={styles.pageAvatar}
              contentFit="cover"
            />
            {page.verified && (
              <View style={styles.verifiedBadge}>
                <Ionicons name="checkmark-circle" size={18} color={ACCENT} />
              </View>
            )}
          </View>

          <View style={styles.titleRow}>
            <Text style={styles.pageTitle}>{page.title}</Text>
            {page.verified && (
              <Ionicons name="checkmark-circle" size={16} color={ACCENT} style={{ marginLeft: 6, marginTop: 4 }} />
            )}
          </View>

          <Text style={styles.pageHandle}>@{page.name}</Text>

          {page.about ? (
            <Text style={styles.pageAbout}>
              {page.about.replace(/<\/?[^>]+(>|$)/g, "")}
            </Text>
          ) : null}

          {page.location ? (
            <View style={styles.locationRow}>
              <Ionicons name="location-outline" size={13} color={TEXT_MUTED} />
              <Text style={styles.locationText}>{page.location}</Text>
            </View>
          ) : null}

          {/* Stats */}
          <View style={styles.statsBlock}>
            <StatPill value={followers}        label="Followers" />
            <View style={styles.statDivider} />
            <StatPill value={page.posts_count} label="Posts" />
          </View>

          {/* Follow button */}
          <TouchableOpacity
            style={[styles.followBtn, following && styles.followingBtn]}
            onPress={handleFollow}
            activeOpacity={0.85}
            disabled={followLoading}
          >
            {followLoading ? (
              <ActivityIndicator size="small" color={following ? TEXT_MUTED : BRAND} />
            ) : following ? (
              <View style={styles.followBtnInner}>
                <Ionicons name="checkmark" size={15} color={TEXT_MUTED} />
                <Text style={[styles.followBtnText, styles.followingBtnText]}>Following</Text>
              </View>
            ) : (
              <LinearGradient
                colors={[ACCENT, LIME]}
                style={styles.followGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <Ionicons name="add" size={16} color={BRAND} />
                <Text style={styles.followBtnText}>Follow Page</Text>
              </LinearGradient>
            )}
          </TouchableOpacity>
        </View>

        {/* Feed label */}
        <View style={styles.feedLabel}>
          <View style={styles.sectionDot} />
          <Text style={styles.feedLabelText}>PAGE FEED</Text>
          {loadingFeed && <ActivityIndicator size="small" color={ACCENT} style={{ marginLeft: 8 }} />}
        </View>

      </View>
    );
  };

  return (
    <View style={styles.container}>

      {/* Floating back button */}
      <TouchableOpacity style={styles.backCircle} onPress={() => navigation.goBack()} activeOpacity={0.85}>
        <Ionicons name="arrow-back" size={18} color={BRAND} />
      </TouchableOpacity>

      <FlatList
        data={posts}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => <FeedCard feed={item} />}
        ListHeaderComponent={<ListHeader />}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.5}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: false }
        )}
        scrollEventThrottle={16}
        ListFooterComponent={
          loadingMore
            ? <ActivityIndicator size="small" color={ACCENT} style={{ paddingVertical: 20 }} />
            : null
        }
        ListEmptyComponent={
          !loadingFeed ? (
            <View style={styles.emptyFeed}>
              <Ionicons name="document-text-outline" size={40} color={BORDER} />
              <Text style={styles.emptyText}>No posts yet</Text>
            </View>
          ) : null
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container:   { flex: 1, backgroundColor: BG },
  listContent: { paddingBottom: 100 },

  pageLoader: { justifyContent: "center", alignItems: "center", paddingVertical: 60, rowGap: 12 },
  loaderText: { color: TEXT_MUTED, fontSize: 14, fontWeight: "500" },

  backCircle: {
    position: "absolute",
    top: 52, left: 16,
    zIndex: 99,
    width: 38, height: 38,
    borderRadius: 19,
    backgroundColor: "rgba(255,255,255,0.92)",
    justifyContent: "center", alignItems: "center",
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1, shadowRadius: 6, elevation: 4,
  },

  headerBlock:  { marginBottom: 4 },
  coverWrapper: { width: SCREEN_W, height: COVER_HEIGHT, overflow: "hidden" },
  cover:        { width: "100%", height: "100%" },

  infoCard: {
    backgroundColor: CARD,
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },

  avatarContainer: { marginTop: -(AVATAR_SIZE / 2), marginBottom: 10, width: AVATAR_SIZE + 6, position: "relative" },
  pageAvatar: {
    width: AVATAR_SIZE, height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
    borderWidth: 3, borderColor: CARD,
  },
  verifiedBadge: {
    position: "absolute", bottom: 0, right: 0,
    backgroundColor: CARD, borderRadius: 12, padding: 1,
  },

  titleRow:  { flexDirection: "row", alignItems: "flex-start", marginBottom: 2 },
  pageTitle: { fontSize: 22, fontWeight: "800", color: TEXT_HEAD, letterSpacing: -0.3 },
  pageHandle:{ fontSize: 13, color: TEXT_MUTED, marginBottom: 10 },
  pageAbout: { fontSize: 14, color: TEXT_BODY, lineHeight: 21, marginBottom: 10 },

  locationRow: { flexDirection: "row", alignItems: "center", columnGap: 4, marginBottom: 14 },
  locationText:{ fontSize: 13, color: TEXT_MUTED },

  statsBlock: {
    flexDirection: "row", alignItems: "center",
    marginBottom: 16, backgroundColor: BG,
    borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: BORDER,
  },
  statPill:    { flex: 1, alignItems: "center" },
  statValue:   { fontSize: 17, fontWeight: "800", color: TEXT_HEAD, letterSpacing: -0.3 },
  statLabel:   { fontSize: 11, color: TEXT_MUTED, marginTop: 2, fontWeight: "500", textTransform: "uppercase", letterSpacing: 0.5 },
  statDivider: { width: 1, height: 28, backgroundColor: BORDER },

  followBtn: {
    borderRadius: 30,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "transparent",
  },
  followingBtn: {
    backgroundColor: BG,
    borderColor: BORDER,
  },
  followGradient: {
    flexDirection: "row", alignItems: "center",
    justifyContent: "center",
    paddingVertical: 13, columnGap: 6,
  },
  followBtnInner: {
    flexDirection: "row", alignItems: "center",
    justifyContent: "center",
    paddingVertical: 13, columnGap: 6,
  },
  followBtnText: {
    fontSize: 14, fontWeight: "800", color: BRAND, letterSpacing: 0.2,
  },
  followingBtnText: { color: TEXT_MUTED },

  feedLabel: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 20, paddingTop: 18, paddingBottom: 10,
    backgroundColor: BG,
  },
  sectionDot:    { width: 6, height: 6, borderRadius: 3, backgroundColor: ACCENT, marginRight: 8 },
  feedLabelText: { fontSize: 11, fontWeight: "700", color: TEXT_MUTED, letterSpacing: 2 },

  emptyFeed: { alignItems: "center", paddingVertical: 60, rowGap: 10 },
  emptyText: { fontSize: 14, color: TEXT_MUTED, fontWeight: "500" },
});