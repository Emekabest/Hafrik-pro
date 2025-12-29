import axios from "axios"


const getUserPostInteractionController = async(post_id, token)=>{
    const API_URL = `https://hafrik.com/api/v1/feed/view.php?id=${post_id}`


    try{
        const response = await axios.get(API_URL, {
            headers:{
                    Authorization: `Bearer ${token}`        
            }
        })

    
        return {status:response.status, data:response.data.data}
    }
    catch(error){

        return {status:error.status, data:error}
    }

    
}


export default getUserPostInteractionController;