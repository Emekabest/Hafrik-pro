import apiClient from '../api/apiClient';

const RepostController = async(postData, token)=>{

    const API_URL = `https://hafrik.com/api/v1/feed/share.php`;

    // const formData = new FormData();
    // formData.append('post_id', post_id);


    try{
        const response = await apiClient.post(API_URL, postData)

    
        return {status:response.status, data:response.data}
    }
    catch(error){

        return {status:error.status, data:error}
    }
}

export default RepostController