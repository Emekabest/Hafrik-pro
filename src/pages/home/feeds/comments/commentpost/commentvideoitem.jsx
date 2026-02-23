import React, { useEffect, useState, useImperativeHandle, forwardRef, useRef, memo, useCallback, useMemo } from 'react';
import { View, Image, TouchableOpacity, ActivityIndicator, StyleSheet, Text } from 'react-native';
import { VideoView, useVideoPlayer } from 'expo-video';
import { useEvent } from 'expo';
import { useIsFocused } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import VideoManager from '../../../../../helpers/videomanager';
import { useGlobalVideoPlayer } from '../../../../../helpers/GlobalVideoPlayerContext';
import VideoPlaceholder from '../../../../../helpers/VideoPlaceholder';
import useStore from '../../../../../repository/store';

const MEDIA_HEIGHT = 520;
const MEDIA_WIDTH = 270;

// Memoized container style
const containerStyle = { marginTop: 10 };


const CommentVideoItem = memo(forwardRef(({ videoUrl, thumbnail, isLeaving = false, feedId }, ref) => {
    const isFocused = useIsFocused();
    
    // Try to use global video player
    const globalPlayer = useGlobalVideoPlayer();
    const isGlobalPlayerAvailable = globalPlayer && globalPlayer.feedId === feedId;

    // Track if we've reset position for this focus session
    const hasResetPositionRef = useRef(false);

    // Reset the ref when screen loses focus (isLeaving becomes true)
    useEffect(() => {
        if (isLeaving) {
            hasResetPositionRef.current = false;
        }
    }, [isLeaving]);

    // Start playback with global player when mounting (if pre-loaded)
    useEffect(() => {
        if (feedId && globalPlayer && globalPlayer.feedId === feedId && !isLeaving && isFocused) {
            globalPlayer.playVideo({
                videoUrl,
                feedId,
                thumbnailUrl: thumbnail,
                screen: 'comments',
                autoPlay: true,
            });

            // Reset to beginning after playback starts (only once per focus session)
            if (!hasResetPositionRef.current && globalPlayer.seekTo) {
                hasResetPositionRef.current = true;
                // Small delay to ensure player is ready before seeking
                setTimeout(() => {
                    if (globalPlayer.seekTo) {
                        globalPlayer.seekTo(0);
                    }
                }, 100);
            }
        }
    }, [feedId, globalPlayer?.feedId, isLeaving, isFocused, videoUrl, thumbnail]);

    // Handle isLeaving - pause global player and transfer back to feeds
    useEffect(() => {
        if (isLeaving && globalPlayer && globalPlayer.feedId === feedId) {
            globalPlayer.pause();
            globalPlayer.transferTo('feeds');
        }
    }, [isLeaving, globalPlayer, feedId]);

    // If global player is for this video, use VideoPlaceholder
    if (isGlobalPlayerAvailable && !isLeaving) {
        return (
            <View style={containerStyle}>
                <VideoPlaceholder
                    feedId={feedId}
                    videoUrl={videoUrl}
                    thumbnail={thumbnail}
                    width={MEDIA_WIDTH}
                    height={MEDIA_HEIGHT}
                    screen="comments"
                    showControls={true}
                />
            </View>
        );
    }

    // Fallback: Create local player if global player is not available for this video
    return (
        <FallbackVideoPlayer 
            ref={ref}
            videoUrl={videoUrl}
            thumbnail={thumbnail}
            isLeaving={isLeaving}
            feedId={feedId}
        />
    );
}), (prevProps, nextProps) => {
    // Custom comparison - only re-render if essential props change
    return (
        prevProps.videoUrl === nextProps.videoUrl &&
        prevProps.thumbnail === nextProps.thumbnail &&
        prevProps.isLeaving === nextProps.isLeaving &&
        prevProps.feedId === nextProps.feedId
    );
});


