import React, { memo, useState, useCallback, useEffect } from "react";
import {
  View,
  StyleSheet,
  TouchableWithoutFeedback,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
  Text,
} from "react-native";
import { Image as ExpoImage } from "expo-image";
import { VideoView, useVideoPlayer } from "expo-video";
import { useEvent } from "expo";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from '../../../../theme/colors';

const withOpacity = (hex, opacity) => {
  const normalized = (hex || "").replace("#", "");
  const alpha = Math.round(Math.max(0, Math.min(1, opacity)) * 255).toString(16).padStart(2, "0");
  return `#${normalized}${alpha}`;
};


const { width: SCREEN_W } = Dimensions.get("window");
// Feed card layout: container pad 16×2 + leftCol 44 + col gap 12 = 88
const FEED_VIDEO_W = SCREEN_W - 88;

const HIT_SLOP = { top: 10, bottom: 10, left: 10, right: 10 };

const isValidUrl = (v) => typeof v === "string" && v.trim().length > 0;

const formatTime = (seconds = 0) => {
  const s = Math.floor(seconds);
  const m = Math.floor(s / 60);
  const rem = s % 60;
  return `${m}:${rem.toString().padStart(2, "0")}`;
};

// ─── VideoPostContent ─────────────────────────────────────────────────────────
const VideoPostContent = ({ media, leftOffset = 0, containerWidth = 0, isVisible }) => {
  const mediaItem = media?.[0];
  if (!mediaItem) return null;

  const rawUrl  = mediaItem?.video_url;
  const safeUrl = isValidUrl(rawUrl) ? rawUrl.trim() : null;

  // Fill the right-column width; when containerWidth is provided (tablet) subtract leftOffset
  const videoW = containerWidth > 0
    ? Math.max(containerWidth - leftOffset, 100)
    : FEED_VIDEO_W;
  const videoH = Math.round(videoW * 16 / 9); // 9:16 portrait ratio

  return (
    <View style={{ borderRadius: 12, overflow: "hidden", backgroundColor: Colors.black }}>
      {safeUrl ? (
        <VideoPlayerLayer
          videoUrl={safeUrl}
          thumbnail={mediaItem?.thumbnail}
          isVisible={isVisible}
          videoWidth={videoW}
          videoHeight={videoH}
        />
      ) : (
        mediaItem?.thumbnail ? (
          <ExpoImage
            source={{ uri: mediaItem.thumbnail }}
            style={{ width: videoW, height: videoH }}
            contentFit="contain"
          />
        ) : null
      )}
    </View>
  );
};

