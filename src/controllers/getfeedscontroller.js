import axios from "axios"

const GetFeedsController = async()=>{
    const API_URL = 'https://hafrik.com/api/v1/feed/list.php';

    try{
        const response = await axios.get(API_URL)

        return {status:response.status, data:response.data.data.data}
    }
    catch(error){

        return {status:error.response.status, data:error.response.data}
    }
}

export default GetFeedsController;