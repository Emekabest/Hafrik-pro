import React, { useEffect, useState, useCallback, useRef, memo } from "react";
import {
  View,
  Text,
  FlatList,
  ActivityIndicator,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Dimensions,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Image as ExpoImage } from "expo-image";
import { useNavigation } from "@react-navigation/native";
import { useAuth } from "../../AuthContext";
import {
  getBusinessList,
  getBusinessCategories,
  followBusiness,
  unfollowBusiness,
} from "./Businessapi";
import { Colors } from "../../theme/colors";

const BRAND      = Colors.primaryDark;
const ACCENT     = Colors.primary;
const BG         = Colors.surfaceTint;
const CARD       = Colors.white;
const BORDER     = Colors.borderLight;
const TEXT_HEAD  = Colors.tealInk;
const TEXT_BODY  = Colors.textBodyIndigo;
const TEXT_MUTED = Colors.mutedBlueGrayAlt;

const { width: SCREEN_W } = Dimensions.get("window");
const CARD_W = (SCREEN_W - 48) / 2;

const defaultAvatar = "https://hafrik.com/default-avatar.png";

// ─── Business Card ────────────────────────────────────────────────────────────
// UI is unchanged. Only follow button state and follow/unfollow logic are wired.
const BusinessCard = memo(({ item, onPress, token, isLoggedIn }) => {
  // is_following is only reliable when the user is logged in.
  const initFollowing = isLoggedIn ? !!item.is_following : false;
  const [following, setFollowing] = useState(initFollowing);
  const [followers, setFollowers] = useState(item.followers_count ?? item.followers ?? 0);

  // Ref prevents stale closures in the async handler.
  const followingRef = useRef(initFollowing);

  const handleFollow = useCallback(async () => {
    const wasFollowing = followingRef.current;

    // Optimistic update — do not wait for the network.
    followingRef.current = !wasFollowing;
    setFollowing(!wasFollowing);
    setFollowers(f => wasFollowing ? Math.max(0, f - 1) : f + 1);

    try {
      if (wasFollowing) {
        await unfollowBusiness(item.id, token);
      } else {
        await followBusiness(item.id, token);
      }
    } catch (e) {
      console.log("follow error:", e);
      // Revert on failure.
      followingRef.current = wasFollowing;
      setFollowing(wasFollowing);
      setFollowers(f => wasFollowing ? f + 1 : Math.max(0, f - 1));
    }
  }, [item.id, token]);

  return (
    <TouchableOpacity style={styles.card} onPress={() => onPress(item)} activeOpacity={0.88}>
      <ExpoImage
        source={{ uri: item.avatar || defaultAvatar }}
        style={styles.cardAvatar}
        contentFit="cover"
        cachePolicy="memory-disk"
      />
      {item.verified && (
        <View style={styles.verifiedBadge}>
          <Ionicons name="checkmark-circle" size={14} color={ACCENT} />
        </View>
      )}
      <Text style={styles.cardTitle} numberOfLines={1}>{item.title}</Text>
      {item.about ? (
        <Text style={styles.cardAbout} numberOfLines={2}>
          {item.about.replace(/<\/?[^>]+(>|$)/g, "")}
        </Text>
      ) : null}
      <Text style={styles.cardFollowers}>{followers?.toLocaleString()} followers</Text>

      {/* Follow button — only state & style change, layout stays identical */}
      <TouchableOpacity
        style={[styles.followBtn, following && styles.followingBtn]}
        onPress={handleFollow}
        activeOpacity={0.8}
      >
        <Text style={[styles.followBtnText, following && styles.followingBtnText]}>
          {following ? "Following" : "Follow"}
        </Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );
});

