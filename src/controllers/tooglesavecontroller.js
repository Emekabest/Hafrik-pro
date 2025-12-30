import axios from "axios"

const ToggleSaveController = async(post_id, token)=>{
    const API_URL = `https://hafrik.com/api/v1/feed/toggle_save.php`;

    const formData = new FormData();
    formData.append('post_id', post_id);

    try{
        const response = await axios.post(API_URL , formData, {
            headers:{
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "multipart/form-data",
            }
        })

    
        return {status:response.status, data:response.data}
    }
    catch(error){

        return {status:error.status, data:error}
    }
}


export default ToggleSaveController;