import axios from "axios"



const AddCommentController = async(post_id, comment, token)=>{

    const API_URL = `https://hafrik.com/api/v1/feed/add_comment.php`



        try{
        const response = await axios.post(API_URL , { post_id, comment }, {
            headers: {
                Authorization: `Bearer ${token}`,
            }
        })

        console.log(response.data)

        return {status:response.status, data:response.data.data.data}
    }
    catch(error){

        console.log(error.message)
        return {status:error.response.status, data:error.response.data}
    }



}
    

const GetCommentsController = async(post_id, token)=>{
    const API_URL = `https://hafrik.com/api/v1/feed/get_comments.php?post_id=${post_id}`;

    try{
        const response = await axios.get(API_URL , {
            headers: {
                Authorization: `Bearer ${token}`,
            }
        })


        return {status:response.status, data:response.data.data.data}
    }
    catch(error){

        console.log(error.message)
        return {status:error.response.status, data:error.response.data}
    }
}


export  {AddCommentController, GetCommentsController};