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
import { useWatchTime } from './useWatchTime';
import { useViewCounter } from './useViewCounter';
import { recordWatch } from './reelsApi';
import { Colors } from '../../theme/colors';

const withOpacity = (hex, opacity) => {
  const normalized = (hex || "").replace("#", "");
  const alpha = Math.round(Math.max(0, Math.min(1, opacity)) * 255).toString(16).padStart(2, "0");
  return `#${normalized}${alpha}`;
};


const { height: SCREEN_H } = Dimensions.get('window');

const ReelCard = ({ reel, height = SCREEN_H }) => {
  const { token } = useAuth();
  const { top: safeTop } = useSafeAreaInsets();

  const currentReelId = useStore((s) => s.currentReel?.reelId);
  const isActive = currentReelId === reel.id;

  const interactionRef    = useRef(null);
  const progress          = useRef(new Animated.Value(0)).current;
  const [heartKey,  setHeartKey]  = useState('');
  const [isPaused,  setIsPaused]  = useState(false);
  const [pauseIcon, setPauseIcon] = useState('pause-circle');
  const [isMuted,   setIsMuted]   = useState(false);

  // Mute icon scale bounce
  const muteScale = useRef(new Animated.Value(1)).current;
  // Centre pause/play indicator
  const indicatorOpacity = useRef(new Animated.Value(0)).current;
  const indicatorScale   = useRef(new Animated.Value(0.6)).current;

  // ── Reset pause state when this reel becomes active ─────────────────────
  const prevIsActiveRef = useRef(false);
  useEffect(() => {
    if (isActive && !prevIsActiveRef.current) setIsPaused(false);
    prevIsActiveRef.current = isActive;
  }, [isActive]);

  // ── Watch-time & view tracking ───────────────────────────────────────────
  const { start, pause, flush } = useWatchTime({
    onFlush: (reelId, totalMs) => {
      if (!token || totalMs < 2000) return;
      recordWatch(reelId, totalMs, undefined, token).catch(() => {});
    },
  });
  const { start: viewStart, stop: viewStop } = useViewCounter({
    minWatchMs: 1200,
    onView: () => {},
  });
  useEffect(() => {
    if (isActive && !isPaused) {
      start(reel.id);
      viewStart(reel.id);
    } else {
      pause();
      viewStop();
    }
    return () => { flush(); viewStop(); };
  }, [isActive, reel.id, isPaused]);

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
    setIsPaused(prev => {
      const next = !prev;
      showIndicator(next ? 'pause-circle' : 'play-circle');
      return next;
    });
  }, [showIndicator]);

  // ── Mute toggle ───────────────────────────────────────────────────────────
  const handleMuteToggle = useCallback(() => {
    Animated.sequence([
      Animated.timing(muteScale, { toValue: 0.72, duration: 75, useNativeDriver: true }),
      Animated.spring(muteScale,  { toValue: 1,    tension: 200, friction: 6, useNativeDriver: true }),
    ]).start();
    setIsMuted(prev => !prev);
  }, [muteScale]);

  // ── Progress bar callback ─────────────────────────────────────────────────
  const handleTimeUpdate = useCallback((ratio) => {
    progress.setValue(Math.min(1, Math.max(0, ratio)));
  }, [progress]);

  const handlePress      = useDoubleTap(handleDoubleTap, handleSingleTap);
  const handleSwipeRight = useCallback(() => {
    setHeartKey(String(Date.now()));
    interactionRef.current?.triggerLike();
  }, []);

  // Position mute button just below the overlay header (header ends ~safeTop + 55px)
  const muteBtnTop = safeTop + 58;

  return (
    <ReelGestures onSwipeRight={handleSwipeRight}>
      <TouchableWithoutFeedback onPress={handlePress}>
        <View style={[styles.container, { height }]}>

          {/* ── Video ─────────────────────────────────────────────────────── */}
          <ReelMedia
            reelId={reel.id}
            media={reel.media}
            isActive={isActive}
            isPaused={isPaused}
            isMuted={isMuted}
            onTimeUpdate={handleTimeUpdate}
          />

          {/* ── Bottom gradient (text legibility) ────────────────────────── */}
          <LinearGradient
            colors={['transparent', withOpacity(Colors.black, 0.22), withOpacity(Colors.black, 0.8)]}
            style={styles.gradient}
            pointerEvents="none"
          />

          {/* ── Thin progress bar at the very top ────────────────────────── */}
          <View style={styles.progressWrap}>
            <ReelProgressBar progress={progress} />
          </View>

          {/* ── Centre pause / play flash (auto-hides) ───────────────────── */}
          <Animated.View
            style={[
              styles.indicator,
              { opacity: indicatorOpacity, transform: [{ scale: indicatorScale }] },
            ]}
            pointerEvents="none"
          >
            <Ionicons name={pauseIcon} size={58} color={withOpacity(Colors.white, 0.92)} />
          </Animated.View>

          {/* ── Mute button — top-right, below header ────────────────────── */}
          <Animated.View style={[styles.muteWrap, { top: muteBtnTop, transform: [{ scale: muteScale }] }]}>
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
          <ReelInteractionContainer
            ref={interactionRef}
            reel={reel}
          />

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
    height: '62%',
    zIndex: 2,
  },
  progressWrap: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 5,
  },
  // Centre play/pause flash
  indicator: {
    position: 'absolute',
    alignSelf: 'center',
    top: '40%',
    width: 84,
    height: 84,
    marginLeft: -42,
    borderRadius: 42,
    backgroundColor: withOpacity(Colors.black, 0.38),
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 20,
  },
  // Mute button — top-right, Instagram-style
  muteWrap: {
    position: 'absolute',
    right: 14,
    zIndex: 25,
  },
  muteBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: withOpacity(Colors.black, 0.48),
    borderWidth: 1,
    borderColor: withOpacity(Colors.white, 0.18),
    alignItems: 'center',
    justifyContent: 'center',
  },
});

// Only re-render when the reel id changes; store subscription handles isActive internally
export default memo(ReelCard, (prev, next) => prev.reel.id === next.reel.id);
