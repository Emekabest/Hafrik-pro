import axios from "axios"


const GetCommentsController = async(post_id, token)=>{
    const API_URL = `https://hafrik.com/api/v1/feed/comments.php?post_id=${post_id}`;

    try{
        const response = await axios.get(API_URL , {
            headers: {
                Authorization: `Bearer ${token}`,
            }
        })

        console.log(response.data)

        // return {status:response.status, data:response.data.data.data}
    }
    catch(error){

        console.log(error)
        return {status:error.response.status, data:error.response.data}
    }
}


export default GetCommentsController;