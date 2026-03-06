import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";



const GetBannersController = async () => {

    const selectedCountry = JSON.parse(await AsyncStorage.getItem('selected_country'));

    // Accept both country_id (normalised) and id (raw API shape)
    const countryId = selectedCountry?.country_id ?? selectedCountry?.id;
    const API_URL = (countryId && countryId !== 'all')
        ? `https://hafrik.com/api/v1/home/banners.php?country_id=${countryId}`
        : `https://hafrik.com/api/v1/home/banners.php`;

    try {
        const response = await axios.get(API_URL);

        return {status: response.status, data: response.data.data};
    } catch (error) {

        return {status: error.response ? error.response.status : 500, data: null};        
    }

}

export default GetBannersController;