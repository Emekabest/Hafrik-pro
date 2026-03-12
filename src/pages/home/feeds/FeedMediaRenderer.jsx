/**
 * FeedMediaRenderer
 *
 * Threads-style media renderer — replaces PostContent in FeedCard.
 *
 * Images
 *   1  → full-width, dynamic aspect ratio
 *   2  → 2-column grid
 *   3  → 2-column top row + 1 full-width bottom row
 *   4+ → 2×2 grid (last cell shows +N overlay when more than 4)
 *
 * Videos  → expo-av; auto-pause/play driven by isVisible prop
 * Reels   → poster thumbnail with play-button overlay (tap navigates to Reels screen)
 * Special types (shared, article, poll, product, event, job, link, media)
 *           → delegated to existing dedicated renderers
 *
 * Performance
 *   • No nested ScrollView
 *   • All sub-components are memo()
 *   • Images use expo-image (lazy + disk cache)
 *   • Video player only plays the visible item (isVisible = from onViewableItemsChanged)
 */

import React, { memo, useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  StyleSheet,
  Dimensions,
  ActivityIndicator,
  Text,
  TouchableOpacity,
  Animated,
} from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';
import { Image as ExpoImage } from 'expo-image';
import { VideoView, useVideoPlayer } from 'expo-video';
import { useEvent } from 'expo';
import { Ionicons } from '@expo/vector-icons';
import { useIsFocused } from '@react-navigation/native';
import useStore from '../../../repository/store';
import VideoManager from '../../../helpers/videomanager';

// Existing dedicated renderers — kept as-is
import SharedContent      from './feedcardproperties/sharedcontent';
import ProductContent     from './feedcardproperties/productcontent';
import ArticlePostContent from './feedcardproperties/articlecontent';
import PollPostContent    from './feedcardproperties/pollcontent';
import EventPostContent   from './feedcardproperties/eventpostcontent';
import JobPostContent     from './feedcardproperties/jobpostcontent';
import LinkContent        from './feedcardproperties/linkcontent';
import MediaLinkContent   from './feedcardproperties/medialinkcontent';
import AppDetails         from '../../../helpers/appdetails';
import { Colors } from '../../../theme/colors';

const withOpacity = (hex, opacity) => {
  const normalized = (hex || "").replace("#", "");
  const alpha = Math.round(Math.max(0, Math.min(1, opacity)) * 255).toString(16).padStart(2, "0");
  return `#${normalized}${alpha}`;
};


// ─── Layout constants ─────────────────────────────────────────────────────────
const { width: SCREEN_W } = Dimensions.get('window');
// Feed card: container h-pad 32 + leftCol 44 + col gap 12 = 88
const MEDIA_W  = SCREEN_W - 88;
const GAP      = 3;
const CELL_W   = (MEDIA_W - GAP) / 2;
const CELL_H   = Math.round(CELL_W * 0.9);    // 2-col / 4-grid tile height (square-ish)
const BOTTOM_H = Math.round(MEDIA_W * 0.45);  // 3-image layout: bottom full-width row

// Compact reel thumbnail (Threads-style portrait card shown beside caption)
const REEL_THUMB_W = Math.round(MEDIA_W * 0.36); // ~35 % of right column
const REEL_THUMB_H = Math.round(REEL_THUMB_W * 16 / 9); // true 9:16 portrait

const ACCENT = Colors.primary;
const BRAND  = Colors.primaryDark;

