import axios from "axios";

const GetCountryFeedController = async(countryCode, token)=>{
    
    const API_URL = `https://hafrik.com/api/v1/feed/list.php?country_id=${countryCode}`


    try{
        const response = await axios.get(API_URL, {
            headers:{
                    Authorization: `Bearer ${token}`        
            }
        })

    
        return {status:response.status, data:response.data.data.data}
    }
    catch(error){
        console.log(error);
        return {status:error.status, data:error}
    }

}

export default GetCountryFeedController;

