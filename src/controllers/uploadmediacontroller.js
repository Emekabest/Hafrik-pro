import axios from "axios";
import { useAuth } from "../AuthContext";



const UploadMediaController = async(media, token)=>{

    const API_URL = `https://hafrik.com/api/v1/uploads/media.php`;

    try{
        
          const formData = new FormData();

          formData.append('image', {
            uri:media.uri,
            type:"image/jpeg",
            name:"photo.jpg"
          });

          const response = await axios.post(API_URL, formData, {
            headers: {
                Authorization: `Bearer${token}`,
            },
          })

          console.log(response.data)

    }
    catch(error){

        // console.log("An error occured::", error)

        if (error.response) {
  console.log('Server responded:', error.response.data);
} else if (error.request) {
  console.log('Request made but no response');
} else {
  console.log('Axios config error:', error.message);
}

    }




}

export default UploadMediaController;