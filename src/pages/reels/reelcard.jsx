/**
 * ReelCard – full-screen TikTok-style reel card.
 *
 * Props:
 *   reel      {object}  – reel data from API
 *   height    {number}  – exact height of the card (== FlatList container height)
 */
import React, { memo, useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  StyleSheet,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../AuthContext';
import useStore from '../../repository/store';
import ReelMedia from './reelmedia';
import ReelInteractionContainer from './reelinteractioncontainer';
import ReelGestures from './ReelGestures';
import ReelProgressBar from './ReelProgressBar';
import HeartBurst from './HeartBurst';
import { useDoubleTap } from './useDoubleTap';
import { recordWatch } from './reelsApi';
import { Colors } from '../../theme/colors';

const withOpacity = (hex, opacity) => {
  const normalized = (hex || '').replace('#', '');
  const alpha = Math.round(Math.max(0, Math.min(1, opacity)) * 255)
    .toString(16)
    .padStart(2, '0');
  return `#${normalized}${alpha}`;
};

const { height: SCREEN_H } = Dimensions.get('window');

const ReelCard = ({ reel, height = SCREEN_H, onSwipeMode }) => {
  const { token } = useAuth();
  const { top: safeTop } = useSafeAreaInsets();
  const postId = reel?.post_id ?? reel?.id;

  // ── Active state (Zustand – only this card re-renders on change) ──────────
  const currentReelId = useStore((s) => s.currentReel?.reelId);
  const isActive = currentReelId === postId;

  const interactionRef    = useRef(null);
  const progress          = useRef(new Animated.Value(0)).current;
  const [heartKey,  setHeartKey]  = useState('');
  const [isPaused,  setIsPaused]  = useState(false);
  const [pauseIcon, setPauseIcon] = useState('pause-circle');
  const [isMuted,   setIsMuted]   = useState(false);
  const [playback,  setPlayback]  = useState({ progress: 0, currentTime: 0 });
  const seekRef = useRef(null);

  // Mute icon scale bounce
  const muteScale = useRef(new Animated.Value(1)).current;
  // Centre pause/play indicator
  const indicatorOpacity = useRef(new Animated.Value(0)).current;
  const indicatorScale   = useRef(new Animated.Value(0.6)).current;

  // Reset pause state when this reel becomes active
  const prevIsActiveRef = useRef(false);
  useEffect(() => {
    if (isActive && !prevIsActiveRef.current) setIsPaused(false);
    prevIsActiveRef.current = isActive;
  }, [isActive]);

  // ── Watch-time & view tracking ───────────────────────────────────────────
  // viewFiredRef: ensures recordWatch is called at most once per playback session.
  // Resets each time this reel becomes active (new session).
  const viewFiredRef = useRef(false);
  const prevIsActiveForViewRef = useRef(false);
  useEffect(() => {
    if (isActive && !prevIsActiveForViewRef.current) {
      // Reel just became active — fresh session, allow one view recording
      viewFiredRef.current = false;
    }
    prevIsActiveForViewRef.current = isActive;
  }, [isActive]);


  // ── Centre pause/play flash indicator ────────────────────────────────────
  const showIndicator = useCallback((icon) => {
    setPauseIcon(icon);
    indicatorOpacity.stopAnimation();
    indicatorScale.stopAnimation();
    indicatorOpacity.setValue(1);
    indicatorScale.setValue(0.65);
    Animated.parallel([
      Animated.spring(indicatorScale, {
        toValue: 1, useNativeDriver: true, tension: 140, friction: 7,
      }),
      Animated.sequence([
        Animated.delay(520),
        Animated.timing(indicatorOpacity, { toValue: 0, duration: 280, useNativeDriver: true }),
      ]),
    ]).start();
  }, [indicatorOpacity, indicatorScale]);

  // ── Double-tap → like ────────────────────────────────────────────────────
  const handleDoubleTap = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    setHeartKey(String(Date.now()));
    interactionRef.current?.triggerLike();
  }, []);

  // ── Single-tap → toggle pause / play ─────────────────────────────────────
  const handleSingleTap = useCallback(() => {
    setIsPaused((prev) => {
      const next = !prev;
      showIndicator(next ? 'pause-circle' : 'play-circle');
      return next;
    });
  }, [showIndicator]);

  // ── Mute toggle ───────────────────────────────────────────────────────────
  const handleMuteToggle = useCallback(() => {
    Animated.sequence([
      Animated.timing(muteScale, { toValue: 0.72, duration: 75, useNativeDriver: true }),
      Animated.spring(muteScale, { toValue: 1, tension: 200, friction: 6, useNativeDriver: true }),
    ]).start();
    setIsMuted((prev) => !prev);
  }, [muteScale]);

  // ── Progress bar callback ─────────────────────────────────────────────────
  const handleTimeUpdate = useCallback((ratio, currentTime = 0) => {
    const nextRatio = Math.min(1, Math.max(0, ratio));
    progress.setValue(nextRatio);
    setPlayback({ progress: nextRatio, currentTime });

    // Fire view exactly once per session after the user watches >= 2 seconds
    if (isActive && !isPaused && !viewFiredRef.current && token && postId && currentTime >= 2) {
      viewFiredRef.current = true;
      recordWatch(postId, Math.round(currentTime * 1000), token).catch(() => {});
    }
  }, [isActive, isPaused, postId, progress, token]);

  const handleSeekReady = useCallback((seek) => {
    seekRef.current = seek;
  }, []);

  const handleSeek = useCallback((ratio) => {
    const nextRatio = Math.max(0, Math.min(1, ratio));
    seekRef.current?.(nextRatio);
    progress.setValue(nextRatio);
    setPlayback((prev) => ({ ...prev, progress: nextRatio }));
  }, [progress]);

  const handlePress      = useDoubleTap(handleDoubleTap, handleSingleTap);
  const handleSwipeRight = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    onSwipeMode?.('right');
  }, [onSwipeMode]);

  const handleSwipeLeft = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    onSwipeMode?.('left');
  }, [onSwipeMode]);

  // Mute button sits below the header tabs.
  const muteBtnTop = safeTop + 78;

  return (
    <ReelGestures onSwipeRight={handleSwipeRight} onSwipeLeft={handleSwipeLeft}>
      <TouchableWithoutFeedback onPress={handlePress}>
        <View style={[styles.container, { height }]}>

          {/* ── Video ─────────────────────────────────────────────────────── */}
          <ReelMedia
            videoUrl={reel.media?.video_url}
            thumbnailUrl={reel.media?.thumbnail_url ?? reel.media?.image ?? null}
            isActive={isActive}
            isPaused={isPaused}
            isMuted={isMuted}
            onTimeUpdate={handleTimeUpdate}
            onSeekReady={handleSeekReady}
          />

          {/* ── Bottom gradient (text legibility) ────────────────────────── */}
          <LinearGradient
            colors={[
              'transparent',
              withOpacity(Colors.black, 0.15),
              withOpacity(Colors.black, 0.72),
            ]}
            style={styles.gradient}
            pointerEvents="none"
          />

          {/* ── Progress bar — bottom of screen, TikTok-style ────────────── */}
          <View style={styles.progressWrap}>
            <ReelProgressBar
              progress={playback.progress}
              onSeek={handleSeek}
            />
          </View>

          {/* ── Centre pause / play flash (auto-hides) ───────────────────── */}
          <Animated.View
            style={[
              styles.indicatorOverlay,
              { opacity: indicatorOpacity, transform: [{ scale: indicatorScale }] },
            ]}
            pointerEvents="none"
          >
            <View style={styles.indicatorCircle}>
              <Ionicons name={pauseIcon} size={58} color={withOpacity(Colors.white, 0.92)} />
            </View>
          </Animated.View>

          {/* ── Mute button — top-right, below header ────────────────────── */}
          <Animated.View
            style={[styles.muteWrap, { top: muteBtnTop, transform: [{ scale: muteScale }] }]}
          >
            <TouchableOpacity
              onPress={handleMuteToggle}
              activeOpacity={0.8}
              style={styles.muteBtn}
            >
              <Ionicons
                name={isMuted ? 'volume-mute' : 'volume-high'}
                size={16}
                color={Colors.white}
              />
            </TouchableOpacity>
          </Animated.View>

          {/* ── Heart burst on double-tap / swipe-right ──────────────────── */}
          <HeartBurst visibleKey={heartKey} />

          {/* ── Right-side engagement + left-side caption ────────────────── */}
          <ReelInteractionContainer ref={interactionRef} reel={reel} />

        </View>
      </TouchableWithoutFeedback>
    </ReelGestures>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    backgroundColor: Colors.black,
    overflow: 'hidden',
  },
  gradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '65%',
    zIndex: 2,
  },
  // Progress bar — TikTok puts it at the very bottom
  progressWrap: {
    position: 'absolute',
    bottom: 10,
    left: 0,
    right: 0,
    zIndex: 5,
  },
  // Centre play/pause flash — overlay fills screen, content is centered inside
  indicatorOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 20,
  },
  indicatorCircle: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: withOpacity(Colors.black, 0.38),
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Mute button — top-right
  muteWrap: {
    position: 'absolute',
    right: 14,
    zIndex: 25,
  },
  muteBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: withOpacity(Colors.black, 0.34),
    borderWidth: 1,
    borderColor: withOpacity(Colors.white, 0.18),
    alignItems: 'center',
    justifyContent: 'center',
  },
});

// Only re-render when reel id changes; isActive is managed via Zustand subscription
export default memo(
  ReelCard,
  (prev, next) =>
    (prev.reel.post_id ?? prev.reel.id) === (next.reel.post_id ?? next.reel.id) &&
    prev.height === next.height,
);
