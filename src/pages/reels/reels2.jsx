import { useCallback, useEffect, useState } from "react";
import { FlatList, Text, View } from "react-native";
import GetReelsController from "../../controllers/getreelscontroller";
import { useAuth } from "../../AuthContext";
import ReelHeader from "./reelheader";
import ReelCard from "./reelcard";
import MainLoader from "../mainloader";
import AppDetails from "../../helpers/appdetails";




const Reels2 = () => {
    const { token } = useAuth();

    const [reels, setReels] = useState([]);
    const [isLoading, setIsLoading] = useState(true);



    useEffect(()=>{
        const getReelsData = async()=>{
            setIsLoading(true);
            const response = await GetReelsController(token)

            if (response.status === 200){
                setReels(response.data);
            }
            setIsLoading(false);
        }
        getReelsData();//Store!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
    },[])






    const renderReels = ({item})=>{

        return(

            <ReelCard reel={item} /> 

        )
    }


    return(

        <View style={{ flex: 1}}>

            {
                isLoading ?
                    <MainLoader visible={isLoading} />

                :

               <>
                    <ReelHeader />


                    <FlatList
                        style={{backgroundColor:"green"}}
                        data={reels}
                        keyExtractor={(item)=> item.id}
                        renderItem={renderReels}
                
                    />
               </>

            }
            
            
        </View>
    )

}

export default Reels2;