// src/pages/profile/UserProfileScreen.jsx
// ✅ Updated to use YOUR endpoints:
// 1) GET  /api/v1/users/view.php?user_id=1099
// 2) GET  /api/v1/users/user_feed.php?user_id=1099&page=1&limit=10&filter=all|media
// 3) POST /api/v1/users/follow.php  body: { "user_id": 1099 } OR { "user_id": 1099, "action": "follow|unfollow" }
//
// Also wired (optional tabs):
// - GET /api/v1/users/user_communities.php?user_id=...&page=1&limit=5
// - GET /api/v1/users/user_pages.php?user_id=...&page=1&limit=5
// - GET /api/v1/users/user_following.php?user_id=...&page=1&limit=10
// - GET /api/v1/users/user_followers.php?user_id=...&page=1&limit=10
// - GET /api/v1/users/user_media.php?user_id=...&page=1&limit=10  (fallback to feed filter=media)

import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  StatusBar,
  Animated,
  Dimensions,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../../AuthContext";
import AppDetails from "../../helpers/appdetails";

const { width: SCREEN_W } = Dimensions.get("window");

const BRAND = "#0C3F44";
const ACCENT = "#13C296";
const CREAM = "#F5F0E8";
const DARK = "#0D1B1E";
const MUTED = "#7A9198";
const BORDER = "rgba(12,63,68,0.08)";

const BASE_URL = "https://hafrik.com";

/** ---------------------------
 * API helpers
 * -------------------------- */
const apiGet = async (path, token) => {
  try {
    const url = `${BASE_URL}${path.startsWith("/") ? path : "/" + path}`;
    const res = await fetch(url, {
      method: "GET",
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });
    return await res.json();
  } catch (e) {
    console.log("[UserProfile] apiGet error:", e?.message);
    return null;
  }
};

const apiPost = async (path, body, token) => {
  try {
    const url = `${BASE_URL}${path.startsWith("/") ? path : "/" + path}`;
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(body ?? {}),
    });
    return await res.json();
  } catch (e) {
    console.log("[UserProfile] apiPost error:", e?.message);
    return null;
  }
};

const decodeHtml = (text = "") =>
  String(text)
    .replace(/&rsquo;/g, "'")
    .replace(/&lsquo;/g, "'")
    .replace(/&rdquo;/g, '"')
    .replace(/&ldquo;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/<[^>]*>/g, "")
    .replace(/\s+/g, " ")
    .trim();

const isRealImage = (url) =>
  !!url &&
  !String(url).includes("blank_profile") &&
  !String(url).includes("/default.");

const statVal = (n) => {
  const num = Number(n ?? 0);
  if (!Number.isFinite(num)) return "0";
  return num >= 1000 ? `${(num / 1000).toFixed(1)}k` : String(num);
};

/** ---------------------------
 * UI bits
 * -------------------------- */
const Skeleton = ({ width, height, radius = 10, style }) => {
  const anim = useRef(new Animated.Value(0.35)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: 1, duration: 800, useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0.35, duration: 800, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [anim]);

  return (
    <Animated.View
      style={[
        { width, height, borderRadius: radius, backgroundColor: "rgba(12,63,68,0.10)", opacity: anim },
        style,
      ]}
    />
  );
};

