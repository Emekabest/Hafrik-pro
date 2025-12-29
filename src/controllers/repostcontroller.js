import axios from "axios"

const RepostController = async(post_id, token)=>{

    const API_URL = `https://hafrik.com//api/v1/feed/repost.php`;

    const formData = new FormData();
    formData.append('post_id', post_id);


    try{
        const response = await axios.post(API_URL , formData, {
            headers:{
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "multipart/form-data",
            }
        })

    
        console.log("Repost Response:", response.data);

        return {status:response.status, data:response.data}
    }
    catch(error){

        return {status:error.status, data:error}
    }
}

export default RepostController