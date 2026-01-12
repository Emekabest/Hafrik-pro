import request from "superagent";


const testSuperagent = async (token) => {


    try{

       const response = await request
            .get("https://hafrik.com/api/v1/feed/list.php?page=1")
            .set("Authorization", `Bearer ${token}`);


            console.log("From super agent::")
            console.log(response.body.data);

    }
    catch(error){

        console.log("Feed Error:", error);
    }


}

export default testSuperagent;