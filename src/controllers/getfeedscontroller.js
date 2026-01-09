import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios"


const GetFeedsController = async(url, token, page = 1)=>{


    const selectedCountry = JSON.parse(await AsyncStorage.getItem('selected_country'));

    const API_URL = selectedCountry && selectedCountry.country_id && selectedCountry.country_id !== 'all' ?
        `${url}?country_id=${selectedCountry.country_id}&page=${page}` :
        `${url}?page=${page}`;
    
    try{
        const response = await axios.get(API_URL, {
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