import axios from "axios";


const PushNotificationController = async (msg)=>{

    const message = {
        to: msg.token,
        sound: "default",
        title: msg.title,
        body: msg.body,
        data: { type: "message" }
    };
    
    try {
        const API_URL = "https://exp.host/--/api/v2/push/send";
        const reponse = await axios.post(API_URL, message, {
            headers :{
                "Content-Type": "application/json"
            },
           
        })



        return {status: "success", data: reponse.data}


    } catch (error) {

        return {status: "error", message: error.message}
        
    }


}


export default PushNotificationController;