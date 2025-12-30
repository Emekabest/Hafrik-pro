import * as FileSystem from "expo-file-system/legacy";


/**
 * Caches a video locally if its size is less than 15MB.
 * @param {string} videoUrl - The URL of the video to cache.
 * @returns {Promise<string>} - The local file path if cached, or the original URL if not cached.
 */
const cacheVideo = async (videoUrl) => {
    try {

        const FILE_SIZE_LIMIT_MB = 20;

        const cacheDirectory = FileSystem.cacheDirectory;
        const fileName = videoUrl.split('/').pop().replace(/[^a-zA-Z0-9_.-]/g, '_');

        if (!cacheDirectory) throw new Error('Cache directory is undefined');

        const filePath = `${cacheDirectory}${fileName}`;

        

        // Check if the file already exists
        const fileInfo = await FileSystem.getInfoAsync(filePath);
        if (fileInfo.exists) {
            return filePath;
        }


        // Fetch the video size
        const response = await fetch(videoUrl, { method: 'HEAD' });
        const contentLength = response.headers.get('Content-Length');
        const sizeInMB = contentLength / (1024 * 1024);

        // Cache the video if it's less than 20MB
        console.log({filename: fileName, size: sizeInMB});
        if (sizeInMB <= FILE_SIZE_LIMIT_MB) {
            
            console.log(`I downloaded file:${fileName} of size: ${sizeInMB} MB to cache.`);
            const downloadResult = await FileSystem.downloadAsync(videoUrl, filePath);
            return downloadResult.uri;
        }

            console.log(`I did NOT downloaded file:${fileName} of size: ${sizeInMB} MB to cache.`);

        // Return the original URL if the video is larger than 15MB
        return videoUrl;
    } catch (error) {
        console.error('Error caching video:', error);
        return videoUrl;
    }
};

export default cacheVideo;