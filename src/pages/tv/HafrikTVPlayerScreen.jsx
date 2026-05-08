/**
 * HafrikTVPlayerScreen
 *
 * Three modes:
 *   reel   → ReelFeedPlayer  vertical-paging FlatList (swipe up/down between reels)
 *   video  → VideoLayout     scrollable 16:9 with engagement + related
 *
 * Both support YouTube (react-native-youtube-iframe) or direct MP4 (expo-video).
 */
import React, {
  useCallback, useEffect, useRef, useState,
} from 'react';
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { VideoView, useVideoPlayer } from 'expo-video';
import { useEvent } from 'expo';
import YoutubeIframe from 'react-native-youtube-iframe';
import { Ionicons } from '@expo/vector-icons';
import { Image as ExpoImage } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useAuth } from '../../AuthContext';
import { toggleLike, addComment, fetchComments } from '../reels/reelsApi';
import RepostModal from '../home/feeds/feedcardproperties/RepostModal';

const { width: W, height: SCREEN_H } = Dimensions.get('window');
const VIDEO_H = Math.round(W * (9 / 16));
const THUMB_W = 110;
const THUMB_H = Math.round(THUMB_W * (9 / 16));

// ─── Brand colours ────────────────────────────────────────────────────────────
const BG           = '#071e21';
const BG_CARD      = '#0d2d32';
const BG_ROW       = '#0f3539';
const ACCENT       = '#1f8e93';
const ACCENT_LIGHT = '#27adb5';
const WHITE        = '#ffffff';
const WHITE_DIM    = 'rgba(255,255,255,0.65)';
const WHITE_MUTED  = 'rgba(255,255,255,0.38)';
const BORDER       = 'rgba(255,255,255,0.08)';
const LIGHT_BG     = '#F4F8F8';
const LIGHT_CARD   = '#ffffff';
const LIGHT_BORDER = '#E3ECEC';
const LIGHT_TEXT   = '#071e21';
const LIGHT_MUTED  = '#667A7D';

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmtCount(n) {
  if (!n || n < 1) return '0';
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `${(n / 1_000).toFixed(n >= 10_000 ? 0 : 1)}K`;
  return String(n);
}

function fmtTime(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d)) return '';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function extractYouTubeId(url = '') {
  if (!url) return null;
  const m = url.match(
    /(?:youtu\.be\/|youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/))([A-Za-z0-9_-]{11})/
  );
  return m ? m[1] : null;
}

