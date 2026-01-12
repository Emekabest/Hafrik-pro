import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";



const GetBannersController = async () => {

    const selectedCountry = JSON.parse(await AsyncStorage.getItem('selected_country'));

    const API_URL = selectedCountry && selectedCountry.country_id !== "all" ? `https://hafrik.com//api/v1/home/banners.php?country_id=${selectedCountry.country_id}` : `https://hafrik.com//api/v1/home/banners.php`;

    try {
        const response = await axios.get(API_URL);

        return {status: response.status, data: response.data.data};
    } catch (error) {

        return {status: error.response ? error.response.status : 500, data: null};        
    }

}

export default GetBannersController;