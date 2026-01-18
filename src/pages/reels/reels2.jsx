import { use, useCallback, useEffect, useRef, useState } from "react";
import { Dimensions, FlatList, Platform, Text, View } from "react-native";
import GetReelsController from "../../controllers/getreelscontroller";
import { useAuth } from "../../AuthContext";
import ReelHeader from "./reelheader";
import ReelCard from "./reelcard";
import MainLoader from "../mainloader";
import AppDetails from "../../helpers/appdetails";
import useStore from "../../repository/store";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");
const ITEM_HEIGHT = SCREEN_HEIGHT - AppDetails.mainTabNavigatorHeight;




const Reels2 = () => {
    const { token } = useAuth();

    const flatListRef = useRef(null);
    const startIndexRef = useRef(0);

    const [reels, setReels] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    const reelsFromStore = useStore((state)=> state.reels);
    const setReelsToStore = useStore((state)=> state.setReels);



    useEffect(()=>{
        const getReelsData = async()=>{
            setIsLoading(true);
            const response = await GetReelsController(token)

            if (response.status === 200){
                setReelsToStore(response.data);
            }
            setIsLoading(false);
        }
        getReelsData();//Store!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
    },[])


    useEffect(()=>{

        console.log("Reels From Store Changed::"+reelsFromStore.length);
        setReels(reelsFromStore);

    },[reelsFromStore])



    const getItemLayout = useCallback((_, index) => ({
        length: ITEM_HEIGHT,
        offset: ITEM_HEIGHT * index,
        index
    }), []);




    const renderReels = ({item})=>{

        return(

            <ReelCard reel={item} /> 

        )
    }


    

   const onViewableItemsChanged = useRef(({ viewableItems, changed }) => {



    }).current;


    return(

        <View style={{ flex: 1}}>

            {
                isLoading ?
                    <MainLoader visible={isLoading} />

                :

               <>
                    <ReelHeader />


                    <FlatList
                        style={{backgroundColor:"#000"}}
                        data={reels}
                        keyExtractor={(item)=> String(item.id)}
                        renderItem={renderReels}
                        // snapToAlignment="start"
                        // snapToInterval={
                        //     Platform.OS === 'android' ? ITEM_HEIGHT : undefined
                        // }
                        decelerationRate="fast"
                        getItemLayout={getItemLayout}
                        showsVerticalScrollIndicator={false}
                        // onScrollBeginDrag={onScrollBeginDrag}
                        // onMomentumScrollEnd={onMomentumScrollEnd}
                        onViewableItemsChanged={onViewableItemsChanged}
                        pagingEnabled
                        initialNumToRender={1}
                        maxToRenderPerBatch={1}
                        windowSize={5}  
                
                    />
               </>

            }
            
            
        </View>
    )

}

export default Reels2;