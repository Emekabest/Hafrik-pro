import { View, StyleSheet } from "react-native";
import { VideoView, useVideoPlayer } from "expo-video";
import ReelsManager from "../../helpers/reelsmanager";
import { memo, useCallback, useEffect, useRef, useState } from "react";

import { useEvent } from "expo";
import { useIsFocused } from "@react-navigation/native";
import useStore from "../../repository/store";
import VideoPreloader from "../../helpers/VideoPreloader";


/**
 * ReelMedia - Wrapper that only mounts the heavy video player when needed
 * This prevents memory issues from creating players for all reels
 */
const ReelMedia = ({ reelId, media, isActive, isPaused = false, isMuted = false, onTimeUpdate }) => {
    const isFocused = useIsFocused();
    const isAppActive = useStore((state) => state.isAppActive);
    
    // Track if this reel should have a player mounted
    const [shouldMountPlayer, setShouldMountPlayer] = useState(false);
    const mountTimerRef = useRef(null);
    const unmountTimerRef = useRef(null);

    // Determine if player should be active based on all conditions
    const canPlay = isActive && isFocused && isAppActive;

    useEffect(() => {
        if (canPlay) {
            // Clear any pending unmount timer
            if (unmountTimerRef.current) {
                clearTimeout(unmountTimerRef.current);
                unmountTimerRef.current = null;
            }
            
            // Debounce mounting - only mount if reel stays active for 50ms
            // This prevents rapid scroll from creating many players
            // Reduced from 150ms for faster playback on low-end iOS devices
            if (!shouldMountPlayer) {
                mountTimerRef.current = setTimeout(() => {
                    setShouldMountPlayer(true);
                }, 50);
            }
        } else {
            // Clear any pending mount timer (user scrolled away quickly)
            if (mountTimerRef.current) {
                clearTimeout(mountTimerRef.current);
                mountTimerRef.current = null;
            }
            
            if (shouldMountPlayer) {
                // When screen loses focus or app goes to background, unmount faster
                // Reduced active delay from 500ms to 200ms to free memory sooner on low-end iOS
                const delay = (!isFocused || !isAppActive) ? 100 : 200;
                unmountTimerRef.current = setTimeout(() => {
                    setShouldMountPlayer(false);
                }, delay);
            }
        }

        return () => {
            if (mountTimerRef.current) {
                clearTimeout(mountTimerRef.current);
            }
            if (unmountTimerRef.current) {
                clearTimeout(unmountTimerRef.current);
            }
        };
    }, [canPlay, shouldMountPlayer, isFocused, isAppActive]);

    // When component unmounts (navigating away from reels), clear immediately
    useEffect(() => {
        return () => {
            setShouldMountPlayer(false);
            if (mountTimerRef.current) {
                clearTimeout(mountTimerRef.current);
            }
            if (unmountTimerRef.current) {
                clearTimeout(unmountTimerRef.current);
            }
        };
    }, []);

    return (
        <View style={styles.container}>
            {shouldMountPlayer ? (
                <ActiveReelPlayer
                    reelId={reelId}
                    media={media}
                    isActive={isActive}
                    isPaused={isPaused}
                    isMuted={isMuted}
                    onTimeUpdate={onTimeUpdate}
                />
            ) : null}
        </View>
    );
};


/**
 * ActiveReelPlayer - The actual video player component
 * Only mounted when the reel is active or recently active
 */
