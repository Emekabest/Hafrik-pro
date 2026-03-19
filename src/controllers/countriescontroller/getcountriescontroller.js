import apiClient from '../../api/apiClient';

const GetCountriesController = async(token)=>{

    const API_URL = `https://hafrik.com/api/v1/location/countries.php`


    try{
        const response = await apiClient.get(API_URL)


        return {status:response.status, data:response.data.data}
    }
    catch(error){
        return {status:error.status, data:error}
    }

}


export default GetCountriesController;