// ─── Comment bottom sheet ─────────────────────────────────────────────────────
function CommentSheet({ visible, postId, onClose, token }) {
  const [comments,   setComments]   = useState([]);
  const [loading,    setLoading]    = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [text,       setText]       = useState('');
  const { bottom } = useSafeAreaInsets();

  useEffect(() => {
    if (!visible || !postId) return;
    let alive = true;
    setLoading(true);
    fetchComments(postId, token, 1, 20)
      .then((data) => { if (alive) setComments(data); })
      .catch(() => {})
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [visible, postId, token]);

  const handleSubmit = useCallback(async () => {
    const trimmed = text.trim();
    if (!trimmed || submitting) return;
    setSubmitting(true);
    try {
      const result = await addComment(postId, trimmed, token);
      if (result) {
        setComments((prev) => [
          result?.comment ?? { id: Date.now(), text: trimmed, user: { username: 'You' } },
          ...prev,
        ]);
        setText('');
      }
    } catch {}
    setSubmitting(false);
  }, [postId, text, token, submitting]);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <TouchableOpacity style={cs.backdrop} activeOpacity={1} onPress={onClose} />
        <View style={[cs.sheet, { paddingBottom: bottom + 12 }]}>
          <View style={cs.handle} />
          <Text style={cs.title}>Comments</Text>
          {loading ? (
            <ActivityIndicator color={ACCENT} style={{ marginVertical: 24 }} />
          ) : comments.length === 0 ? (
            <View style={{ alignItems: 'center', paddingVertical: 28 }}>
              <Ionicons name="chatbubble-outline" size={30} color={WHITE_MUTED} />
              <Text style={{ color: WHITE_MUTED, fontSize: 13, fontFamily: 'WorkSans_400Regular', marginTop: 8 }}>
                No comments yet
              </Text>
            </View>
          ) : (
            <FlatList
              data={comments}
              keyExtractor={(c, i) => String(c.id ?? i)}
              style={{ maxHeight: 260 }}
              showsVerticalScrollIndicator={false}
              renderItem={({ item }) => (
                <View style={cs.commentRow}>
                  <View style={cs.commentAvatar}>
                    {item.user?.avatar
                      ? <ExpoImage source={{ uri: item.user.avatar }} style={{ width: 30, height: 30, borderRadius: 15 }} contentFit="cover" />
                      : <Ionicons name="person-circle-outline" size={30} color={WHITE_MUTED} />}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={cs.commentUser}>{item.user?.name ?? item.user?.username ?? 'User'}</Text>
                    <Text style={cs.commentText}>{item.text ?? item.comment ?? ''}</Text>
                  </View>
                </View>
              )}
            />
          )}
          <View style={cs.inputRow}>
            <TextInput
              style={cs.input}
              placeholder="Add a comment…"
              placeholderTextColor={WHITE_MUTED}
              value={text}
              onChangeText={setText}
              multiline
              maxLength={300}
            />
            <TouchableOpacity
              style={[cs.sendBtn, !text.trim() && { opacity: 0.4 }]}
              onPress={handleSubmit}
              disabled={!text.trim() || submitting}
            >
              {submitting
                ? <ActivityIndicator size="small" color={WHITE} />
                : <Ionicons name="send" size={16} color={WHITE} />}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── Expandable description ───────────────────────────────────────────────────
function ExpandableDesc({ text: raw, dark = false }) {
  const [expanded, setExpanded] = useState(false);
  if (!raw) return null;
  return (
    <View style={{ marginBottom: 8 }}>
      <Text style={dark ? vl.reelDesc : styles.videoDesc} numberOfLines={expanded ? undefined : (dark ? 2 : 3)}>
        {raw}
      </Text>
      {raw.length > 80 ? (
        <TouchableOpacity onPress={() => setExpanded((e) => !e)} activeOpacity={0.7}>
          <Text style={{ color: ACCENT_LIGHT, fontSize: 12, fontFamily: 'WorkSans_600SemiBold', marginTop: 2 }}>
            {expanded ? 'Show less' : 'See all'}
          </Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

// ─── Direct video hook ────────────────────────────────────────────────────────
function useDirectPlayer(url) {
  const [paused,   setPaused]  = useState(false);
  const [overlay,  setOverlay] = useState(true);
  const opacity  = useRef(new Animated.Value(1)).current;
  const timer    = useRef(null);

  const player = useVideoPlayer(url ?? null, (p) => {
    if (!p) return;
    p.loop = false; p.muted = false; p.volume = 1;
    p.play();
  });

  const { status } = useEvent(player, 'statusChange', { status: player?.status ?? 'idle' });

  const hide = useCallback(() => {
    Animated.timing(opacity, { toValue: 0, duration: 380, useNativeDriver: true }).start(() => setOverlay(false));
  }, [opacity]);

  const show = useCallback(() => {
    setOverlay(true);
    Animated.timing(opacity, { toValue: 1, duration: 180, useNativeDriver: true }).start();
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(hide, 3500);
  }, [opacity, hide]);

  useEffect(() => {
    show();
    return () => {
      if (timer.current) clearTimeout(timer.current);
      try { player?.pause(); } catch {}
    };
  }, []);

  const toggle = useCallback(() => {
    show();
    if (paused) { player?.play(); } else { player?.pause(); }
    setPaused((p) => !p);
  }, [paused, player, show]);

  const tap = useCallback(() => {
    overlay ? hide() : show();
  }, [overlay, hide, show]);

  return {
    player, paused, overlay, opacity,
    toggle, tap,
    isLoading: status === 'loading' || status === 'idle',
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// REEL FEED — individual item in vertical paging list
// ─────────────────────────────────────────────────────────────────────────────
function ReelFeedItem({ item, isActive, token }) {
  const { bottom } = useSafeAreaInsets();
  const postId = item.id;

  // Engagement
  const [liked,       setLiked]       = useState(false);
  const [likeCount,   setLikeCount]   = useState(Number(item.likes ?? 0));
  const [likeLoading, setLikeLoading] = useState(false);
  const [commentOpen, setCommentOpen] = useState(false);
  const [repostOpen,  setRepostOpen]  = useState(false);
  const [descOpen,    setDescOpen]    = useState(false);

  const handleLike = useCallback(async () => {
    if (likeLoading) return;
    setLikeLoading(true);
    const was = liked;
    setLiked(!was);
    setLikeCount((c) => was ? Math.max(0, c - 1) : c + 1);
    try { await toggleLike(postId, token); }
    catch { setLiked(was); setLikeCount((c) => was ? c + 1 : Math.max(0, c - 1)); }
    finally { setLikeLoading(false); }
  }, [liked, likeLoading, postId, token]);

  // ── YouTube reel ──────────────────────────────────────────────
  const [ytPlaying, setYtPlaying] = useState(false);
  const [ytReady,   setYtReady]   = useState(false);
  useEffect(() => {
    if (item.is_youtube) setYtPlaying(isActive);
  }, [isActive, item.is_youtube]);

  // ── Direct video ──────────────────────────────────────────────
  const player = useVideoPlayer(
    (!item.is_youtube && item.video_url) ? item.video_url : null,
    (p) => { if (!p) return; p.loop = true; p.muted = false; p.volume = 1; }
  );
  const { status } = useEvent(player, 'statusChange', { status: player?.status ?? 'idle' });

  useEffect(() => {
    if (item.is_youtube || !player) return;
    try { isActive ? player.play() : player.pause(); } catch {}
  }, [isActive, player, item.is_youtube]);

  useEffect(() => {
    return () => { if (!item.is_youtube) { try { player?.pause(); } catch {} } };
  }, []);

  const isLoading = !item.is_youtube && (status === 'loading' || status === 'idle');
  const videoId   = item.is_youtube ? extractYouTubeId(item.video_url) : null;

  return (
    <View style={rf.item}>
      <StatusBar hidden />

      {/* ── Video ─────────────────────────────────────────────── */}
      {item.is_youtube ? (
        videoId ? (
          <View style={StyleSheet.absoluteFill}>
            {!ytReady ? (
              <View style={[StyleSheet.absoluteFill, { backgroundColor: '#000', justifyContent: 'center', alignItems: 'center' }]}>
                <Ionicons name="logo-youtube" size={44} color="#FF0000" />
              </View>
            ) : null}
            <YoutubeIframe
              videoId={videoId}
              width={W}
              height={SCREEN_H}
              play={ytPlaying && isActive}
              onReady={() => setYtReady(true)}
              onChangeState={(s) => { if (s === 'ended') setYtPlaying(false); }}
              webViewProps={{ allowsInlineMediaPlayback: true, mediaPlaybackRequiresUserAction: false }}
              initialPlayerParams={{ rel: 0, modestbranding: 1, controls: 0 }}
            />
          </View>
        ) : null
      ) : (
        <VideoView
          player={player}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          nativeControls={false}
          fullscreenOptions={{ isFullscreen: false }}
        />
      )}

      {isLoading ? (
        <View style={rf.loader} pointerEvents="none">
          <ActivityIndicator size="large" color={ACCENT} />
        </View>
      ) : null}

      {/* ── Gradients ─────────────────────────────────────────── */}
      <LinearGradient
        colors={['rgba(0,0,0,0.5)', 'transparent']}
        style={rf.topGrad}
        pointerEvents="none"
      />
      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.75)']}
        style={rf.bottomGrad}
        pointerEvents="none"
      />

      {/* ── Right side engagement ─────────────────────────────── */}
      <View style={[rf.sideBar, { bottom: bottom + 90 }]}>
        <TouchableOpacity style={rf.sideBtn} onPress={handleLike} disabled={likeLoading}>
          {likeLoading
            ? <ActivityIndicator size="small" color={ACCENT} />
            : <Ionicons name={liked ? 'heart' : 'heart-outline'} size={28} color={liked ? '#ff4d6d' : WHITE} />}
          {likeCount > 0 ? <Text style={rf.sideCount}>{fmtCount(likeCount)}</Text> : null}
        </TouchableOpacity>

        <TouchableOpacity style={rf.sideBtn} onPress={() => setCommentOpen(true)}>
          <Ionicons name="chatbubble-outline" size={26} color={WHITE} />
          {item.comments > 0 ? <Text style={rf.sideCount}>{fmtCount(item.comments)}</Text> : null}
        </TouchableOpacity>

        <TouchableOpacity style={rf.sideBtn} onPress={() => setRepostOpen(true)}>
          <Ionicons name="repeat-outline" size={28} color={WHITE} />
          {item.shares > 0 ? <Text style={rf.sideCount}>{fmtCount(item.shares)}</Text> : null}
        </TouchableOpacity>
      </View>

      {/* ── Bottom info ────────────────────────────────────────── */}
      <View style={[rf.bottomInfo, { paddingBottom: bottom + 24, paddingRight: 72 }]}>
        {item.title ? <Text style={rf.title} numberOfLines={2}>{item.title}</Text> : null}
        <ExpandableDesc text={item.description} dark />
        {item.views > 0 ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Ionicons name="eye-outline" size={12} color={WHITE_DIM} />
            <Text style={rf.views}>{fmtCount(item.views)} views</Text>
          </View>
        ) : null}
      </View>

      <CommentSheet visible={commentOpen} postId={postId} token={token} onClose={() => setCommentOpen(false)} />
      <RepostModal
        visible={repostOpen}
        postId={postId}
        onClose={() => setRepostOpen(false)}
        onRepostWithComment={() => setCommentOpen(true)}
      />
    </View>
  );
}

// ─── Vertical paging reel feed ────────────────────────────────────────────────
function ReelFeedPlayer({ reels, initialIndex, onBack, token }) {
  const { top } = useSafeAreaInsets();
  const [activeIndex, setActiveIndex] = useState(initialIndex);

  const onViewableItemsChanged = useRef(({ viewableItems }) => {
    const first = viewableItems.find((v) => v.isViewable);
    if (first) setActiveIndex(first.index);
  });

  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 75 });

  const getItemLayout = useCallback((_, index) => ({
    length: SCREEN_H, offset: SCREEN_H * index, index,
  }), []);

  return (
    <View style={{ flex: 1, backgroundColor: '#000' }}>
      <FlatList
        data={reels}
        keyExtractor={(item) => `rf-${item.id}`}
        renderItem={({ item, index }) => (
          <ReelFeedItem item={item} isActive={index === activeIndex} token={token} />
        )}
        pagingEnabled
        showsVerticalScrollIndicator={false}
        getItemLayout={getItemLayout}
        initialScrollIndex={initialIndex}
        onViewableItemsChanged={onViewableItemsChanged.current}
        viewabilityConfig={viewabilityConfig.current}
        removeClippedSubviews
        windowSize={3}
        maxToRenderPerBatch={2}
        initialNumToRender={2}
      />

      {/* Fixed back button + badge */}
      <View style={[rf.topBar, { paddingTop: top + 8 }]} pointerEvents="box-none">
        <TouchableOpacity style={rf.backBtn} onPress={onBack} activeOpacity={0.85}>
          <Ionicons name="arrow-back" size={22} color={WHITE} />
        </TouchableOpacity>
        <View style={styles.tvBadge}>
          <Ionicons name="tv" size={11} color={ACCENT} style={{ marginRight: 4 }} />
          <Text style={styles.tvBadgeTxt}>HafrikTV</Text>
        </View>
        <View style={{ width: 38 }} />
      </View>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// VIDEO LAYOUT — scrollable 16:9, engagement, related
// ─────────────────────────────────────────────────────────────────────────────
function VideoLayout({ video, related, onBack, onRelatedPress, token }) {
  const { top, bottom } = useSafeAreaInsets();
  const postId = video.id;

  const [liked,       setLiked]       = useState(false);
  const [likeCount,   setLikeCount]   = useState(Number(video.likes ?? 0));
  const [likeLoading, setLikeLoading] = useState(false);
  const [commentOpen, setCommentOpen] = useState(false);
  const [repostOpen,  setRepostOpen]  = useState(false);

  const handleLike = useCallback(async () => {
    if (likeLoading) return;
    setLikeLoading(true);
    const was = liked;
    setLiked(!was);
    setLikeCount((c) => was ? Math.max(0, c - 1) : c + 1);
    try { await toggleLike(postId, token); }
    catch { setLiked(was); setLikeCount((c) => was ? c + 1 : Math.max(0, c - 1)); }
    finally { setLikeLoading(false); }
  }, [liked, likeLoading, postId, token]);

  const direct = useDirectPlayer(video.is_youtube ? null : video.video_url);

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      <View style={[styles.topBar, { paddingTop: top + 6 }]}>
        <TouchableOpacity style={styles.backBtn} onPress={onBack} activeOpacity={0.8}>
          <Ionicons name="arrow-back" size={22} color={WHITE} />
        </TouchableOpacity>
        <View style={styles.tvBadge}>
          <Ionicons name="tv" size={11} color={ACCENT} style={{ marginRight: 4 }} />
          <Text style={styles.tvBadgeTxt}>HafrikTV</Text>
        </View>
        <View style={{ width: 38 }} />
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: bottom + 28 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ marginTop: top + 52 }}>
          {video.is_youtube ? (
            <View style={styles.videoWrap}>
              {(() => {
                const videoId = extractYouTubeId(video.video_url);
                if (!videoId) return (
                  <View style={[StyleSheet.absoluteFill, { justifyContent: 'center', alignItems: 'center', backgroundColor: BG_CARD }]}>
                    <Ionicons name="alert-circle-outline" size={36} color={WHITE_MUTED} />
                  </View>
                );
                return (
                  <YoutubeIframe
                    videoId={videoId}
                    width={W}
                    height={VIDEO_H}
                    play
                    webViewProps={{ allowsInlineMediaPlayback: true, mediaPlaybackRequiresUserAction: false }}
                    initialPlayerParams={{ rel: 0, modestbranding: 1, controls: 1 }}
                  />
                );
              })()}
            </View>
          ) : (
            <Pressable style={styles.videoWrap} onPress={direct.tap}>
              <VideoView
                player={direct.player}
                style={StyleSheet.absoluteFill}
                contentFit="contain"
                nativeControls={false}
                fullscreenOptions={{ isFullscreen: false }}
              />
              {direct.isLoading ? (
                <View style={styles.loaderWrap} pointerEvents="none">
                  <View style={styles.loaderCircle}>
                    <Ionicons name="tv-outline" size={24} color={ACCENT} />
                  </View>
                </View>
              ) : null}
              {direct.overlay ? (
                <Animated.View style={[StyleSheet.absoluteFill, { opacity: direct.opacity }]} pointerEvents="box-none">
                  <Pressable style={styles.centreBtn} onPress={direct.toggle}>
                    <View style={styles.centreCircle}>
                      <Ionicons
                        name={direct.paused ? 'play' : 'pause'}
                        size={28} color={WHITE}
                        style={direct.paused ? { paddingLeft: 3 } : undefined}
                      />
                    </View>
                  </Pressable>
                </Animated.View>
              ) : null}
            </Pressable>
          )}
        </View>

        <View style={styles.infoBlock}>
          {video.title ? <Text style={styles.videoTitle}>{video.title}</Text> : null}
          <ExpandableDesc text={video.description} />
          {video.views > 0 ? (
            <View style={styles.viewsRow}>
              <Ionicons name="eye-outline" size={13} color={LIGHT_MUTED} />
              <Text style={styles.viewsTxt}>{fmtCount(video.views)} views</Text>
            </View>
          ) : null}
        </View>

        {/* Engagement */}
        <View style={eng.row}>
          <TouchableOpacity style={eng.btn} onPress={handleLike} disabled={likeLoading}>
            {likeLoading
              ? <ActivityIndicator size="small" color={ACCENT} />
              : <Ionicons name={liked ? 'heart' : 'heart-outline'} size={22} color={liked ? '#ff4d6d' : LIGHT_MUTED} />}
            {likeCount > 0
              ? <Text style={[eng.count, liked && { color: '#ff4d6d' }]}>{fmtCount(likeCount)}</Text>
              : null}
          </TouchableOpacity>
          <View style={eng.divider} />
          <TouchableOpacity style={eng.btn} onPress={() => setCommentOpen(true)}>
            <Ionicons name="chatbubble-outline" size={21} color={LIGHT_MUTED} />
            {video.comments > 0 ? <Text style={eng.count}>{fmtCount(video.comments)}</Text> : null}
          </TouchableOpacity>
          <View style={eng.divider} />
          <TouchableOpacity style={eng.btn} onPress={() => setRepostOpen(true)}>
            <Ionicons name="repeat-outline" size={23} color={LIGHT_MUTED} />
            {video.shares > 0 ? <Text style={eng.count}>{fmtCount(video.shares)}</Text> : null}
          </TouchableOpacity>
        </View>

        {/* Related videos */}
        {related.length > 0 ? (
          <View style={styles.relatedSection}>
            <View style={styles.relatedHeader}>
              <Ionicons name="play-circle-outline" size={16} color={ACCENT} style={{ marginRight: 6 }} />
              <Text style={styles.relatedTitle}>Related Videos</Text>
            </View>
            <View style={styles.relatedList}>
              {related.map((item) => (
                <RelatedRow key={String(item.id)} item={item} onPress={onRelatedPress} />
              ))}
            </View>
          </View>
        ) : null}
      </ScrollView>

      <CommentSheet visible={commentOpen} postId={postId} token={token} onClose={() => setCommentOpen(false)} />
      <RepostModal
        visible={repostOpen}
        postId={postId}
        onClose={() => setRepostOpen(false)}
        onRepostWithComment={() => setCommentOpen(true)}
      />
    </View>
  );
}

// ─── Related video row ────────────────────────────────────────────────────────
function RelatedRow({ item, onPress }) {
  return (
    <TouchableOpacity style={rel.row} onPress={() => onPress(item)} activeOpacity={0.78}>
      <View style={rel.thumb}>
        {item.thumbnail ? (
          <ExpoImage source={{ uri: item.thumbnail }} style={StyleSheet.absoluteFill} contentFit="cover" cachePolicy="memory-disk" transition={200} />
        ) : null}
        <LinearGradient colors={['transparent', 'rgba(0,0,0,0.55)']} style={StyleSheet.absoluteFill} />
        <View style={rel.play}>
          <Ionicons name="play" size={10} color={WHITE} style={{ paddingLeft: 1 }} />
        </View>
        {item.is_youtube ? (
          <View style={rel.ytBadge}>
            <Ionicons name="logo-youtube" size={8} color="#FF0000" />
          </View>
        ) : null}
        {item.type === 'reel' ? (
          <View style={rel.reelBadge}><Text style={rel.reelBadgeTxt}>REEL</Text></View>
        ) : null}
      </View>
      <View style={{ flex: 1 }}>
        <Text style={rel.title} numberOfLines={2}>
          {item.title || item.description?.slice(0, 60) || 'Untitled'}
        </Text>
        <View style={rel.meta}>
          <Ionicons name="eye-outline" size={10} color={LIGHT_MUTED} />
          <Text style={rel.metaTxt}>{fmtCount(item.views)} views</Text>
          {item.time ? <><Text style={{ color: LIGHT_MUTED, fontSize: 10 }}> · </Text><Text style={rel.metaTxt}>{fmtTime(item.time)}</Text></> : null}
        </View>
      </View>
      <Ionicons name="chevron-forward" size={13} color={LIGHT_MUTED} style={{ alignSelf: 'center' }} />
    </TouchableOpacity>
  );
}

// ─── Entry Point ──────────────────────────────────────────────────────────────
export default function HafrikTVPlayerScreen() {
  const navigation = useNavigation();
  const route      = useRoute();
  const { token }  = useAuth();

  const video      = route.params?.video      ?? {};
  const related    = route.params?.related    ?? [];
  const reels      = route.params?.reels      ?? null;
  const reelIndex  = route.params?.reelIndex  ?? 0;

  const handleBack = useCallback(() => navigation.goBack(), [navigation]);

  const handleRelatedPress = useCallback((item) => {
    const newRelated = related.filter((v) => v.id !== item.id);
    navigation.replace('HafrikTVPlayer', { video: item, related: newRelated });
  }, [navigation, related]);

  // Reel → vertical swipe feed
  if (video.type === 'reel' && Array.isArray(reels) && reels.length > 0) {
    return (
      <ReelFeedPlayer
        reels={reels}
        initialIndex={reelIndex}
        onBack={handleBack}
        token={token}
      />
    );
  }

  // Normal video → scrollable layout
  return (
    <VideoLayout
      video={video}
      related={related}
      onBack={handleBack}
      onRelatedPress={handleRelatedPress}
      token={token}
    />
  );
}

// ─── Reel feed styles ──────────────────────────────────────────────────────────
const rf = StyleSheet.create({
  item: { width: W, height: SCREEN_H, backgroundColor: '#000' },
  loader: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center' },
  topGrad: { position: 'absolute', top: 0, left: 0, right: 0, height: 120 },
  bottomGrad: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 240 },
  topBar: {
    position: 'absolute', top: 0, left: 0, right: 0,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingBottom: 10,
    zIndex: 30,
  },
  backBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center', justifyContent: 'center',
  },
  sideBar: {
    position: 'absolute', right: 14,
    alignItems: 'center', gap: 22, zIndex: 20,
  },
  sideBtn: { alignItems: 'center', gap: 4 },
  sideCount: {
    color: WHITE, fontSize: 12, fontFamily: 'WorkSans_600SemiBold',
    textShadowColor: 'rgba(0,0,0,0.8)', textShadowRadius: 4,
    textShadowOffset: { width: 0, height: 1 },
  },
  bottomInfo: {
    position: 'absolute', bottom: 0, left: 16, right: 0, zIndex: 20,
  },
  title: {
    color: WHITE, fontSize: 15, fontFamily: 'ReadexPro_600SemiBold',
    lineHeight: 21, marginBottom: 4,
    textShadowColor: 'rgba(0,0,0,0.6)', textShadowRadius: 4,
    textShadowOffset: { width: 0, height: 1 },
  },
  reelDesc: {
    color: WHITE_DIM, fontSize: 13, fontFamily: 'WorkSans_400Regular', lineHeight: 18,
    textShadowColor: 'rgba(0,0,0,0.6)', textShadowRadius: 4,
    textShadowOffset: { width: 0, height: 1 },
  },
  views: {
    color: WHITE_DIM, fontSize: 11, fontFamily: 'WorkSans_400Regular',
    textShadowColor: 'rgba(0,0,0,0.5)', textShadowRadius: 3,
    textShadowOffset: { width: 0, height: 1 },
  },
});

// needed by ExpandableDesc dark mode
const vl = rf;

// ─── Comment sheet styles ──────────────────────────────────────────────────────
const cs = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' },
  sheet: {
    backgroundColor: BG_CARD,
    borderTopLeftRadius: 22, borderTopRightRadius: 22,
    paddingTop: 12, paddingHorizontal: 16,
    borderTopWidth: 1, borderTopColor: BORDER,
  },
  handle: {
    width: 36, height: 4, borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignSelf: 'center', marginBottom: 14,
  },
  title: { color: WHITE, fontSize: 16, fontFamily: 'ReadexPro_600SemiBold', textAlign: 'center', marginBottom: 16 },
  commentRow: { flexDirection: 'row', gap: 10, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: BORDER },
  commentAvatar: { width: 30 },
  commentUser: { color: WHITE, fontSize: 12, fontFamily: 'WorkSans_600SemiBold', marginBottom: 2 },
  commentText: { color: WHITE_DIM, fontSize: 13, fontFamily: 'WorkSans_400Regular', lineHeight: 18 },
  inputRow: { flexDirection: 'row', alignItems: 'flex-end', marginTop: 12, gap: 10 },
  input: {
    flex: 1, backgroundColor: BG_ROW,
    borderRadius: 12, borderWidth: 1, borderColor: BORDER,
    paddingHorizontal: 14, paddingVertical: 10,
    color: WHITE, fontSize: 13, fontFamily: 'WorkSans_400Regular', maxHeight: 100,
  },
  sendBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: ACCENT, alignItems: 'center', justifyContent: 'center' },
});

