import React, { memo, useCallback, useMemo } from 'react';
import { View, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { VideoView } from 'expo-video';
import { useGlobalVideoPlayer } from './GlobalVideoPlayerContext';
import { Ionicons } from '@expo/vector-icons';

/**
 * VideoPlaceholder - Renders the global video player directly (not as overlay).
 * This allows the video to scroll naturally with the content.
 * Optimized with memo and useCallback for performance on low-end devices.
 */
const VideoPlaceholder = memo(({ 
    feedId, 
    videoUrl, 
    thumbnail, 
    width, 
    height, 
    screen,
    showControls = false,
    onPress,
    style,
}) => {
    const { 
        player,
        feedId: currentFeedId,
        activeScreen,
        isPlaying,
        status,
        pause,
        play,
        isMuted,
        toggleMute,
    } = useGlobalVideoPlayer();

    // Memoize computed values
    const isThisVideoActive = currentFeedId === feedId;
    const isThisScreenActive = activeScreen === screen;
    
    // Guard: check if player's native object is still valid before rendering VideoView
    // On iOS, a released player passed to VideoView will crash the app
    const isPlayerSafe = (() => {
        try {
            return player && typeof player.playing !== 'undefined';
        } catch (e) {
            return false;
        }
    })();
    
    const showVideo = isThisVideoActive && isThisScreenActive && isPlayerSafe;
    const showLoading = isThisVideoActive && isThisScreenActive && status === 'loading';
    // Show play button when video is paused (not loading) - allows manual play after returning from background
    const showPlayButton = showVideo && !isPlaying && status !== 'loading';
    const showMuteButton = showControls && showVideo;

    // Memoize container style
    const containerStyle = useMemo(() => [
        styles.container, 
        { width, height }, 
        style
    ], [width, height, style]);

    // Handler - call player.play() directly to avoid stale closure issues
    const handlePress = useCallback(() => {
        if (onPress) {
            onPress();
            return;
        }
        
        if (isThisVideoActive && player) {
            try {
                // Check player validity before accessing — prevents iOS crash
                if (typeof player.playing === 'undefined') return;
                
                if (player.playing) {
                    player.pause();
                } else {
                    player.play();
                }
            } catch (e) {
                // Player may have been released on iOS - ignore
            }
        }
    }, [onPress, isThisVideoActive, player]);

    const handleMutePress = useCallback(() => {
        toggleMute();
    }, [toggleMute]);

    return (
        <View style={containerStyle}>
            {/* Show VideoView directly when global player is active */}
            {showVideo ? (
                <VideoView
                    style={styles.video}
                    player={player}
                    nativeControls={true}
                    contentFit="contain"
                />
            ) : (
                <TouchableOpacity onPress={handlePress} activeOpacity={0.9} style={styles.thumbnailContainer}>
                    <ThumbnailImage uri={thumbnail} />
                </TouchableOpacity>
            )}
            
            {/* Show loading indicator when this video is loading */}
            {showLoading && <LoadingOverlay />}

            {/* Mute button */}
            {showMuteButton && (
                <MuteButton isMuted={isMuted} onPress={handleMutePress} />
            )}
        </View>
    );
}, (prevProps, nextProps) => {
    // Custom comparison for memo - only re-render if these props change
    return (
        prevProps.feedId === nextProps.feedId &&
        prevProps.videoUrl === nextProps.videoUrl &&
        prevProps.thumbnail === nextProps.thumbnail &&
        prevProps.width === nextProps.width &&
        prevProps.height === nextProps.height &&
        prevProps.screen === nextProps.screen &&
        prevProps.showControls === nextProps.showControls
    );
});

// Memoized sub-components to prevent re-renders
const ThumbnailImage = memo(({ uri }) => (
    <ExpoImage
        source={{ uri }}
        style={styles.thumbnail}
        contentFit="contain"
        cachePolicy="memory-disk"
    />
));

const LoadingOverlay = memo(() => (
    <View style={styles.loadingOverlay} pointerEvents="none">
        <ActivityIndicator size="large" color="#fff" />
    </View>
));

const PlayButton = memo(() => (
    <View style={styles.playButtonOverlay} pointerEvents="none">
        <View style={styles.playButton}>
            <Ionicons name="play" size={30} color="#fff" />
        </View>
    </View>
));

const MuteButton = memo(({ isMuted, onPress }) => (
    <TouchableOpacity 
        style={styles.muteButton}
        onPress={onPress}
    >
        <Ionicons 
            name={isMuted ? "volume-mute" : "volume-high"} 
            size={20} 
            color="#fff" 
        />
    </TouchableOpacity>
));

const styles = StyleSheet.create({
    container: {
        backgroundColor: '#000',
        borderRadius: 10,
        overflow: 'hidden',
    },
    video: {
        width: '100%',
        height: '100%',
    },
    thumbnail: {
        width: '100%',
        height: '100%',
    },
    thumbnailContainer: {
        width: '100%',
        height: '100%',
    },
    loadingOverlay: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.3)',
    },
    playButtonOverlay: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'center',
        alignItems: 'center',
    },
    playButton: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: 'rgba(0,0,0,0.6)',
        justifyContent: 'center',
        alignItems: 'center',
        paddingLeft: 5,
    },
    muteButton: {
        position: 'absolute',
        bottom: 10,
        right: 10,
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: 'rgba(0,0,0,0.6)',
        justifyContent: 'center',
        alignItems: 'center',
    },
});

export default VideoPlaceholder;
