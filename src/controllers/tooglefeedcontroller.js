import axios from "axios"

/**
 * React to a post.
 * Sending the same reaction again removes it (toggle).
 * @param {number} post_id
 * @param {string} token
 * @param {string} reaction - like | love | haha | yay | wow | sad | angry
 * @returns {{ status, data: { is_reacted, my_reaction, reactions } }}
 */
const ToggleFeedController = async(post_id, token, reaction = 'like')=>{
    const API_URL = `https://hafrik.com/api/v1/feed/react.php`;

    try{
        const response = await axios.post(API_URL, { post_id, reaction }, {
            headers:{
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json",
            }
        })

        return {status:response.status, data:response.data?.data ?? response.data}
    }
    catch(error){

        return {status:error.response?.status ?? error.status ?? 500, data:error.response?.data ?? error}
    }
}


export default ToggleFeedController;