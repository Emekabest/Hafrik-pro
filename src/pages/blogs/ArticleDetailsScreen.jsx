// src/pages/blogs/ArticleDetailsScreen.jsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  RefreshControl,
  Share,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import * as Haptics from 'expo-haptics';

import { fetchArticleDetail, normalizeTags } from './articlesApi';
import { useAuth } from '../../AuthContext';
import { Colors } from '../../theme';
import { GetCommentsController, AddCommentController, AddReplyController } from '../../controllers/commentscontroller';
import ToggleFeedController from '../../controllers/tooglefeedcontroller';
import ToggleSaveController from '../../controllers/tooglesavecontroller';
import ShareModal from '../home/feeds/share';

const { width, height } = Dimensions.get('window');

const BRAND = Colors.primaryDark;
const ACCENT = Colors.primary;
const BG = '#F4F8F8';
const CARD = Colors.white;
const WHITE = Colors.white;
const TEXT = Colors.deepSlate ?? Colors.black;
const MUTED = Colors.secondaryText;
const BORDER = Colors.borderSoft ?? Colors.borderLight ?? '#E5EEEE';
const GOLD = '#F2A900';
const DANGER = Colors.destructive ?? '#E5484D';
const BOOKMARKS_KEY = 'hafrik_article_bookmarks_v1';

const alpha = (hex, opacity) => {
  const normalized = String(hex || '').replace('#', '');
  if (normalized.length !== 6) return hex || 'transparent';
  return `#${normalized}${Math.round(Math.max(0, Math.min(1, opacity)) * 255).toString(16).padStart(2, '0')}`;
};

const decodeHtml = (text = '') =>
  String(text)
    .replace(/&#039;/g, "'")
    .replace(/&#8217;/g, "'")
    .replace(/&rsquo;/g, "'")
    .replace(/&lsquo;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&ldquo;/g, '"')
    .replace(/&rdquo;/g, '"')
    .replace(/&amp;amp;/g, '&')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/&mdash;/g, '-')
    .replace(/&ndash;/g, '-')
    .replace(/&hellip;/g, '...')
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)));

const cleanText = (text = '') => decodeHtml(text).replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();

const fmtCount = (n) => {
  const v = Number(n ?? 0);
  if (v >= 1000000) return `${(v / 1000000).toFixed(1)}M`;
  if (v >= 1000) return `${(v / 1000).toFixed(1)}k`;
  return String(v);
};

const isRealImage = (url) =>
  typeof url === 'string' &&
  /^https?:\/\//i.test(url.trim()) &&
  !url.includes('default-article') &&
  !url.includes('blank_profile') &&
  !url.includes('/default.');

const buildHtml = (body) => `<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width,initial-scale=1.0,maximum-scale=1.0">
  <style>
    *{box-sizing:border-box}
    html,body{margin:0;padding:0;background:transparent}
    body{
      font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;
      color:${TEXT};
      font-size:16px;
      line-height:1.82;
      padding:0;
    }
    p{margin:0 0 16px}
    h1,h2,h3,h4{color:${TEXT};font-weight:900;line-height:1.25;margin:24px 0 12px}
    h2{font-size:22px} h3{font-size:19px}
    a{color:${ACCENT};font-weight:700;text-decoration:none}
    img{display:block;max-width:100%!important;height:auto!important;border-radius:18px;margin:18px 0}
    blockquote{
      margin:18px 0;
      padding:14px 16px;
      border-left:4px solid ${ACCENT};
      background:${alpha(BRAND, 0.06)};
      border-radius:0 16px 16px 0;
      color:${MUTED};
      font-weight:600;
    }
    ul,ol{padding-left:22px;margin:0 0 16px}
    li{margin-bottom:8px}
    table{width:100%;border-collapse:collapse;margin:16px 0}
    th,td{border:1px solid ${BORDER};padding:10px;font-size:13px}
    th{background:${alpha(BRAND, 0.06)};font-weight:900}
    pre,code{background:${alpha(BRAND, 0.07)};border-radius:9px;padding:3px 7px;font-size:13px}
  </style>
</head>
<body>
  ${body || ''}
  <div style="height:24px"></div>
  <script>
    function sendHeight(){
      window.ReactNativeWebView.postMessage(String(document.body.scrollHeight));
    }
    setTimeout(sendHeight, 120);
    setTimeout(sendHeight, 600);
    setTimeout(sendHeight, 1200);
  </script>
</body>
</html>`;

