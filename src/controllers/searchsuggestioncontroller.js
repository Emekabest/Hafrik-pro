import axios from "axios";
import App from "../../App"


const SearchSuggestionController = async(query, token)=>{

    try {

        const API_URL = `https://hafrik.com/api/v1/search/index.php?q=${query}`;

        const response = await axios.get(API_URL, {
            headers:{
                    Authorization: `Bearer ${token}`
            }
        })

        console.log(response.data)

        // return {status:response.status, data:response.data.data}
        
    } catch (error) {

        return {status:error.response.status, data:error.response.data}

        
    }



}

export default SearchSuggestionController;