// ─── VideoPlayerLayer ─────────────────────────────────────────────────────────
const VideoPlayerLayer = memo(({ videoUrl, thumbnail, isVisible, videoWidth, videoHeight }) => {
  const [paused,      setPaused]      = useState(false);
  const [muted,       setMuted]       = useState(false);
  const [controlsVis, setControlsVis] = useState(true);

  const player = useVideoPlayer(videoUrl, (p) => {
    if (!p) return;
    try {
      p.loop  = false;
      p.muted = false;
    } catch (e) {
      console.warn("Player setup error:", e);
    }
  });

  const { status } = useEvent(player, "statusChange", {
    status: player?.status ?? "idle",
  });

  useEvent(player, "timeUpdate", { currentTime: 0 });

  // Auto-pause/play based on scroll visibility
  useEffect(() => {
    if (!player) return;
    try {
      if (isVisible) {
        if (!paused) player.play();
      } else {
        player.pause();
      }
    } catch (e) {
      console.warn("Visibility control error:", e);
    }
  }, [isVisible, player]);

  const isReady     = status === "readyToPlay";
  const isBuffering = status === "buffering";

  const currentTime = player?.currentTime ?? 0;
  const totalTime   = player?.duration    ?? 0;
  const progress    = totalTime > 0 ? currentTime / totalTime : 0;

  const handleTap = useCallback(() => {
    setControlsVis(prev => !prev);
  }, []);

  const handlePlayPause = useCallback(() => {
    if (!player) return;
    if (paused) { player.play(); } else { player.pause(); }
    setPaused(prev => !prev);
  }, [player, paused]);

  const handleMute = useCallback(() => {
    if (!player) return;
    player.muted = !muted;
    setMuted(prev => !prev);
  }, [player, muted]);

  const handleReplay = useCallback(() => {
    if (!player) return;
    player.seekBy(-player.currentTime);
    player.play();
    setPaused(false);
  }, [player]);

  const handleSeek = useCallback((e) => {
    if (!player || totalTime === 0) return;
    const barW  = videoWidth - 32;
    const ratio = Math.min(Math.max(e.nativeEvent.locationX / barW, 0), 1);
    player.seekBy(ratio * totalTime - player.currentTime);
  }, [player, totalTime, videoWidth]);

  return (
    <TouchableWithoutFeedback onPress={handleTap}>
      <View style={{ width: videoWidth, height: videoHeight, backgroundColor: Colors.black }}>

        {/* Thumbnail while buffering / not ready */}
        {!isReady && thumbnail && (
          <ExpoImage
            source={{ uri: thumbnail }}
            style={StyleSheet.absoluteFillObject}
            contentFit="cover"
          />
        )}

        {/* Video */}
        {isReady && (
          <VideoView
            style={StyleSheet.absoluteFillObject}
            player={player}
            nativeControls={false}
            contentFit="contain"
          />
        )}

        {/* Buffering spinner */}
        {isBuffering && (
          <View style={styles.bufferOverlay}>
            <ActivityIndicator size="large" color={Colors.white} />
          </View>
        )}

        {/* VIDEO badge */}
        <View style={styles.videoBadge}>
          <Ionicons name="videocam" size={12} color={Colors.white} />
          <Text style={styles.videoBadgeText}>VIDEO</Text>
        </View>

        {/* Controls overlay */}
        {controlsVis && isReady && (
          <View style={styles.controlsOverlay}>

            {/* Top: mute + time */}
            <View style={styles.topRow}>
              <TouchableOpacity onPress={handleMute} style={styles.iconBtn} hitSlop={HIT_SLOP}>
                <Ionicons name={muted ? "volume-mute" : "volume-high"} size={20} color={Colors.white} />
              </TouchableOpacity>
              <Text style={styles.durationText}>
                {formatTime(currentTime)} / {formatTime(totalTime)}
              </Text>
            </View>

            {/* Center: replay + play/pause */}
            <View style={styles.centerRow}>
              <TouchableOpacity onPress={handleReplay} style={styles.iconBtn} hitSlop={HIT_SLOP}>
                <Ionicons name="refresh" size={22} color={Colors.white} />
              </TouchableOpacity>
              <TouchableOpacity onPress={handlePlayPause} style={styles.playBtn} hitSlop={HIT_SLOP}>
                <Ionicons name={paused ? "play" : "pause"} size={28} color={Colors.white} />
              </TouchableOpacity>
              <View style={{ width: 38 }} />
            </View>

            {/* Bottom: progress bar */}
            <TouchableOpacity activeOpacity={1} onPress={handleSeek} style={styles.progressBarHitArea}>
              <View style={styles.progressTrack}>
                <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
                <View style={[styles.scrubber, { left: `${progress * 100}%` }]} />
              </View>
            </TouchableOpacity>

          </View>
        )}

        {/* Paused hint when controls are hidden */}
        {paused && !controlsVis && (
          <View style={styles.pausedHint} pointerEvents="none">
            <Ionicons name="play-circle" size={56} color={withOpacity(Colors.white, 0.75)} />
          </View>
        )}

      </View>
    </TouchableWithoutFeedback>
  );
});

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  bufferOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
  },

  videoBadge: {
    position: "absolute",
    top: 10,
    left: 10,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: withOpacity(Colors.black, 0.55),
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
    gap: 4,
  },
  videoBadgeText: {
    color: Colors.white,
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.5,
  },

  controlsOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: withOpacity(Colors.black, 0.35),
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 14,
  },

  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  durationText: {
    color: Colors.white,
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 0.3,
  },

  centerRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 24,
  },

  iconBtn: {
    width: 38,
    height: 38,
    justifyContent: "center",
    alignItems: "center",
  },

  playBtn: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: withOpacity(Colors.white, 0.2),
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: withOpacity(Colors.white, 0.6),
  },

  progressBarHitArea: { paddingVertical: 8 },

  progressTrack: {
    height: 3,
    backgroundColor: withOpacity(Colors.white, 0.35),
    borderRadius: 2,
    position: "relative",
  },

  progressFill: {
    height: "100%",
    backgroundColor: Colors.tealAccent,
    borderRadius: 2,
  },

  scrubber: {
    position: "absolute",
    top: -4,
    width: 11,
    height: 11,
    borderRadius: 6,
    backgroundColor: Colors.white,
    marginLeft: -5.5,
  },

  pausedHint: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
  },
});

export default memo(VideoPostContent);
