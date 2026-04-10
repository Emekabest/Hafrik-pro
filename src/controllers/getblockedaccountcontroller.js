import axios from "axios";


const GetBlockedAccountController = async (token) => {
   
    try {
        const API_URL = "https://hafrik.com/api/v1/users/blocked-list.php";

        const response = await axios.get(API_URL, {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        });

        // console.log(response.data.data);

        
        return { data: response.data.data, status: response.status };
        
    } catch (error) {
        return { error: error.message, status: error.response?.status || 500 };
        
    }


}

export default GetBlockedAccountController;