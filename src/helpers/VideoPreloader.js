/**
 * VideoPreloader - Preloads video sources for instant playback
 * 
 * IMPORTANT: This preloader is COMPLETELY DECOUPLED from scroll events.
 * It only preloads videos:
 * 1. When feeds data first loads
 * 2. When pagination loads more data
 * 
 * This prevents scroll jitter by never doing work during scroll.
 */

import * as FileSystem from 'expo-file-system/legacy';

const CACHE_DIR = `${FileSystem.cacheDirectory}video_preload/`;
const MAX_PRELOAD_QUEUE = 4;

class VideoPreloader {
    constructor() {
        // Map of videoUrl -> { status, localUri, etc }
        this.preloadedVideos = new Map();
        // Queue of video URLs to preload
        this.preloadQueue = [];
        // Currently loading videos
        this.loadingVideos = new Set();
        // Max concurrent preloads - reduced for iOS memory safety
        this.maxConcurrentPreloads = 1;
        // Initialization flag
        this.initialized = false;
        // Is processing queue
        this.isProcessing = false;
        // Maximum cached videos to keep in memory map (prevent unbounded growth)
        this.MAX_CACHED_ENTRIES = 20;
    }

    /**
     * Initialize the preloader (ensure cache directory exists)
     */
    async initialize() {
        if (this.initialized) return;
        try {
            await FileSystem.makeDirectoryAsync(CACHE_DIR, { intermediates: true });
            this.initialized = true;
        } catch (e) {
            // Silent fail
        }
    }

    /**
     * Extract video URL from a feed item
     */
    getVideoUrlFromFeed(feed) {
        if (!feed) return null;
        
        // Handle shared posts
        if (feed.type === 'shared' && feed.shared_post) {
            const sharedPost = feed.shared_post;
            if ((sharedPost.type === 'video' || sharedPost.type === 'reel') && 
                sharedPost.media?.[0]?.video_url) {
                return sharedPost.media[0].video_url;
            }
        }
        
        // Handle direct video posts
        if ((feed.type === 'video' || feed.type === 'reel') && 
            feed.media?.[0]?.video_url) {
            return feed.media[0].video_url;
        }
        
        return null;
    }

    /**
     * Extract video URL from a reel item
     */
    getVideoUrlFromReel(reel) {
        if (!reel) return null;
        
        // Reels have media array with video_url
        if (reel.media?.video_url) {
            return reel.media.video_url;
        }
        
        // Or it might be in media[0]
        if (reel.media?.[0]?.video_url) {
            return reel.media[0].video_url;
        }
        
        return null;
    }

    /**
     * Preload videos from a list of feeds - FIRE AND FORGET
     * Call this when feeds data loads or when pagination adds more
     * @param {Array} feedsData - Array of feed items
     */
    preloadFromFeeds(feedsData) {
        if (!feedsData || feedsData.length === 0) return;
        
        // Use setTimeout to completely decouple from calling context
        setTimeout(() => {
            this._extractAndQueueVideos(feedsData);
        }, 100); // Small delay to let UI settle first
    }

    /**
     * Preload videos from a list of reels - FIRE AND FORGET
     * Call this when reels data loads or when pagination adds more
     * @param {Array} reelsData - Array of reel items
     */
    preloadFromReels(reelsData) {
        if (!reelsData || reelsData.length === 0) return;
        
        // Process immediately for reels - data comes from API, UI is already settled
        this._extractAndQueueReelVideos(reelsData);
    }

    /**
     * Extract videos from reels and add to queue (internal)
     */
    _extractAndQueueReelVideos(reelsData) {
        if (!Array.isArray(reelsData)) return;
        const videoUrls = [];
        
        for (const reel of reelsData) {
            // Skip skeleton items
            if (!reel || reel.type === 'skeleton') continue;
            
            const videoUrl = this.getVideoUrlFromReel(reel);
            
            if (videoUrl && !this.preloadedVideos.has(videoUrl)) {
                videoUrls.push(videoUrl);
            }
            
            // Limit how many we queue at once
            if (videoUrls.length >= MAX_PRELOAD_QUEUE) break;
        }
        
        // Add to queue
        for (const url of videoUrls) {
            if (!this.preloadQueue.includes(url)) {
                this.preloadQueue.push(url);
                this.preloadedVideos.set(url, { status: 'pending' });
            }
        }
        
        // Start processing in background
        this._scheduleProcessing();
    }

    /**
     * Extract videos from feeds and add to queue (internal)
     */
    _extractAndQueueVideos(feedsData) {
        if (!Array.isArray(feedsData)) return;
        const videoUrls = [];
        
        for (const item of feedsData) {
            // Handle combinedData format (type: 'feed', data: {...})
            const feed = item.data || item;
            const videoUrl = this.getVideoUrlFromFeed(feed);
            
            if (videoUrl && !this.preloadedVideos.has(videoUrl)) {
                videoUrls.push(videoUrl);
            }
            
            // Limit how many we queue at once
            if (videoUrls.length >= MAX_PRELOAD_QUEUE) break;
        }
        
        // Add to queue
        for (const url of videoUrls) {
            if (!this.preloadQueue.includes(url)) {
                this.preloadQueue.push(url);
                this.preloadedVideos.set(url, { status: 'pending' });
            }
        }
        
        // Start processing in background
        this._scheduleProcessing();
    }

