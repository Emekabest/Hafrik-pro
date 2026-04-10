import axios from "axios";

const getReportCategoriesController = async (token) => {
  try {

    const API_URL = "https://hafrik.com/api/v1/feed/report_cats.php"

    const reponse = await axios.get(API_URL, {
        headers: {
            Authorization: `Bearer ${token}`,
        },
    });


    return {data: reponse.data.data, status: reponse.status };
    
    
  } catch (error) {

    return { error: error.message, status: error.response?.status || 500 };
    
  }


}


const ReportPostController = async (body, token) => {
    try {
        const API_URL = "https://hafrik.com/api/v1/feed/report.php";

        const response = await axios.post(API_URL, body, {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        });

        return { data: response.data, status: response.status };

    }
    catch (error) {
        return { error: error.message, status: error.response?.status || 500 };
    }
}

const BlockUserController  = async (body, token)=>{
    try{
        const API_URL = "https://hafrik.com/api/v1/users/block.php"
        
        const response = await axios.post(API_URL, body, {
             headers: {
                Authorization: `Bearer ${token}`,
            },
        })

        return { data: response.data, status: response.status };

    }
    catch(err){

    }
}

export { getReportCategoriesController, ReportPostController, BlockUserController };