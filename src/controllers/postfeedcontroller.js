import axios from "axios";


const PostFeedController = (postData)=>{


    try{

        const response = axios.post(url, postData, {
        headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        }
    })

    

    }
    catch(error){

        return{status:error.status, message:error.message}
    }


}

export default PostFeedController;