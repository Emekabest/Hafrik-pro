import axios from "axios"

const GetFeedsController = async(token)=>{
    const API_URL = 'https://hafrik.com/api/v1/feed/list.php?page=3';

    try{
        const response = await axios.get(API_URL ,  {
            headers:{
                    Authorization: `Bearer ${token}`
            }
        })

        return {status:response.status, data:response.data.data.data}
    }
    catch(error){

        return {status:error.response.status, data:error.response.data}
    }
}

export default GetFeedsController;