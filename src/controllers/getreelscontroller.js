import axios from "axios"


const GetReelsController = async(token, page = 1) => {

    try{
        const response = await axios.get(`https://hafrik.com/api/v1/reels/list.php?page=${page}`, {
            headers:{
                    Authorization: `Bearer ${token}`,
                    'Cache-Control': 'no-cache'
            }
        })

        return {status: response.status, data: response.data.data.data};
    }
    catch(error){

        
        console.log("Error in GetReelsController:", error.message);
        return {status: error.response ? error.response.status : 500, data: null};
    }

}


export default GetReelsController;