/**
 * ReelMedia
 *
 * Clean, simple video player for reels.
 * - Mounts the player the first time `isActive` becomes true, then keeps it alive.
 * - Shows a black placeholder until the reel is first activated.
 * - Plays as soon as the video is ready and conditions are met.
 * - NO VideoPreloader, NO ReelsManager, NO complex ref tracking.
 */
import { StyleSheet, View } from 'react-native';
import { VideoView, useVideoPlayer } from 'expo-video';
import { memo, useEffect, useState } from 'react';
import { useEvent } from 'expo';
import { useIsFocused } from '@react-navigation/native';
import useStore from '../../repository/store';
import { Colors } from '../../theme/colors';

// ─── Outer wrapper ────────────────────────────────────────────────────────────
// Prevents creating a video player for every reel in the list.
// Once a reel has been active, we keep the player mounted to avoid remount cost.
const ReelMedia = ({ videoUrl, isActive, isPaused = false, isMuted = false, onTimeUpdate }) => {
  const [everActive, setEverActive] = useState(false);

  useEffect(() => {
    if (isActive && !everActive) setEverActive(true);
  }, [isActive, everActive]);

  if (!everActive) return <View style={styles.black} />;

  return (
    <ActiveReelPlayer
      videoUrl={videoUrl}
      isActive={isActive}
      isPaused={isPaused}
      isMuted={isMuted}
      onTimeUpdate={onTimeUpdate}
    />
  );
};

// ─── Actual player ────────────────────────────────────────────────────────────
const ActiveReelPlayer = memo(({ videoUrl, isActive, isPaused, isMuted, onTimeUpdate }) => {
  const isFocused    = useIsFocused();
  const isAppActive  = useStore((s) => s.isAppActive);

  // Create player; always pass a URL (not null) so status events fire immediately.
  const player = useVideoPlayer(videoUrl ?? '', (p) => {
    if (p) p.loop = true;
  });

  // Status and time events – each state update triggers a re-render which
  // re-evaluates shouldPlay below.
  const { status }      = useEvent(player, 'statusChange', { status: player?.status ?? 'idle' });
  const { currentTime } = useEvent(player, 'timeUpdate',   { currentTime: 0 });
  const isReady = status === 'readyToPlay';

  // ── Play / pause ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!player) return;
    const shouldPlay = isActive && isFocused && isAppActive && !isPaused && isReady;
    try {
      if (shouldPlay && !player.playing) player.play();
      else if (!shouldPlay && player.playing) player.pause();
    } catch (_) {}
  }, [isActive, isPaused, isFocused, isAppActive, isReady, player]);

  // ── Mute ────────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!player) return;
    try { player.muted = isMuted; } catch (_) {}
  }, [isMuted, player]);

  // ── Progress callback ───────────────────────────────────────────────────────
  useEffect(() => {
    if (!onTimeUpdate || !player) return;
    try {
      const dur = player.duration;
      if (dur > 0) onTimeUpdate(currentTime / dur);
    } catch (_) {}
  }, [currentTime, player, onTimeUpdate]);

  // ── Cleanup on unmount ──────────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      try { if (player) player.pause(); } catch (_) {}
    };
  }, [player]);

  // Always render VideoView — no early return that hides it.
  return (
    <VideoView
      style={styles.video}
      player={player}
      nativeControls={false}
      contentFit="cover"
    />
  );
});

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  black: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: Colors.black,
  },
  video: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
});

export default ReelMedia;
