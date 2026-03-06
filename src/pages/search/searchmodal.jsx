import React, { useState, useMemo, useEffect, useCallback, useRef } from "react";
import {
  View,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Modal,
  Image,
  Text,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Animated,
  Dimensions,
  StatusBar,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import AppDetails from "../../helpers/appdetails";
import useStore from "../../repository/store";
import SearchSuggestionController from "../../controllers/searchsuggestioncontroller";
import { useAuth } from "../../AuthContext";
import { useNavigation } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Colors } from "../../theme";

const PRIMARY = Colors.primaryDark;
const ACCENT  = Colors.primary;
const WHITE   = Colors.white;
const DARK    = Colors.black;
const MUTED   = Colors.secondaryText;
const BORDER  = Colors.border;
const SURFACE = Colors.surfaceTint;
const { width: SW } = Dimensions.get("window");

const REEL_W  = Math.round(Math.max(SW * 0.26, 96));
const REEL_H  = Math.round(REEL_W * 1.5);

const TYPE_META = {
  user:  { label: "Person",  icon: "person-outline",   bg: SURFACE, color: PRIMARY },
  post:  { label: "Post",    icon: "document-outline",  bg: ACCENT + "14", color: ACCENT },
  page:  { label: "Page",    icon: "business-outline",  bg: SURFACE, color: PRIMARY },
  group: { label: "Group",   icon: "people-outline",    bg: ACCENT + "14", color: ACCENT },
  event: { label: "Event",   icon: "calendar-outline",  bg: Colors.warning + "14", color: Colors.warning },
};

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────
async function safeJson(res) {
  const text = await res.text();
  try { return JSON.parse(text); }
  catch { return null; }
}

async function bumpAffinity(query) {
  const q = String(query || "").trim().toLowerCase();
  if (!q) return;
  try {
    const raw = await AsyncStorage.getItem("search_affinity");
    const map  = raw ? JSON.parse(raw) : {};
    map[q] = (map[q] || 0) + 1;
    await AsyncStorage.setItem("search_affinity", JSON.stringify(map));
  } catch {}
}

async function getAffinity() {
  try {
    const raw = await AsyncStorage.getItem("search_affinity");
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}

// ─────────────────────────────────────────────────────────────────────────────
// Fade + slide-up entrance animation
// ─────────────────────────────────────────────────────────────────────────────
const Enter = ({ delay = 0, children, style }) => {
  const opacity = useRef(new Animated.Value(0)).current;
  const ty      = useRef(new Animated.Value(12)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 380, delay, useNativeDriver: true }),
      Animated.timing(ty,      { toValue: 0, duration: 380, delay, useNativeDriver: true }),
    ]).start();
  }, []);

  return <Animated.View style={[{ opacity, transform: [{ translateY: ty }] }, style]}>{children}</Animated.View>;
};

// ─────────────────────────────────────────────────────────────────────────────
// Shimmer skeleton
// ─────────────────────────────────────────────────────────────────────────────
const Shimmer = ({ width, height, borderRadius = 8, style }) => {
  const anim = useRef(new Animated.Value(0.3)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: 0.85, duration: 800, useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0.3,  duration: 800, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, []);
  return <Animated.View style={[{ width, height, borderRadius, backgroundColor: SURFACE, opacity: anim }, style]} />;
};