const Tabs = ({ value, onChange }) => {
  const tabs = [
    { key: "posts", label: "Posts" },
    { key: "media", label: "Media" },
    { key: "communities", label: "Communities" },
    { key: "pages", label: "Pages" },
  ];

  return (
    <View style={styles.tabsWrap}>
      {tabs.map((t) => {
        const active = value === t.key;
        return (
          <TouchableOpacity
            key={t.key}
            activeOpacity={0.85}
            onPress={() => onChange(t.key)}
            style={[styles.tabPill, active && styles.tabPillActive]}
          >
            <Text style={[styles.tabText, active && styles.tabTextActive]}>{t.label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const PostGrid = ({ items, navigation, emptyLabel = "No posts yet" }) => {
  if (!items?.length) {
    return (
      <View style={styles.emptyPosts}>
        <Ionicons name="images-outline" size={40} color={MUTED} />
        <Text style={styles.emptyText}>{emptyLabel}</Text>
      </View>
    );
  }

  const CELL = (SCREEN_W - 4) / 3;

  return (
    <View style={styles.grid}>
      {items.map((post) => {
        const img =
          post?.media?.thumbnail ??
          post?.thumbnail ??
          post?.image ??
          post?.photo ??
          post?.cover ??
          null;

        const isVideo =
          post?.type === "video" ||
          post?.post_type === "video" ||
          String(post?.mime ?? "").includes("video");

        return (
          <TouchableOpacity
            key={`${post?.id ?? post?.post_id ?? Math.random()}`}
            style={[styles.gridCell, { width: CELL, height: CELL }]}
            activeOpacity={0.85}
            onPress={() => {
              // Keep your existing navigation if you already open a post modal / comment screen
              const feedId = post?.id ?? post?.post_id;
              navigation.navigate("CommentScreen", { feedId });
            }}
          >
            {isRealImage(img) ? (
              <Image source={{ uri: img }} style={StyleSheet.absoluteFill} resizeMode="cover" />
            ) : (
              <View style={[StyleSheet.absoluteFill, styles.gridFallback]}>
                <Ionicons name="document-text-outline" size={24} color={MUTED} />
              </View>
            )}

            {isVideo && (
              <View style={styles.videoIcon}>
                <Ionicons name="play" size={12} color="#fff" />
              </View>
            )}
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const SmallListRow = ({ icon, title, subtitle, onPress }) => (
  <TouchableOpacity style={styles.smallRow} activeOpacity={0.85} onPress={onPress}>
    <View style={styles.smallRowIcon}>
      <Ionicons name={icon} size={18} color={BRAND} />
    </View>
    <View style={{ flex: 1 }}>
      <Text style={styles.smallRowTitle} numberOfLines={1}>
        {title}
      </Text>
      {!!subtitle && (
        <Text style={styles.smallRowSub} numberOfLines={1}>
          {subtitle}
        </Text>
      )}
    </View>
    <Ionicons name="chevron-forward" size={16} color={MUTED} />
  </TouchableOpacity>
);

/** ---------------------------
 * Screen
 * -------------------------- */
export default function UserProfileScreen({ navigation, route }) {
  const { token } = useAuth();
  const { top } = useSafeAreaInsets();

  // ✅ expects route.params.userId from Explore / feed click etc.
  const userId = route?.params?.userId;
  const passedUsername = route?.params?.username ?? "";

  const [tab, setTab] = useState("posts");

  const [profile, setProfile] = useState(null);
  const [isFollowing, setIsFollowing] = useState(false);

  const [posts, setPosts] = useState([]);
  const [media, setMedia] = useState([]);
  const [communities, setCommunities] = useState([]);
  const [pages, setPages] = useState([]);

  const [loading, setLoading] = useState(true);
  const [followLoading, setFollowLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const scrollY = useRef(new Animated.Value(0)).current;

  const headerOpacity = scrollY.interpolate({
    inputRange: [0, 120],
    outputRange: [0, 1],
    extrapolate: "clamp",
  });

  const displayName = useMemo(() => {
    const p = profile ?? {};
    return p?.name ?? p?.full_name ?? p?.username ?? passedUsername ?? "Profile";
  }, [profile, passedUsername]);

  const bio = useMemo(() => decodeHtml(profile?.bio ?? profile?.about ?? ""), [profile]);

  const avatar = profile?.avatar ?? profile?.image ?? profile?.photo ?? null;
  const verified = !!(profile?.verified ?? profile?.is_verified);

  const followersCount = profile?.followers_count ?? profile?.followers ?? profile?.followers_total ?? 0;
  const followingCount = profile?.following_count ?? profile?.following ?? profile?.following_total ?? 0;
  const postsCount = profile?.posts_count ?? profile?.posts ?? posts?.length ?? 0;

  const loadAll = useCallback(async () => {
    if (!userId) return;

    setLoading(true);

    // ✅ Use your endpoints
    const viewRes = await apiGet(`/api/v1/users/view.php?user_id=${userId}`, token);
    const p = viewRes?.data ?? viewRes?.user ?? viewRes?.profile ?? null;

    if (p) {
      setProfile(p);
      setIsFollowing(!!(p.is_following ?? p.following ?? p.followed));
    }

    // Posts (filter=all)
    const postsRes = await apiGet(
      `/api/v1/users/user_feed.php?user_id=${userId}&page=1&limit=18&filter=all`,
      token
    );
    const postsItems = postsRes?.data ?? postsRes?.posts ?? postsRes?.feed ?? [];
    setPosts(Array.isArray(postsItems) ? postsItems : []);

    // Media (prefer explicit media endpoint, fallback to filter=media)
    const mediaRes =
      (await apiGet(`/api/v1/users/user_media.php?user_id=${userId}&page=1&limit=30`, token)) ||
      (await apiGet(`/api/v1/users/user_feed.php?user_id=${userId}&page=1&limit=30&filter=media`, token));

    const mediaItems = mediaRes?.data ?? mediaRes?.posts ?? mediaRes?.feed ?? [];
    setMedia(Array.isArray(mediaItems) ? mediaItems : []);

    // Communities + Pages (small previews for tabs)
    const [commRes, pagesRes] = await Promise.all([
      apiGet(`/api/v1/users/user_communities.php?user_id=${userId}&page=1&limit=10`, token),
      apiGet(`/api/v1/users/user_pages.php?user_id=${userId}&page=1&limit=10`, token),
    ]);

    setCommunities(Array.isArray(commRes?.data ?? commRes?.groups) ? (commRes?.data ?? commRes?.groups) : []);
    setPages(Array.isArray(pagesRes?.data ?? pagesRes?.pages) ? (pagesRes?.data ?? pagesRes?.pages) : []);

    setLoading(false);
  }, [token, userId]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadAll();
    setRefreshing(false);
  }, [loadAll]);

  const handleFollowToggle = useCallback(async () => {
    if (!userId || followLoading) return;
    setFollowLoading(true);

    // ✅ Your API supports either:
    // POST { user_id } -> toggle
    // OR POST { user_id, action: "follow"|"unfollow" } -> explicit
    const action = isFollowing ? "unfollow" : "follow";
    const res = await apiPost(`/api/v1/users/follow.php`, { user_id: userId, action }, token);

    // If API returns updated state, use it. Otherwise optimistic toggle.
    const next =
      res?.data?.is_following ??
      res?.data?.following ??
      res?.is_following ??
      res?.following ??
      null;

    if (typeof next === "boolean") setIsFollowing(next);
    else setIsFollowing((v) => !v);

    setFollowLoading(false);

    // refresh view stats quickly (followers count etc)
    const viewRes = await apiGet(`/api/v1/users/view.php?user_id=${userId}`, token);
    const p = viewRes?.data ?? viewRes?.user ?? viewRes?.profile ?? null;
    if (p) setProfile(p);
  }, [token, userId, isFollowing, followLoading]);

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" />

      {/* Sticky header */}
      <Animated.View style={[styles.stickyHeader, { paddingTop: top + 6, opacity: headerOpacity }]}>
        <TouchableOpacity style={styles.headerBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={20} color={DARK} />
        </TouchableOpacity>

        <Text style={styles.stickyName} numberOfLines={1}>
          {displayName}
        </Text>

        <View style={{ width: 36 }} />
      </Animated.View>

      <Animated.ScrollView
        showsVerticalScrollIndicator={false}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], {
          useNativeDriver: false,
        })}
        scrollEventThrottle={16}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={BRAND} />}
      >
        {/* HERO */}
        <View style={[styles.hero, { paddingTop: top + 14 }]}>
          <View style={styles.heroBlob1} />
          <View style={styles.heroBlob2} />

          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={20} color="#fff" />
          </TouchableOpacity>

          {/* Avatar */}
          <View style={styles.avatarWrap}>
            {loading ? (
              <Skeleton width={92} height={92} radius={46} />
            ) : isRealImage(avatar) ? (
              <Image source={{ uri: avatar }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, styles.avatarFallback]}>
                <Text style={{ fontSize: 38 }}>{profile?.gender === 2 ? "👩" : "👨"}</Text>
              </View>
            )}

            {verified && (
              <View style={styles.verifiedBadge}>
                <Ionicons name="checkmark" size={11} color="#fff" />
              </View>
            )}
          </View>

          {/* Name */}
          {loading ? (
            <View style={{ alignItems: "center", gap: 8, marginTop: 12 }}>
              <Skeleton width={160} height={18} radius={9} />
              <Skeleton width={110} height={12} radius={6} />
            </View>
          ) : (
            <View style={{ alignItems: "center", marginTop: 12 }}>
              <Text style={styles.displayName}>{displayName}</Text>
              {!!(profile?.username ?? passedUsername) && (
                <Text style={styles.handle}>@{profile?.username ?? passedUsername}</Text>
              )}
            </View>
          )}

          {/* Bio */}
          {!!bio && <Text style={styles.bio} numberOfLines={3}>{bio}</Text>}

          {/* Stats (tap to open lists if you have these screens) */}
          <View style={styles.statsRow}>
            <TouchableOpacity
              activeOpacity={0.85}
              style={styles.statItem}
              onPress={() => setTab("posts")}
            >
              {loading ? <Skeleton width={40} height={20} radius={6} /> : <Text style={styles.statValue}>{statVal(postsCount)}</Text>}
              <Text style={styles.statLabel}>Posts</Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.85}
              style={styles.statItem}
              onPress={() => {
                // If you already have a followers screen, navigate to it.
                // navigation.navigate("UserFollowersScreen", { userId });
                // For now: just switch tab / do nothing.
              }}
            >
              {loading ? <Skeleton width={40} height={20} radius={6} /> : <Text style={styles.statValue}>{statVal(followersCount)}</Text>}
              <Text style={styles.statLabel}>Followers</Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.85}
              style={styles.statItem}
              onPress={() => {
                // navigation.navigate("UserFollowingScreen", { userId });
              }}
            >
              {loading ? <Skeleton width={40} height={20} radius={6} /> : <Text style={styles.statValue}>{statVal(followingCount)}</Text>}
              <Text style={styles.statLabel}>Following</Text>
            </TouchableOpacity>
          </View>

          {/* Follow button */}
          {!loading && (
            <TouchableOpacity
              style={[styles.followBtn, isFollowing && styles.followingBtn]}
              activeOpacity={0.85}
              onPress={handleFollowToggle}
              disabled={followLoading}
            >
              {followLoading ? (
                <ActivityIndicator size="small" color={isFollowing ? BRAND : "#fff"} />
              ) : (
                <>
                  <Ionicons
                    name={isFollowing ? "checkmark-circle" : "person-add-outline"}
                    size={16}
                    color={isFollowing ? BRAND : "#fff"}
                  />
                  <Text style={[styles.followBtnText, isFollowing && styles.followingBtnText]}>
                    {isFollowing ? "Following" : "Follow"}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          )}
        </View>

        {/* CONTENT */}
        <View style={styles.contentWrap}>
          <Tabs value={tab} onChange={setTab} />

          {tab === "posts" && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Ionicons name="grid-outline" size={16} color={BRAND} />
                <Text style={styles.sectionTitle}>Posts</Text>
              </View>

              {loading ? (
                <View style={styles.grid}>
                  {[1, 2, 3, 4, 5, 6].map((i) => {
                    const CELL = (SCREEN_W - 4) / 3;
                    return <Skeleton key={i} width={CELL} height={CELL} radius={0} />;
                  })}
                </View>
              ) : (
                <PostGrid items={posts} navigation={navigation} emptyLabel="No posts yet" />
              )}
            </View>
          )}

          {tab === "media" && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Ionicons name="images-outline" size={16} color={BRAND} />
                <Text style={styles.sectionTitle}>Media</Text>
              </View>

              {loading ? (
                <View style={styles.grid}>
                  {[1, 2, 3, 4, 5, 6].map((i) => {
                    const CELL = (SCREEN_W - 4) / 3;
                    return <Skeleton key={i} width={CELL} height={CELL} radius={0} />;
                  })}
                </View>
              ) : (
                <PostGrid items={media} navigation={navigation} emptyLabel="No media yet" />
              )}
            </View>
          )}

          {tab === "communities" && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Ionicons name="people-outline" size={16} color={BRAND} />
                <Text style={styles.sectionTitle}>Communities</Text>
              </View>

              {loading ? (
                <View style={{ paddingHorizontal: 16, gap: 10 }}>
                  <Skeleton width="100%" height={58} radius={16} />
                  <Skeleton width="100%" height={58} radius={16} />
                </View>
              ) : communities?.length ? (
                <View style={{ paddingHorizontal: 16, gap: 10 }}>
                  {communities.map((g) => {
                    const title = decodeHtml(g?.title ?? g?.name ?? "Community");
                    const sub = `${statVal(g?.members_count ?? g?.members ?? 0)} members`;
                    return (
                      <SmallListRow
                        key={g?.id ?? title}
                        icon="people-outline"
                        title={title}
                        subtitle={sub}
                        onPress={() => navigation.navigate("GroupDetails", { groupId: g?.id })}
                      />
                    );
                  })}
                </View>
              ) : (
                <View style={styles.emptyPosts}>
                  <Ionicons name="people-outline" size={40} color={MUTED} />
                  <Text style={styles.emptyText}>No communities yet</Text>
                </View>
              )}
            </View>
          )}

          {tab === "pages" && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Ionicons name="business-outline" size={16} color={BRAND} />
                <Text style={styles.sectionTitle}>Pages</Text>
              </View>

              {loading ? (
                <View style={{ paddingHorizontal: 16, gap: 10 }}>
                  <Skeleton width="100%" height={58} radius={16} />
                  <Skeleton width="100%" height={58} radius={16} />
                </View>
              ) : pages?.length ? (
                <View style={{ paddingHorizontal: 16, gap: 10 }}>
                  {pages.map((p) => {
                    const title = decodeHtml(p?.title ?? p?.name ?? "Page");
                    const sub = `${statVal(p?.followers_count ?? p?.followers ?? 0)} followers`;
                    return (
                      <SmallListRow
                        key={p?.id ?? title}
                        icon="business-outline"
                        title={title}
                        subtitle={sub}
                        onPress={() => navigation.navigate("BusinessDetails", { pageId: p?.id })}
                      />
                    );
                  })}
                </View>
              ) : (
                <View style={styles.emptyPosts}>
                  <Ionicons name="business-outline" size={40} color={MUTED} />
                  <Text style={styles.emptyText}>No pages yet</Text>
                </View>
              )}
            </View>
          )}

          <View style={{ height: 80 }} />
        </View>
      </Animated.ScrollView>
    </View>
  );
}

/** ---------------------------
 * Styles
 * -------------------------- */
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: CREAM },

  stickyHeader: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 20,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    paddingHorizontal: 14,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 4,
  },
  headerBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#F5F7F8",
    alignItems: "center",
    justifyContent: "center",
  },
  stickyName: {
    flex: 1,
    fontSize: 16,
    fontWeight: "800",
    color: DARK,
    textAlign: "center",
    fontFamily: AppDetails?.fontFamily?.redex?.bold ?? "System",
  },

  hero: {
    backgroundColor: BRAND,
    paddingHorizontal: 20,
    paddingBottom: 28,
    alignItems: "center",
    overflow: "hidden",
  },
  heroBlob1: {
    position: "absolute",
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: "rgba(19,194,150,0.12)",
    top: -20,
    right: -40,
  },
  heroBlob2: {
    position: "absolute",
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: "rgba(255,255,255,0.05)",
    bottom: -30,
    left: -20,
  },

  backBtn: {
    alignSelf: "flex-start",
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },

  avatarWrap: { position: "relative" },
  avatar: {
    width: 92,
    height: 92,
    borderRadius: 46,
    borderWidth: 3,
    borderColor: ACCENT,
  },
  avatarFallback: {
    backgroundColor: `${ACCENT}22`,
    alignItems: "center",
    justifyContent: "center",
  },
  verifiedBadge: {
    position: "absolute",
    bottom: 2,
    right: 2,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: ACCENT,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: BRAND,
  },

  displayName: {
    fontSize: 22,
    fontWeight: "900",
    color: "#fff",
    fontFamily: AppDetails?.fontFamily?.redex?.bold ?? "System",
  },
  handle: {
    fontSize: 13,
    color: "rgba(255,255,255,0.6)",
    marginTop: 3,
    fontFamily: AppDetails?.fontFamily?.inter?.regular ?? "System",
  },
  bio: {
    marginTop: 10,
    fontSize: 13,
    color: "rgba(255,255,255,0.75)",
    textAlign: "center",
    lineHeight: 19,
    maxWidth: SCREEN_W - 60,
    fontFamily: AppDetails?.fontFamily?.inter?.regular ?? "System",
  },

  statsRow: {
    flexDirection: "row",
    gap: 28,
    marginTop: 20,
    marginBottom: 18,
  },
  statItem: { alignItems: "center", gap: 4 },
  statValue: {
    fontSize: 20,
    fontWeight: "900",
    color: "#fff",
    fontFamily: AppDetails?.fontFamily?.redex?.bold ?? "System",
  },
  statLabel: {
    fontSize: 11,
    color: "rgba(255,255,255,0.6)",
    fontFamily: AppDetails?.fontFamily?.inter?.regular ?? "System",
  },

  followBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: ACCENT,
    borderRadius: 100,
    paddingHorizontal: 28,
    paddingVertical: 11,
    shadowColor: ACCENT,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 6,
  },
  followingBtn: {
    backgroundColor: "rgba(255,255,255,0.15)",
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.4)",
    shadowOpacity: 0,
  },
  followBtnText: {
    fontSize: 15,
    fontWeight: "800",
    color: "#fff",
    fontFamily: AppDetails?.fontFamily?.redex?.bold ?? "System",
  },
  followingBtnText: { color: "#fff" },

  contentWrap: {
    backgroundColor: CREAM,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    marginTop: -16,
    paddingTop: 14,
  },

  tabsWrap: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 14,
    paddingBottom: 12,
  },
  tabPill: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: BORDER,
    alignItems: "center",
    justifyContent: "center",
  },
  tabPillActive: {
    backgroundColor: `${BRAND}10`,
    borderColor: `${BRAND}22`,
  },
  tabText: {
    fontSize: 12,
    fontWeight: "800",
    color: MUTED,
    fontFamily: AppDetails?.fontFamily?.redex?.bold ?? "System",
  },
  tabTextActive: { color: BRAND },

  section: { paddingBottom: 14 },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: BRAND,
    fontFamily: AppDetails?.fontFamily?.redex?.bold ?? "System",
  },

  grid: { flexDirection: "row", flexWrap: "wrap", gap: 2 },
  gridCell: { overflow: "hidden", backgroundColor: `${BRAND}10` },
  gridFallback: { backgroundColor: `${BRAND}12`, alignItems: "center", justifyContent: "center" },
  videoIcon: {
    position: "absolute",
    top: 7,
    right: 7,
    backgroundColor: "rgba(0,0,0,0.55)",
    borderRadius: 100,
    width: 20,
    height: 20,
    alignItems: "center",
    justifyContent: "center",
  },

  emptyPosts: { alignItems: "center", paddingVertical: 48, gap: 10 },
  emptyText: { fontSize: 14, color: MUTED, fontFamily: AppDetails?.fontFamily?.inter?.regular ?? "System" },

  smallRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#fff",
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: BORDER,
  },
  smallRowIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: `${ACCENT}18`,
    alignItems: "center",
    justifyContent: "center",
  },
  smallRowTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: DARK,
    fontFamily: AppDetails?.fontFamily?.redex?.bold ?? "System",
  },
  smallRowSub: {
    marginTop: 2,
    fontSize: 11,
    color: MUTED,
    fontFamily: AppDetails?.fontFamily?.inter?.regular ?? "System",
  },
});