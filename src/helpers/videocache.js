import * as FileSystem from 'expo-file-system/legacy';
import { useState, useEffect } from 'react';

// A simple in-memory index to avoid repeated disk checks
const videoCache = new Map();

// Function to generate a predictable and safe filename from a URL
const getCacheKey = (uri) => {
    // This is a simple way to create a filename. A robust solution might use hashing.
    // Replace non-alphanumeric characters with an underscore.
    return uri.replace(/[^a-zA-Z0-9]/g, '_');
};

const CACHE_DIR = `${FileSystem.cacheDirectory}videos/`;

/**
 * A hook to manage caching videos to the local filesystem.
 * @param {string} videoUrl The remote URL of the video to cache.
 * @returns {{ cachedUri: string | null, isCaching: boolean }} 
 *          `cachedUri` - The local or remote URI to be used by the Video component.
 *          `isCaching` - A boolean indicating if the video is currently being downloaded.
 */
export const useVideoCache = (videoUrl) => {
    const [cachedUri, setCachedUri] = useState(null);
    const [isCaching, setIsCaching] = useState(false);

    useEffect(() => {
        const manageCache = async () => {
            if (!videoUrl) return;

            // 1. Check in-memory map first
            if (videoCache.has(videoUrl)) {
                setCachedUri(videoCache.get(videoUrl));
                return;
            }

            const fileName = getCacheKey(videoUrl);
            const localUri = `${CACHE_DIR}${fileName}`;

            try {
                // Ensure the cache directory exists
                await FileSystem.makeDirectoryAsync(CACHE_DIR, { intermediates: true });

                // 2. Check if file exists on disk
                const fileInfo = await FileSystem.getInfoAsync(localUri);

                if (fileInfo.exists) {
                    // Cache hit on disk
                    videoCache.set(videoUrl, localUri);
                    setCachedUri(localUri);
                } else {
                    // Cache miss: stream remote and download in background
                    setIsCaching(true);
                    setCachedUri(videoUrl); // Use remote URL for immediate playback

                    const downloadResumable = FileSystem.createDownloadResumable(videoUrl, localUri, {});
                    const { uri: newLocalUri } = await downloadResumable.downloadAsync();
                    
                    // Once downloaded, update the URIs
                    videoCache.set(videoUrl, newLocalUri);
                    setCachedUri(newLocalUri);
                    setIsCaching(false);
                }
            } catch (e) {
                console.error('Failed to cache video:', e);
                // Fallback to remote URL on any error
                setCachedUri(videoUrl);
                videoCache.set(videoUrl, videoUrl);
                setIsCaching(false);
            }
        };

        manageCache();

    }, [videoUrl]);

    return { cachedUri, isCaching };
};
