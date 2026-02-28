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

const { height: SCREEN_H } = Dimensions.get('window');

const ReelCard = ({ reel, height = SCREEN_H }) => {
  const { token } = useAuth();

  const currentReelId = useStore((s) => s.currentReel?.reelId);
  const isActive = currentReelId === reel.id;

  const interactionRef = useRef(null);
  const progress      = useRef(new Animated.Value(0)).current;
  const [heartKey,  setHeartKey]  = useState('');
  const [isPaused,  setIsPaused]  = useState(false);
  const [pauseIcon, setPauseIcon] = useState('pause-circle');
  const [isMuted,   setIsMuted]   = useState(false);

  // Mute animation
  const muteScale = useRef(new Animated.Value(1)).current;

  // Pause indicator animation
  const indicatorOpacity = useRef(new Animated.Value(0)).current;
  const indicatorScale   = useRef(new Animated.Value(0.6)).current;

  // ── Auto-reset pause when a new reel becomes active ─────────────────────
  const prevIsActiveRef = useRef(false);
  useEffect(() => {
    if (isActive && !prevIsActiveRef.current) {
      setIsPaused(false);
    }
    prevIsActiveRef.current = isActive;
  }, [isActive]);

  // ── Watch time tracking ──────────────────────────────────────────────────
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
    return () => {
      flush();
      viewStop();
    };
  }, [isActive, reel.id, isPaused]);

  // ── Pause/play indicator ─────────────────────────────────────────────────
  const showIndicator = useCallback((icon) => {
    setPauseIcon(icon);
    indicatorOpacity.stopAnimation();
    indicatorScale.stopAnimation();
    indicatorOpacity.setValue(1);
    indicatorScale.setValue(0.65);
    Animated.parallel([
      Animated.spring(indicatorScale, {
        toValue: 1,
        useNativeDriver: true,
        tension: 140,
        friction: 7,
      }),
      Animated.sequence([
        Animated.delay(500),
        Animated.timing(indicatorOpacity, {
          toValue: 0,
          duration: 260,
          useNativeDriver: true,
        }),
      ]),
    ]).start();
  }, [indicatorOpacity, indicatorScale]);

  // ── Double tap → like ────────────────────────────────────────────────────
  const handleDoubleTap = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    setHeartKey(String(Date.now()));
    interactionRef.current?.triggerLike();
  }, []);

  // ── Single tap → toggle pause/play ──────────────────────────────────────
  const handleSingleTap = useCallback(() => {
    setIsPaused(prev => {
      const next = !prev;
      showIndicator(next ? 'pause-circle' : 'play-circle');
      return next;
    });
  }, [showIndicator]);

  // ── Mute toggle ──────────────────────────────────────────────────────────
  const handleMuteToggle = useCallback(() => {
    Animated.sequence([
      Animated.timing(muteScale, { toValue: 0.75, duration: 80, useNativeDriver: true }),
      Animated.spring(muteScale, { toValue: 1, tension: 200, friction: 6, useNativeDriver: true }),
    ]).start();
    setIsMuted(prev => !prev);
  }, [muteScale]);

  // ── Progress callback ────────────────────────────────────────────────────
  const handleTimeUpdate = useCallback((ratio) => {
    progress.setValue(Math.min(1, Math.max(0, ratio)));
  }, [progress]);

  const handlePress   = useDoubleTap(handleDoubleTap, handleSingleTap);
  const handleSwipeRight = useCallback(() => {
    setHeartKey(String(Date.now()));
    interactionRef.current?.triggerLike();
  }, []);

  return (
    <ReelGestures onSwipeRight={handleSwipeRight}>
      <TouchableWithoutFeedback onPress={handlePress}>
        <View style={[styles.container, { height }]}>

          {/* Video */}
          <ReelMedia
            reelId={reel.id}
            media={reel.media}
            isActive={isActive}
            isPaused={isPaused}
            isMuted={isMuted}
            onTimeUpdate={handleTimeUpdate}
          />

          {/* Bottom gradient — improves text readability */}
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.28)', 'rgba(0,0,0,0.72)']}
            style={styles.gradient}
            pointerEvents="none"
          />

          {/* Progress bar */}
          <View style={styles.progressWrap}>
            <ReelProgressBar progress={progress} />
          </View>

          {/* Tap-feedback pause/play indicator (centre, fades out) */}
          <Animated.View
            style={[
              styles.indicator,
              {
                opacity: indicatorOpacity,
                transform: [{ scale: indicatorScale }],
              },
            ]}
            pointerEvents="none"
          >
            <Ionicons name={pauseIcon} size={52} color="#fff" />
          </Animated.View>

          {/* Persistent pause/play button — bottom-left corner */}
          <TouchableOpacity
            style={[styles.pauseBtn, isPaused && styles.pauseBtnActive]}
            onPress={handleSingleTap}
            activeOpacity={0.75}
          >
            <Ionicons
              name={isPaused ? 'play' : 'pause'}
              size={13}
              color="#fff"
            />
          </TouchableOpacity>

          {/* Mute / unmute button */}
          <Animated.View style={[styles.muteBtn, { transform: [{ scale: muteScale }] }]}>
            <TouchableOpacity onPress={handleMuteToggle} activeOpacity={0.8} style={styles.muteBtnInner}>
              <Ionicons
                name={isMuted ? 'volume-mute' : 'volume-high'}
                size={15}
                color="#fff"
              />
            </TouchableOpacity>
          </Animated.View>

          <HeartBurst visibleKey={heartKey} />

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
    backgroundColor: '#000',
    overflow: 'hidden',
  },
  gradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '58%',
    zIndex: 2,
  },
  progressWrap: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 5,
  },
  indicator: {
    position: 'absolute',
    alignSelf: 'center',
    top: '42%',
    width: 80,
    height: 80,
    marginLeft: -40,
    borderRadius: 40,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 20,
  },
  // Persistent pause/play button — bottom-left corner, above interaction panel
  pauseBtn: {
    position: 'absolute',
    left: 14,
    bottom: 200,
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(0,0,0,0.32)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.22)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 25,
  },
  pauseBtnActive: {
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderColor: 'rgba(255,255,255,0.5)',
  },
  muteBtn: {
    position: 'absolute',
    left: 56,
    bottom: 200,
    zIndex: 25,
  },
  muteBtnInner: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(0,0,0,0.32)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.22)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});

// Only re-render when the reel id changes (store subscription handles isActive internally)
export default memo(ReelCard, (prev, next) => prev.reel.id === next.reel.id);
