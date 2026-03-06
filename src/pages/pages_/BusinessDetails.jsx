import React, { useEffect, useState, useRef, useCallback, useMemo } from "react";
import {
  View, Text, FlatList, ActivityIndicator, StyleSheet,
  TouchableOpacity, Animated, Dimensions, Linking, Share, Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useNavigation } from "@react-navigation/native";
import { Image as ExpoImage } from "expo-image";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "../../AuthContext";
import useStore from "../../repository/store";
import { getBusinessDetails, getBusinessFeed, toggleFollowBusiness } from "./Businessapi";
import FeedCard from "../home/feeds/feedcard.jsx";
import { Colors } from "../../theme";

const BRAND      = Colors.primaryDark;
const ACCENT     = Colors.primary;
const BG         = Colors.background ?? "#F7F8FA";
const CARD       = Colors.white;
const BORDER     = Colors.borderSoft ?? Colors.border;
const TEXT_HEAD   = Colors.black;
const TEXT_BODY   = Colors.black;
const TEXT_MUTED  = Colors.secondaryText;
const WHITE       = Colors.white;
const BLACK       = Colors.black;
const GREEN       = "#22c55e";

const { width: SCREEN_W } = Dimensions.get("window");
const COVER_H  = 200;
const AVATAR_S = 80;

const defaultAvatar = "https://hafrik.com/default-avatar.png";

