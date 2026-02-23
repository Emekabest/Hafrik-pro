import React, { memo, useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  StyleSheet,
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
const ITEM_HEIGHT = SCREEN_H;

const ReelCard = ({ reel }) => {
  const { token } = useAuth();

  const currentReelId = useStore((s) => s.currentReel?.reelId);
  const isActive = currentReelId === reel.id;

  const interactionRef = useRef(null);
  const progress      = useRef(new Animated.Value(0)).current;
  const [heartKey,  setHeartKey]  = useState('');
  const [isPaused,  setIsPaused]  = useState(false);
  const [pauseIcon, setPauseIcon] = useState('pause');

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
        Animated.delay(550),
        Animated.timing(indicatorOpacity, {
          toValue: 0,
          duration: 280,
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
      showIndicator(next ? 'pause' : 'play');
      return next;
    });
  }, [showIndicator]);

  const handlePress   = useDoubleTap(handleDoubleTap, handleSingleTap);
  const handleSwipeRight = useCallback(() => {
    setHeartKey(String(Date.now()));
    interactionRef.current?.triggerLike();
  }, []);

  return (
    <ReelGestures onSwipeRight={handleSwipeRight}>
      <TouchableWithoutFeedback onPress={handlePress}>
        <View style={styles.container}>

          {/* Video */}
          <ReelMedia
            reelId={reel.id}
            media={reel.media}
            isActive={isActive}
            isPaused={isPaused}
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

          {/* Pause / play indicator */}
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
            <Ionicons name={pauseIcon} size={34} color="#fff" />
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
    height: ITEM_HEIGHT,
    width: '100%',
    backgroundColor: '#000',
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
    top: '45%',
    width: 68,
    height: 68,
    marginLeft: -34,
    borderRadius: 34,
    backgroundColor: 'rgba(0,0,0,0.48)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 20,
  },
});

// Only re-render when the reel id changes (store subscription handles isActive internally)
export default memo(ReelCard, (prev, next) => prev.reel.id === next.reel.id);
