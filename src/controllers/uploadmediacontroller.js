import axios from "axios";


const UploadMediaController = async(media, token)=>{

    const API_URL = `https://hafrik.com/api/v1/uploads/media.php`;

    try{
          const formData = new FormData();

          formData.append('type', 'photo');
          formData.append('file', {
            uri: media.uri,
            type: "image/jpeg",
            name: media.fileName
          });

          
          const response = await axios.post(API_URL, formData, {
            headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "multipart/form-data",
            },
        })
  

        return {status:response.data.status, data:response.data.data} 

    }
    catch(error){

        return {status:error.status, message:error}
    }

}

export default UploadMediaController;