const decodeHtml = (str) => {
  if (!str) return str;
  return str
    .replace(/&#039;/g, "'").replace(/&quot;/g, '"').replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&nbsp;/g, " ")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)));
};

const cleanText = (str) => {
  if (!str) return str;
  return decodeHtml(str.replace(/<\/?[^>]+(>|$)/g, "").trim());
};

const fmtCount = (n) => {
  const v = Number(n ?? 0);
  if (v >= 1_000_000) return (v / 1_000_000).toFixed(1) + "M";
  if (v >= 1_000) return (v / 1_000).toFixed(1) + "k";
  return String(v);
};

export default function BusinessDetails({ route }) {
  const { pageId } = route.params || {};
  const navigation    = useNavigation();
  const { token, user } = useAuth();
  const { top }       = useSafeAreaInsets();
  const openComposer  = useStore((s) => s.openComposer);
  const refreshSignal = useStore((s) => s.refreshSignal);

  const [page,          setPageData]     = useState(null);
  const [posts,         setPosts]        = useState([]);
  const [loadingPage,   setLoadingPage]  = useState(true);
  const [loadingFeed,   setLoadingFeed]  = useState(true);
  const [loadingMore,   setLoadingMore]  = useState(false);
  const [pageNum,       setPageNum]      = useState(1);
  const [hasMore,       setHasMore]      = useState(true);
  const [following,     setFollowing]    = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [aboutExpanded, setAboutExpanded] = useState(false);

  const followRef = useRef({ following: false, followLoading: false });
  followRef.current = { following, followLoading };

  const scrollY       = useRef(new Animated.Value(0)).current;
  const coverScale    = scrollY.interpolate({ inputRange: [-100, 0], outputRange: [1.3, 1], extrapolate: "clamp" });
  const coverOpacity  = scrollY.interpolate({ inputRange: [0, COVER_H * 0.5], outputRange: [1, 0.3], extrapolate: "clamp" });
  const headerOpacity = scrollY.interpolate({ inputRange: [COVER_H - 60, COVER_H], outputRange: [0, 1], extrapolate: "clamp" });

  const isOwner = !!page && (
    page.is_owner === true || page.is_owner === 1 ||
    (user?.id && String(page.user_id) === String(user.id))
  );

  const openPageComposer = useCallback(() => {
    openComposer({ _type: "page", id: pageId, title: page?.title, avatar: page?.avatar, locked: true });
  }, [openComposer, pageId, page?.title, page?.avatar]);

  const prevRefreshSignal = useRef(0);
  useEffect(() => {
    if (refreshSignal > 0 && refreshSignal !== prevRefreshSignal.current) {
      prevRefreshSignal.current = refreshSignal;
      loadFeed(1);
    }
  }, [refreshSignal]);

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
      }
    } catch (e) { console.log("loadPage:", e); }
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
          : Array.isArray(payload.data) ? payload.data : [];
        setPosts(prev => pNum === 1 ? feedPosts : [...prev, ...feedPosts]);
        if (pNum === 1 && payload.data?.is_following != null) setFollowing(!!(payload.data.is_following));
        const tp = payload.data?.total_pages ?? null;
        if (tp != null) setHasMore(pNum < tp);
        else if (feedPosts.length < 10) setHasMore(false);
      }
    } catch (e) { console.log("loadFeed:", e); }
    setLoadingFeed(false);
    setLoadingMore(false);
  };

  const handleLoadMore = useCallback(() => {
    if (loadingMore || !hasMore) return;
    const next = pageNum + 1;
    setPageNum(next);
    loadFeed(next);
  }, [pageNum, loadingMore, hasMore]);

  const handleFollow = useCallback(async () => {
    const { followLoading: curLoad, following: curFollowing } = followRef.current;
    if (curLoad) return;
    setFollowLoading(true);
    setFollowing(!curFollowing);
    try {
      const res = await toggleFollowBusiness(pageId, token);
      if (res?.data?.is_following != null) setFollowing(!!(res.data.is_following));
    } catch (e) {
      console.log("follow error:", e);
      setFollowing(curFollowing);
    }
    setFollowLoading(false);
  }, [pageId, token]);

  const handleCall = useCallback(() => {
    const phone = page?.phone || page?.phone_number || page?.contact_phone || page?.mobile;
    if (phone) Linking.openURL(`tel:${phone.replace(/\s+/g, "")}`);
  }, [page]);

  const handleWebsite = useCallback(() => {
    let url = page?.website || page?.url || page?.web;
    if (!url) return;
    if (!url.startsWith("http")) url = "https://" + url;
    navigation.navigate("WebView", { url, title: cleanText(page?.title) });
  }, [page, navigation]);

  const handleShare = useCallback(async () => {
    try {
      await Share.share({
        message: `Check out "${cleanText(page?.title)}" on Hafrik!\nhttps://hafrik.com/page/${pageId}`,
      });
    } catch {}
  }, [page?.title, pageId]);

  // ── List Header ───────────────────────────────────────────────────────────
  const listHeader = useMemo(() => {
    if (loadingPage) {
      return (
        <View style={st.loader}>
          <ActivityIndicator size="large" color={ACCENT} />
          <Text style={st.loaderText}>Loading…</Text>
        </View>
      );
    }
    if (!page) return null;

    const title    = cleanText(page.title) || "";
    const handle   = cleanText(page.name)  || "";
    const about    = cleanText(page.about) || "";
    const category = cleanText(page.category || page.page_category || page.type) || "";
    const address  = cleanText(page.address || page.full_address || page.location) || "";
    const phone    = cleanText(page.phone || page.phone_number || page.contact_phone || page.mobile) || "";
    const website  = page.website || page.url || page.web || "";
    const postsCount    = Number(page.posts_count ?? 0);
    const followersCount = Number(page.followers_count ?? page.likes_count ?? 0);
    const isVerified = page.verified === true || page.verified === 1 || page.verified_value === 1;
    const hasContact = !!(address || phone || website);

    return (
      <View style={st.headerBlock}>
        {/* ── Cover ── */}
        <Animated.View style={[st.coverWrap, { transform: [{ scale: coverScale }], opacity: coverOpacity }]}>
          {page.cover ? (
            <ExpoImage source={{ uri: page.cover }} style={st.cover} contentFit="cover" cachePolicy="memory-disk" />
          ) : (
            <LinearGradient colors={[BRAND, ACCENT + "DD"]} style={st.cover} />
          )}
          <LinearGradient colors={["transparent", BRAND + "AA"]} style={StyleSheet.absoluteFillObject} />
        </Animated.View>

        {/* ── Profile Card ── */}
        <View style={st.profileCard}>
          {/* Avatar */}
          <View style={st.avatarRow}>
            <View style={st.avatarWrap}>
              <ExpoImage
                source={{ uri: page.avatar || defaultAvatar }}
                style={st.avatar}
                contentFit="cover"
                cachePolicy="memory-disk"
              />
              {isVerified && (
                <View style={st.verifiedDot}>
                  <Ionicons name="checkmark-circle" size={22} color={ACCENT} />
                </View>
              )}
            </View>

            {/* Stats row */}
            <View style={st.statsRow}>
              <View style={st.statItem}>
                <Text style={st.statNum}>{fmtCount(postsCount)}</Text>
                <Text style={st.statLabel}>Posts</Text>
              </View>
              <View style={st.statDivider} />
              <View style={st.statItem}>
                <Text style={st.statNum}>{fmtCount(followersCount)}</Text>
                <Text style={st.statLabel}>Followers</Text>
              </View>
            </View>
          </View>

          {/* Name + category */}
          <View style={st.nameSection}>
            <View style={st.nameRow}>
              <Text style={st.pageTitle} numberOfLines={2}>{title}</Text>
              {isVerified && (
                <Ionicons name="checkmark-circle" size={16} color={ACCENT} style={{ marginLeft: 5 }} />
              )}
            </View>
            <View style={st.metaRow}>
              {!!handle && <Text style={st.handle}>@{handle}</Text>}
              {!!category && (
                <View style={st.categoryPill}>
                  <Text style={st.categoryText}>{category}</Text>
                </View>
              )}
            </View>
            {isOwner && (
              <View style={st.ownerPill}>
                <Ionicons name="shield-checkmark" size={11} color={ACCENT} />
                <Text style={st.ownerPillText}>Your Page</Text>
              </View>
            )}
          </View>

          {/* About */}
          {!!about && (
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => setAboutExpanded(v => !v)}
              style={st.aboutWrap}
            >
              <Text style={st.aboutText} numberOfLines={aboutExpanded ? undefined : 3}>
                {about}
              </Text>
              {about.length > 120 && (
                <Text style={st.seeMore}>{aboutExpanded ? "See less" : "See more"}</Text>
              )}
            </TouchableOpacity>
          )}

          {/* ── Action Buttons ── */}
          <View style={st.actionsRow}>
            {isOwner ? (
              <TouchableOpacity style={st.primaryAction} onPress={openPageComposer} activeOpacity={0.85}>
                <LinearGradient colors={[ACCENT, BRAND]} style={st.actionGrad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                  <Ionicons name="create-outline" size={15} color={WHITE} />
                  <Text style={st.primaryActionText}>Write Post</Text>
                </LinearGradient>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={[st.primaryAction, following && st.followingAction]}
                onPress={handleFollow}
                activeOpacity={0.85}
                disabled={followLoading}
              >
                {followLoading ? (
                  <View style={st.actionInner}>
                    <ActivityIndicator size="small" color={following ? TEXT_MUTED : WHITE} />
                  </View>
                ) : following ? (
                  <View style={[st.actionInner, { backgroundColor: BG, borderWidth: 1, borderColor: BORDER }]}>
                    <Ionicons name="checkmark" size={15} color={TEXT_MUTED} />
                    <Text style={[st.primaryActionText, { color: TEXT_MUTED }]}>Following</Text>
                  </View>
                ) : (
                  <LinearGradient colors={[ACCENT, BRAND]} style={st.actionGrad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                    <Ionicons name="add" size={16} color={WHITE} />
                    <Text style={st.primaryActionText}>Follow</Text>
                  </LinearGradient>
                )}
              </TouchableOpacity>
            )}

            {!!phone && (
              <TouchableOpacity style={st.iconAction} onPress={handleCall} activeOpacity={0.85}>
                <Ionicons name="call" size={16} color={GREEN} />
              </TouchableOpacity>
            )}

            {!!website && (
              <TouchableOpacity style={st.iconAction} onPress={handleWebsite} activeOpacity={0.85}>
                <Ionicons name="globe-outline" size={16} color={ACCENT} />
              </TouchableOpacity>
            )}

            <TouchableOpacity style={st.iconAction} onPress={handleShare} activeOpacity={0.85}>
              <Ionicons name="share-outline" size={16} color={BRAND} />
            </TouchableOpacity>
          </View>

          {/* ── Contact Info ── */}
          {hasContact && (
            <View style={st.contactCard}>
              {!!address && (
                <View style={st.contactRow}>
                  <View style={st.contactIconWrap}>
                    <Ionicons name="location-outline" size={14} color={ACCENT} />
                  </View>
                  <Text style={st.contactText} numberOfLines={2}>{address}</Text>
                </View>
              )}
              {!!phone && (
                <TouchableOpacity style={st.contactRow} onPress={handleCall} activeOpacity={0.7}>
                  <View style={st.contactIconWrap}>
                    <Ionicons name="call-outline" size={14} color={ACCENT} />
                  </View>
                  <Text style={[st.contactText, st.contactLink]}>{phone}</Text>
                </TouchableOpacity>
              )}
              {!!website && (
                <TouchableOpacity style={st.contactRow} onPress={handleWebsite} activeOpacity={0.7}>
                  <View style={st.contactIconWrap}>
                    <Ionicons name="globe-outline" size={14} color={ACCENT} />
                  </View>
                  <Text style={[st.contactText, st.contactLink]} numberOfLines={1}>{website}</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>

        {/* ── Feed Section Label ── */}
        <View style={st.feedSection}>
          <View style={st.sectionDot} />
          <Text style={st.feedSectionLabel}>POSTS</Text>
          {loadingFeed && <ActivityIndicator size="small" color={ACCENT} style={{ marginLeft: 8 }} />}
        </View>

        {/* ── Owner Compose Bar ── */}
        {isOwner && (
          <TouchableOpacity style={st.composeBar} onPress={openPageComposer} activeOpacity={0.85}>
            <View style={st.composeAvatarWrap}>
              <Ionicons name="storefront-outline" size={16} color={BRAND} />
            </View>
            <View style={st.composeInputWrap}>
              <Text style={st.composePlaceholder}>Write something…</Text>
            </View>
            <Ionicons name="send" size={16} color={ACCENT} />
          </TouchableOpacity>
        )}
      </View>
    );
  }, [loadingPage, page, following, followLoading, aboutExpanded, loadingFeed, isOwner,
      coverScale, coverOpacity, openPageComposer, handleCall, handleFollow, handleWebsite, handleShare]);

  const renderFeedItem = useCallback(({ item }) => (
    <FeedCard feed={item} />
  ), []);

  return (
    <View style={st.root}>
      {/* ── Sticky top bar (appears on scroll) ── */}
      <Animated.View style={[st.stickyHeader, { paddingTop: top + 4, opacity: headerOpacity }]}>
        <Text style={st.stickyTitle} numberOfLines={1}>{cleanText(page?.title) || ""}</Text>
      </Animated.View>

      {/* ── Floating back button ── */}
      <TouchableOpacity style={[st.backBtn, { top: top + 8 }]} onPress={() => navigation.goBack()} activeOpacity={0.85}>
        <Ionicons name="arrow-back" size={18} color={BRAND} />
      </TouchableOpacity>

      <FlatList
        data={posts}
        keyExtractor={(item) => item.id?.toString()}
        renderItem={renderFeedItem}
        ListHeaderComponent={listHeader}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.5}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={st.listContent}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: false }
        )}
        scrollEventThrottle={16}
        ListFooterComponent={
          loadingMore ? <ActivityIndicator size="small" color={ACCENT} style={{ paddingVertical: 20 }} /> : null
        }
        ListEmptyComponent={
          !loadingFeed ? (
            <View style={st.empty}>
              <Ionicons name="newspaper-outline" size={40} color={BORDER} />
              <Text style={st.emptyText}>No posts yet</Text>
            </View>
          ) : null
        }
      />
    </View>
  );
}

