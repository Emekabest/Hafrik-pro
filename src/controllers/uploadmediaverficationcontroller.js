import axios from "axios";

const UploadVerificationDocumentController = async(media, uploadType, token)=>{

    try {
        const API_URL = `https://hafrik.com/api/v1/uploads/media.php`;

          const formData = new FormData();

          formData.append('type', uploadType || media.fileType || 'photo');
          formData.append('file', {
            uri: media.uri,
            type: media.type?.includes("image") ? "image/jpeg" : media.type?.includes("video") ? "video/mp4" : "application/octet-stream",
            name: media.fileName || 'file'
          });

          const response = await axios.post(API_URL, formData, {
            headers: { 'Content-Type': 'multipart/form-data', Authorization: `Bearer ${token}` },
            // timeout: 30000, // 30s timeout for verification documents
        })


        return {status:response.data.status, data:response.data.data}

        
    } catch (error) {

        return {status:error.status, message:error}
        
    }


}


export default UploadVerificationDocumentController;