const ActiveReelPlayer = memo(({ reelId, media, isActive, isPaused = false, isMuted = false, onTimeUpdate }) => {
    const isFocused = useIsFocused();
    const isAppActive_store = useStore((state) => state.isAppActive);

    // Track if component is still mounted and player is valid
    const isMountedRef = useRef(true);
    const isReleasedRef = useRef(false);
    const playerValidRef = useRef(false);

    // Get video source (cached or original)
    const source = media?.video_url 
        ? VideoPreloader.getBestUri(media.video_url) 
        : null;

    // Create player with error handling
    const player = useVideoPlayer(source, (p) => {
        if (p && source && isMountedRef.current) {
            try { 
                p.loop = true;
                playerValidRef.current = true;
            } catch (e) {
                playerValidRef.current = false;
            }
        }
    });

    // Safe player validity check - prevents NativeSharedObjectNotFoundException on iOS
    const isPlayerSafe = useCallback(() => {
        try {
            return player && typeof player.playing !== 'undefined' && 
                   isMountedRef.current && !isReleasedRef.current && playerValidRef.current;
        } catch (e) {
            isReleasedRef.current = true;
            playerValidRef.current = false;
            return false;
        }
    }, [player]);

    // Event subscriptions
    const { isPlaying } = useEvent(player, 'playingChange', { isPlaying: player?.playing ?? false });
    const { status }    = useEvent(player, 'statusChange', { status: player?.status ?? 'idle' });
    const { currentTime } = useEvent(player, 'timeUpdate', { currentTime: 0 });

    const isReady = status === 'readyToPlay';

    // Register player when ready
    useEffect(() => {
        if (!player || !isReady || !isMountedRef.current || isReleasedRef.current || !isPlayerSafe()) return;
        
        try {
            const existing = ReelsManager.getVideoPlayer(reelId);
            if (!existing) {
                ReelsManager.register(reelId, player);
            }
        } catch (e) {
            isReleasedRef.current = true;
        }
    }, [reelId, player, isReady, isPlayerSafe]);

    // MAIN PLAY LOGIC
    useEffect(() => {
        if (!player || !isMountedRef.current || isReleasedRef.current || !isPlayerSafe()) return;

        const shouldPlay = isActive && isFocused && isAppActive_store && isReady && !isPaused;

        if (shouldPlay) {
            try {
                if (!player.playing) player.play();
            } catch (e) {
                isReleasedRef.current = true;
                playerValidRef.current = false;
            }
        } else {
            try {
                if (player.playing) player.pause();
            } catch (e) {
                isReleasedRef.current = true;
                playerValidRef.current = false;
            }
        }
    }, [isActive, isPaused, isFocused, isAppActive_store, isReady, player, isPlayerSafe]);

    // Mute / unmute
    useEffect(() => {
        if (!player || !isPlayerSafe()) return;
        try { player.muted = isMuted; } catch (_) {}
    }, [isMuted, player, isPlayerSafe]);

    // Progress → onTimeUpdate callback
    useEffect(() => {
        if (!onTimeUpdate || !player) return;
        try {
            const dur = player.duration;
            if (dur && dur > 0) onTimeUpdate(currentTime / dur);
        } catch (_) {}
    }, [currentTime, player, onTimeUpdate]);

    // Handle screen focus changes
    const prevFocusedRef = useRef(isFocused);
    useEffect(() => {
        if (!isMountedRef.current || isReleasedRef.current || !isPlayerSafe()) return;

        if (isFocused && !prevFocusedRef.current && isActive && isReady && isAppActive_store) {
            try {
                if (player && !player.playing) {
                    player.play();
                }
            } catch (e) {
                isReleasedRef.current = true;
            }
        }

        prevFocusedRef.current = isFocused;
    }, [isFocused, isActive, isReady, isAppActive_store, player, isPlayerSafe]);

    // Handle app state changes (background/foreground)
    useEffect(() => {
        if (!player || !isMountedRef.current || isReleasedRef.current || !isPlayerSafe()) return;

        if (isAppActive_store && isActive && isFocused && isReady) {
            const timeout = setTimeout(() => {
                if (isMountedRef.current && !isReleasedRef.current && player && isPlayerSafe()) {
                    try {
                        if (!player.playing && player.status === 'readyToPlay') {
                            player.play();
                        }
                    } catch (e) {
                        isReleasedRef.current = true;
                    }
                }
            }, 50);
            return () => clearTimeout(timeout);
        }
    }, [isAppActive_store, isActive, isFocused, isReady, player, isPlayerSafe]);

    // Cleanup on unmount - THIS IS KEY FOR MEMORY
    useEffect(() => {
        isMountedRef.current = true;
        isReleasedRef.current = false;
        playerValidRef.current = true;

        return () => {
            isMountedRef.current = false;
            isReleasedRef.current = true;
            playerValidRef.current = false;

            // Unregister from manager FIRST to prevent any access to this player
            try {
                ReelsManager.unregister(reelId);
            } catch (e) {}

            // Then pause the player
            try {
                if (player) {
                    player.pause();
                }
            } catch (e) {
                // Player may already be invalid, ignore
            }
        };
    }, [reelId, player]);

    // Early return if player is invalid
    if (!player || isReleasedRef.current || !playerValidRef.current) {
        return null;
    }

    return (
        <VideoView
            style={styles.videoOverlay}
            player={player}
            nativeControls={false}
            contentFit="contain"
            usePoster={false}
            onError={(error) => {
                console.log('Reel VideoView onError', error);
            }}
        />
    );
});


const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000',
    },
    videoOverlay: {
        flex: 1,
        width: '100%',
        height: '100%',
    },
});

const handleMemoize = (prev, next) => {
    if (!prev || !next) return false;
    if (prev.reelId   !== next.reelId)   return false;
    if (prev.isActive !== next.isActive) return false;
    if (prev.isPaused !== next.isPaused) return false;
    if (prev.isMuted  !== next.isMuted)  return false;
    return true;
};

export default memo(ReelMedia, handleMemoize);
