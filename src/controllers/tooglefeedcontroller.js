import axios from "axios"

const ToggleFeedController = async(post_id, token)=>{
    const API_URL = `https://hafrik.com/api/v1/feed/toggle_like.php`;

    try{
        const response = await axios.post(API_URL , { post_id }, {
            headers:{
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json'
            }
        })

    
        console.log(response.data)
        // return {status:response.status, data:response.data.data.data}
    }
    catch(error){

        console.log("An error occured::"+error)
        return {status:error.response.status, data:error.response.data}
    }
}


export default ToggleFeedController;