// ─── VideoPlayer (expo-video) ─────────────────────────────────────────────────
// Plays when isVisible=true. Height adapts to the video's natural aspect ratio.
// Custom play/pause/mute buttons intercept touches so they don't bubble to the
// parent TouchableOpacity in FeedCard (which would otherwise open the post).
const VideoPlayer = memo(({ item, isVisible }) => {
  const [videoH,  setVideoH]  = useState(Math.round(MEDIA_W * 9 / 16));
  const [isMuted, setIsMuted] = useState(false);

  const player = useVideoPlayer({ uri: item.video_url }, p => {
    if (p) { p.loop = false; }
  });

  const { isPlaying } = useEvent(player, 'playingChange', { isPlaying: player?.playing ?? false });
  const { status }    = useEvent(player, 'statusChange',  { status: player?.status ?? 'idle' });
  const isLoaded = status === 'readyToPlay';

  useEffect(() => {
    if (!player || !isLoaded) return;
    try {
      if (isVisible) { player.play(); }
      else           { player.pause(); }
    } catch (_) {}
  }, [isVisible, isLoaded, player]);

  const togglePlay = useCallback(() => {
    if (!player) return;
    try { isPlaying ? player.pause() : player.play(); } catch (_) {}
  }, [isPlaying, player]);

  const toggleMute = useCallback(() => {
    if (!player) return;
    const next = !isMuted;
    try { player.muted = next; } catch (_) {}
    setIsMuted(next);
  }, [isMuted, player]);

  const handleVideoSizeChange = useCallback(({ width, height }) => {
    if (width && height) {
      const ratio = height / width;
      const capped = Math.min(Math.max(ratio, 9 / 16), 4 / 3);
      setVideoH(Math.round(MEDIA_W * capped));
    }
  }, []);

  return (
    <View style={[styles.videoWrap, { height: videoH }]}>
      <VideoView
        player={player}
        style={StyleSheet.absoluteFillObject}
        contentFit="contain"
        nativeControls={false}
        onVideoSizeChange={handleVideoSizeChange}
      />
      {!isLoaded && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={ACCENT} />
        </View>
      )}
      {/* Play / mute controls — touch is consumed here, never bubbles to parent */}
      <View style={styles.controlBar} pointerEvents="box-none">
        <TouchableOpacity onPress={togglePlay} style={styles.controlBtn} activeOpacity={0.7}>
          <Ionicons name={isPlaying ? 'pause' : 'play'} size={15} color={Colors.white} />
        </TouchableOpacity>
        <TouchableOpacity onPress={toggleMute} style={styles.controlBtn} activeOpacity={0.7}>
          <Ionicons name={isMuted ? 'volume-mute' : 'volume-high'} size={15} color={Colors.white} />
        </TouchableOpacity>
      </View>
    </View>
  );
});

// ─── FeedReelPlayer (expo-video) ──────────────────────────────────────────────
// Autoplay reel in feed. Custom controls so play/pause/mute never opens the post.
// Tracks position so PostDetail can resume from where feed left off.
// NOTE: ALL hooks are called unconditionally before any early return.
const FeedReelPlayer = memo(({ item, isVisible, feedId }) => {
  const [isMuted, setIsMuted] = useState(false);

  const safeThumbnail = item.thumbnail?.startsWith('http') ? item.thumbnail : null;
  const safeVideoUrl  = item.video_url?.startsWith('http')  ? item.video_url  : null;

  // useVideoPlayer accepts null safely — no invalid source passed to native layer
  const player = useVideoPlayer(safeVideoUrl ? { uri: safeVideoUrl } : null, p => {
    if (p && safeVideoUrl) { p.loop = false; }
  });

  const { isPlaying }   = useEvent(player, 'playingChange', { isPlaying: player?.playing ?? false });
  const { status }      = useEvent(player, 'statusChange',  { status: player?.status ?? 'idle' });
  const { currentTime } = useEvent(player, 'timeUpdate',    { currentTime: 0 });
  const isLoaded = status === 'readyToPlay';

  // Track position for PostDetail resume
  useEffect(() => {
    if (feedId && currentTime != null) {
      VideoManager.setPosition(feedId, currentTime * 1000); // s → ms
    }
  }, [feedId, currentTime]);

  useEffect(() => {
    if (!player || !isLoaded || !safeVideoUrl) return;
    try {
      if (isVisible) { player.play(); }
      else           { player.pause(); }
    } catch (_) {}
  }, [isVisible, isLoaded, player, safeVideoUrl]);

  const togglePlay = useCallback(() => {
    if (!player) return;
    try { isPlaying ? player.pause() : player.play(); } catch (_) {}
  }, [isPlaying, player]);

  const toggleMute = useCallback(() => {
    if (!player) return;
    const next = !isMuted;
    try { player.muted = next; } catch (_) {}
    setIsMuted(next);
  }, [isMuted, player]);

  // No valid URL — static thumbnail fallback (after all hooks)
  if (!safeVideoUrl) {
    return (
      <View style={styles.reelThumb}>
        {safeThumbnail
          ? <ExpoImage source={{ uri: safeThumbnail }} style={StyleSheet.absoluteFillObject} contentFit="cover" cachePolicy="memory-disk" />
          : <View style={[StyleSheet.absoluteFillObject, { backgroundColor: Colors.neutral900 }]} />
        }
        <View style={styles.reelPlayCircle}>
          <View style={styles.reelPlayBg}><Ionicons name="play" size={20} color={Colors.white} /></View>
        </View>
        <View style={styles.reelBadge}>
          <Ionicons name="flame" size={10} color={Colors.orange} />
          <Text style={styles.reelBadgeText}>REEL</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.reelThumb}>
      <VideoView
        player={player}
        style={StyleSheet.absoluteFillObject}
        contentFit="cover"
        nativeControls={false}
      />
      {!isLoaded && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="small" color={Colors.white} />
        </View>
      )}
      {/* REEL badge */}
      <View style={styles.reelBadge}>
        <Ionicons name="flame" size={10} color={Colors.orange} />
        <Text style={styles.reelBadgeText}>REEL</Text>
      </View>
      {/* Custom controls */}
      <View style={styles.controlBar} pointerEvents="box-none">
        <TouchableOpacity onPress={togglePlay} style={styles.controlBtn} activeOpacity={0.7}>
          <Ionicons name={isPlaying ? 'pause' : 'play'} size={15} color={Colors.white} />
        </TouchableOpacity>
        <TouchableOpacity onPress={toggleMute} style={styles.controlBtn} activeOpacity={0.7}>
          <Ionicons name={isMuted ? 'volume-mute' : 'volume-high'} size={15} color={Colors.white} />
        </TouchableOpacity>
      </View>
    </View>
  );
});