// Fallback local player component (used when navigating to comment screen without a video playing in feeds)
// Memoized for performance
const FallbackVideoPlayer = memo(forwardRef(({ videoUrl, thumbnail, isLeaving, feedId }, ref) => {
    const isFocused = useIsFocused();
    const isAppActive = useStore(state => state.isAppActive);
    const [hasError, setHasError] = useState(false);
    const hasSeenkedRef = useRef(false);

    // Check if we have stored playback info from feeds (old VideoManager approach)
    const sharedPlayerInfo = useMemo(() => VideoManager.getSharedPlayer(), []);
    // Always start from beginning in comments - ignore stored position
    const hasStoredPosition = false;
    const storedTime = 0;
    
    const source = videoUrl || null;

    const player = useVideoPlayer(source, (p) => {
        if (p && source) {
            try { p.loop = true; } catch (e) {}
        }
    });

    const { isPlaying } = useEvent(player, 'playingChange', { isPlaying: player?.playing ?? false });
    const { status } = useEvent(player, 'statusChange', { status: player?.status ?? 'idle' });

    // When player is ready, seek to stored position and play
    useEffect(() => {
        // Only auto-play if app is active and screen is focused
        if (player && status === 'readyToPlay' && isFocused && isAppActive && !hasSeenkedRef.current) {
            hasSeenkedRef.current = true;
            
            try {
                if (hasStoredPosition && storedTime > 0) {
                    player.currentTime = storedTime;
                }
                player.play();
                VideoManager.clearSharedPlayer();
            } catch (e) {}
        }
    }, [player, status, isFocused, isAppActive, hasStoredPosition, storedTime]);

    // Pause when app goes to background
    useEffect(() => {
        if (!isAppActive && player) {
            try { player.pause(); } catch (e) {}
        }
    }, [isAppActive, player]);

    useImperativeHandle(ref, () => ({
        pause: () => {
            try { player?.pause(); } catch (e) {}
        },
        release: () => {
            // Do NOT call player.release() - useVideoPlayer hook manages the native player lifecycle.
            // Manually releasing causes double-free (EXC_BAD_ACCESS) crashes on iOS.
            try { player?.pause(); } catch (e) {}
        }
    }), [player]);

    useEffect(() => {
        if (isLeaving && player) {
            try { player.pause(); } catch (e) {}
        }
    }, [isLeaving, player]);

    useEffect(() => {
        return () => {  
            // Only pause on unmount - do NOT call player.release().
            // The useVideoPlayer hook automatically releases the native AVPlayer when
            // the component unmounts. Manually releasing causes EXC_BAD_ACCESS on iOS
            // which can trigger a device restart via kernel panic.
            try { player?.pause(); } catch (e) {}
        };
    }, [player]);

    // Memoized error handler
    const handleRetry = useCallback(() => setHasError(false), []);
    const handleError = useCallback(() => setHasError(true), []);

    // Memoized poster source
    const posterSource = useMemo(() => ({ uri: thumbnail }), [thumbnail]);

    if (hasError) {
        return <ErrorView onRetry={handleRetry} />;
    }

    return (
        <View style={fallbackStyles.container}>
            <VideoView
                style={fallbackStyles.video}
                player={player}
                nativeControls={true}
                contentFit="contain"
                posterSource={posterSource}
                usePoster={true}
                onError={handleError}
            />

            {(!isPlaying && status !== "readyToPlay") && (
                <View style={fallbackStyles.loadingOverlay} pointerEvents="none">
                    <ActivityIndicator size="large" color="#fff" />
                </View>
            )}
        </View>
    );
}), (prevProps, nextProps) => {
    return (
        prevProps.videoUrl === nextProps.videoUrl &&
        prevProps.thumbnail === nextProps.thumbnail &&
        prevProps.isLeaving === nextProps.isLeaving &&
        prevProps.feedId === nextProps.feedId
    );
});

// Memoized error view component
const ErrorView = memo(({ onRetry }) => (
    <View style={fallbackStyles.errorContainer}>
        <Ionicons name="alert-circle-outline" size={30} color="#fff" />
        <Text style={fallbackStyles.errorText}>Something went wrong</Text>
        <TouchableOpacity onPress={onRetry} style={fallbackStyles.retryButton}>
            <Text style={fallbackStyles.retryText}>Try Again</Text>
        </TouchableOpacity>
    </View>
));

// Pre-defined styles (created once, not on every render)
const fallbackStyles = StyleSheet.create({
    container: {
        height: MEDIA_HEIGHT,
        width: MEDIA_WIDTH,
        borderRadius: 10,
        overflow: 'hidden',
        marginTop: 10,
        backgroundColor: '#000',
    },
    video: {
        width: '100%',
        height: '100%',
    },
    loadingOverlay: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 2,
    },
    errorContainer: {
        height: MEDIA_HEIGHT,
        width: MEDIA_WIDTH,
        borderRadius: 10,
        overflow: 'hidden',
        marginTop: 10,
        backgroundColor: '#202020',
        justifyContent: 'center',
        alignItems: 'center',
    },
    errorText: {
        color: '#fff',
        fontSize: 14,
        marginTop: 10,
    },
    retryButton: {
        marginTop: 15,
        paddingVertical: 8,
        paddingHorizontal: 15,
        backgroundColor: '#333',
        borderRadius: 20,
    },
    retryText: {
        color: '#fff',
        fontSize: 12,
    },
});

export default CommentVideoItem;
