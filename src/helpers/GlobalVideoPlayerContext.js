import React, { createContext, useContext, useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { useVideoPlayer } from 'expo-video';
import { useEvent } from 'expo';
import useStore from '../repository/store';

const GlobalVideoPlayerContext = createContext(null);

export const GlobalVideoPlayerProvider = ({ children }) => {
    // Current video source and state
    const [source, setSource] = useState(null);
    const [feedId, setFeedId] = useState(null);
    const [isMuted, setIsMuted] = useState(false);
    
    // Track which screen owns the player
    const [activeScreen, setActiveScreen] = useState(null); // 'feeds' | 'comments' | null
    
    // Subscribe to app active state
    const isAppActive = useStore(state => state.isAppActive);
    
    // Thumbnail for poster
    const [thumbnail, setThumbnail] = useState(null);
    
    // Ref to track if we should auto-play
    const shouldAutoPlayRef = useRef(false);
    
    // Ref to track app active state (for use in callbacks that capture initial value)
    const isAppActiveRef = useRef(isAppActive);
    useEffect(() => {
        isAppActiveRef.current = isAppActive;
    }, [isAppActive]);
    
    // Create the global player
    const player = useVideoPlayer(source, (p) => {
        if (p && source) {
            try {
                p.loop = true;
                p.muted = isMuted;
                // Only auto-play if explicitly requested AND app is active AND in comments screen
                if (shouldAutoPlayRef.current && isAppActiveRef.current && activeScreenRef.current === 'comments') {
                    p.play();
                }
            } catch (e) {
                // Player may be invalid on iOS - ignore
            }
        }
    });

    // Safe player validity check
    const isPlayerValid = useCallback(() => {
        try {
            return player && typeof player.playing !== 'undefined';
        } catch (e) {
            return false;
        }
    }, [player]);
    
    // Keep a ref to player for use in callbacks (avoids stale closure issues)
    const playerRef = useRef(player);
    useEffect(() => {
        playerRef.current = player;
    }, [player]);
    
    // Keep a ref to activeScreen for use in player setup callback
    const activeScreenRef = useRef(activeScreen);
    useEffect(() => {
        activeScreenRef.current = activeScreen;
    }, [activeScreen]);

    // Track player events
    const { isPlaying } = useEvent(player, 'playingChange', { isPlaying: player?.playing ?? false });
    const { status } = useEvent(player, 'statusChange', { status: player?.status ?? 'idle' });
    
    // Track previous activeScreen to only pause on actual screen changes
    const prevActiveScreenRef = useRef(activeScreen);

    // Auto-pause player when screen changes away from comments (not on player changes)
    useEffect(() => {
        const prevScreen = prevActiveScreenRef.current;
        prevActiveScreenRef.current = activeScreen;
        
        // Only pause if screen actually changed away from comments
        if (player && prevScreen === 'comments' && activeScreen !== 'comments' && isPlayerValid()) {
            try {
                player.pause();
            } catch (e) {}
        }
    }, [activeScreen, player, isPlayerValid]);
    
    // Safety: Always ensure player is paused when not in comments screen
    useEffect(() => {
        if (player && activeScreen !== 'comments' && isPlaying && isPlayerValid()) {
            try {
                player.pause();
            } catch (e) {}
        }
    }, [player, activeScreen, isPlaying, isPlayerValid]);

    // Pause player when app goes to background
    useEffect(() => {
        if (!isAppActive && player && isPlayerValid()) {
            try {
                player.pause();
            } catch (e) {}
        }
    }, [isAppActive, player, isPlayerValid]);

    // Play a video
    const playVideo = useCallback(({ videoUrl, feedId: newFeedId, thumbnailUrl, screen, autoPlay = true }) => {
        // Only auto-play if app is active
        const shouldPlay = autoPlay && isAppActiveRef.current;
        shouldAutoPlayRef.current = shouldPlay;
        
        // If same feedId (already pre-loaded), just update screen and play immediately
        if (newFeedId === feedId && source) {
            setActiveScreen(screen);
            if (shouldPlay && player && isPlayerValid()) {
                try { 
                    player.play(); 
                } catch (e) {}
            }
            return;
        }
        
        // New video
        setFeedId(newFeedId);
        setThumbnail(thumbnailUrl);
        setActiveScreen(screen);
        setSource(videoUrl);
    }, [feedId, source, player, isPlayerValid]);

    // Pause playback
    const pause = useCallback(() => {
        try { 
            const p = playerRef.current;
            if (p) p.pause(); 
        } catch (e) {}
    }, []);

    // Resume playback - works regardless of status for manual play
    const play = useCallback(() => {
        try { 
            const p = playerRef.current;
            if (p) {
                // Check validity before playing
                try {
                    if (typeof p.playing !== 'undefined') {
                        p.play(); 
                    }
                } catch (e) {}
            }
        } catch (e) {}
    }, []);

    // Seek to position
    const seekTo = useCallback((time) => {
        try {
            if (player) {
                player.currentTime = time;
            }
        } catch (e) {}
    }, [player]);

    // Transfer ownership to another screen (null = no active screen, stays pre-loaded but paused)
    const transferTo = useCallback((screen) => {
        console.log('GlobalVideoPlayer: Transferring to', screen);
        setActiveScreen(screen);
    }, []);

    // Get current playback time
    const getCurrentTime = useCallback(() => {
        try {
            return player?.currentTime || 0;
        } catch (e) {
            return 0;
        }
    }, [player]);

    // Toggle mute
    const toggleMute = useCallback(() => {
        const newMuted = !isMuted;
        setIsMuted(newMuted);
        try {
            if (player && isPlayerValid()) player.muted = newMuted;
        } catch (e) {}
    }, [isMuted, player, isPlayerValid]);

    // Release player
    const release = useCallback(() => {
        setSource(null);
        setFeedId(null);
        setActiveScreen(null);
        pendingVideoRef.current = null;
    }, []);

    // Ref to store pending video info (doesn't create player until needed)
    const pendingVideoRef = useRef(null);

    // Prepare video info for transfer to comments (pre-loads player but keeps it paused)
    const prepareForTransfer = useCallback(({ feedId: newFeedId, videoUrl, thumbnail: thumbUrl }) => {
        // IMPORTANT: Reset auto-play flag - we're just preparing, not playing
        shouldAutoPlayRef.current = false;
        
        // Store pending info
        pendingVideoRef.current = {
            feedId: newFeedId,
            videoUrl,
            thumbnail: thumbUrl,
        };
        setFeedId(newFeedId);
        setThumbnail(thumbUrl);
        // Set source to pre-load the player (but it stays paused due to auto-pause effect)
        setSource(videoUrl);
        // Don't set activeScreen - keeps it paused and invisible
    }, []);

    // Store video info without starting playback (for feeds to prepare for transfer)
    const storeVideoInfo = useCallback(({ feedId: newFeedId, videoUrl, thumbnail: thumbUrl }) => {
        // Only store metadata in the ref — do NOT call setSource here.
        // setSource loads the video into a native AVPlayer, consuming significant memory
        // even when the user never opens comments. prepareForTransfer() handles actual
        // pre-loading right before the user navigates to comments.
        pendingVideoRef.current = { feedId: newFeedId, videoUrl, thumbnail: thumbUrl };
        setFeedId(newFeedId);
        setThumbnail(thumbUrl);
    }, []);

    // Get pending video info
    const getPendingVideo = useCallback(() => {
        return pendingVideoRef.current;
    }, []);

    // Memoize context value to prevent unnecessary re-renders
    const contextValue = useMemo(() => ({
        player,
        source,
        feedId,
        isPlaying,
        status,
        activeScreen,
        isMuted,
        thumbnail,
        playVideo,
        prepareForTransfer,
        getPendingVideo,
        pause,
        play,
        seekTo,
        transferTo,
        getCurrentTime,
        toggleMute,
        release,
    }), [
        player,
        source,
        feedId,
        isPlaying,
        status,
        activeScreen,
        isMuted,
        thumbnail,
        playVideo,
        prepareForTransfer,
        getPendingVideo,
        pause,
        play,
        seekTo,
        transferTo,
        getCurrentTime,
        toggleMute,
        release,
    ]);

    return (
        <GlobalVideoPlayerContext.Provider value={contextValue}>
            {children}
        </GlobalVideoPlayerContext.Provider>
    );
};

export const useGlobalVideoPlayer = () => {
    const context = useContext(GlobalVideoPlayerContext);
    // Return null if used outside provider (graceful fallback)
    return context;
};

export default GlobalVideoPlayerContext;
