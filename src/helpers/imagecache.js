import * as FileSystem from 'expo-file-system/legacy';
import { useState, useEffect } from 'react';

// A simple in-memory index for our cache to avoid repeated disk checks
const imageCache = new Map();

// Function to generate a predictable and safe filename from a URL
const getCacheKey = (uri) => uri.replace(/[^a-zA-Z0-9]/g, '_');

const CACHE_DIR = `${FileSystem.cacheDirectory}images/`;

/**
 * A hook to manage caching images to the local filesystem.
 * @param {string} imageUrl The remote URL of the image to cache.
 * @returns {{ cachedUri: string | null }} 
 *          `cachedUri` - The local URI if cached, otherwise null while downloading, or the remote URI on error.
 */
export const useImageCache = (imageUrl) => {
    const [cachedUri, setCachedUri] = useState(null);

    useEffect(() => {
        let isMounted = true;

        const manageCache = async () => {
            if (!imageUrl) return;

            // 1. Check in-memory map first
            if (imageCache.has(imageUrl)) {
                if (isMounted) setCachedUri(imageCache.get(imageUrl));
                return;
            }

            const fileName = getCacheKey(imageUrl);
            const localUri = `${CACHE_DIR}${fileName}`;

            try {
                // Ensure the cache directory exists
                await FileSystem.makeDirectoryAsync(CACHE_DIR, { intermediates: true });
                const fileInfo = await FileSystem.getInfoAsync(localUri);

                if (fileInfo.exists) {
                    // Cache hit on disk
                    imageCache.set(imageUrl, localUri);
                    if (isMounted) setCachedUri(localUri);
                } else {
                    // Cache miss: download the image.
                    // Return null initially to allow for a placeholder.
                    if (isMounted) setCachedUri(null); 
                    
                    const { uri: newLocalUri } = await FileSystem.downloadAsync(imageUrl, localUri);
                    
                    imageCache.set(imageUrl, newLocalUri);
                    if (isMounted) setCachedUri(newLocalUri);
                }
            } catch (e) {
                console.error('Failed to cache image:', e);
                // Fallback to the original remote URL on any error
                imageCache.set(imageUrl, imageUrl);
                if (isMounted) setCachedUri(imageUrl);
            }
        };

        manageCache();

        return () => {
            isMounted = false;
        };
    }, [imageUrl]);

    return { cachedUri };
};