async function loadBookmarksSet() {
  try {
    const raw = await AsyncStorage.getItem(BOOKMARKS_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return new Set(Array.isArray(arr) ? arr.map(String) : []);
  } catch {
    return new Set();
  }
}

async function saveBookmarksSet(set) {
  try {
    await AsyncStorage.setItem(BOOKMARKS_KEY, JSON.stringify(Array.from(set)));
  } catch {}
}

const CommentRow = ({ item }) => {
  const name = cleanText(item?.user?.full_name || item?.user?.name || item?.user?.username || item?.username || 'Hafrik user');
  const avatar = item?.user?.avatar || item?.avatar || null;
  const text = cleanText(item?.comment || item?.body || item?.text || '');
  return (
    <View style={styles.commentRow}>
      {isRealImage(avatar) ? (
        <Image source={{ uri: avatar }} style={styles.commentAvatar} />
      ) : (
        <LinearGradient colors={[BRAND, ACCENT]} style={[styles.commentAvatar, styles.avatarFallback]}>
          <Ionicons name="person" size={15} color={WHITE} />
        </LinearGradient>
      )}
      <View style={styles.commentBubble}>
        <Text style={styles.commentName}>{name}</Text>
        <Text style={styles.commentText}>{text}</Text>
      </View>
    </View>
  );
};

export default function ArticleDetailsScreen({ navigation, route }) {
  const routeId = route?.params?.postId ?? route?.params?.articleId ?? route?.params?.id;
  const navTitle = route?.params?.title;
  const { top, bottom } = useSafeAreaInsets();
  const { token, user } = useAuth();

  const [article, setArticle] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [webHeight, setWebHeight] = useState(520);
  const [webReady, setWebReady] = useState(false);
  const [bookmarked, setBookmarked] = useState(false);
  const [likesCount, setLikesCount] = useState(0);
  const [isLiked, setIsLiked] = useState(false);
  const [comments, setComments] = useState([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  const [replyingTo, setReplyingTo] = useState(null);
  const [shareToTimelineVisible, setShareToTimelineVisible] = useState(false);
  const [progressPct, setProgressPct] = useState(0);

  const scrollY = useRef(new Animated.Value(0)).current;
  const contentHeightRef = useRef(1);
  const viewHeightRef = useRef(1);
  const stickyAnim = useRef(new Animated.Value(0)).current;

  const postId = routeId;

  const loadArticle = useCallback(async (silent = false) => {
    if (!postId) {
      setLoading(false);
      return;
    }
    try {
      if (!silent) setLoading(true);
      const data = await fetchArticleDetail(postId);
      setArticle(data);
      setLikesCount(Number(data?.likes_count ?? data?.likes ?? 0));
      setIsLiked(!!data?.user_liked);
      setWebReady(false);
      setWebHeight(520);
    } catch (err) {
      console.log('[ArticleDetails] load error:', err?.message || err);
      setArticle(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [postId]);

  useEffect(() => {
    loadArticle(false);
  }, [loadArticle]);

  useEffect(() => {
    if (!postId) return;
    (async () => {
      const set = await loadBookmarksSet();
      setBookmarked(set.has(String(postId)));
    })();
  }, [postId]);

  const loadComments = useCallback(async () => {
    if (!postId || !token) return;
    setCommentsLoading(true);
    try {
      const res = await GetCommentsController(postId, token, 1, 12);
      setComments(Array.isArray(res?.data) ? res.data : []);
    } catch (err) {
      console.log('[ArticleDetails] comments error:', err?.message || err);
    } finally {
      setCommentsLoading(false);
    }
  }, [postId, token]);

  useEffect(() => {
    loadComments();
  }, [loadComments]);

  const displayTitle = cleanText(article?.title || navTitle || 'Article');
  const snippet = cleanText(article?.snippet || '');
  const category = cleanText(article?.category_name || '');
  const tags = normalizeTags(article?.tags).map(cleanText).filter(Boolean);
  const image = isRealImage(article?.image) ? article.image : null;
  const authorName = cleanText(article?.author?.full_name || article?.author?.name || article?.author?.username || 'Hafrik');
  const authorAvatar = article?.author?.avatar;
  const authorVerified = !!article?.author?.verified;
  const readTime = Number(article?.reading_time_minutes || 0) || 1;
  const viewsText = fmtCount(article?.views || 0);
  const dateText = cleanText(article?.date || '');

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadArticle(true);
    loadComments();
  }, [loadArticle, loadComments]);

  const onScroll = useCallback((e) => {
    const y = e?.nativeEvent?.contentOffset?.y ?? 0;
    const viewH = e?.nativeEvent?.layoutMeasurement?.height ?? viewHeightRef.current;
    const contentH = e?.nativeEvent?.contentSize?.height ?? contentHeightRef.current;
    viewHeightRef.current = viewH || 1;
    contentHeightRef.current = contentH || 1;
    const maxScroll = Math.max(1, contentH - viewH);
    const pct = Math.max(0, Math.min(1, y / maxScroll));
    setProgressPct(pct);
    Animated.timing(stickyAnim, {
      toValue: y > height * 0.18 ? 1 : 0,
      duration: 180,
      useNativeDriver: true,
    }).start();
  }, [stickyAnim]);

  const toggleBookmark = useCallback(async () => {
    if (!postId) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    const set = await loadBookmarksSet();
    const id = String(postId);
    const next = !set.has(id);
    if (next) set.add(id);
    else set.delete(id);
    setBookmarked(next);
    await saveBookmarksSet(set);
    ToggleSaveController(postId, token);
  }, [postId, token]);

  const handleLike = useCallback(async () => {
    if (!postId || !token) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    const prevLiked = isLiked;
    const prevCount = likesCount;
    setIsLiked(!prevLiked);
    setLikesCount((count) => (prevLiked ? Math.max(0, count - 1) : count + 1));
    try {
      const res = await ToggleFeedController(postId, token, 'like');
      if (res.status !== 200) throw new Error('Like failed');
      const raw = res.data;
      const data = raw?.data && raw.data.is_reacted !== undefined ? raw.data : raw;
      const serverLiked = !!(data?.is_reacted || data?.my_reaction || data?.user_reaction);
      const serverCount = Number(data?.likes_count ?? data?.reactions?.total ?? (prevLiked ? Math.max(0, prevCount - 1) : prevCount + 1));
      setIsLiked(serverLiked);
      setLikesCount(serverCount);
    } catch (err) {
      console.log('[ArticleDetails] like error:', err?.message || err);
      setIsLiked(prevLiked);
      setLikesCount(prevCount);
    }
  }, [isLiked, likesCount, postId, token]);

  const handleShare = useCallback(async () => {
    try {
      await Share.share({
        message: `${displayTitle}\n${article?.link || route?.params?.link || ''}`,
        url: article?.link || route?.params?.link,
      });
    } catch {}
  }, [article?.link, displayTitle, route?.params?.link]);

  const submitComment = useCallback(async () => {
    const text = newComment.trim();
    if (!text || !postId || !token || submittingComment) return;
    setSubmittingComment(true);
    const optimistic = {
      id: `opt-${Date.now()}`,
      comment: text,
      user: {
        name: user?.full_name || user?.username || 'You',
        avatar: user?.avatar,
      },
    };
    setComments((prev) => [optimistic, ...prev]);
    setNewComment('');
    try {
      if (replyingTo) {
        await AddReplyController(postId, replyingTo, text, token);
        setReplyingTo(null);
      } else {
        await AddCommentController(postId, text, token);
      }
      loadComments();
    } catch (err) {
      console.log('[ArticleDetails] submit comment error:', err?.message || err);
      setComments((prev) => prev.filter((item) => item.id !== optimistic.id));
      setNewComment(text);
    } finally {
      setSubmittingComment(false);
    }
  }, [loadComments, newComment, postId, replyingTo, submittingComment, token, user]);

  const openRelated = useCallback((item) => {
    const id = item?.post_id ?? item?.id;
    if (!id) return;
    navigation.push('ArticleDetails', { postId: id, title: cleanText(item?.title) });
  }, [navigation]);

  const stickyOpacity = stickyAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 1] });
  const stickyTranslateY = stickyAnim.interpolate({ inputRange: [0, 1], outputRange: [-18, 0] });

  const related = useMemo(() => (
    Array.isArray(article?.related_articles) ? article.related_articles : []
  ), [article?.related_articles]);

  if (loading) {
    return (
      <View style={styles.centered}>
        <StatusBar barStyle="light-content" backgroundColor={BRAND} />
        <ActivityIndicator size="large" color={BRAND} />
        <Text style={styles.centeredText}>Opening article...</Text>
      </View>
    );
  }

  if (!article) {
    return (
      <View style={styles.centered}>
        <Ionicons name="alert-circle-outline" size={46} color={DANGER} />
        <Text style={styles.errorTitle}>Could not load this article</Text>
        <Text style={styles.errorSub}>Please go back and try again.</Text>
        <TouchableOpacity style={styles.primaryButton} onPress={() => navigation.goBack()} activeOpacity={0.86}>
          <Text style={styles.primaryButtonText}>Go back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <StatusBar barStyle="light-content" backgroundColor={BRAND} />

      <View style={[styles.progressWrap, { paddingTop: top }]}>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${Math.round(progressPct * 100)}%` }]} />
        </View>
      </View>

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
        <TouchableOpacity style={styles.stickyIcon} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={18} color={BRAND} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.stickyTitle} numberOfLines={1}>{displayTitle}</Text>
          <Text style={styles.stickySub} numberOfLines={1}>{readTime} min read · {viewsText} views</Text>
        </View>
        <TouchableOpacity style={styles.stickyIcon} onPress={toggleBookmark}>
          <Ionicons name={bookmarked ? 'bookmark' : 'bookmark-outline'} size={18} color={bookmarked ? GOLD : BRAND} />
        </TouchableOpacity>
      </Animated.View>

      <Animated.ScrollView
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={16}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={BRAND} />}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], {
          useNativeDriver: false,
          listener: onScroll,
        })}
      >
        <View style={styles.hero}>
          {image ? (
            <Image source={{ uri: image }} style={styles.heroImage} resizeMode="cover" />
          ) : (
            <LinearGradient colors={[BRAND, '#0D5056', ACCENT]} style={styles.heroImage}>
              <Ionicons name="newspaper-outline" size={64} color={WHITE + '55'} />
            </LinearGradient>
          )}
          <LinearGradient colors={['rgba(5,31,35,0.22)', 'rgba(5,31,35,0.95)']} style={StyleSheet.absoluteFill} />

          <View style={[styles.heroTop, { paddingTop: top + 10 }]}>
            <TouchableOpacity style={styles.heroIcon} onPress={() => navigation.goBack()} activeOpacity={0.86}>
              <Ionicons name="arrow-back" size={20} color={WHITE} />
            </TouchableOpacity>
            <View style={styles.heroActions}>
              <TouchableOpacity style={styles.heroIcon} onPress={toggleBookmark} activeOpacity={0.86}>
                <Ionicons name={bookmarked ? 'bookmark' : 'bookmark-outline'} size={20} color={bookmarked ? GOLD : WHITE} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.heroIcon} onPress={handleShare} activeOpacity={0.86}>
                <Ionicons name="share-outline" size={20} color={WHITE} />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.heroBottom}>
            {!!category && (
              <View style={styles.categoryPill}>
                <Text style={styles.categoryPillText}>{category}</Text>
              </View>
            )}
            <Text style={styles.title}>{displayTitle}</Text>
            <View style={styles.heroMeta}>
              <Text style={styles.heroMetaText}>{readTime} min read</Text>
              <View style={styles.metaDot} />
              <Text style={styles.heroMetaText}>{viewsText} views</Text>
              {!!dateText && <View style={styles.metaDot} />}
              {!!dateText && (
                <>
                  <Text style={styles.heroMetaText} numberOfLines={1}>{dateText}</Text>
                </>
              )}
            </View>
          </View>
        </View>

        <View style={styles.contentShell}>
          <View style={styles.authorCard}>
            {isRealImage(authorAvatar) ? (
              <Image source={{ uri: authorAvatar }} style={styles.authorAvatar} />
            ) : (
              <LinearGradient colors={[BRAND, ACCENT]} style={[styles.authorAvatar, styles.avatarFallback]}>
                <Ionicons name="create" size={17} color={WHITE} />
              </LinearGradient>
            )}
            <View style={{ flex: 1 }}>
              <Text style={styles.authorName}>
                {authorName}{authorVerified ? '  ✓' : ''}
              </Text>
              <Text style={styles.authorMeta}>Published on Hafrik</Text>
            </View>
          </View>

          <View style={styles.actionCard}>
            <Pressable style={[styles.actionBtn, isLiked && styles.actionBtnActive]} onPress={handleLike}>
              <Ionicons name={isLiked ? 'heart' : 'heart-outline'} size={18} color={isLiked ? WHITE : BRAND} />
              <Text style={[styles.actionText, isLiked && styles.actionTextActive]}>{likesCount > 0 ? fmtCount(likesCount) : 'Like'}</Text>
            </Pressable>
            <Pressable style={[styles.actionBtn, bookmarked && styles.actionBtnGold]} onPress={toggleBookmark}>
              <Ionicons name={bookmarked ? 'bookmark' : 'bookmark-outline'} size={18} color={bookmarked ? WHITE : BRAND} />
              <Text style={[styles.actionText, bookmarked && styles.actionTextActive]}>{bookmarked ? 'Saved' : 'Save'}</Text>
            </Pressable>
            <Pressable style={styles.actionBtn} onPress={() => setShareToTimelineVisible(true)}>
              <Ionicons name="share-social-outline" size={18} color={BRAND} />
              <Text style={styles.actionText}>Share</Text>
            </Pressable>
          </View>

          {!!snippet && (
            <View style={styles.snippetBox}>
              <Ionicons name="sparkles-outline" size={18} color={ACCENT} />
              <Text style={styles.snippetText}>{snippet}</Text>
            </View>
          )}

          {tags.length > 0 && (
            <View style={styles.tagWrap}>
              {tags.slice(0, 6).map((tag) => (
                <View key={`tag-${tag}`} style={styles.tagPill}>
                  <Text style={styles.tagText}>#{tag}</Text>
                </View>
              ))}
            </View>
          )}

          <View style={styles.readerCard}>
            {article.content_html ? (
              <View style={[styles.webWrap, { height: webHeight }]}>
                {!webReady && (
                  <View style={styles.webLoading}>
                    <ActivityIndicator size="small" color={BRAND} />
                    <Text style={styles.webLoadingText}>Preparing article...</Text>
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
                  onMessage={(event) => {
                    const nextHeight = Number(event.nativeEvent.data);
                    if (nextHeight > 0) setWebHeight(nextHeight + 28);
                  }}
                />
              </View>
            ) : (
              <Text style={styles.plainContent}>{cleanText(article.content_plain || '')}</Text>
            )}
          </View>

          {related.length > 0 && (
            <View style={styles.relatedSection}>
              <View style={styles.sectionHead}>
                <Text style={styles.sectionTitle}>Continue reading</Text>
                <Text style={styles.sectionSub}>Related articles</Text>
              </View>
              {related.map((item, index) => {
                const relatedImage = isRealImage(item?.image) ? item.image : null;
                return (
                  <TouchableOpacity
                    key={`related-${item?.post_id ?? item?.id ?? index}-${index}`}
                    style={styles.relatedCard}
                    onPress={() => openRelated(item)}
                    activeOpacity={0.86}
                  >
                    {relatedImage ? (
                      <Image source={{ uri: relatedImage }} style={styles.relatedImage} />
                    ) : (
                      <LinearGradient colors={[alpha(BRAND, 0.12), alpha(ACCENT, 0.16)]} style={styles.relatedImage}>
                        <Ionicons name="newspaper-outline" size={21} color={BRAND} />
                      </LinearGradient>
                    )}
                    <View style={{ flex: 1 }}>
                      <Text style={styles.relatedTitle} numberOfLines={2}>{cleanText(item?.title)}</Text>
                      {!!item?.snippet && <Text style={styles.relatedSnippet} numberOfLines={2}>{cleanText(item.snippet)}</Text>}
                    </View>
                    <Ionicons name="chevron-forward" size={18} color={ACCENT} />
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          <View style={styles.commentsCard}>
            <View style={styles.sectionHead}>
              <Text style={styles.sectionTitle}>Comments</Text>
              <Text style={styles.sectionSub}>{comments.length ? `${comments.length} comments` : 'Join the conversation'}</Text>
            </View>

            <View style={styles.commentInputRow}>
              {isRealImage(user?.avatar) ? (
                <Image source={{ uri: user.avatar }} style={styles.inputAvatar} />
              ) : (
                <LinearGradient colors={[BRAND, ACCENT]} style={[styles.inputAvatar, styles.avatarFallback]}>
                  <Ionicons name="person" size={15} color={WHITE} />
                </LinearGradient>
              )}
              <TextInput
                style={styles.commentInput}
                placeholder="Write a thoughtful comment..."
                placeholderTextColor={MUTED}
                value={newComment}
                onChangeText={setNewComment}
                multiline
              />
              <TouchableOpacity
                style={[styles.sendBtn, (!newComment.trim() || submittingComment) && styles.sendBtnDisabled]}
                disabled={!newComment.trim() || submittingComment}
                onPress={submitComment}
                activeOpacity={0.84}
              >
                {submittingComment ? (
                  <ActivityIndicator size="small" color={WHITE} />
                ) : (
                  <Ionicons name="send" size={16} color={WHITE} />
                )}
              </TouchableOpacity>
            </View>

            {commentsLoading ? (
              <ActivityIndicator size="small" color={BRAND} style={{ marginVertical: 18 }} />
            ) : comments.length === 0 ? (
              <View style={styles.noComments}>
                <Ionicons name="chatbubble-ellipses-outline" size={26} color={MUTED} />
                <Text style={styles.noCommentsText}>No comments yet. Be the first to respond.</Text>
              </View>
            ) : (
              comments.map((item, index) => (
                <CommentRow key={`comment-${item?.id ?? item?.comment_id ?? item?.created_at ?? index}-${index}`} item={item} />
              ))
            )}
          </View>

          <View style={{ height: Math.max(104, bottom + 86) }} />
        </View>
      </Animated.ScrollView>

      <View style={[styles.bottomDock, { paddingBottom: Math.max(14, bottom + 8) }]}>
        <TouchableOpacity style={[styles.dockBtn, isLiked && styles.dockBtnActive]} onPress={handleLike} activeOpacity={0.9}>
          <Ionicons name={isLiked ? 'heart' : 'heart-outline'} size={19} color={isLiked ? WHITE : BRAND} />
          <Text style={[styles.dockText, isLiked && styles.dockTextActive]}>{likesCount > 0 ? fmtCount(likesCount) : 'Like'}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.dockBtn} onPress={handleShare} activeOpacity={0.9}>
          <Ionicons name="paper-plane-outline" size={19} color={BRAND} />
          <Text style={styles.dockText}>Send</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.dockPrimary} onPress={() => setShareToTimelineVisible(true)} activeOpacity={0.9}>
          <Ionicons name="share-social-outline" size={18} color={WHITE} />
          <Text style={styles.dockPrimaryText}>Share</Text>
        </TouchableOpacity>
      </View>

      <ShareModal
        visible={shareToTimelineVisible}
        onClose={() => setShareToTimelineVisible(false)}
        feed={{ id: postId }}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },
  centered: { flex: 1, backgroundColor: BG, alignItems: 'center', justifyContent: 'center', padding: 28, gap: 12 },
  centeredText: { color: MUTED, fontSize: 13, fontWeight: '700' },
  errorTitle: { color: TEXT, fontSize: 18, fontWeight: '900', textAlign: 'center' },
  errorSub: { color: MUTED, fontSize: 13, textAlign: 'center' },
  primaryButton: { marginTop: 8, backgroundColor: BRAND, borderRadius: 999, paddingHorizontal: 22, paddingVertical: 12 },
  primaryButtonText: { color: WHITE, fontSize: 13, fontWeight: '900' },
  progressWrap: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 90, backgroundColor: 'transparent' },
  progressTrack: { height: 3, backgroundColor: WHITE + '30' },
  progressFill: { height: 3, backgroundColor: ACCENT, borderRadius: 99 },
  stickyBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 80,
    backgroundColor: CARD,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
    paddingHorizontal: 12,
    paddingBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    shadowColor: BRAND,
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 8,
  },
  stickyIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: alpha(BRAND, 0.07), alignItems: 'center', justifyContent: 'center' },
  stickyTitle: { color: TEXT, fontSize: 12.5, fontWeight: '900' },
  stickySub: { color: MUTED, fontSize: 10.5, marginTop: 1, fontWeight: '700' },
  hero: { height: Math.max(420, height * 0.52), backgroundColor: BRAND },
  heroImage: { ...StyleSheet.absoluteFillObject, width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' },
  heroTop: { position: 'absolute', top: 0, left: 0, right: 0, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  heroActions: { flexDirection: 'row', gap: 10 },
  heroIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.24)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroBottom: { position: 'absolute', left: 20, right: 20, bottom: 28 },
  categoryPill: { alignSelf: 'flex-start', backgroundColor: ACCENT, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 7, marginBottom: 10 },
  categoryPillText: { color: WHITE, fontSize: 10.5, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 0.7 },
  title: { color: WHITE, fontSize: 31, lineHeight: 38, fontWeight: '900', fontFamily: 'ReadexPro-Bold' },
  heroMeta: { marginTop: 12, flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8 },
  heroMetaText: { color: WHITE + 'C7', fontSize: 12, fontWeight: '800' },
  metaDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: WHITE + '82' },
  contentShell: { marginTop: -18, borderTopLeftRadius: 28, borderTopRightRadius: 28, backgroundColor: BG, paddingTop: 14, paddingHorizontal: 14 },
  authorCard: {
    backgroundColor: CARD,
    borderRadius: 22,
    padding: 13,
    borderWidth: 1,
    borderColor: BORDER,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    shadowColor: BRAND,
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 3,
  },
  authorAvatar: { width: 46, height: 46, borderRadius: 23 },
  avatarFallback: { alignItems: 'center', justifyContent: 'center' },
  authorName: { color: TEXT, fontSize: 14, fontWeight: '900' },
  authorMeta: { color: MUTED, fontSize: 12, marginTop: 2, fontWeight: '700' },
  actionCard: {
    marginTop: 12,
    backgroundColor: CARD,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 8,
    flexDirection: 'row',
    gap: 8,
  },
  actionBtn: { flex: 1, height: 42, borderRadius: 999, backgroundColor: alpha(BRAND, 0.06), alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 6 },
  actionBtnActive: { backgroundColor: DANGER },
  actionBtnGold: { backgroundColor: GOLD },
  actionText: { color: BRAND, fontSize: 12.5, fontWeight: '900' },
  actionTextActive: { color: WHITE },
  snippetBox: {
    marginTop: 12,
    backgroundColor: alpha(ACCENT, 0.1),
    borderRadius: 20,
    padding: 14,
    borderWidth: 1,
    borderColor: alpha(ACCENT, 0.16),
    flexDirection: 'row',
    gap: 10,
  },
  snippetText: { flex: 1, color: TEXT, fontSize: 14, lineHeight: 21, fontWeight: '700' },
  tagWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  tagPill: { backgroundColor: CARD, borderWidth: 1, borderColor: BORDER, borderRadius: 999, paddingHorizontal: 11, paddingVertical: 7 },
  tagText: { color: ACCENT, fontSize: 11.5, fontWeight: '900' },
  readerCard: {
    marginTop: 14,
    backgroundColor: CARD,
    borderRadius: 24,
    padding: 16,
    borderWidth: 1,
    borderColor: BORDER,
    overflow: 'hidden',
  },
  webWrap: { width: '100%', backgroundColor: CARD },
  webview: { flex: 1, backgroundColor: 'transparent' },
  webLoading: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: CARD, zIndex: 2 },
  webLoadingText: { color: MUTED, fontSize: 12, fontWeight: '700' },
  plainContent: { color: TEXT, fontSize: 16, lineHeight: 29 },
  relatedSection: { marginTop: 14, backgroundColor: CARD, borderRadius: 24, padding: 14, borderWidth: 1, borderColor: BORDER },
  sectionHead: { marginBottom: 12 },
  sectionTitle: { color: TEXT, fontSize: 17, fontWeight: '900', fontFamily: 'ReadexPro-Bold' },
  sectionSub: { color: MUTED, fontSize: 12, marginTop: 2, fontWeight: '700' },
  relatedCard: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 },
  relatedImage: { width: 74, height: 74, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  relatedTitle: { color: TEXT, fontSize: 13.5, lineHeight: 18, fontWeight: '900' },
  relatedSnippet: { color: MUTED, fontSize: 11.5, lineHeight: 16, marginTop: 4 },
  commentsCard: { marginTop: 14, backgroundColor: CARD, borderRadius: 24, padding: 14, borderWidth: 1, borderColor: BORDER },
  commentInputRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 9, backgroundColor: alpha(BRAND, 0.05), borderRadius: 20, padding: 8 },
  inputAvatar: { width: 34, height: 34, borderRadius: 17 },
  commentInput: { flex: 1, maxHeight: 96, minHeight: 38, color: TEXT, fontSize: 13, paddingVertical: 9 },
  sendBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: ACCENT, alignItems: 'center', justifyContent: 'center' },
  sendBtnDisabled: { opacity: 0.45 },
  noComments: { alignItems: 'center', gap: 8, paddingVertical: 22 },
  noCommentsText: { color: MUTED, fontSize: 13, textAlign: 'center' },
  commentRow: { flexDirection: 'row', gap: 10, marginTop: 14 },
  commentAvatar: { width: 36, height: 36, borderRadius: 18 },
  commentBubble: { flex: 1, backgroundColor: alpha(BRAND, 0.05), borderRadius: 17, paddingHorizontal: 12, paddingVertical: 10 },
  commentName: { color: TEXT, fontSize: 12.5, fontWeight: '900' },
  commentText: { color: TEXT, fontSize: 13, lineHeight: 19, marginTop: 3 },
  bottomDock: {
    position: 'absolute',
    left: 12,
    right: 12,
    bottom: 0,
    backgroundColor: CARD,
    borderRadius: 26,
    paddingTop: 10,
    paddingHorizontal: 10,
    flexDirection: 'row',
    gap: 8,
    borderWidth: 1,
    borderColor: BORDER,
    shadowColor: BRAND,
    shadowOpacity: 0.13,
    shadowRadius: 20,
    elevation: 10,
  },
  dockBtn: { flex: 1, height: 44, borderRadius: 22, backgroundColor: alpha(BRAND, 0.06), flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  dockBtnActive: { backgroundColor: DANGER },
  dockText: { color: BRAND, fontSize: 12.5, fontWeight: '900' },
  dockTextActive: { color: WHITE },
  dockPrimary: { flex: 1.12, height: 44, borderRadius: 22, backgroundColor: BRAND, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  dockPrimaryText: { color: WHITE, fontSize: 12.5, fontWeight: '900' },
});
