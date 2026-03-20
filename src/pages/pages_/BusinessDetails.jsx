import React, { useEffect, useState, useRef, useCallback, useMemo } from "react";
import {
  View, Text, FlatList, ActivityIndicator, StyleSheet,
  TouchableOpacity, Animated, Dimensions, Linking, Share,
  ScrollView,
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

// ─── Design tokens ─────────────────────────────────────────────────────────────
const BRAND   = Colors.primaryDark;   // Cyprus / dark teal
const ACCENT  = Colors.primary;       // Java teal
const BG      = Colors.surfaceBase;    // #f5f7f8 — clean neutral, no green tint
const CARD    = Colors.white;
const BORDER  = Colors.borderSoft ?? Colors.border;
const TEXT_H  = Colors.black;
const TEXT_M  = Colors.secondaryText;
const WHITE   = Colors.white;
const BLACK   = Colors.black;
const GREEN   = "#22c55e";
const WA      = "#25D366";            // WhatsApp green

const { width: SCREEN_W } = Dimensions.get("window");
const COVER_H   = 240;
const AVATAR_S  = 84;
const TAB_KEYS  = ["posts", "about", "contact"];

const defaultAvatar = "https://hafrik.com/default-avatar.png";

// ─── Helpers ───────────────────────────────────────────────────────────────────
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

// ─── Small components ──────────────────────────────────────────────────────────
const StatPill = ({ icon, value, label }) => (
  <View style={st.statPill}>
    <Ionicons name={icon} size={14} color={ACCENT} />
    <Text style={st.statValue}>{value}</Text>
    <Text style={st.statLabel}>{label}</Text>
  </View>
);

const ContactRow = ({ icon, text, onPress, iconColor }) => (
  <TouchableOpacity style={st.contactRow} onPress={onPress} activeOpacity={onPress ? 0.7 : 1}>
    <View style={[st.contactIcon, { backgroundColor: (iconColor ?? ACCENT) + "18" }]}>
      <Ionicons name={icon} size={15} color={iconColor ?? ACCENT} />
    </View>
    <Text style={[st.contactText, onPress && st.contactLink]} numberOfLines={2}>{text}</Text>
    {!!onPress && <Ionicons name="chevron-forward" size={14} color={TEXT_M} />}
  </TouchableOpacity>
);

// ─── Main Component ────────────────────────────────────────────────────────────
export default function BusinessDetails({ route }) {
  const { pageId } = route.params || {};
  const navigation   = useNavigation();
  const { token, user } = useAuth();
  const { top }      = useSafeAreaInsets();
  const openComposer = useStore((s) => s.openComposer);
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
  const [activeTab,     setActiveTab]    = useState("posts");
  const [aboutExpanded, setAboutExpanded] = useState(false);

  const followRef = useRef({ following: false, followLoading: false });
  followRef.current = { following, followLoading };

  const scrollY      = useRef(new Animated.Value(0)).current;
  const coverScale   = scrollY.interpolate({ inputRange: [-80, 0], outputRange: [1.2, 1], extrapolate: "clamp" });
  const headerOpacity = scrollY.interpolate({ inputRange: [COVER_H - 56, COVER_H], outputRange: [0, 1], extrapolate: "clamp" });

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
        // API returns data directly (no page wrapper): { id, title, likes, is_liked, avatar, cover, ... }
        const pageData = payload.data;
        setPageData(pageData);
        setFollowing(!!(pageData?.is_liked));
      }
    } catch {}
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
        if (pNum === 1 && payload.data?.is_liked != null) setFollowing(!!(payload.data.is_liked));
        else if (pNum === 1 && payload.data?.is_following != null) setFollowing(!!(payload.data.is_following));
        const tp = payload.data?.total_pages ?? null;
        if (tp != null) setHasMore(pNum < tp);
        else if (feedPosts.length < 10) setHasMore(false);
      }
    } catch {}
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
      const res = await toggleFollowBusiness(pageId, curFollowing ? 'unlike' : 'like');
      const d = res?.data ?? res;
      if (d?.is_liked     != null) setFollowing(!!d.is_liked);
      else if (d?.is_following != null) setFollowing(!!d.is_following);
      const newCount = d?.likes ?? d?.followers;
      if (newCount != null) setPageData(p => p ? { ...p, likes: Number(newCount) } : p);
    } catch {
      setFollowing(followRef.current.following);
    }
    setFollowLoading(false);
  }, [pageId]);

  const handleCall = useCallback(() => {
    const phone = page?.phone || page?.phone_number || page?.contact_phone || page?.mobile;
    if (phone) Linking.openURL(`tel:${phone.replace(/\s+/g, "")}`);
  }, [page]);

  const handleWhatsApp = useCallback(() => {
    const phone = page?.phone || page?.phone_number || page?.contact_phone || page?.mobile;
    if (phone) Linking.openURL(`https://wa.me/${phone.replace(/[^0-9+]/g, "")}`);
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

  // ── Tab content ───────────────────────────────────────────────────────────────
  const aboutTab = useMemo(() => {
    if (!page) return null;
    const about    = cleanText(page.about) || "";
    const category = cleanText(page.category || page.page_category || page.type) || "";
    const email    = cleanText(page.email) || "";

    return (
      <View style={st.tabContent}>
        {!!about && (
          <View style={st.section}>
            <Text style={st.sectionLabel}>About</Text>
            <TouchableOpacity activeOpacity={0.8} onPress={() => setAboutExpanded(v => !v)}>
              <Text style={st.aboutText} numberOfLines={aboutExpanded ? undefined : 5}>{about}</Text>
              {about.length > 150 && (
                <Text style={st.seeMore}>{aboutExpanded ? "See less" : "See more"}</Text>
              )}
            </TouchableOpacity>
          </View>
        )}
        {!!category && (
          <View style={st.section}>
            <Text style={st.sectionLabel}>Category</Text>
            <View style={st.categoryRow}>
              <View style={st.categoryPill}>
                <Ionicons name="pricetag-outline" size={12} color={ACCENT} style={{ marginRight: 5 }} />
                <Text style={st.categoryText}>{category}</Text>
              </View>
            </View>
          </View>
        )}
        {!!email && (
          <View style={st.section}>
            <Text style={st.sectionLabel}>Email</Text>
            <TouchableOpacity onPress={() => Linking.openURL(`mailto:${email}`)} activeOpacity={0.7}>
              <Text style={[st.aboutText, st.contactLink]}>{email}</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  }, [page, aboutExpanded]);

  const contactTab = useMemo(() => {
    if (!page) return null;
    const phone   = cleanText(page.phone || page.phone_number || page.contact_phone || page.mobile) || "";
    const address = cleanText(page.address || page.full_address || page.location) || "";
    const website = page.website || page.url || page.web || "";
    const email   = cleanText(page.email) || "";

    if (!phone && !address && !website && !email) {
      return (
        <View style={st.tabContent}>
          <View style={st.emptyTab}>
            <Ionicons name="call-outline" size={36} color={BORDER} />
            <Text style={st.emptyTabText}>No contact details provided</Text>
          </View>
        </View>
      );
    }

    return (
      <View style={st.tabContent}>
        <View style={st.contactCard}>
          {!!phone && (
            <ContactRow
              icon="call-outline"
              text={phone}
              onPress={handleCall}
              iconColor={GREEN}
            />
          )}
          {!!phone && (
            <ContactRow
              icon="logo-whatsapp"
              text={"WhatsApp: " + phone}
              onPress={handleWhatsApp}
              iconColor={WA}
            />
          )}
          {!!address && (
            <ContactRow
              icon="location-outline"
              text={address}
            />
          )}
          {!!website && (
            <ContactRow
              icon="globe-outline"
              text={website}
              onPress={handleWebsite}
              iconColor={ACCENT}
            />
          )}
          {!!email && (
            <ContactRow
              icon="mail-outline"
              text={email}
              onPress={() => Linking.openURL(`mailto:${email}`)}
              iconColor={ACCENT}
            />
          )}
        </View>
      </View>
    );
  }, [page, handleCall, handleWhatsApp, handleWebsite]);

  // ── List header (cover + profile card + tab bar + tab content for non-posts tabs) ──
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

    const title      = cleanText(page.title) || "";
    const handle     = cleanText(page.name) || "";
    const isVerified = page.verified === true || page.verified === 1 || page.verified_value === 1;
    const phone      = cleanText(page.phone || page.phone_number || page.contact_phone || page.mobile) || "";
    const postsCount    = Number(page.posts_count ?? 0);
    const followersCount = Number(page.likes ?? page.followers ?? page.followers_count ?? page.likes_count ?? 0);

    return (
      <View>
        {/* ── Cover ── */}
        <View style={st.coverWrap}>
          <Animated.View style={[StyleSheet.absoluteFill, { transform: [{ scale: coverScale }] }]}>
            {page.cover ? (
              <ExpoImage
                source={{ uri: page.cover }}
                style={StyleSheet.absoluteFill}
                contentFit="cover"
                contentPosition="top"
                cachePolicy="memory-disk"
              />
            ) : (
              <View style={[StyleSheet.absoluteFill, { backgroundColor: BRAND }]} />
            )}
          </Animated.View>
          {/* Bottom scrim for avatar blending */}
          <LinearGradient
            colors={["transparent", BLACK + "44"]}
            style={StyleSheet.absoluteFill}
          />
        </View>

        {/* ── Profile row: avatar (overlapping cover) + stats ── */}
        <View style={st.profileRow}>
          <View style={st.avatarWrap}>
            <ExpoImage
              source={{ uri: page.avatar || defaultAvatar }}
              style={st.avatar}
              contentFit="cover"
              cachePolicy="memory-disk"
            />
            {isVerified && (
              <View style={st.verifiedDot}>
                <Ionicons name="checkmark-circle" size={20} color={ACCENT} />
              </View>
            )}
          </View>

          {/* Stat pills */}
          <View style={st.statsStrip}>
            <StatPill icon="people-outline" value={fmtCount(followersCount)} label="Followers" />
            <View style={st.statDivider} />
            <StatPill icon="newspaper-outline" value={fmtCount(postsCount)} label="Posts" />
          </View>
        </View>

        {/* ── Business name + handle (always below avatar, never hidden) ── */}
        <View style={st.nameBlock}>
          <View style={st.nameRow}>
            <Text style={st.pageTitle} numberOfLines={2}>{title}</Text>
            {isVerified && (
              <Ionicons name="checkmark-circle" size={18} color={ACCENT} style={{ marginLeft: 6, marginTop: 2 }} />
            )}
          </View>
          {!!handle && (
            <Text style={st.handle}>@{handle}</Text>
          )}
          {isVerified && (
            <View style={st.verifiedBadge}>
              <Ionicons name="checkmark-circle" size={11} color={ACCENT} />
              <Text style={st.verifiedText}>Verified Business</Text>
            </View>
          )}
          {isOwner && (
            <View style={st.ownerPill}>
              <Ionicons name="shield-checkmark" size={11} color={ACCENT} />
              <Text style={st.ownerPillText}>Your Page</Text>
            </View>
          )}
        </View>

        {/* ── CTA buttons ── */}
        <View style={st.ctaRow}>
          {isOwner ? (
            <TouchableOpacity style={st.primaryBtn} onPress={openPageComposer} activeOpacity={0.85}>
              <View style={st.primaryBtnGrad}>
                <Ionicons name="create-outline" size={16} color={WHITE} />
                <Text style={st.primaryBtnText}>Write Post</Text>
              </View>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={st.primaryBtn}
              onPress={handleFollow}
              activeOpacity={0.85}
              disabled={followLoading}
            >
              {following ? (
                <View style={st.followingBtn}>
                  {followLoading
                    ? <ActivityIndicator size="small" color={TEXT_M} />
                    : <>
                        <Ionicons name="checkmark" size={16} color={TEXT_M} />
                        <Text style={st.followingBtnText}>Following</Text>
                      </>
                  }
                </View>
              ) : (
                <View style={st.primaryBtnGrad}>
                  {followLoading
                    ? <ActivityIndicator size="small" color={WHITE} />
                    : <>
                        <Ionicons name="add" size={17} color={WHITE} />
                        <Text style={st.primaryBtnText}>Follow</Text>
                      </>
                  }
                </View>
              )}
            </TouchableOpacity>
          )}

          {!!phone && (
            <TouchableOpacity style={st.circleBtn} onPress={handleCall} activeOpacity={0.85}>
              <Ionicons name="call" size={17} color={GREEN} />
            </TouchableOpacity>
          )}

          {!!phone && (
            <TouchableOpacity style={[st.circleBtn, { backgroundColor: WA + "15" }]} onPress={handleWhatsApp} activeOpacity={0.85}>
              <Ionicons name="logo-whatsapp" size={17} color={WA} />
            </TouchableOpacity>
          )}

          <TouchableOpacity style={st.circleBtn} onPress={handleShare} activeOpacity={0.85}>
            <Ionicons name="share-outline" size={17} color={BRAND} />
          </TouchableOpacity>
        </View>

        {/* ── Tab bar ── */}
        <View style={st.tabBar}>
          {TAB_KEYS.map((key) => {
            const active = activeTab === key;
            const label = key.charAt(0).toUpperCase() + key.slice(1);
            return (
              <TouchableOpacity
                key={key}
                style={[st.tab, active && st.tabActive]}
                onPress={() => setActiveTab(key)}
                activeOpacity={0.75}
              >
                <Text style={[st.tabLabel, active && st.tabLabelActive]}>{label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* ── Non-posts tab content lives here (inside header) ── */}
        {activeTab === "about" && aboutTab}
        {activeTab === "contact" && contactTab}

        {/* ── Posts tab: owner compose bar + section header ── */}
        {activeTab === "posts" && (
          <>
            {isOwner && (
              <TouchableOpacity style={st.composeBar} onPress={openPageComposer} activeOpacity={0.85}>
                <View style={st.composeIcon}>
                  <Ionicons name="storefront-outline" size={16} color={BRAND} />
                </View>
                <View style={st.composeInput}>
                  <Text style={st.composePlaceholder}>Write something…</Text>
                </View>
                <Ionicons name="send" size={16} color={ACCENT} />
              </TouchableOpacity>
            )}
            <View style={st.feedLabel}>
              <View style={st.feedLabelDot} />
              <Text style={st.feedLabelText}>LATEST POSTS</Text>
              {loadingFeed && <ActivityIndicator size="small" color={ACCENT} style={{ marginLeft: 8 }} />}
            </View>
          </>
        )}
      </View>
    );
  }, [
    loadingPage, page, following, followLoading, aboutExpanded,
    loadingFeed, isOwner, activeTab, coverScale,
    openPageComposer, handleCall, handleWhatsApp, handleFollow,
    handleWebsite, handleShare, aboutTab, contactTab,
  ]);

  const [visiblePostId, setVisiblePostId] = useState(null);

  const onViewableItemsChanged = useRef(({ viewableItems }) => {
    const next = viewableItems.find((e) => e?.isViewable && e?.item?.id)?.item?.id ?? null;
    setVisiblePostId((prev) => (prev === next ? prev : next));
  });

  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 70, waitForInteraction: false });

  const renderFeedItem = useCallback(({ item }) => (
    <FeedCard feed={item} isVisible={visiblePostId === item?.id} />
  ), [visiblePostId]);

  // Only show FlatList data in Posts tab
  const listData = activeTab === "posts" ? posts : [];

  return (
    <View style={st.root}>
      {/* ── Sticky top bar ── */}
      <Animated.View style={[st.stickyHeader, { paddingTop: top + 4, opacity: headerOpacity }]}>
        <Text style={st.stickyTitle} numberOfLines={1}>{cleanText(page?.title) || ""}</Text>
      </Animated.View>

      {/* ── Floating back button ── */}
      <TouchableOpacity style={[st.backBtn, { top: top + 8 }]} onPress={() => navigation.goBack()} activeOpacity={0.85}>
        <Ionicons name="arrow-back" size={18} color={WHITE} />
      </TouchableOpacity>

      <FlatList
        data={listData}
        keyExtractor={(item) => String(item.id ?? Math.random())}
        renderItem={renderFeedItem}
        onViewableItemsChanged={onViewableItemsChanged.current}
        viewabilityConfig={viewabilityConfig.current}
        extraData={visiblePostId}
        ListHeaderComponent={listHeader}
        onEndReached={activeTab === "posts" ? handleLoadMore : undefined}
        onEndReachedThreshold={0.5}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={st.listContent}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: false }
        )}
        scrollEventThrottle={16}
        ListFooterComponent={
          loadingMore && activeTab === "posts"
            ? <ActivityIndicator size="small" color={ACCENT} style={{ paddingVertical: 20 }} />
            : null
        }
        ListEmptyComponent={
          activeTab === "posts" && !loadingFeed ? (
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

// ─── Styles ────────────────────────────────────────────────────────────────────
const st = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },
  listContent: { paddingBottom: 120 },

  // ── Sticky header ──
  stickyHeader: {
    position: "absolute",
    top: 0, left: 0, right: 0, zIndex: 50,
    backgroundColor: BRAND,
    paddingBottom: 10,
    paddingHorizontal: 60,
    alignItems: "center",
  },
  stickyTitle: {
    fontSize: 15, fontWeight: "800", color: WHITE,
    fontFamily: "ReadexPro-Bold",
  },

  // ── Back button ──
  backBtn: {
    position: "absolute", left: 14, zIndex: 99,
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: BLACK + "55",
    justifyContent: "center", alignItems: "center",
  },

  // ── Cover ──
  coverWrap: {
    width: SCREEN_W, height: COVER_H, overflow: "hidden",
    backgroundColor: BRAND,
  },
  // ── Profile row ──
  profileRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    marginTop: -(AVATAR_S / 2),
    marginBottom: 10,
    gap: 14,
    backgroundColor: CARD,
  },
  avatarWrap: { position: "relative" },
  avatar: {
    width: AVATAR_S, height: AVATAR_S, borderRadius: AVATAR_S / 2,
    borderWidth: 3.5, borderColor: WHITE,
    backgroundColor: BORDER,
  },
  verifiedDot: {
    position: "absolute", bottom: 0, right: -2,
    backgroundColor: WHITE, borderRadius: 12,
  },
  statsStrip: {
    flex: 1, flexDirection: "row", alignItems: "center",
    backgroundColor: CARD, borderRadius: 14, borderWidth: 1, borderColor: BORDER,
    paddingVertical: 10, paddingHorizontal: 12, gap: 0,
    shadowColor: BLACK, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 6, elevation: 2,
  },
  statPill: { flex: 1, alignItems: "center", gap: 2 },
  statValue: { fontSize: 17, fontWeight: "900", color: TEXT_H, fontFamily: "ReadexPro-Bold" },
  statLabel: { fontSize: 10, color: TEXT_M, textTransform: "uppercase", letterSpacing: 0.4, fontFamily: "ReadexPro-Regular" },
  statDivider: { width: 1, height: 28, backgroundColor: BORDER, marginHorizontal: 4 },

  // ── Name block (always below avatar) ──
  nameBlock: {
    paddingHorizontal: 16, paddingBottom: 14, backgroundColor: CARD,
  },
  nameRow: {
    flexDirection: "row", alignItems: "flex-start", marginBottom: 4,
  },
  pageTitle: {
    flex: 1, fontSize: 22, fontWeight: "900", color: TEXT_H,
    fontFamily: "ReadexPro-Bold", letterSpacing: -0.3, lineHeight: 28,
  },
  handle: {
    fontSize: 13, color: TEXT_M, fontWeight: "500",
    marginBottom: 6, fontFamily: "ReadexPro-Regular",
  },
  verifiedBadge: {
    flexDirection: "row", alignItems: "center", gap: 4,
    alignSelf: "flex-start", marginBottom: 6,
    backgroundColor: ACCENT + "18", borderRadius: 100,
    paddingHorizontal: 10, paddingVertical: 4,
    borderWidth: 1, borderColor: ACCENT + "30",
  },
  verifiedText: { fontSize: 10, fontWeight: "700", color: ACCENT, fontFamily: "ReadexPro-Bold" },
  ownerPill: {
    flexDirection: "row", alignItems: "center", alignSelf: "flex-start",
    gap: 4, marginBottom: 0,
    backgroundColor: ACCENT + "14", borderRadius: 100,
    paddingHorizontal: 10, paddingVertical: 4,
    borderWidth: 1, borderColor: ACCENT + "28",
  },
  ownerPillText: { fontSize: 11, fontWeight: "700", color: ACCENT, fontFamily: "ReadexPro-Bold" },

  // ── CTA row ──
  ctaRow: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 16, gap: 10, marginBottom: 18,
    backgroundColor: CARD,
  },
  primaryBtn: {
    flex: 1, borderRadius: 100, overflow: "hidden",
    shadowColor: BRAND, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.2, shadowRadius: 6, elevation: 4,
  },
  primaryBtnGrad: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    paddingVertical: 12, gap: 6,
    backgroundColor: BRAND,
    borderRadius: 100,
  },
  primaryBtnText: { fontSize: 14, fontWeight: "800", color: WHITE, fontFamily: "ReadexPro-Bold" },
  followingBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    paddingVertical: 12, borderRadius: 100, gap: 6,
    backgroundColor: BG, borderWidth: 1.5, borderColor: BORDER,
  },
  followingBtnText: { fontSize: 14, fontWeight: "700", color: TEXT_M, fontFamily: "ReadexPro-Bold" },
  circleBtn: {
    width: 46, height: 46, borderRadius: 23,
    backgroundColor: BG, borderWidth: 1.5, borderColor: BORDER,
    alignItems: "center", justifyContent: "center",
  },

  // ── Tab bar ──
  tabBar: {
    flexDirection: "row",
    backgroundColor: CARD,
    borderTopWidth: 1, borderTopColor: BORDER,
    borderBottomWidth: 1, borderBottomColor: BORDER,
    marginBottom: 0,
  },
  tab: {
    flex: 1, paddingVertical: 14,
    alignItems: "center",
    borderBottomWidth: 2.5, borderBottomColor: "transparent",
  },
  tabActive: { borderBottomColor: BRAND },
  tabLabel: {
    fontSize: 13, fontWeight: "600", color: TEXT_M,
    fontFamily: "ReadexPro-Medium",
  },
  tabLabelActive: {
    color: BRAND, fontWeight: "800", fontFamily: "ReadexPro-Bold",
  },

  // ── Tab content ──
  tabContent: {
    backgroundColor: BG, paddingHorizontal: 16, paddingVertical: 16, gap: 16,
  },
  section: { gap: 8 },
  sectionLabel: {
    fontSize: 11, fontWeight: "800", color: TEXT_M,
    textTransform: "uppercase", letterSpacing: 1.2, fontFamily: "ReadexPro-Bold",
  },
  aboutText: { fontSize: 14, color: TEXT_H, lineHeight: 22, fontFamily: "ReadexPro-Regular" },
  seeMore: { fontSize: 13, color: ACCENT, fontWeight: "600", marginTop: 5, fontFamily: "ReadexPro-Bold" },
  categoryRow: { flexDirection: "row" },
  categoryPill: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: ACCENT + "18", borderRadius: 100,
    paddingHorizontal: 12, paddingVertical: 5,
    borderWidth: 1, borderColor: ACCENT + "28",
  },
  categoryText: { fontSize: 12, fontWeight: "700", color: BRAND, fontFamily: "ReadexPro-Bold" },
  contactLink: { color: ACCENT, fontWeight: "600" },
  emptyTab: { alignItems: "center", paddingVertical: 50, gap: 10 },
  emptyTabText: { fontSize: 14, color: TEXT_M, fontFamily: "ReadexPro-Regular" },

  // ── Contact card ──
  contactCard: {
    backgroundColor: CARD, borderRadius: 16, borderWidth: 1, borderColor: BORDER,
    overflow: "hidden",
    shadowColor: BLACK, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
  },
  contactRow: {
    flexDirection: "row", alignItems: "center", gap: 12,
    paddingHorizontal: 16, paddingVertical: 13,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: BORDER,
  },
  contactIcon: {
    width: 36, height: 36, borderRadius: 10,
    alignItems: "center", justifyContent: "center",
  },
  contactText: { flex: 1, fontSize: 13, color: TEXT_H, lineHeight: 19, fontFamily: "ReadexPro-Regular" },

  // ── Posts section ──
  composeBar: {
    flexDirection: "row", alignItems: "center", gap: 10,
    backgroundColor: CARD, paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: BORDER,
  },
  composeIcon: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: BG, borderWidth: 1, borderColor: BORDER,
    alignItems: "center", justifyContent: "center",
  },
  composeInput: {
    flex: 1, height: 38, backgroundColor: BG, borderRadius: 19,
    paddingHorizontal: 14, justifyContent: "center",
    borderWidth: 1, borderColor: BORDER,
  },
  composePlaceholder: { fontSize: 13, color: TEXT_M, fontFamily: "ReadexPro-Regular" },
  feedLabel: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 18, paddingTop: 14, paddingBottom: 8,
    backgroundColor: BG,
  },
  feedLabelDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: ACCENT, marginRight: 8 },
  feedLabelText: { fontSize: 11, fontWeight: "800", color: TEXT_M, letterSpacing: 2, fontFamily: "ReadexPro-Bold" },

  // ── Loader / empty ──
  loader: { justifyContent: "center", alignItems: "center", paddingVertical: 80, gap: 12 },
  loaderText: { color: TEXT_M, fontSize: 14, fontFamily: "ReadexPro-Regular" },
  empty: { alignItems: "center", paddingVertical: 60, gap: 10 },
  emptyText: { fontSize: 14, color: TEXT_M, fontFamily: "ReadexPro-Regular" },
});
