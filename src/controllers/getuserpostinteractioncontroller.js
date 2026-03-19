import apiClient from '../api/apiClient';


const getUserPostInteractionController = async(post_id, token)=>{
    console.log("Single post id: ", post_id)
    const API_URL = `https://hafrik.com/api/v1/feed/view.php?id=${post_id}`


    try{
        const response = await apiClient.get(API_URL)

    
        return {status:response.status, data:response.data.data}
    }
    catch(error){

        return {status:error.status, data:error}
    }

    
}


export default getUserPostInteractionController;