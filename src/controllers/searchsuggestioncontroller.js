import apiClient from '../api/apiClient';


const SearchSuggestionController = async(query, token)=>{

    try {

        const API_URL = `https://hafrik.com/api/v1/search/index.php?q=${query}`;

        const response = await apiClient.get(API_URL)

        // console.log(response.data);

        return {status:response.status, data:response.data}
        
    } catch (error) {

        return {status:error.response.status, data:error.response.data}

        
    }



}

export default SearchSuggestionController;