import axios from "axios";


const CreateReelsController = async(postData, token) => {

    const API_URL = `https://hafrik.com/api/v1/posts/create.php`;

    try {

        const response = await axios.post(API_URL, postData, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                }
        })

        console.log(response.data);
        return {status:response.status, message:"success", data:response.data};

    }
    catch (error) {
        console.log(error)
        return {status:error.response?.status || 500, message:error.message || "Error", data:null};
    }







}

export default CreateReelsController;