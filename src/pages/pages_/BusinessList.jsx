import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  ActivityIndicator,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Dimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Image as ExpoImage } from "expo-image";
import { useNavigation } from "@react-navigation/native";
import { getBusinessList, followBusiness, unfollowBusiness } from "./Businessapi";

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
const CARD_W = (SCREEN_W - 48) / 2;

const defaultAvatar = "https://hafrik.com/default-avatar.png";

// ─── Business Card ─────────────────────────────────────────────────────────────
const BusinessCard = ({ item, onPress }) => {
  const [following, setFollowing] = useState(item.is_following);
  const [followers, setFollowers] = useState(item.followers_count ?? item.followers ?? 0);
  const [loading,   setLoading]   = useState(false);

  const handleFollow = async () => {
    if (loading) return;
    setLoading(true);
    try {
      if (following) {
        await unfollowBusiness(item.id);
        setFollowing(false);
        setFollowers(f => Math.max(0, f - 1));
      } else {
        await followBusiness(item.id);
        setFollowing(true);
        setFollowers(f => f + 1);
      }
    } catch (e) { console.log("follow error:", e); }
    setLoading(false);
  };

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

      <TouchableOpacity
        style={[styles.followBtn, following && styles.followingBtn]}
        onPress={handleFollow}
        activeOpacity={0.8}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator size="small" color={following ? TEXT_MUTED : BRAND} />
        ) : (
          <Text style={[styles.followBtnText, following && styles.followingBtnText]}>
            {following ? "Following" : "Follow"}
          </Text>
        )}
      </TouchableOpacity>
    </TouchableOpacity>
  );
};

// ─── BusinessList ──────────────────────────────────────────────────────────────
export default function BusinessList() {
  const navigation = useNavigation();

  const [pages,       setPages]       = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page,        setPage]        = useState(1);
  const [hasMore,     setHasMore]     = useState(true);
  const [search,      setSearch]      = useState("");

  useEffect(() => { loadPages(1); }, []);

  const loadPages = async (pageNum, query = search) => {
    if (pageNum === 1) setLoading(true);
    else setLoadingMore(true);

    try {
      const filters = query.trim() ? { search: query.trim() } : {};
      const payload = await getBusinessList(pageNum, 20, filters);
      if (payload?.status === "success") {
        const items = Array.isArray(payload.data?.data) ? payload.data.data : [];
        setPages(prev => pageNum === 1 ? items : [...prev, ...items]);
        if (items.length < 20) setHasMore(false);
        else setHasMore(true);
      }
    } catch (e) { console.log("loadPages error:", e); }

    setLoading(false);
    setLoadingMore(false);
  };

  const handleSearch = useCallback((text) => {
    setSearch(text);
    setPage(1);
    setHasMore(true);
    loadPages(1, text);
  }, []);

  const handleLoadMore = useCallback(() => {
    if (loadingMore || !hasMore) return;
    const next = page + 1;
    setPage(next);
    loadPages(next);
  }, [page, loadingMore, hasMore]);

  const handlePress = useCallback((item) => {
    navigation.navigate("BusinessDetails", { pageId: item.id });
  }, []);

  const ListHeader = () => (
    <View style={styles.listHeader}>
      <Text style={styles.screenTitle}>Business Pages</Text>
      <Text style={styles.screenSub}>Discover & follow businesses on Hafrik</Text>
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
        renderItem={({ item }) => <BusinessCard item={item} onPress={handlePress} />}
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
  followBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: BRAND,
  },
  followingBtnText: {
    color: TEXT_MUTED,
  },

  emptyState: { alignItems: "center", paddingVertical: 60, rowGap: 10 },
  emptyText:  { fontSize: 14, color: TEXT_MUTED, fontWeight: "500" },
});