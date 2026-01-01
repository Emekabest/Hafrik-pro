import * as FileSystem from "expo-file-system/legacy";


/**
 * Caches a video locally if its size is less than 15MB.
 * @param {string} videoUrl - The URL of the video to cache.
 * @returns {Promise<string>} - The local file path if cached, or the original URL if not cached.
 */
const CACHE_MIN_MB = 1.5; // 1.5 MB
const CACHE_MAX_MB = 20; // 20 MB

const getCacheFilePath = (videoUrl) => {
    const cacheDirectory = FileSystem.cacheDirectory;
    const fileName = videoUrl.split('/').pop().replace(/[^a-zA-Z0-9_.-]/g, '_');
    return `${cacheDirectory}${fileName}`;
};

const validateCachedFile = async (videoUrl, filePath) => {
    try {
        const info = await FileSystem.getInfoAsync(filePath);
        if (!info.exists) return false;

        // Try to compare with server content-length when available
        try {
            const head = await fetch(videoUrl, { method: 'HEAD' });
            const contentLength = head.headers.get('Content-Length');
            if (contentLength) {
                const expected = parseInt(contentLength, 10);
                // If sizes mismatch, treat as corrupted
                if (typeof info.size === 'number' && info.size === expected) return true;
                // mismatch => remove
                await FileSystem.deleteAsync(filePath, { idempotent: true });
                return false;
            }
        } catch (e) {
            // HEAD may fail; treat unknown remote size as invalid to avoid
            // returning partially downloaded or corrupted files. Caller will
            // re-download below.
            await FileSystem.deleteAsync(filePath, { idempotent: true });
            return false;
        }

        // If no content-length header, consider non-empty file valid
        // We already deleted files when HEAD failed; reaching here implies
        // content-length header was present and handled above. As a fallback
        // be conservative and require a non-empty file.
        return typeof info.size === 'number' && info.size > 100;
    } catch (err) {
        return false;
    }
};

const cacheVideo = async (videoUrl) => {
    try {
        if (typeof videoUrl !== 'string') return videoUrl;

        const filePath = getCacheFilePath(videoUrl);

        // If file exists, validate it first
        const fileInfo = await FileSystem.getInfoAsync(filePath);
        if (fileInfo.exists) {
            const ok = await validateCachedFile(videoUrl, filePath);
            if (ok) {
                return filePath;
            }
            // if invalid, continue to re-download below
        }

        // Fetch the video size via HEAD (best-effort)
        let fileSize = null;
        try {
            const response = await fetch(videoUrl, { method: 'HEAD' });
            const contentLength = response.headers.get('Content-Length');
            if (contentLength) fileSize = parseInt(contentLength, 10);
        } catch (e) {
            // ignore
        }

        const sizeInMB = fileSize ? fileSize / (1024 * 1024) : null;

        const isCacheable =
            videoUrl.includes('.mp4') &&
            !videoUrl.includes('.m3u8') &&
            (fileSize === null || (fileSize >= CACHE_MIN_MB * 1024 * 1024 && fileSize <= CACHE_MAX_MB * 1024 * 1024));

        if (isCacheable) {
            const tempPath = `${filePath}.download`;
            try {
                const downloadResult = await FileSystem.downloadAsync(videoUrl, tempPath);
                // verify downloaded file matches expected size when possible
                if (fileSize) {
                    const info = await FileSystem.getInfoAsync(downloadResult.uri);
                    if (!info.exists || info.size !== fileSize) {
                        await FileSystem.deleteAsync(downloadResult.uri, { idempotent: true });
                        return videoUrl;
                    }
                }

                // Move temp file into final location atomically
                try {
                    await FileSystem.moveAsync({ from: downloadResult.uri, to: filePath });
                    return filePath;
                } catch (moveErr) {
                    // If move fails, try to return downloaded uri (still usable)
                    return downloadResult.uri || videoUrl;
                }
            } catch (err) {
                // Download failed, ensure no partial or temp file remains
                try { await FileSystem.deleteAsync(tempPath, { idempotent: true }); } catch(e){}
                try { await FileSystem.deleteAsync(filePath, { idempotent: true }); } catch(e){}
                return videoUrl;
            }
        }

        return videoUrl;
    } catch (error) {
        console.error('Error caching video:', error);
        return videoUrl;
    }
};

export default cacheVideo;

export const invalidateCache = async (videoUrl) => {
    try {
        if (typeof videoUrl !== 'string') return false;
        const filePath = getCacheFilePath(videoUrl);
        const info = await FileSystem.getInfoAsync(filePath);
        console.log("File redownloaded:", filePath);
        if (info.exists) {
            await FileSystem.deleteAsync(filePath, { idempotent: true });
            return true;
        }
        return false;
    } catch (err) {
        return false;
    }
};


export const clearCache = async () => {
    // try {
    //     const files = await FileSystem.readDirectoryAsync(FileSystem.cacheDirectory);
    //     for (const file of files) {
    //         await FileSystem.deleteAsync(FileSystem.cacheDirectory + file, { idempotent: true });
    //     }
    //     console.log("Cache cleared successfully");
    // } catch (error) {
    //     console.error("Error clearing cache:", error);
    // }
};