import axios from "axios";


const CreateReelsController = async(formData, token) => {

    const API_URL = "https://hafrik.com/api/v1/reels/upload.php";

    try {

        const response = await axios.post(API_URL, formData, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'multipart/form-data',
                }
        })

        console.log(response.data);
        return {status:response.status, message:"success", data:response.data};

    }
    catch (error) {
        console.log(error)
        return {status:error.response?.status || 500, message:error.message + "oo" || "Error", data:null};
    }







}

export default CreateReelsController;