// ─── BusinessList ─────────────────────────────────────────────────────────────
export default function BusinessList() {
  const navigation = useNavigation();
  const { token } = useAuth();
  const isLoggedIn = !!token;

  const [pages,       setPages]       = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page,        setPage]        = useState(1);
  const [hasMore,     setHasMore]     = useState(true);
  const [search,      setSearch]      = useState("");

  const [categories, setCategories] = useState([]);
  const [activeCat,  setActiveCat]  = useState(null); // null = All

  useEffect(() => {
    loadCategories();
    loadPages(1, "", null);
  }, []);

  const loadCategories = async () => {
    try {
      const payload = await getBusinessCategories(token);
      if (payload?.status === "success") {
        const cats = Array.isArray(payload.data) ? payload.data : [];
        setCategories(cats);
      }
    } catch (e) {
      console.log("loadCategories error:", e);
    }
  };

  // categoryId is passed explicitly so loadMore / search always use latest value
  // without depending on potentially-stale closure state.
  const loadPages = async (pageNum, query, categoryId) => {
    if (pageNum === 1) setLoading(true);
    else setLoadingMore(true);

    try {
      const filters = {};
      if (query?.trim()) filters.search = query.trim();
      if (categoryId != null) filters.category_id = categoryId;

      const payload = await getBusinessList(pageNum, 20, filters, token);
      if (payload?.status === "success") {
        const items = Array.isArray(payload.data?.data) ? payload.data.data : [];
        setPages(prev => pageNum === 1 ? items : [...prev, ...items]);
        setHasMore(items.length >= 20);
      }
    } catch (e) {
      console.log("loadPages error:", e);
    }

    setLoading(false);
    setLoadingMore(false);
  };

  const handleSearch = useCallback((text) => {
    setSearch(text);
    setPage(1);
    setHasMore(true);
    loadPages(1, text, activeCat);
  }, [activeCat]);

  const handleCategoryPress = useCallback((catId) => {
    // Tap active category again → reset to All
    const next = catId === activeCat ? null : catId;
    setActiveCat(next);
    setPage(1);
    setHasMore(true);
    loadPages(1, search, next);
  }, [activeCat, search]);

  const handleLoadMore = useCallback(() => {
    if (loadingMore || !hasMore) return;
    const next = page + 1;
    setPage(next);
    loadPages(next, search, activeCat);
  }, [page, loadingMore, hasMore, search, activeCat]);

  const handlePress = useCallback((item) => {
    navigation.navigate("BusinessDetails", { pageId: item.id });
  }, []);

  const ListHeader = () => (
    <View style={styles.listHeader}>
      <Text style={styles.screenTitle}>Business Pages</Text>
      <Text style={styles.screenSub}>Discover & follow businesses on Hafrik</Text>

      {/* Search */}
      <View style={styles.searchBar}>
        <Ionicons name="search-outline" size={16} color={TEXT_MUTED} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search businesses..."
          placeholderTextColor={TEXT_MUTED}
          value={search}
          onChangeText={handleSearch}
          returnKeyType="search"
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => handleSearch("")}>
            <Ionicons name="close-circle" size={16} color={TEXT_MUTED} />
          </TouchableOpacity>
        )}
      </View>

      {/* Category filter chips */}
      {categories.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.catRow}
          contentContainerStyle={styles.catRowContent}
        >
          <TouchableOpacity
            style={[styles.catChip, activeCat === null && styles.catChipActive]}
            onPress={() => handleCategoryPress(null)}
            activeOpacity={0.75}
          >
            <Text style={[styles.catChipText, activeCat === null && styles.catChipTextActive]}>All</Text>
          </TouchableOpacity>

          {categories.map(cat => {
            const catId = cat.id ?? cat.category_id;
            const isActive = activeCat === catId;
            return (
              <TouchableOpacity
                key={catId}
                style={[styles.catChip, isActive && styles.catChipActive]}
                onPress={() => handleCategoryPress(catId)}
                activeOpacity={0.75}
              >
                <Text style={[styles.catChipText, isActive && styles.catChipTextActive]}>
                  {cat.name ?? cat.title}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loaderScreen}>
        <ActivityIndicator size="large" color={ACCENT} />
        <Text style={styles.loaderText}>Loading businesses...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={pages}
        keyExtractor={(item) => item.id.toString()}
        numColumns={2}
        columnWrapperStyle={styles.row}
        renderItem={({ item }) => (
          <BusinessCard
            item={item}
            onPress={handlePress}
            token={token}
            isLoggedIn={isLoggedIn}
          />
        )}
        ListHeaderComponent={<ListHeader />}
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
          <View style={styles.emptyState}>
            <Ionicons name="business-outline" size={48} color={BORDER} />
            <Text style={styles.emptyText}>No businesses found</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container:   { flex: 1, backgroundColor: BG },
  listContent: { paddingBottom: 100, paddingHorizontal: 16 },

  loaderScreen: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: BG, rowGap: 12 },
  loaderText:   { color: TEXT_MUTED, fontSize: 14, fontWeight: "500" },

  listHeader: { paddingTop: 60, paddingBottom: 16 },
  screenTitle: { fontSize: 26, fontWeight: "800", color: TEXT_HEAD, letterSpacing: -0.5 },
  screenSub:   { fontSize: 13, color: TEXT_MUTED, marginTop: 4, marginBottom: 16 },

  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: CARD,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: BORDER,
    columnGap: 8,
  },
  searchInput: { flex: 1, fontSize: 14, color: TEXT_BODY },

  // Category chips
  catRow:        { marginTop: 14 },
  catRowContent: { paddingBottom: 4 },
  catChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: CARD,
    borderWidth: 1,
    borderColor: BORDER,
    marginRight: 8,
  },
  catChipActive:     { backgroundColor: ACCENT, borderColor: ACCENT },
  catChipText:       { fontSize: 12, fontWeight: "600", color: TEXT_MUTED },
  catChipTextActive: { color: CARD },

  row: { justifyContent: "space-between", marginBottom: 12 },

  card: {
    width: CARD_W,
    backgroundColor: CARD,
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: BORDER,
    alignItems: "center",
    shadowColor: BRAND,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },

  cardAvatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    marginBottom: 10,
    borderWidth: 2,
    borderColor: BORDER,
  },

  verifiedBadge: {
    position: "absolute",
    top: 50,
    right: CARD_W / 2 - 32 - 2,
    backgroundColor: CARD,
    borderRadius: 10,
    padding: 1,
  },

  cardTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: TEXT_HEAD,
    textAlign: "center",
    marginBottom: 4,
  },

  cardAbout: {
    fontSize: 11,
    color: TEXT_MUTED,
    textAlign: "center",
    lineHeight: 16,
    marginBottom: 6,
  },

  cardFollowers: {
    fontSize: 11,
    color: ACCENT,
    fontWeight: "600",
    marginBottom: 10,
  },

  // Follow = filled (primary). Following = outlined (secondary).
  followBtn: {
    width: "100%",
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: ACCENT,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 32,
  },
  followingBtn: {
    backgroundColor: BG,
    borderWidth: 1,
    borderColor: BORDER,
  },
  followBtnText:     { fontSize: 12, fontWeight: "700", color: BRAND },
  followingBtnText:  { color: TEXT_MUTED },

  emptyState: { alignItems: "center", paddingVertical: 60, rowGap: 10 },
  emptyText:  { fontSize: 14, color: TEXT_MUTED, fontWeight: "500" },
});
