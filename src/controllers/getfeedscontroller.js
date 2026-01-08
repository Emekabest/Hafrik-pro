import axios from "axios"

const GetFeedsController = async(url, token, page = 1)=>{
    const API_URL = `${url}?page=${page}`;

    console.log("GetFeedsController called with URL:", API_URL);

    try{
        const response = await axios.get(API_URL , {
            headers:{
                    Authorization: `Bearer ${token}`
            }
        })


        return {status:response.status, data:response.data.data.data}
    }
    catch(error){

        return {status:error.response.status, data:error}
    }

}


export default GetFeedsController;