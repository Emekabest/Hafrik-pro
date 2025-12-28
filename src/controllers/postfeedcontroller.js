import axios from "axios";


const PostFeedController = async(postData, token)=>{
    console.log("Hmmmmm")
    const API_URL = `https://hafrik.com/api/v1/posts/create.php`;


    try{

        const response = await axios.post(API_URL, postData, {
            headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            }
        })


        return {status:response.status, message:"Success"}
    }
    catch(error){

        return{status:error.status, message:error.message}
    }

}

export default PostFeedController;