// ─── Engagement row styles ─────────────────────────────────────────────────────
const eng = StyleSheet.create({
  row: {
    flexDirection: 'row', alignItems: 'center',
    marginHorizontal: 16, marginTop: 4, marginBottom: 4,
    backgroundColor: LIGHT_CARD, borderRadius: 18, borderWidth: 1, borderColor: LIGHT_BORDER, overflow: 'hidden',
  },
  btn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, gap: 6 },
  count: { color: LIGHT_MUTED, fontSize: 13, fontFamily: 'WorkSans_500Medium' },
  divider: { width: 1, height: 24, backgroundColor: LIGHT_BORDER },
});

// ─── Related row styles ────────────────────────────────────────────────────────
const rel = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-start', padding: 12, borderBottomWidth: 1, borderBottomColor: LIGHT_BORDER, gap: 12 },
  thumb: { width: THUMB_W, height: THUMB_H, borderRadius: 8, backgroundColor: BG_ROW, overflow: 'hidden', justifyContent: 'center', alignItems: 'center', flexShrink: 0 },
  play: { width: 22, height: 22, borderRadius: 11, backgroundColor: 'rgba(0,0,0,0.55)', borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.5)', alignItems: 'center', justifyContent: 'center' },
  ytBadge: { position: 'absolute', top: 5, right: 5, backgroundColor: 'rgba(0,0,0,0.65)', borderRadius: 3, padding: 2 },
  reelBadge: { position: 'absolute', top: 5, left: 5, backgroundColor: 'rgba(31,142,147,0.75)', borderRadius: 3, paddingHorizontal: 4, paddingVertical: 1 },
  reelBadgeTxt: { color: WHITE, fontSize: 7, fontFamily: 'WorkSans_700Bold', letterSpacing: 0.5 },
  title: { color: LIGHT_TEXT, fontSize: 13, fontFamily: 'WorkSans_600SemiBold', lineHeight: 18 },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  metaTxt: { color: LIGHT_MUTED, fontSize: 11, fontFamily: 'WorkSans_400Regular' },
});