// ─────────────────────────────────────────────────────────────────────────────
// Trending Reels Row
// ─────────────────────────────────────────────────────────────────────────────
const TrendingReelsRow = ({ token, onReelPress, onSeeAllPress }) => {
  const [items,   setItems]   = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const seed = Math.floor(Math.random() * 2147483647);
        const res  = await fetch(
          `https://hafrik.com/api/v1/reels/list.php?page=1&limit=14&mode=for_you&seed=${seed}`,
          { headers: token ? { Authorization: `Bearer ${token}`, Accept: "application/json" } : { Accept: "application/json" } }
        );
        const json = await safeJson(res);
        const list = Array.isArray(json?.data?.data) ? json.data.data : [];
        setItems(
          list
            .filter((r) => r?.media?.thumbnail)
            .slice(0, 12)
            .map((r) => ({ id: r.id, thumb: r.media.thumbnail, views: r.views ?? 0, user: r.user?.username || "" }))
        );
      } catch { setItems([]); }
      finally  { setLoading(false); }
    })();
  }, [token]);

  if (!loading && !items.length) return null;

  return (
    <Enter delay={40}>
      <View style={styles.section}>
        <View style={styles.sectionHead}>
          <View style={styles.sectionHeadLeft}>
            <View style={styles.sectionDot} />
            <Text style={styles.sectionTitle}>Trending Reels</Text>
          </View>
          <TouchableOpacity onPress={onSeeAllPress} style={styles.seeAllBtn} activeOpacity={0.75}>
            <Text style={styles.seeAllBtnText}>Open Reels</Text>
            <Ionicons name="chevron-forward" size={13} color={PRIMARY} />
          </TouchableOpacity>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.reelsScrollContent}
        >
          {loading
            ? Array.from({ length: 6 }).map((_, i) => (
                <Shimmer key={i} width={REEL_W} height={REEL_H} borderRadius={14} style={{ marginRight: 10 }} />
              ))
            : items.map((r) => (
                <TouchableOpacity
                  key={r.id}
                  style={styles.reelCard}
                  activeOpacity={0.82}
                  onPress={() => onReelPress(r.id)}
                >
                  <Image source={{ uri: r.thumb }} style={StyleSheet.absoluteFill} resizeMode="cover" />

                  {/* gradient-like overlay */}
                  <View style={styles.reelGradient} />

                  {/* play button */}
                  <View style={styles.reelPlayBtn}>
                    <Ionicons name="play" size={14} color={WHITE} />
                  </View>

                  {/* view count */}
                  <View style={styles.reelViewsBadge}>
                    <Ionicons name="eye-outline" size={11} color={WHITE} />
                    <Text style={styles.reelViewsText}>
                      {r.views >= 1000 ? `${(r.views / 1000).toFixed(1)}k` : String(r.views)}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
        </ScrollView>
      </View>
    </Enter>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Trending Topics Row  (hashtags extracted from trending posts)
// ─────────────────────────────────────────────────────────────────────────────
const TrendingTopicsRow = ({ token, onTopicPress }) => {
  const [topics,  setTopics]  = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const res  = await fetch(
          `https://hafrik.com/api/v1/feed/trending.php?page=1&limit=30`,
          { headers: token ? { Authorization: `Bearer ${token}`, Accept: "application/json" } : { Accept: "application/json" } }
        );
        const json = await safeJson(res);
        const list = Array.isArray(json?.data)       ? json.data      :
                     Array.isArray(json?.data?.data) ? json.data.data : [];

        // Extract hashtags from post text
        const tagSet = new Set();
        list.forEach((feed) => {
          const text = String(feed?.text || feed?.title || "");
          const tags = text.match(/#[\w\u00C0-\u024F]+/g) || [];
          tags.forEach((t) => tagSet.add(t.toLowerCase()));
        });

        // Fall back: use post text snippets if no hashtags
        let result = [...tagSet].slice(0, 18);
        if (result.length < 4) {
          const snippets = list
            .slice(0, 12)
            .map((f) => {
              const t = String(f?.text || f?.title || "").trim();
              const words = t.split(/\s+/).slice(0, 3).join(" ");
              return words.length > 3 ? words : null;
            })
            .filter(Boolean);
          result = [...new Set([...result, ...snippets])].slice(0, 16);
        }

        setTopics(result);
      } catch { setTopics([]); }
      finally  { setLoading(false); }
    })();
  }, [token]);

  if (!loading && !topics.length) return null;

  return (
    <Enter delay={100}>
      <View style={styles.section}>
        <View style={styles.sectionHead}>
          <View style={styles.sectionHeadLeft}>
            <View style={[styles.sectionDot, { backgroundColor: ACCENT }]} />
            <Text style={styles.sectionTitle}>Trending Now</Text>
          </View>
        </View>

        <View style={styles.topicsWrap}>
          {loading
            ? Array.from({ length: 8 }).map((_, i) => (
                <Shimmer key={i} width={70 + (i % 3) * 20} height={32} borderRadius={16} style={{ margin: 4 }} />
              ))
            : topics.map((tag, i) => (
                <TouchableOpacity
                  key={`${tag}-${i}`}
                  style={styles.topicPill}
                  activeOpacity={0.75}
                  onPress={() => onTopicPress(tag.startsWith("#") ? tag : `#${tag}`)}
                >
                  <Text style={styles.topicText}>
                    {tag.startsWith("#") ? tag : `#${tag}`}
                  </Text>
                </TouchableOpacity>
              ))}
        </View>
      </View>
    </Enter>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// People Near You Row
// ─────────────────────────────────────────────────────────────────────────────
const PeopleNearYouRow = ({ token, onPersonPress }) => {
  const [items,   setItems]   = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const res  = await fetch(
          `https://hafrik.com/api/v1/people/nearby.php?limit=10`,
          { headers: token ? { Authorization: `Bearer ${token}`, Accept: "application/json" } : { Accept: "application/json" } }
        );
        const json = await safeJson(res);
        const list = Array.isArray(json?.data) ? json.data :
                     Array.isArray(json?.data?.data) ? json.data.data : [];
        setItems(
          list.slice(0, 10).map((p) => ({
            id:          p.id,
            username:    p.username || p.user_name || "User",
            avatar:      p.avatar   || p.user_picture || null,
            distance_km: p.distance_km ?? null,
          }))
        );
      } catch { setItems([]); }
      finally  { setLoading(false); }
    })();
  }, [token]);

  if (!loading && !items.length) return null;

  return (
    <Enter delay={160}>
      <View style={styles.section}>
        <View style={styles.sectionHead}>
          <View style={styles.sectionHeadLeft}>
            <View style={[styles.sectionDot, { backgroundColor: Colors.warning }]} />
            <Text style={styles.sectionTitle}>People Near You</Text>
          </View>
          <Text style={styles.nearbyHint}>Make friends faster</Text>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 2, gap: 10 }}
        >
          {loading
            ? Array.from({ length: 5 }).map((_, i) => (
                <View key={i} style={styles.personCard}>
                  <Shimmer width={44} height={44} borderRadius={22} />
                  <Shimmer width={80} height={11} borderRadius={6} style={{ marginTop: 8 }} />
                  <Shimmer width={55} height={9}  borderRadius={6} style={{ marginTop: 5 }} />
                </View>
              ))
            : items.map((p) => (
                <TouchableOpacity
                  key={p.id}
                  style={styles.personCard}
                  activeOpacity={0.78}
                  onPress={() => onPersonPress(p)}
                >
                  {p.avatar ? (
                    <Image source={{ uri: p.avatar }} style={styles.personAvatar} />
                  ) : (
                    <View style={styles.personAvatarFallback}>
                      <Ionicons name="person" size={18} color={PRIMARY} />
                    </View>
                  )}
                  <Text style={styles.personName} numberOfLines={1}>{p.username}</Text>
                  <Text style={styles.personDist} numberOfLines={1}>
                    {p.distance_km != null ? `${Number(p.distance_km).toFixed(1)} km` : "Nearby"}
                  </Text>
                  <View style={styles.personFollowBtn}>
                    <Text style={styles.personFollowBtnText}>Follow</Text>
                  </View>
                </TouchableOpacity>
              ))}
        </ScrollView>
      </View>
    </Enter>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Suggestion type badge
