import { useEffect, useState } from "react";
import { Text, View } from "react-native";
import GetReelsController from "../../controllers/getreelscontroller";
import { useAuth } from "../../AuthContext";
import ReelHeader from "./reelheader";
import ReelCard from "./reelcard";




const Reels2 = () => {
    const { token } = useAuth();

    const [reels, setReels] = useState([]);


    useEffect(()=>{
        const getReelsData = async()=>{
            const response = await GetReelsController(token)

            if (response.status === 200){
                setReels(response.data);
            }
        }
        getReelsData();
    },[])


    

    return(
        <View>
            <ReelHeader />
            <ReelCard />            
        </View>
    )


}

export default Reels2;