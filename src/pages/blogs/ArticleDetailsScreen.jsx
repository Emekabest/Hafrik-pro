// src/pages/blogs/ArticleDetailsScreen.jsx
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  SafeAreaView,
  StatusBar,
  ActivityIndicator,
  Dimensions,
  Share,
  Animated,
  Pressable,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';

import { fetchArticleDetail, normalizeTags } from './articlesApi';

const { width, height } = Dimensions.get('window');

const BRAND  = '#0C3F44';
const ACCENT = '#13C296';
const MUTED  = '#7A9198';
const DARK   = '#0D1B1E';
const CREAM  = '#F5F0E8';
const BORDER = 'rgba(12,63,68,0.09)';

const BOOKMARKS_KEY = 'hafrik_article_bookmarks_v1';

// Trending logic (adjust to taste)
const TRENDING_VIEWS_THRESHOLD = 7000;

// HTML template wrapping article.content_html
const buildHtml = (body) => `<!DOCTYPE html>
<html><head>
<meta name="viewport" content="width=device-width,initial-scale=1.0,maximum-scale=1.0">
<style>
*{box-sizing:border-box}
html,body{background:transparent;margin:0;padding:0}
body{
  font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;
  font-size:15px; line-height:1.8; color:#1f2937;
  padding:0 6px;
}
img{max-width:100%!important;height:auto;border-radius:12px;margin:14px 0;display:block}
p{margin:0 0 14px}
h1,h2,h3,h4{color:#0D1B1E;font-weight:900;margin:18px 0 10px;line-height:1.25}
h2{font-size:18px} h3{font-size:16px}
a{color:#13C296;text-decoration:none}
blockquote{
  border-left:3px solid #0C3F44;
  padding:10px 12px;
  color:#4b5563;
  margin:14px 0;
  background:#f8fafa;
  border-radius:0 12px 12px 0;
}
pre,code{background:#f4f5f6;padding:3px 7px;border-radius:8px;font-size:13px;font-family:ui-monospace,SFMono-Regular,Menlo,monospace}
ul,ol{margin:0 0 14px 22px}
li{margin-bottom:6px}
hr{border:none;border-top:1px solid #e5e7eb;margin:16px 0}
table{width:100%;border-collapse:collapse;margin:12px 0 14px}
th,td{padding:8px;border:1px solid #e5e7eb;font-size:13px}
th{background:#f0f5f5;font-weight:800}
</style>
</head><body>
${body}
<div style="height:18px"></div>
<script>
setTimeout(function(){
  window.ReactNativeWebView.postMessage(String(document.body.scrollHeight));
},300);
</script>
</body></html>`;

