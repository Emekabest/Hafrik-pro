/**
 * usePreloadedVideo - Hook for using preloaded video sources
 * 
 * This hook provides:
 * 1. The best video URI (cached or remote)
 * 2. Preload status
 * 3. Automatic preload triggering
 */

import { useState, useEffect, useMemo } from 'react';
import VideoPreloader from './VideoPreloader';

/**
 * Hook to get the best video URI and preload status
 * @param {string} videoUrl - Original video URL
 * @param {string} feedId - Feed ID for tracking
 * @returns {{ videoUri: string|null, isPreloaded: boolean, isLoading: boolean }}
 */
export const usePreloadedVideo = (videoUrl, feedId) => {
    const [preloadStatus, setPreloadStatus] = useState(null);
    
    // Get initial status — check once on mount and when videoUrl changes
    // Removed polling interval that was wasting CPU and preventing idle
    useEffect(() => {
        if (videoUrl) {
            const status = VideoPreloader.getPreloadStatus(videoUrl);
            setPreloadStatus(status);
            
            // Single delayed re-check (gives preloader time to finish)
            const timer = setTimeout(() => {
                const newStatus = VideoPreloader.getPreloadStatus(videoUrl);
                setPreloadStatus(newStatus);
            }, 2000);
            
            return () => clearTimeout(timer);
        }
    }, [videoUrl]);
    
    // Get the best URI to use
    const videoUri = useMemo(() => {
        if (!videoUrl) return null;
        return VideoPreloader.getBestUri(videoUrl);
    }, [videoUrl, preloadStatus?.cached]);
    
    const isPreloaded = useMemo(() => {
        return preloadStatus?.status === 'ready' || preloadStatus?.cached;
    }, [preloadStatus]);
    
    const isLoading = useMemo(() => {
        return preloadStatus?.status === 'loading';
    }, [preloadStatus]);
    
    return {
        videoUri,
        isPreloaded,
        isLoading,
        isCached: preloadStatus?.cached || false
    };
};

/**
 * Trigger preloading for a specific video
 * @param {string} videoUrl - Video URL to preload
 * @param {string} feedId - Feed ID
 */
export const triggerPreload = (videoUrl, feedId) => {
    if (videoUrl) {
        VideoPreloader.queuePreload(videoUrl, feedId);
        VideoPreloader.processQueue();
    }
};

export default usePreloadedVideo;