// ─────────────────────────────────────────────────────────────────────────────
const TypeBadge = ({ type }) => {
  const meta = TYPE_META[type] || { label: type, icon: "search-outline", bg: SURFACE, color: MUTED };
  return (
    <View style={[styles.typeBadge, { backgroundColor: meta.bg }]}>
      <Ionicons name={meta.icon} size={10} color={meta.color} style={{ marginRight: 3 }} />
      <Text style={[styles.typeBadgeText, { color: meta.color }]}>{meta.label}</Text>
    </View>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Main SearchModal
// ─────────────────────────────────────────────────────────────────────────────
const SearchModal = () => {
  const navigation = useNavigation();

  const setSearchVisible        = useStore((s) => s.setSearchVisible);
  const searchQuery             = useStore((s) => s.searchQuery);
  const setSearchQuery          = useStore((s) => s.setSearchQuery);
  const setSearchResultsVisible = useStore((s) => s.setSearchResultsVisible);

  const { token } = useAuth();

  const [searchText,       setSearchText]       = useState(searchQuery ?? "");
  const [suggestions,      setSuggestions]      = useState([]);
  const [isLoading,        setIsLoading]        = useState(false);
  const [recentSearches,   setRecentSearches]   = useState([]);
  const [showAllRecent,    setShowAllRecent]     = useState(false);
  const [youMayLike,       setYouMayLike]       = useState([]);

  const debounceRef = useRef(null);
  const inputRef    = useRef(null);

  const close = useCallback(() => setSearchVisible(false), [setSearchVisible]);

  // ── Auto-execute search when opened with a pre-set query (from chips/hero) ─
  useEffect(() => {
    const q = String(searchQuery ?? "").trim();
    if (!q) return;
    // Short delay so the modal is rendered before we navigate away
    const timer = setTimeout(() => {
      setSearchQuery("");           // consume the query
      setSearchText(q);
      setSearchResultsVisible(true);
      saveRecent(q);
      close();
    }, 80);
    return () => clearTimeout(timer);
  }, [searchQuery]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Recent searches ────────────────────────────────────────────────────────
  useEffect(() => {
    AsyncStorage.getItem("recent_search")
      .then((raw) => setRecentSearches(raw ? JSON.parse(raw) : []))
      .catch(() => setRecentSearches([]));
  }, []);

  const saveRecent = async (q) => {
    const text = String(q || "").trim();
    if (!text) return;
    try {
      const raw  = await AsyncStorage.getItem("recent_search");
      let   list = raw ? JSON.parse(raw) : [];
      list = list.filter((i) => String(i?.text || "").toLowerCase() !== text.toLowerCase());
      const next = [{ text }, ...list].slice(0, 20);
      await AsyncStorage.setItem("recent_search", JSON.stringify(next));
      setRecentSearches(next);
    } catch {}
  };

  const deleteRecent = async (idx) => {
    try {
      const raw  = await AsyncStorage.getItem("recent_search");
      const list = (raw ? JSON.parse(raw) : []).filter((_, i) => i !== idx);
      await AsyncStorage.setItem("recent_search", JSON.stringify(list));
      setRecentSearches(list);
    } catch {}
  };

  // ── You may like ───────────────────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const page = Math.floor(Math.random() * 15) + 1;
        const res  = await fetch(
          `https://hafrik.com/api/v1/feed/list.php?page=${page}&limit=20`,
          { headers: token ? { Authorization: `Bearer ${token}`, Accept: "application/json" } : { Accept: "application/json" } }
        );
        const json  = await safeJson(res);
        const feeds = Array.isArray(json?.data) ? json.data :
                      Array.isArray(json?.data?.data) ? json.data.data : [];

        const picks = [...feeds]
          .sort(() => 0.5 - Math.random())
          .slice(0, 14)
          .filter((f) => f?.id)
          .map((f) => ({
            id:   f.id,
            text: (f.text || f?.payload?.title || "").trim().slice(0, 45) || f.user?.full_name || "Post",
          }));

        setYouMayLike(picks);
      } catch {}
    })();
  }, [token]);

  // ── Suggestion ranking ─────────────────────────────────────────────────────
  const rankSuggestions = useCallback(async (arr, query) => {
    const q        = String(query || "").trim().toLowerCase();
    const affinity = await getAffinity();

    const scored = (Array.isArray(arr) ? arr : []).map((item) => {
      const title = String(item?.title || item?.name || "").toLowerCase();
      let   score = (affinity[title] || affinity[q] || 0) * 4;
      if (q && title.startsWith(q))  score += 6;
      else if (q && title.includes(q)) score += 2;
      const t = String(item?.type || "").toLowerCase();
      if (t === "user")  score += 1.5;
      if (t === "group") score += 1;
      return { item, score };
    });

    return scored.sort((a, b) => b.score - a.score).map((x) => x.item);
  }, []);

  // ── Debounced search ───────────────────────────────────────────────────────
  const handleChangeText = (text) => {
    setSearchText(text);
    const q = String(text || "").trim();
    if (!q) { setSuggestions([]); setIsLoading(false); return; }

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setIsLoading(true);
      try {
        const resp   = await SearchSuggestionController(q, token);
        const ranked = await rankSuggestions(resp?.data?.results || [], q);
        setSuggestions(ranked);
      } catch { setSuggestions([]); }
      finally  { setIsLoading(false); }
    }, 250);
  };

  // ── Actions ────────────────────────────────────────────────────────────────
  const goSearch = useCallback((query) => {
    const q = String(query || searchText || "").trim();
    if (!q) return;
    close();
    setSearchQuery(q);
    setSearchResultsVisible(true);
    saveRecent(q);
  }, [searchText, close, setSearchQuery, setSearchResultsVisible]);

  const selectSuggestion = useCallback(async (item) => {
    const q = String(item?.title || item?.name || "").trim();
    if (!q) return;
    await bumpAffinity(q);
    close();
    setSearchQuery(q);
    setSearchResultsVisible(true);
    saveRecent(q);
  }, [close, setSearchQuery, setSearchResultsVisible]);

  const handleReelPress = useCallback(() => {
    close();
    setTimeout(() => navigation.navigate("Reels"), 80);
  }, [close, navigation]);

  const handlePersonPress = useCallback((p) => {
    close();
    setTimeout(() => navigation.navigate("Profile", { userId: p.id }), 80);
  }, [close, navigation]);

  const handlePostPress = useCallback((item) => {
    close();
    const t = String(item?.type || '').toLowerCase();
    if (t === 'reel' || t === 'video') {
      setTimeout(() => navigation.navigate('Reels2', {
        initialReels: [item],
        startIndex: 0,
        initialReelId: item?.id,
      }), 80);
    } else {
      setTimeout(() => navigation.navigate('CommentScreen', { feedId: item?.id ?? item }), 80);
    }
  }, [close, navigation]);

  const handleTopicPress = useCallback((tag) => {
    goSearch(tag);
  }, [goSearch]);

  // ── Grouped suggestions ────────────────────────────────────────────────────
  const displayedSuggestions = useMemo(() => suggestions.slice(0, 25), [suggestions]);

  const visibleRecent = showAllRecent ? recentSearches : recentSearches.slice(0, 5);

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <Modal
      visible={true}
      animationType="slide"
      transparent={false}
    >
      <SafeAreaView style={{ flex: 1, backgroundColor: WHITE }}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >

          {/* ── Header ─────────────────────────────────────────────────── */}
          <View style={styles.header}>
            <View style={styles.searchBarOuter}>
              <Ionicons name="search-outline" size={17} color={MUTED} style={styles.searchIcon} />
              <TextInput
                ref={inputRef}
                style={styles.searchInput}
                placeholder="Search Hafrik…"
                placeholderTextColor={MUTED}
                autoFocus
                value={searchText}
                onChangeText={handleChangeText}
                onSubmitEditing={() => goSearch()}
                returnKeyType="search"
                autoCapitalize="none"
                autoCorrect={false}
                clearButtonMode="while-editing"
              />
              {isLoading ? (
                <ActivityIndicator size="small" color={PRIMARY} style={{ marginLeft: 6 }} />
              ) : searchText.length > 0 ? (
                <TouchableOpacity
                  onPress={() => { setSearchText(""); setSuggestions([]); }}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Ionicons name="close-circle" size={18} color={MUTED} />
                </TouchableOpacity>
              ) : null}
            </View>

            <TouchableOpacity onPress={close} style={styles.cancelBtn} activeOpacity={0.7}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>

          {/* ── Body ───────────────────────────────────────────────────── */}
          {String(searchText || "").trim() === "" ? (

            /* ── Discovery / empty state ─────────────────────────────── */
            <ScrollView
              style={styles.body}
              contentContainerStyle={styles.bodyContent}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {/* Trending Reels */}
              <TrendingReelsRow
                token={token}
                onReelPress={handleReelPress}
                onSeeAllPress={handleReelPress}
              />

              {/* Trending Topics */}
              <TrendingTopicsRow
                token={token}
                onTopicPress={handleTopicPress}
              />

              {/* People Near You */}
              <PeopleNearYouRow
                token={token}
                onPersonPress={handlePersonPress}
              />

              {/* Recent Searches */}
              {recentSearches.length > 0 && (
                <Enter delay={200}>
                  <View style={styles.section}>
                    <View style={styles.sectionHead}>
                      <View style={styles.sectionHeadLeft}>
                        <View style={[styles.sectionDot, { backgroundColor: MUTED }]} />
                        <Text style={styles.sectionTitle}>Recent</Text>
                      </View>
                      {recentSearches.length > 5 && (
                        <TouchableOpacity onPress={() => setShowAllRecent(!showAllRecent)} activeOpacity={0.7}>
                          <Text style={styles.seeAllBtnText}>{showAllRecent ? "See less" : "See all"}</Text>
                        </TouchableOpacity>
                      )}
                    </View>

                    <View style={styles.recentList}>
                      {visibleRecent.map((item, idx) => (
                        <TouchableOpacity
                          key={`${item?.text}-${idx}`}
                          style={[styles.recentRow, idx === visibleRecent.length - 1 && { borderBottomWidth: 0 }]}
                          activeOpacity={0.75}
                          onPress={() => goSearch(item.text)}
                        >
                          <View style={styles.recentIconWrap}>
                            <Ionicons name="time-outline" size={15} color={MUTED} />
                          </View>
                          <Text style={styles.recentText} numberOfLines={1}>{item.text}</Text>
                          <TouchableOpacity
                            onPress={() => deleteRecent(idx)}
                            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                          >
                            <Ionicons name="close" size={15} color={BORDER} />
                          </TouchableOpacity>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                </Enter>
              )}

              {/* You May Like */}
              {youMayLike.length > 0 && (
                <Enter delay={260}>
                  <View style={[styles.section, { marginBottom: 20 }]}>
                    <View style={styles.sectionHead}>
                      <View style={styles.sectionHeadLeft}>
                        <View style={[styles.sectionDot, { backgroundColor: ACCENT }]} />
                        <Text style={styles.sectionTitle}>You May Like</Text>
                      </View>
                    </View>
                    <View style={styles.topicsWrap}>
                      {youMayLike.map((item) => (
                        <TouchableOpacity
                          key={item.id}
                          style={[styles.topicPill, { backgroundColor: SURFACE }]}
                          activeOpacity={0.75}
                          onPress={() => handlePostPress(item)}
                        >
                          <Ionicons name="document-text-outline" size={12} color={PRIMARY} style={{ marginRight: 5 }} />
                          <Text style={[styles.topicText, { color: PRIMARY }]} numberOfLines={1}>
                            {item.text || "Post"}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                </Enter>
              )}
            </ScrollView>

          ) : (

            /* ── Live search suggestions ──────────────────────────────── */
            <View style={styles.body}>
              {displayedSuggestions.length === 0 && !isLoading ? (
                <View style={styles.noResultsWrap}>
                  <Ionicons name="search-outline" size={40} color={BORDER} />
                  <Text style={styles.noResultsText}>No results for "{searchText}"</Text>
                  <Text style={styles.noResultsSub}>Try different keywords</Text>
                </View>
              ) : (
                <ScrollView
                  keyboardShouldPersistTaps="handled"
                  showsVerticalScrollIndicator={false}
                  contentContainerStyle={{ paddingBottom: 80 }}
                >
                  {displayedSuggestions.map((item, idx) => {
                    const type = String(item?.type || "").toLowerCase();
                    return (
                      <TouchableOpacity
                        key={`${item?.id || idx}-${idx}`}
                        style={styles.suggRow}
                        activeOpacity={0.78}
                        onPress={() => selectSuggestion(item)}
                      >
                        <Image
                          source={{ uri: item?.thumbnail || "https://hafrik.com/default-avatar.png" }}
                          style={styles.suggAvatar}
                        />
                        <View style={styles.suggBody}>
                          <Text style={styles.suggTitle} numberOfLines={1}>
                            {item?.title || item?.name || "—"}
                          </Text>
                          {item?.subtitle ? (
                            <Text style={styles.suggSub} numberOfLines={1}>{item.subtitle}</Text>
                          ) : null}
                        </View>
                        {type ? <TypeBadge type={type} /> : null}
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              )}

              {/* See all results */}
              <View style={styles.seeAllBar}>
                <TouchableOpacity style={styles.seeAllBarBtn} onPress={() => goSearch()} activeOpacity={0.82}>
                  <Ionicons name="search" size={16} color={WHITE} style={{ marginRight: 8 }} />
                  <Text style={styles.seeAllBarText}>See all results for "{searchText}"</Text>
                </TouchableOpacity>
              </View>
            </View>

          )}
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
};


// ─────────────────────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({

  safe: { flex: 1, backgroundColor: WHITE },

  // ─ Header ─
header: {
  flexDirection: "row",
  alignItems: "center",
  paddingHorizontal: 16,
  paddingTop: 12,
  paddingBottom: 14,
  backgroundColor: WHITE,
  borderBottomWidth: StyleSheet.hairlineWidth,
  borderBottomColor: BORDER,
},
 searchBarOuter: {
  flex: 1,
  flexDirection: "row",
  alignItems: "center",
  backgroundColor: SURFACE,
  borderRadius: 16,
  paddingHorizontal: 14,
  height: 44,
},
  searchIcon: { marginRight: 8 },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: DARK,
    fontFamily: AppDetails.fontFamily.inter?.regular || "Inter_400Regular",
    paddingVertical: 0,
  },
  cancelBtn: { marginLeft: 12, paddingVertical: 6, paddingHorizontal: 4 },
  cancelText: {
    fontSize: 15,
    color: PRIMARY,
    fontFamily: AppDetails.fontFamily.inter?.semiBold || "Inter_600SemiBold",
  },

  // ─ Body ─
  body: { flex: 1, backgroundColor: Colors.background },
  bodyContent: { paddingVertical: 10, paddingBottom: 60 },

  // ─ Section ─
 section: {
  marginTop: 22,
  paddingHorizontal: 18,
  paddingVertical: 6,
},
  sectionHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  sectionHeadLeft: { flexDirection: "row", alignItems: "center" },
  sectionDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: PRIMARY,
    marginRight: 8,
  },
  sectionTitle: {
    fontSize: 15,
    fontFamily: AppDetails.fontFamily.inter?.semiBold || "Inter_600SemiBold",
    color: DARK,
  },
  seeAllBtn: { flexDirection: "row", alignItems: "center" },
  seeAllBtnText: {
    fontSize: 13,
    color: PRIMARY,
    fontFamily: AppDetails.fontFamily.inter?.semiBold || "Inter_600SemiBold",
    marginRight: 2,
  },
  nearbyHint: {
    fontSize: 12,
    color: MUTED,
    fontFamily: AppDetails.fontFamily.inter?.regular || "Inter_400Regular",
  },

  // ─ Reels ─
  reelsScrollContent: { paddingHorizontal: 2, gap: 10 },
  reelCard: {
    width: REEL_W,
    height: REEL_H,
    borderRadius: 14,
    overflow: "hidden",
    backgroundColor: SURFACE,
  },
  reelGradient: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: DARK + "2E",
    // simulate gradient: stronger at bottom
  },
  reelPlayBtn: {
    position: "absolute",
    top: "50%",
    left: "50%",
    marginTop: -18,
    marginLeft: -18,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: DARK + "73",
    alignItems: "center",
    justifyContent: "center",
  },
  reelViewsBadge: {
    position: "absolute",
    left: 8,
    bottom: 8,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: DARK + "73",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    gap: 4,
  },
  reelViewsText: {
    color: WHITE,
    fontSize: 11,
    fontFamily: AppDetails.fontFamily.inter?.semiBold || "Inter_600SemiBold",
  },

  // ─ Trending topics ─
  topicsWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  topicPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: SURFACE,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
  },
  topicText: {
    fontSize: 13,
    color: DARK,
    fontFamily: AppDetails.fontFamily.inter?.semiBold || "Inter_600SemiBold",
    maxWidth: SW * 0.35,
  },

  // ─ People near you ─
  personCard: {
    width: 120,
    backgroundColor: Colors.background,
    borderRadius: 14,
    padding: 12,
    alignItems: "center",
  },
  personAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: BORDER,
  },
  personAvatarFallback: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: SURFACE,
    alignItems: "center",
    justifyContent: "center",
  },
  personName: {
    marginTop: 8,
    fontSize: 13,
    fontFamily: AppDetails.fontFamily.inter?.semiBold || "Inter_600SemiBold",
    color: DARK,
    textAlign: "center",
  },
  personDist: {
    marginTop: 2,
    fontSize: 11,
    color: MUTED,
    fontFamily: AppDetails.fontFamily.inter?.regular || "Inter_400Regular",
    textAlign: "center",
  },
  personFollowBtn: {
    marginTop: 9,
    backgroundColor: PRIMARY,
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 20,
  },
  personFollowBtnText: {
    color: WHITE,
    fontSize: 12,
    fontFamily: AppDetails.fontFamily.inter?.semiBold || "Inter_600SemiBold",
  },

  // ─ Recent searches ─
  recentList: {
    backgroundColor: Colors.background,
    borderRadius: 12,
    overflow: "hidden",
  },
  recentRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: BORDER,
  },
  recentIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: SURFACE,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  recentText: {
    flex: 1,
    fontSize: 14,
    color: DARK,
    fontFamily: AppDetails.fontFamily.inter?.regular || "Inter_400Regular",
  },

  // ─ Suggestion rows ─
  suggRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 13,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: BORDER,
    backgroundColor: WHITE,
    gap: 12,
  },
  suggAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: BORDER,
  },
  suggBody: { flex: 1 },
  suggTitle: {
    fontSize: 15,
    fontFamily: AppDetails.fontFamily.inter?.semiBold || "Inter_600SemiBold",
    color: DARK,
  },
  suggSub: {
    fontSize: 13,
    color: MUTED,
    fontFamily: AppDetails.fontFamily.inter?.regular || "Inter_400Regular",
    marginTop: 2,
  },

  // ─ Type badge ─
  typeBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: "center",
  },
  typeBadgeText: {
    fontSize: 11,
    fontFamily: AppDetails.fontFamily.inter?.semiBold || "Inter_600SemiBold",
  },

  // ─ See all bar ─
  seeAllBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: WHITE,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: BORDER,
  },
  seeAllBarBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: PRIMARY,
    paddingVertical: 13,
    borderRadius: 14,
  },
  seeAllBarText: {
    color: WHITE,
    fontSize: 14,
    fontFamily: AppDetails.fontFamily.inter?.semiBold || "Inter_600SemiBold",
  },

  // ─ No results ─
  noResultsWrap: {
    flex: 1,
    alignItems: "center",
    paddingTop: 80,
  },
  noResultsText: {
    marginTop: 14,
    fontSize: 17,
    fontFamily: AppDetails.fontFamily.inter?.semiBold || "Inter_600SemiBold",
    color: DARK,
    textAlign: "center",
  },
  noResultsSub: {
    marginTop: 6,
    fontSize: 14,
    color: MUTED,
    fontFamily: AppDetails.fontFamily.inter?.regular || "Inter_400Regular",
  },
});

export default SearchModal;