// ─── Carousel — all photos slide one-by-one, natural aspect ratio ─────────────
const MAX_H_RATIO = 16 / 9;
const MIN_H_RATIO = 0.5;

// Module-level size cache: persists for the lifetime of the JS bundle
const sizeCache = {};

const DEFAULT_H = Math.round(MEDIA_W * 0.8);

function calcHeight(w, h) {
  if (!w || !h) return DEFAULT_H;
  const ratio   = h / w;
  const clamped = Math.min(Math.max(ratio, MIN_H_RATIO), MAX_H_RATIO);
  return Math.round(MEDIA_W * clamped);
}

const ImageGrid = memo(({ media }) => {
  const n = media.length;
  if (n === 0) return null;

  const firstUrl = media[0]?.url;

  // Lazy-init from cache so already-seen images render immediately at the right height
  const initH = (firstUrl && sizeCache[firstUrl]) || DEFAULT_H;
  const [imgH, setImgH] = useState(initH);
  // Animated value drives the container height — smooth transition on first reveal
  const animH = useRef(new Animated.Value(initH)).current;

  const [activeIndex, setActiveIndex] = useState(0);
  const scrollRef = useRef(null);

  // Called by ExpoImage when the first image finishes decoding — provides real dimensions
  // with zero extra network round-trips. Only fires once per unique URL (cache guard).
  const handleFirstLoad = useCallback(({ source }) => {
    if (!firstUrl || sizeCache[firstUrl]) return;
    const px = calcHeight(source?.width, source?.height);
    sizeCache[firstUrl] = px;
    setImgH(px);
    Animated.timing(animH, {
      toValue:         px,
      duration:        220,
      useNativeDriver: false,
    }).start();
  }, [firstUrl, animH]);

  const handleScroll = useCallback((e) => {
    const idx = Math.round(e.nativeEvent.contentOffset.x / MEDIA_W);
    setActiveIndex(Math.max(0, Math.min(idx, n - 1)));
  }, [n]);

  return (
    <View>
      {/* Animated container — height grows smoothly on first load */}
      <Animated.View style={{ height: animH, borderRadius: 12, overflow: 'hidden' }}>
        <ScrollView
          ref={scrollRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          decelerationRate="fast"
          scrollEventThrottle={16}
          onScroll={handleScroll}
          style={{ flex: 1 }}
        >
          {media.map((item, i) => (
            <ExpoImage
              key={i}
              source={{ uri: item.url }}
              style={{ width: MEDIA_W, height: imgH, backgroundColor: Colors.neutral150 }}
              contentFit="cover"
              cachePolicy="memory-disk"
              transition={180}
              onLoad={i === 0 ? handleFirstLoad : undefined}
            />
          ))}
        </ScrollView>
      </Animated.View>

      {/* Counter badge top-right + dots at bottom */}
      {n > 1 && (
        <>
          <View style={styles.slideCounter}>
            <Text style={styles.slideCounterTxt}>{activeIndex + 1}/{n}</Text>
          </View>
          <View style={styles.dotsRow}>
            {media.map((_, i) => (
              <View key={i} style={[styles.dot, i === activeIndex && styles.dotActive]} />
            ))}
          </View>
        </>
      )}
    </View>
  );
});

// ─── FeedMediaRenderer ────────────────────────────────────────────────────────
const FeedMediaRenderer = ({ feed, isVisible }) => {
  const screenFocused = useIsFocused();
  // Videos should only play when both visible in viewport AND screen is focused
  const effectiveVisible = isVisible && screenFocused;

  const tabletMode = useStore(state => state.tabletMode);
  const feedWidth  = useStore(state => state.feedWidth);

  const containerW = tabletMode && feedWidth > 0 ? feedWidth : 0;
  const defaultSizes = AppDetails.feedSliderSizes;

  // ── Special types: delegate to existing renderers ────────────────────────
  if (feed.type === 'shared' && feed.shared_post) {
    return (
      <SharedContent
        post={feed.shared_post}
        parentFeedId={feed.id}
        containerWidth={containerW}
        isVisible={effectiveVisible}
      />
    );
  }

  if (feed.type === 'product') {
    return (
      <ProductContent
        feed={feed}
        imageWidth={defaultSizes.imageWidth}
        leftOffset={defaultSizes.leftOffset}
        rightOffset={defaultSizes.rightOffset}
        containerWidth={containerW}
      />
    );
  }

  if (feed.type === 'article') {
    return (
      <ArticlePostContent
        feed={feed}
        imageWidth={defaultSizes.imageWidth}
        leftOffset={defaultSizes.leftOffset}
        rightOffset={defaultSizes.rightOffset}
      />
    );
  }

  if (feed.type === 'poll')        return <PollPostContent feed={feed} />;
  if (feed.type === 'event_cover') return <EventPostContent context={feed.context} />;
  if (feed.type === 'job')         return <JobPostContent feed={feed} />;
  if (feed.type === 'link')        return <LinkContent feed={feed} />;
  if (feed.type === 'media')       return <MediaLinkContent text={feed.text} />;

  // ── Video / Reel ─────────────────────────────────────────────────────────
  if (feed.media?.length > 0) {
    const isVideo = feed.type === 'video' || feed.type === 'reel';
    if (isVideo) {
      const item = feed.media[0];
      if (!item?.video_url) return null;
      // Guard: never render ph:// or other non-remote video URLs
      const safeVideoUrl = item.video_url.startsWith('http') ? item.video_url : null;
      if (!safeVideoUrl) return null;
      // Reels: autoplay portrait player in feed (tracks position for post continuation)
      if (feed.type === 'reel') return <FeedReelPlayer item={item} isVisible={effectiveVisible} feedId={feed.id} />
      // Videos get a full expo-av player (auto-pause via effectiveVisible)
      return <VideoPlayer item={{ ...item, video_url: safeVideoUrl }} isVisible={effectiveVisible} />;
    }

    // ── Photos ──────────────────────────────────────────────────────────
    const validMedia = feed.media.filter(m => m?.url);
    if (validMedia.length > 0) {
      return <ImageGrid media={validMedia} />;
    }
  }

  return null;
};

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  videoWrap: {
    width: MEDIA_W,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: Colors.black,
  },

  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: withOpacity(Colors.black, 0.3),
  },

  // Translucent control pill — bottom-left of any video
  controlBar: {
    position: 'absolute',
    bottom: 10,
    left: 10,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: withOpacity(Colors.black, 0.55),
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 6,
    gap: 10,
    zIndex: 10,
  },
  controlBtn: {
    padding: 3,
  },

  // Fills reelMediaWrapper container — overall size controlled by wrapper in feedcard
  reelThumb: {
    width: '100%',
    height: '100%',
    overflow: 'hidden',
    backgroundColor: Colors.black,
  },
  reelPlayCircle: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  reelPlayBg: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: withOpacity(Colors.black, 0.52),
    borderWidth: 1.5,
    borderColor: withOpacity(Colors.white, 0.35),
    justifyContent: 'center',
    alignItems: 'center',
    paddingLeft: 2, // visual centering for play icon
  },
  reelBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: withOpacity(Colors.black, 0.55),
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
  },
  reelBadgeText: {
    color: Colors.white,
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.5,
  },

  // ── Carousel dots ──────────────────────────────────────────────────────────
  dotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
    gap: 4,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: withOpacity(Colors.black, 0.18),
  },
  dotActive: {
    width: 18,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.primary,
  },

  // ── Slide counter badge (top-right) ────────────────────────────────────────
  slideCounter: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: withOpacity(Colors.black, 0.52),
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  slideCounterTxt: {
    color: Colors.white,
    fontSize: 12,
    fontWeight: '700',
  },
});

// Memo with custom comparison: only re-render if feed id, type, media count, or visibility changes
export default memo(FeedMediaRenderer, (prev, next) => {
  if (prev.feed.id                          !== next.feed.id)          return false;
  if (prev.feed.type                        !== next.feed.type)        return false;
  if (prev.isVisible                        !== next.isVisible)        return false;
  if ((prev.feed.media?.length ?? 0)        !== (next.feed.media?.length ?? 0)) return false;
  if (prev.feed.shared_post?.id             !== next.feed.shared_post?.id)      return false;
  return true;
});