// ─── Shared styles ─────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: LIGHT_BG },
  topBar: {
    position: 'absolute', top: 0, left: 0, right: 0, zIndex: 20,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingBottom: 10,
    backgroundColor: 'rgba(7,30,33,0.96)', borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.12)',
  },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(0,0,0,0.3)', alignItems: 'center', justifyContent: 'center' },
  tvBadge: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(31,142,147,0.2)',
    borderWidth: 1, borderColor: ACCENT,
    borderRadius: 4, paddingHorizontal: 8, paddingVertical: 3,
  },
  tvBadgeTxt: { color: ACCENT, fontSize: 11, fontFamily: 'WorkSans_600SemiBold', letterSpacing: 0.5 },
  videoWrap: { width: W, height: VIDEO_H, backgroundColor: '#000', overflow: 'hidden' },
  loaderWrap: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center' },
  loaderCircle: { width: 60, height: 60, borderRadius: 30, backgroundColor: 'rgba(13,45,50,0.85)', borderWidth: 1, borderColor: BORDER, alignItems: 'center', justifyContent: 'center' },
  centreBtn: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'center', alignItems: 'center' },
  centreCircle: { width: 60, height: 60, borderRadius: 30, backgroundColor: 'rgba(7,30,33,0.65)', borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.35)', alignItems: 'center', justifyContent: 'center' },
  infoBlock: {
    marginHorizontal: 16,
    marginTop: 14,
    marginBottom: 8,
    backgroundColor: LIGHT_CARD,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: LIGHT_BORDER,
    paddingHorizontal: 16,
    paddingTop: 15,
    paddingBottom: 12,
  },
  videoTitle: { color: LIGHT_TEXT, fontSize: 18, fontFamily: 'ReadexPro_600SemiBold', lineHeight: 25, marginBottom: 7 },
  videoDesc: { color: LIGHT_MUTED, fontSize: 13, fontFamily: 'WorkSans_400Regular', lineHeight: 19 },
  viewsRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  viewsTxt: { color: LIGHT_MUTED, fontSize: 12, fontFamily: 'WorkSans_400Regular' },
  relatedSection: { marginTop: 16 },
  relatedHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, marginBottom: 10 },
  relatedTitle: { color: LIGHT_TEXT, fontSize: 16, fontFamily: 'ReadexPro_600SemiBold' },
  relatedList: { marginHorizontal: 16, backgroundColor: LIGHT_CARD, borderRadius: 20, borderWidth: 1, borderColor: LIGHT_BORDER, overflow: 'hidden' },
});
