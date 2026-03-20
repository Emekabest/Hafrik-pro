import apiClient from '../api/apiClient';


const GetReelsController = async(token, page = 1, reelSeed) => {
    //   ${API_BASE}/reels/list.php?page=${page}&limit=10&mode=for_you&seed=${reelSeed}


    try{
        const response = await apiClient.get(`https://hafrik.com/api/v1/reels/list.php?page=${page}&limit=10&mode=for_you&seed=${reelSeed}`, {
            headers: { 'Cache-Control': 'no-cache' },
        });

        return {status: response.status, data: response.data.data.data};
    }
    catch(error){

        console.log("Error in GetReelsController:", error.message);
        return {status: error.response ? error.response.status : 500, data: null};
    }

}


export default GetReelsController;