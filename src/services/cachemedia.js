import * as FileSystem from "expo-file-system";


/**
 * Caches a video locally if its size is less than 15MB.
 * @param {string} videoUrl - The URL of the video to cache.
 * @returns {Promise<string>} - The local file path if cached, or the original URL if not cached.
 */
const cacheVideo = async (videoUrl) => {
    try {
        const fileName = videoUrl.split('/').pop();
        const filePath = `${FileSystem.cacheDirectory}${fileName}`;

        consolelog('Caching video from URL');

        // Check if the file already exists
        const fileInfo = await FileSystem.getInfoAsync(filePath);
        if (fileInfo.exists) {
            return filePath;
        }

        // Fetch the video size
        const response = await fetch(videoUrl, { method: 'HEAD' });
        const contentLength = response.headers.get('Content-Length');
        const sizeInMB = contentLength / (1024 * 1024);

        // Cache the video if it's less than 15MB
        console.log('Video size (MB):', sizeInMB);
        if (sizeInMB <= 15) {
            
            const downloadResult = await FileSystem.downloadAsync(videoUrl, filePath);
            return downloadResult.uri;
        }

        // Return the original URL if the video is larger than 15MB
        return videoUrl;
    } catch (error) {
        console.error('Error caching video:', error);
        return videoUrl;
    }
};

export default cacheVideo;