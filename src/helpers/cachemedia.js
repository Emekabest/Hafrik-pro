import * as FileSystem from "expo-file-system/legacy";


/**
 * Caches a video locally if its size is less than 15MB.
 * @param {string} videoUrl - The URL of the video to cache.
 * @returns {Promise<string>} - The local file path if cached, or the original URL if not cached.
 */
const cacheVideo = async (videoUrl) => {
    try {
        if (typeof videoUrl !== "string"){

            console.log("omo")

            return videoUrl
        };

        const cacheDirectory = FileSystem.cacheDirectory;
        const fileName = videoUrl.split('/').pop().replace(/[^a-zA-Z0-9_.-]/g, '_');

        if (!cacheDirectory) throw new Error('Cache directory is undefined');

        const filePath = `${cacheDirectory}${fileName}`;

        

        // Check if the file already exists
        const fileInfo = await FileSystem.getInfoAsync(filePath);
        if (fileInfo.exists) {
            console.log(`File already cached: ${fileName}, videoUrl: ${videoUrl}\n`);
            return filePath;
        }


        // Fetch the video size
        const response = await fetch(videoUrl, { method: 'HEAD' });
        const contentLength = response.headers.get('Content-Length');
        const fileSize = parseInt(contentLength, 10);

        const FILE_SIZE_CACHEABLE_MAX = 20; // 20MB
        const FILE_SIZE_CACHEABLE_MIN = 1; // 1MB

        const sizeInMB = fileSize / (1024 * 1024);

        const isCacheable =
            videoUrl.includes(".mp4") &&
            !videoUrl.includes(".m3u8") &&
            fileSize >= FILE_SIZE_CACHEABLE_MIN * 1024 * 1024 && // >= 1MB
            fileSize <= FILE_SIZE_CACHEABLE_MAX * 1024 * 1024;

        // Cache the video if it's valid size and less than limit
        if (isCacheable) {
            
            console.log(`I downloaded file:${videoUrl} of size: ${sizeInMB} MB to cache.\n`);
            const downloadResult = await FileSystem.downloadAsync(videoUrl, filePath);
            return downloadResult.uri;
        }


            console.log(`I did NOT downloaded file:${videoUrl} of size: ${sizeInMB} MB to cache.\n`);

        // Return the original URL if the video is larger than 15MB
        return videoUrl;
    } catch (error) {
        console.error('Error caching video:', error);
        return videoUrl;
    }
};

export default cacheVideo;

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