const st = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },
  listContent: { paddingBottom: 100 },

  // Sticky header on scroll
  stickyHeader: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 50,
    backgroundColor: CARD,
    paddingBottom: 10,
    paddingHorizontal: 60,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
    alignItems: "center",
  },
  stickyTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: BRAND,
  },

  // Back button
  backBtn: {
    position: "absolute",
    left: 16,
    zIndex: 99,
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: WHITE + "EE",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: BLACK,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 4,
  },

  // Loader
  loader: {
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 80,
    rowGap: 12,
  },
  loaderText: {
    color: TEXT_MUTED,
    fontSize: 14,
    fontWeight: "500",
  },

  // Cover
  headerBlock: { marginBottom: 4 },
  coverWrap: { width: SCREEN_W, height: COVER_H, overflow: "hidden" },
  cover: { width: "100%", height: "100%" },

  // ── Profile Card ──
  profileCard: {
    backgroundColor: CARD,
    paddingHorizontal: 18,
    paddingBottom: 18,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },

  avatarRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    marginTop: -(AVATAR_S / 2),
    marginBottom: 14,
  },
  avatarWrap: { position: "relative" },
  avatar: {
    width: AVATAR_S,
    height: AVATAR_S,
    borderRadius: AVATAR_S / 2,
    borderWidth: 3,
    borderColor: CARD,
  },
  verifiedDot: {
    position: "absolute",
    bottom: 0,
    right: -2,
    backgroundColor: CARD,
    borderRadius: 12,
  },

  statsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    paddingBottom: 6,
  },
  statItem: { alignItems: "center" },
  statNum: { fontSize: 17, fontWeight: "900", color: TEXT_HEAD },
  statLabel: { fontSize: 11, color: TEXT_MUTED, fontWeight: "500", marginTop: 1 },
  statDivider: { width: 1, height: 26, backgroundColor: BORDER },

  // Name
  nameSection: { marginBottom: 12 },
  nameRow: { flexDirection: "row", alignItems: "center", marginBottom: 4 },
  pageTitle: { fontSize: 21, fontWeight: "900", color: TEXT_HEAD, letterSpacing: -0.3, flex: 1 },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 6 },
  handle: { fontSize: 13, color: TEXT_MUTED, fontWeight: "500" },
  categoryPill: {
    backgroundColor: BG,
    borderRadius: 100,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: BORDER,
  },
  categoryText: { fontSize: 11, color: TEXT_MUTED, fontWeight: "600" },
  ownerPill: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 4,
    backgroundColor: ACCENT + "14",
    borderRadius: 100,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: ACCENT + "28",
    marginTop: 4,
  },
  ownerPillText: { fontSize: 11, fontWeight: "700", color: ACCENT },

  // About
  aboutWrap: { marginBottom: 14 },
  aboutText: { fontSize: 14, color: TEXT_BODY, lineHeight: 22 },
  seeMore: { fontSize: 13, color: ACCENT, fontWeight: "600", marginTop: 4 },

  // Actions
  actionsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 14,
  },
  primaryAction: {
    flex: 1,
    borderRadius: 100,
    overflow: "hidden",
  },
  followingAction: {},
  actionGrad: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    gap: 6,
  },
  actionInner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: 100,
    gap: 6,
  },
  primaryActionText: { fontSize: 14, fontWeight: "800", color: WHITE, letterSpacing: 0.2 },
  iconAction: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: BG,
    borderWidth: 1,
    borderColor: BORDER,
    alignItems: "center",
    justifyContent: "center",
  },

  // Contact
  contactCard: {
    backgroundColor: BG,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: BORDER,
    paddingVertical: 4,
  },
  contactRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 10,
  },
  contactIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: ACCENT + "14",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 1,
  },
  contactText: { flex: 1, fontSize: 13, color: TEXT_BODY, lineHeight: 20, fontWeight: "500" },
  contactLink: { color: ACCENT, fontWeight: "600" },

  // Feed section
  feedSection: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 10,
    backgroundColor: BG,
  },
  sectionDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: ACCENT, marginRight: 8 },
  feedSectionLabel: { fontSize: 12, fontWeight: "700", color: TEXT_MUTED, letterSpacing: 2 },

  // Compose bar
  composeBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: CARD,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  composeAvatarWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: BG,
    borderWidth: 1,
    borderColor: BORDER,
    alignItems: "center",
    justifyContent: "center",
  },
  composeInputWrap: {
    flex: 1,
    height: 38,
    backgroundColor: BG,
    borderRadius: 19,
    paddingHorizontal: 14,
    justifyContent: "center",
    borderWidth: 1,
    borderColor: BORDER,
  },
  composePlaceholder: { fontSize: 13, color: TEXT_MUTED },

  // Empty
  empty: { alignItems: "center", paddingVertical: 60, rowGap: 10 },
  emptyText: { fontSize: 14, color: TEXT_MUTED, fontWeight: "500" },
});
