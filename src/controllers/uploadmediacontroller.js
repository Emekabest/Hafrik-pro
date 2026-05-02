import apiClient from '../api/apiClient';

const inferMimeType = (media = {}) => {
    const explicit = media.mimeType || media.type || '';
    if (explicit.includes('/')) return explicit;

    const name = String(media.fileName || media.name || media.uri || '').toLowerCase();
    if (name.endsWith('.mov') || name.endsWith('.qt')) return 'video/quicktime';
    if (name.endsWith('.mp4') || name.endsWith('.m4v')) return 'video/mp4';
    if (name.endsWith('.webm')) return 'video/webm';
    if (name.endsWith('.jpg') || name.endsWith('.jpeg')) return 'image/jpeg';
    if (name.endsWith('.png')) return 'image/png';
    if (name.endsWith('.webp')) return 'image/webp';

    if (explicit.includes('image')) return 'image/jpeg';
    if (explicit.includes('video')) return 'video/mp4';
    return 'application/octet-stream';
};

const normalizeFileName = (media = {}, mime = '') => {
    const raw = media.fileName || media.name || String(media.uri || '').split('/').pop() || 'file';
    if (raw.includes('.')) return raw;
    if (mime === 'video/quicktime') return `${raw}.mov`;
    if (mime === 'video/mp4') return `${raw}.mp4`;
    if (mime === 'image/png') return `${raw}.png`;
    if (mime === 'image/webp') return `${raw}.webp`;
    if (mime.startsWith('image/')) return `${raw}.jpg`;
    return raw;
};


/**
 * @param {Object}  media       – { uri, fileName, type, fileType }
 * @param {string}  token       – auth token
 * @param {Function} onProgress – axios onUploadProgress callback
 * @param {string}  [uploadType] – explicit type for the API: "photo" | "video" | "reel" | "thumbnail"
 *                                 Falls back to media.fileType if omitted.
 */
const UploadMediaController = async(media, token, onProgress, uploadType)=>{
    const API_URL = `https://hafrik.com/api/v1/uploads/media.php`;


    try{
          const formData = new FormData();
          const resolvedType = uploadType || media.fileType || 'photo';
          const resolvedMime = inferMimeType(media);
          const resolvedName = normalizeFileName(media, resolvedMime);

          console.log('[UploadMedia] request:', {
            endpoint: API_URL,
            uploadType,
            resolvedType,
            fileName: resolvedName,
            mime: media.type,
            mimeType: media.mimeType,
            resolvedMime,
            fileSize: media.fileSize,
            hasToken: !!token,
            uri: media.uri,
          });

          formData.append('type', resolvedType);
          formData.append('file', {
            uri: media.uri,
            type: resolvedMime,
            name: resolvedName
          });


          const isLargeUpload = ['video', 'reel', 'thumbnail'].includes(resolvedType);
          const response = await apiClient.post(API_URL, formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
            timeout: isLargeUpload ? 0 : 30000, // no timeout for videos; 30s for photos
            onUploadProgress: (progressEvent) => {
                if (onProgress && progressEvent.total) {
                    onProgress(progressEvent);
                }
            },
        })

        console.log('[UploadMedia] response:', {
            httpStatus: response.status,
            uploadType: resolvedType,
            data: response.data,
        });
  

        return {status:response.data.status, data:response.data.data} 

    }
    catch(error){

        console.log('[UploadMedia] error:', {
            message: error?.message,
            code: error?.code,
            status: error?.status,
            httpStatus: error?.response?.status,
            response: error?.response?.data,
            hasRequest: !!error?.request,
        });

        return {
            status: 'error',
            httpStatus: error?.response?.status || error?.status,
            message: error?.response?.data?.message || error?.message || 'Upload failed',
            errorData: error?.response?.data,
        }
    }

}

export default UploadMediaController;
