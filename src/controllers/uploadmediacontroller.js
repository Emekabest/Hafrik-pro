import axios from "axios";


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

          formData.append('type', uploadType || media.fileType || 'photo');
          formData.append('file', {
            uri: media.uri,
            type: media.type?.includes("image") ? "image/jpeg" : media.type?.includes("video") ? "video/mp4" : "application/octet-stream",
            name: media.fileName || 'file'
          });


          const response = await axios.post(API_URL, formData, {
            headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "multipart/form-data",
            },
            onUploadProgress: (progressEvent) => {
                if (onProgress && progressEvent.total) {
                    onProgress(progressEvent);
                }
            },
        })
  

        return {status:response.data.status, data:response.data.data} 

    }
    catch(error){

        console.log(error)

        return {status:error.status, message:error}
    }

}

export default UploadMediaController;