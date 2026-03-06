import axios from "axios"

/**
 * Toggle save / unsave a post.
 * @param {number} post_id
 * @param {string} token
 * @returns {{ status, data: { post_id, is_saved } }}
 */
const ToggleSaveController = async(post_id, token)=>{
    const API_URL = `https://hafrik.com/api/v1/feed/save.php`;

    try{
        const response = await axios.post(API_URL, { post_id }, {
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


export default ToggleSaveController;