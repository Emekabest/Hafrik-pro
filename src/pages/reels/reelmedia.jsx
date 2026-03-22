/**
 * ReelMedia
 *
 * Preload strategy:
 *  - windowSize={3} in FlatList keeps current ± 1 reel mounted.
 *  - ActiveReelPlayer always mounts (no everActive guard) so adjacent reels
 *    buffer silently before the user swipes to them.
 *  - Only the active reel plays; neighbours stay paused but buffered.
 *  - Thumbnail shows instantly as base layer; fades out when video is ready.
 */
import { ActivityIndicator, Animated, StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import { VideoView, useVideoPlayer } from 'expo-video';
import { memo, useEffect, useRef } from 'react';
import { useEvent } from 'expo';
import { useIsFocused } from '@react-navigation/native';
import useStore from '../../repository/store';
import { Colors } from '../../theme/colors';

// ─── Public component ─────────────────────────────────────────────────────────
// No everActive gate — always mount the player so the reel buffers as soon as
// React Native renders this cell (which happens for current ± 1 via windowSize).
const ReelMedia = ({
  videoUrl,
  thumbnailUrl,
  isActive,
  isPaused    = false,
  isMuted     = false,
  onTimeUpdate,
}) => (
  <View style={StyleSheet.absoluteFill}>

    {/* Thumbnail — base layer, always visible until video is ready */}
    {thumbnailUrl ? (
      <Image
        source={{ uri: thumbnailUrl }}
        style={StyleSheet.absoluteFill}
        contentFit="cover"
        cachePolicy="memory-disk"
      />
    ) : (
      <View style={[StyleSheet.absoluteFill, styles.black]} />
    )}

    {/* Video player — mounts immediately; plays only when isActive */}
    <ActiveReelPlayer
      videoUrl={videoUrl}
      thumbnailUrl={thumbnailUrl}
      isActive={isActive}
      isPaused={isPaused}
      isMuted={isMuted}
      onTimeUpdate={onTimeUpdate}
    />

  </View>
);

// ─── Player ───────────────────────────────────────────────────────────────────
const ActiveReelPlayer = memo(({
  videoUrl,
  thumbnailUrl,
  isActive,
  isPaused,
  isMuted,
  onTimeUpdate,
}) => {
  const isFocused   = useIsFocused();
  const isAppActive = useStore((s) => s.isAppActive);

  // Creating the player immediately starts buffering — this is the preload.
  const player = useVideoPlayer(videoUrl ?? '', (p) => {
    if (p) p.loop = true;
  });

  const { status }      = useEvent(player, 'statusChange', { status: player?.status ?? 'idle' });
  const { currentTime } = useEvent(player, 'timeUpdate',   { currentTime: 0 });
  const isReady = status === 'readyToPlay';

  // Thumbnail fade-out once video is buffered and ready
  const thumbOpacity = useRef(new Animated.Value(1)).current;
  const hasFadedRef  = useRef(false);
  useEffect(() => {
    if (isReady && !hasFadedRef.current) {
      hasFadedRef.current = true;
      setTimeout(() => {
        Animated.timing(thumbOpacity, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }).start();
      }, 120);
    }
  }, [isReady, thumbOpacity]);

  // ── Play / pause ──────────────────────────────────────────────────────────
  // Non-active reels stay paused (but buffered). Active reel plays once ready.
  useEffect(() => {
    if (!player) return;
    const shouldPlay = isActive && isFocused && isAppActive && !isPaused && isReady;
    try {
      if (shouldPlay && !player.playing) player.play();
      else if (!shouldPlay && player.playing) player.pause();
    } catch (_) {}
  }, [isActive, isPaused, isFocused, isAppActive, isReady, player]);

  // ── Mute ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!player) return;
    try { player.muted = isMuted; } catch (_) {}
  }, [isMuted, player]);

  // ── Progress callback ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!onTimeUpdate || !player) return;
    try {
      const dur = player.duration;
      if (dur > 0) onTimeUpdate(currentTime / dur);
    } catch (_) {}
  }, [currentTime, player, onTimeUpdate]);

  // ── Cleanup ───────────────────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      try { if (player) player.pause(); } catch (_) {}
    };
  }, [player]);

  return (
    <>
      {/* Video — always underneath */}
      <VideoView
        style={StyleSheet.absoluteFill}
        player={player}
        nativeControls={false}
        contentFit="cover"
      />

      {/* Thumbnail overlay fades out once video is ready */}
      {thumbnailUrl && (
        <Animated.View
          style={[StyleSheet.absoluteFill, { opacity: thumbOpacity }]}
          pointerEvents="none"
        >
          <Image
            source={{ uri: thumbnailUrl }}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
            cachePolicy="memory-disk"
          />
        </Animated.View>
      )}

      {/* Spinner while buffering — only on active reel so neighbours don't flash */}
      {!isReady && isActive && (
        <View style={styles.loaderOverlay} pointerEvents="none">
          <ActivityIndicator size="large" color="rgba(255,255,255,0.85)" />
        </View>
      )}
    </>
  );
});

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  black: {
    backgroundColor: Colors.black,
  },
  loaderOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default ReelMedia;