const formatNumber = (n) => {
  const num = Number(n || 0);
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`;
  if (num >= 1_000) return `${(num / 1_000).toFixed(1)}k`;
  return String(num);
};

const safeText = (t) => String(t ?? '').trim();

async function loadBookmarksSet() {
  try {
    const raw = await AsyncStorage.getItem(BOOKMARKS_KEY);
    if (!raw) return new Set();
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return new Set();
    return new Set(arr.map(String));
  } catch {
    return new Set();
  }
}

async function saveBookmarksSet(set) {
  try {
    const arr = Array.from(set);
    await AsyncStorage.setItem(BOOKMARKS_KEY, JSON.stringify(arr));
  } catch {}
}

// Optional: hook to your backend later
async function sendClapToApi({ postId, clapsToAdd }) {
  // TODO: wire to your API
  // Example:
  // await api.post('/articles/clap.php', { post_id: postId, claps: clapsToAdd });
  return true;
}

export default function ArticleDetailsScreen({ navigation, route }) {
  const { postId, title: navTitle } = route.params || {};
  const { top, bottom } = useSafeAreaInsets();

  const [article, setArticle] = useState(null);
  const [loading, setLoading] = useState(true);

  const [webHeight, setWebHeight] = useState(450);
  const [webReady, setWebReady] = useState(false);

  // Bookmark
  const [bookmarked, setBookmarked] = useState(false);

  // Claps (optimistic UI)
  const [claps, setClaps] = useState(0);
  const clapBurst = useRef(new Animated.Value(0)).current;

  // Sticky author bar visibility
  const stickyAnim = useRef(new Animated.Value(0)).current;

  // Reading progress
  const scrollY = useRef(new Animated.Value(0)).current;
  const contentHeightRef = useRef(1);
  const viewHeightRef = useRef(1);

  const progress = scrollY.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 0], // placeholder, updated via setNativeProps-like calc below
  });

  // We’ll compute progress width manually using onScroll event and state
  const [progressPct, setProgressPct] = useState(0);

  const isTrending = useMemo(() => {
    const views = Number(article?.views || 0);
    return views >= TRENDING_VIEWS_THRESHOLD;
  }, [article?.views]);

  // Fetch
  useEffect(() => {
    if (!postId) {
      setLoading(false);
      return;
    }

    let mounted = true;

    (async () => {
      try {
        const data = await fetchArticleDetail(postId);
        if (!mounted) return;

        setArticle(data);

        // If API later returns claps_count, use it. For now default to 0.
        setClaps(Number(data?.claps || data?.claps_count || 0));
      } catch {
        if (!mounted) return;
        setArticle(null);
      } finally {
        if (!mounted) return;
        setLoading(false);
      }
    })();

    return () => { mounted = false; };
  }, [postId]);

  // Load bookmark state
  useEffect(() => {
    if (!postId) return;
    (async () => {
      const set = await loadBookmarksSet();
      setBookmarked(set.has(String(postId)));
    })();
  }, [postId]);

  const toggleBookmark = useCallback(async () => {
    if (!postId) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const set = await loadBookmarksSet();
    const id = String(postId);

    if (set.has(id)) {
      set.delete(id);
      setBookmarked(false);
    } else {
      set.add(id);
      setBookmarked(true);
    }
    await saveBookmarksSet(set);
  }, [postId]);

  const handleShare = useCallback(async () => {
    try {
      await Share.share({
        message: `${article?.title ?? navTitle}\n${article?.link ?? ''}`,
        url: article?.link,
      });
    } catch {}
  }, [article, navTitle]);

  const handleClap = useCallback(async () => {
    if (!postId) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    // Optimistic add
    setClaps((c) => c + 1);

    // Burst animation
    clapBurst.setValue(0);
    Animated.timing(clapBurst, {
      toValue: 1,
      duration: 380,
      useNativeDriver: true,
    }).start();

    // Fire and forget API call (batching can come later)
    try {
      await sendClapToApi({ postId, clapsToAdd: 1 });
    } catch {}
  }, [postId, clapBurst]);

  const openRelated = useCallback((rel) => {
    if (!rel?.post_id) return;
    navigation.push('ArticleDetailsScreen', { postId: rel.post_id, title: rel.title });
  }, [navigation]);

  const displayTitle = safeText(article?.title) || safeText(navTitle) || 'Article';
  const tags = normalizeTags(article?.tags);

  const authorName = article?.author?.name || article?.author?.username || 'Hafrik';
  const authorAvatar = article?.author?.avatar;
  const authorVerified = !!article?.author?.verified;

  const viewsText = formatNumber(article?.views || 0);
  const readTime = Number(article?.reading_time_minutes || 0) || 1;
  const dateText = safeText(article?.date);

  // Progress + sticky bar: driven by onScroll
  const onScroll = useCallback((e) => {
    const y = e?.nativeEvent?.contentOffset?.y ?? 0;
    const viewH = e?.nativeEvent?.layoutMeasurement?.height ?? viewHeightRef.current;
    const contentH = e?.nativeEvent?.contentSize?.height ?? contentHeightRef.current;

    viewHeightRef.current = viewH || 1;
    contentHeightRef.current = contentH || 1;

    const maxScroll = Math.max(1, contentH - viewH);
    const pct = Math.max(0, Math.min(1, y / maxScroll));
    setProgressPct(pct);

    // Sticky author bar appears after you move down a bit
    const showAt = height * 0.18;
    const target = y > showAt ? 1 : 0;

    Animated.timing(stickyAnim, {
      toValue: target,
      duration: 180,
      useNativeDriver: true,
    }).start();
  }, [stickyAnim]);

  // States
  if (loading) {
    return (
      <SafeAreaView style={styles.centered}>
        <ActivityIndicator size="large" color={BRAND} />
      </SafeAreaView>
    );
  }

  if (!article) {
    return (
      <SafeAreaView style={styles.centered}>
        <Ionicons name="alert-circle-outline" size={46} color={MUTED} />
        <Text style={styles.errorTxt}>Could not load this article.</Text>
        <TouchableOpacity style={styles.primaryBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.primaryBtnTxt}>Go Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  // Sticky author bar animation values
  const stickyTranslateY = stickyAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-18, 0],
  });
  const stickyOpacity = stickyAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });

  // Clap burst animation styles
  const burstScale = clapBurst.interpolate({
    inputRange: [0, 1],
    outputRange: [0.75, 1.25],
  });
  const burstOpacity = clapBurst.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0, 1, 0],
  });
  const burstTranslate = clapBurst.interpolate({
    inputRange: [0, 1],
    outputRange: [10, -24],
  });

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" />

      {/* Reading progress bar */}
      <View style={[styles.progressWrap, { paddingTop: top }]}>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${Math.round(progressPct * 100)}%` }]} />
        </View>
      </View>

      {/* Sticky author bar */}
      <Animated.View
        style={[
          styles.stickyBar,
          {
            paddingTop: top + 8,
            opacity: stickyOpacity,
            transform: [{ translateY: stickyTranslateY }],
          },
        ]}
        pointerEvents={progressPct > 0.08 ? 'auto' : 'none'}
      >
        <TouchableOpacity style={styles.stickyIconBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={18} color={BRAND} />
        </TouchableOpacity>

        <View style={styles.stickyAuthor}>
          {!!authorAvatar ? (
            <Image source={{ uri: authorAvatar }} style={styles.stickyAvatar} />
          ) : (
            <View style={[styles.stickyAvatar, styles.avatarFallback]}>
              <Text style={{ fontSize: 14 }}>✍️</Text>
            </View>
          )}
          <View style={{ flex: 1 }}>
            <Text style={styles.stickyTitle} numberOfLines={1}>{displayTitle}</Text>
            <Text style={styles.stickyMeta} numberOfLines={1}>
              {authorName}{authorVerified ? ' ✓' : ''} • {readTime} min • {viewsText} views
            </Text>
          </View>
        </View>

        <View style={{ flexDirection: 'row', gap: 8 }}>
          <TouchableOpacity style={styles.stickyIconBtn} onPress={toggleBookmark}>
            <Ionicons
              name={bookmarked ? 'bookmark' : 'bookmark-outline'}
              size={18}
              color={bookmarked ? WARM : BRAND}
            />
          </TouchableOpacity>
          <TouchableOpacity style={styles.stickyIconBtn} onPress={handleShare}>
            <Ionicons name="share-outline" size={18} color={BRAND} />
          </TouchableOpacity>
        </View>
      </Animated.View>

      <Animated.ScrollView
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={16}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          {
            useNativeDriver: false,
            listener: onScroll,
          }
        )}
      >
        {/* Cover */}
        {!!article.image ? (
          <View style={styles.coverWrap}>
            <Image source={{ uri: article.image }} style={styles.cover} resizeMode="cover" />

            <View style={[styles.coverBtns, { paddingTop: top + 10 }]}>
              <TouchableOpacity style={styles.circleBtn} onPress={() => navigation.goBack()}>
                <Ionicons name="arrow-back" size={20} color={BRAND} />
              </TouchableOpacity>

              <View style={{ flexDirection: 'row', gap: 10 }}>
                <TouchableOpacity style={styles.circleBtn} onPress={toggleBookmark}>
                  <Ionicons
                    name={bookmarked ? 'bookmark' : 'bookmark-outline'}
                    size={20}
                    color={bookmarked ? WARM : BRAND}
                  />
                </TouchableOpacity>
                <TouchableOpacity style={styles.circleBtn} onPress={handleShare}>
                  <Ionicons name="share-outline" size={20} color={BRAND} />
                </TouchableOpacity>
              </View>
            </View>

            {/* Trending badge */}
            {isTrending && (
              <View style={styles.trendingBadge}>
                <Ionicons name="flame" size={14} color="#fff" />
                <Text style={styles.trendingTxt}>Trending</Text>
              </View>
            )}
          </View>
        ) : (
          <View style={[styles.plainTop, { paddingTop: top + 10 }]}>
            <TouchableOpacity style={styles.circleBtn} onPress={() => navigation.goBack()}>
              <Ionicons name="arrow-back" size={20} color={BRAND} />
            </TouchableOpacity>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <TouchableOpacity style={styles.circleBtn} onPress={toggleBookmark}>
                <Ionicons
                  name={bookmarked ? 'bookmark' : 'bookmark-outline'}
                  size={20}
                  color={bookmarked ? WARM : BRAND}
                />
              </TouchableOpacity>
              <TouchableOpacity style={styles.circleBtn} onPress={handleShare}>
                <Ionicons name="share-outline" size={20} color={BRAND} />
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Content Card */}
        <View style={[styles.contentCard, !article.image && { marginTop: 10 }]}>

          {/* Category + tags */}
          <View style={styles.metaRow}>
            {!!article.category_name && (
              <View style={styles.catPill}>
                <Text style={styles.catPillTxt}>{article.category_name}</Text>
              </View>
            )}

            {tags.slice(0, 3).map((tag) => (
              <View key={tag} style={styles.tagPill}>
                <Text style={styles.tagPillTxt}>#{tag}</Text>
              </View>
            ))}
          </View>

          {/* Title */}
          <Text style={styles.title}>{displayTitle}</Text>

          {/* Author row */}
          <View style={styles.authorRow}>
            {!!authorAvatar ? (
              <Image source={{ uri: authorAvatar }} style={styles.authorAvatar} />
            ) : (
              <View style={[styles.authorAvatar, styles.avatarFallback]}>
                <Text style={{ fontSize: 16 }}>✍️</Text>
              </View>
            )}

            <View style={{ flex: 1 }}>
              <Text style={styles.authorName}>
                {authorName}{authorVerified ? ' ✓' : ''}
              </Text>
              <Text style={styles.authorMeta}>
                {dateText ? dateText : ' '} • {readTime} min read • {viewsText} views
              </Text>
            </View>
          </View>

          {/* Social row (bookmark + clap) */}
          <View style={styles.socialRow}>
            <Pressable style={[styles.actionBtn, bookmarked && styles.actionBtnActive]} onPress={toggleBookmark}>
              <Ionicons
                name={bookmarked ? 'bookmark' : 'bookmark-outline'}
                size={18}
                color={bookmarked ? '#fff' : BRAND}
              />
              <Text style={[styles.actionTxt, bookmarked && styles.actionTxtActive]}>
                {bookmarked ? 'Saved' : 'Save'}
              </Text>
            </Pressable>

            <Pressable style={styles.actionBtn} onPress={handleClap}>
              <Ionicons name="hand-left-outline" size={18} color={BRAND} />
              <Text style={styles.actionTxt}>Clap</Text>

              {/* burst */}
              <Animated.View
                pointerEvents="none"
                style={[
                  styles.clapBurst,
                  {
                    opacity: burstOpacity,
                    transform: [
                      { translateY: burstTranslate },
                      { scale: burstScale },
                    ],
                  },
                ]}
              >
                <Text style={styles.clapBurstTxt}>+1</Text>
              </Animated.View>
            </Pressable>

            <View style={styles.clapCountPill}>
              <Ionicons name="sparkles-outline" size={14} color={ACCENT} />
              <Text style={styles.clapCountTxt}>{formatNumber(claps)}</Text>
            </View>
          </View>

          {/* Snippet (full) */}
          {!!safeText(article.snippet) && (
            <View style={styles.snippetBox}>
              <Text style={styles.snippetTxt}>{safeText(article.snippet)}</Text>
            </View>
          )}

          <View style={styles.divider} />

          {/* Body */}
          {article.content_html ? (
            <View style={[styles.webviewWrap, { height: webHeight }]}>
              {!webReady && (
                <View style={styles.webLoading}>
                  <ActivityIndicator size="small" color={BRAND} />
                </View>
              )}

              <WebView
                originWhitelist={['*']}
                source={{ html: buildHtml(article.content_html) }}
                style={styles.webview}
                scrollEnabled={false}
                showsVerticalScrollIndicator={false}
                javaScriptEnabled
                onLoadEnd={() => setWebReady(true)}
                onMessage={(e) => {
                  const h = Number(e.nativeEvent.data);
                  if (h > 0) setWebHeight(h + 34);
                }}
              />
            </View>
          ) : !!safeText(article.content_plain) ? (
            <Text style={styles.plainContent}>{safeText(article.content_plain)}</Text>
          ) : null}

          {/* Related */}
          {!!article.related_articles?.length && (
            <View style={styles.relatedWrap}>
              <View style={styles.relatedHeader}>
                <Text style={styles.relatedTitle}>Related Articles</Text>
                <Text style={styles.relatedSub}>Continue reading</Text>
              </View>

              {article.related_articles.map((rel) => (
                <TouchableOpacity
                  key={`${rel.post_id}-${rel.id}`}
                  style={styles.relatedCard}
                  activeOpacity={0.86}
                  onPress={() => openRelated(rel)}
                >
                  {!!rel.image ? (
                    <Image source={{ uri: rel.image }} style={styles.relatedImage} />
                  ) : (
                    <View style={[styles.relatedImage, styles.relatedFallback]}>
                      <Text style={{ fontSize: 16 }}>📰</Text>
                    </View>
                  )}

                  <View style={{ flex: 1 }}>
                    <Text style={styles.relatedCardTitle} numberOfLines={2}>
                      {safeText(rel.title)}
                    </Text>
                    <Text style={styles.relatedSnippet} numberOfLines={2}>
                      {safeText(rel.snippet)}
                    </Text>
                  </View>

                  <Ionicons name="chevron-forward" size={18} color={ACCENT} />
                </TouchableOpacity>
              ))}
            </View>
          )}

          <View style={{ height: 110 }} />
        </View>
      </Animated.ScrollView>

      {/* Floating “Clap” + “Bookmark” */}
      <View style={[styles.fabRow, { paddingBottom: Math.max(18, bottom + 10) }]}>
        <TouchableOpacity style={styles.fab} onPress={handleClap} activeOpacity={0.9}>
          <Ionicons name="hand-left-outline" size={20} color="#fff" />
          <Text style={styles.fabTxt}>Clap</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.fab, bookmarked && styles.fabSaved]}
          onPress={toggleBookmark}
          activeOpacity={0.9}
        >
          <Ionicons name={bookmarked ? 'bookmark' : 'bookmark-outline'} size={20} color="#fff" />
          <Text style={styles.fabTxt}>{bookmarked ? 'Saved' : 'Save'}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const WARM = '#F4A535';

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: CREAM },

  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: CREAM,
    gap: 12,
    padding: 24,
  },
  errorTxt: { fontSize: 14, color: MUTED, textAlign: 'center' },
  primaryBtn: { backgroundColor: BRAND, borderRadius: 12, paddingHorizontal: 24, paddingVertical: 12 },
  primaryBtnTxt: { color: '#fff', fontWeight: '700', fontSize: 14 },

  // Progress
  progressWrap: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 50,
    backgroundColor: 'rgba(245,240,232,0.92)',
  },
  progressTrack: {
    height: 3,
    backgroundColor: 'rgba(12,63,68,0.12)',
  },
  progressFill: {
    height: 3,
    backgroundColor: ACCENT,
    borderRadius: 10,
  },

  // Sticky bar
  stickyBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 60,
    paddingHorizontal: 12,
    paddingBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 8,
  },
  stickyIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F5F7F8',
    justifyContent: 'center',
    alignItems: 'center',
  },
  stickyAuthor: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  stickyAvatar: { width: 34, height: 34, borderRadius: 17 },
  stickyTitle: { fontSize: 12.5, fontWeight: '800', color: DARK },
  stickyMeta: { fontSize: 10.5, color: MUTED, marginTop: 1 },

  // Cover
  coverWrap: { position: 'relative' },
  cover: { width, height: height * 0.38 },
  coverBtns: {
    position: 'absolute',
    top: 0, left: 0, right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  circleBtn: {
    width: 40, height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.94)',
    justifyContent: 'center', alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12, shadowRadius: 8, elevation: 6,
  },
  trendingBadge: {
    position: 'absolute',
    bottom: 14,
    left: 14,
    backgroundColor: 'rgba(232,93,74,0.95)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  trendingTxt: { color: '#fff', fontWeight: '900', fontSize: 11, letterSpacing: 0.3 },

  plainTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 10,
  },

  // Content
  contentCard: {
    marginTop: -18,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 18,
    paddingHorizontal: 18,
    backgroundColor: CREAM,
  },

  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 12 },
  catPill: { backgroundColor: 'rgba(12,63,68,0.10)', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5 },
  catPillTxt: { fontSize: 10.5, fontWeight: '900', color: BRAND },
  tagPill: { backgroundColor: 'rgba(19,194,150,0.14)', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5 },
  tagPillTxt: { fontSize: 10.5, fontWeight: '800', color: ACCENT },

  title: {
    fontSize: 24,
    fontWeight: '900',
    color: DARK,
    lineHeight: 32,
    marginBottom: 12,
  },

  authorRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  authorAvatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#fff' },
  avatarFallback: { justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff', borderWidth: 1, borderColor: BORDER },
  authorName: { fontSize: 13.5, fontWeight: '900', color: DARK },
  authorMeta: { fontSize: 11.5, color: MUTED, marginTop: 2 },

  // Social row
  socialRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  actionBtn: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: BORDER,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    position: 'relative',
  },
  actionBtnActive: {
    backgroundColor: BRAND,
    borderColor: BRAND,
  },
  actionTxt: { fontSize: 12.5, fontWeight: '900', color: BRAND },
  actionTxtActive: { color: '#fff' },

  clapCountPill: {
    marginLeft: 'auto',
    backgroundColor: 'rgba(19,194,150,0.12)',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  clapCountTxt: { fontSize: 12, fontWeight: '900', color: ACCENT },

  clapBurst: {
    position: 'absolute',
    right: 8,
    top: -6,
    backgroundColor: 'rgba(244,165,53,0.95)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },
  clapBurstTxt: { color: '#fff', fontWeight: '900', fontSize: 11 },

  snippetBox: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 14,
    padding: 14,
    marginTop: 6,
  },
  snippetTxt: { fontSize: 13.5, color: '#2f3e43', lineHeight: 21 },

  divider: { height: 1, backgroundColor: BORDER, marginVertical: 16 },

  // WebView
  webviewWrap: { width: '100%', overflow: 'hidden' },
  webview: { flex: 1, backgroundColor: 'transparent' },
  webLoading: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: CREAM,
    zIndex: 1,
  },

  plainContent: { fontSize: 15, color: '#333', lineHeight: 26 },

  // Related
  relatedWrap: { marginTop: 10 },
  relatedHeader: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 10 },
  relatedTitle: { fontSize: 16, fontWeight: '900', color: DARK },
  relatedSub: { fontSize: 12, color: MUTED },

  relatedCard: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 16,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 10,
  },
  relatedImage: { width: 64, height: 64, borderRadius: 12, backgroundColor: '#f2f2f2' },
  relatedFallback: { justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: BORDER, backgroundColor: '#fff' },
  relatedCardTitle: { fontSize: 13.5, fontWeight: '900', color: DARK, lineHeight: 18, marginBottom: 4 },
  relatedSnippet: { fontSize: 11.5, color: MUTED, lineHeight: 16 },

  // FAB row
  fabRow: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 0,
    flexDirection: 'row',
    gap: 12,
  },
  fab: {
    flex: 1,
    backgroundColor: BRAND,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    shadowColor: BRAND,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 14,
    elevation: 10,
  },
  fabSaved: { backgroundColor: '#0a5a62' },
  fabTxt: { color: '#fff', fontWeight: '900', fontSize: 13 },
});