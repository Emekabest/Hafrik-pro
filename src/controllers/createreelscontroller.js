import apiClient from '../api/apiClient';


const CreateReelsController = async(postData, token) => {

    const API_URL = `https://hafrik.com/api/v1/feed/create.php`;

    try {

        const response = await apiClient.post(API_URL, postData)

        console.log(response.data);
        return {status:response.status, message:"success", data:response.data};

    }
    catch (error) {
        console.log(error)
        return {status:error.response?.status || 500, message:error.message || "Error", data:null};
    }







}

export default CreateReelsController;