    /**
     * Schedule queue processing using idle time
     */
    _scheduleProcessing() {
        if (this.isProcessing) return;
        
        // Use short delay to process during idle time
        setTimeout(() => this._processQueue(), 50);
    }

    /**
     * Process the preload queue (internal)
     */
    async _processQueue() {
        if (this.preloadQueue.length === 0) {
            this.isProcessing = false;
            return;
        }
        
        this.isProcessing = true;
        
        // Process one at a time to minimize resource usage
        while (this.preloadQueue.length > 0 && this.loadingVideos.size < this.maxConcurrentPreloads) {
            const videoUrl = this.preloadQueue.shift();
            if (videoUrl && !this.loadingVideos.has(videoUrl)) {
                // Don't await - fire and forget
                this._preloadVideo(videoUrl);
            }
        }
        
        // Schedule next batch if more in queue
        if (this.preloadQueue.length > 0) {
            setTimeout(() => {
                this.isProcessing = false;
                this._scheduleProcessing();
            }, 200);
        } else {
            this.isProcessing = false;
        }
    }

    /**
     * Preload a single video - just warm up the connection
     */
    async _preloadVideo(videoUrl) {
        if (!videoUrl || this.loadingVideos.has(videoUrl)) return;
        
        this.loadingVideos.add(videoUrl);
        this.preloadedVideos.set(videoUrl, { status: 'loading' });
        
        try {
            // Just fetch headers to warm up CDN/connection
            const response = await fetch(videoUrl, {
                method: 'HEAD',
                headers: { 'Range': 'bytes=0-0' }
            });
            
            if (response.ok) {
                const contentLength = response.headers.get('Content-Length');
                
                // Evict old entries if we're over the limit
                this._evictOldEntries();
                
                this.preloadedVideos.set(videoUrl, {
                    status: 'ready',
                    contentLength: contentLength ? parseInt(contentLength) : null,
                    preloadedAt: Date.now()
                });
                
                // For small videos (< 2MB), cache them in background
                // Reduced from 3MB to prevent excessive disk/memory usage on iOS
                if (contentLength && parseInt(contentLength) < 2 * 1024 * 1024) {
                    this._cacheVideoInBackground(videoUrl);
                }
            } else {
                this.preloadedVideos.set(videoUrl, { status: 'error' });
            }
        } catch (e) {
            this.preloadedVideos.set(videoUrl, { status: 'error' });
        } finally {
            this.loadingVideos.delete(videoUrl);
        }
    }

    /**
     * Cache video file in background (for small videos)
     */
    async _cacheVideoInBackground(videoUrl) {
        try {
            await this.initialize();
            
            const fileName = this._getCacheKey(videoUrl);
            const localUri = `${CACHE_DIR}${fileName}`;
            
            // Check if already cached
            const fileInfo = await FileSystem.getInfoAsync(localUri);
            if (fileInfo.exists) {
                const info = this.preloadedVideos.get(videoUrl) || {};
                this.preloadedVideos.set(videoUrl, { ...info, localUri, cached: true });
                return;
            }
            
            // Download
            const result = await FileSystem.downloadAsync(videoUrl, localUri);
            if (result?.uri) {
                const info = this.preloadedVideos.get(videoUrl) || {};
                this.preloadedVideos.set(videoUrl, { 
                    ...info, 
                    localUri: result.uri, 
                    cached: true 
                });
            }
        } catch (e) {
            // Silent fail
        }
    }

    /**
     * Get cache key from URL
     */
    _getCacheKey(url) {
        return url.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 100) + '.mp4';
    }

    /**
     * Get the best URI to use for a video
     */
    getBestUri(videoUrl) {
        const info = this.preloadedVideos.get(videoUrl);
        if (info?.localUri && info?.cached) {
            return info.localUri;
        }
        return videoUrl;
    }

    /**
     * Check if a video is preloaded/ready
     */
    isPreloaded(videoUrl) {
        const info = this.preloadedVideos.get(videoUrl);
        return info?.status === 'ready' || info?.cached;
    }

    /**
     * Evict oldest preloaded entries to keep memory bounded
     */
    _evictOldEntries() {
        if (this.preloadedVideos.size <= this.MAX_CACHED_ENTRIES) return;
        
        // Remove oldest entries (Map preserves insertion order)
        const entriesToRemove = this.preloadedVideos.size - this.MAX_CACHED_ENTRIES;
        let removed = 0;
        for (const [key] of this.preloadedVideos) {
            if (removed >= entriesToRemove) break;
            this.preloadedVideos.delete(key);
            removed++;
        }
    }

    /**
     * Clear all preloaded data
     */
    clear() {
        this.preloadedVideos.clear();
        this.preloadQueue = [];
        this.loadingVideos.clear();
        this.isProcessing = false;
    }
}

// Export singleton instance
export default new VideoPreloader();
