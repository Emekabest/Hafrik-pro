import { useCallback, useEffect, useRef, useState } from "react";
import { Dimensions, FlatList, Text, View } from "react-native";
import GetReelsController from "../../controllers/getreelscontroller";
import { useAuth } from "../../AuthContext";
import ReelHeader from "./reelheader";
import ReelCard from "./reelcard";
import MainLoader from "../mainloader";
import AppDetails from "../../helpers/appdetails";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");
const ITEM_HEIGHT = SCREEN_HEIGHT - AppDetails.mainTabNavigatorHeight;




const Reels2 = () => {
    const { token } = useAuth();

    const flatListRef = useRef(null);
    const startIndexRef = useRef(0);

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




    const getItemLayout = useCallback((_, index) => ({
        length: ITEM_HEIGHT,
        offset: ITEM_HEIGHT * index,
        index
    }), []);



    const onScrollBeginDrag = useRef(({ nativeEvent }) => {

        console.log("Scroll Begin Drag"+JSON.stringify(nativeEvent));
        const offsetY = nativeEvent.contentOffset?.y ?? 0;
        startIndexRef.current = Math.round(offsetY / ITEM_HEIGHT);
    }).current;

    
    const onMomentumScrollEnd = useRef(({ nativeEvent }) => {

        console.log("Momentum Scroll End"+JSON.stringify(nativeEvent));

        const offsetY = nativeEvent.contentOffset?.y ?? 0;
        let targetIndex = Math.round(offsetY / ITEM_HEIGHT);
        const start = startIndexRef.current;
        const delta = targetIndex - start;

        // clamp to only move one item in either direction
        if (Math.abs(delta) > 1) {
        targetIndex = start + Math.sign(delta);
        if (flatListRef.current && typeof flatListRef.current.scrollToIndex === 'function') {
            flatListRef.current.scrollToIndex({ index: targetIndex, animated: true });
        }
        }
    // set current playing id/state here if you use it
  }).current;

    





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
                        style={{backgroundColor:"#000"}}
                        data={reels}
                        keyExtractor={(item)=> String(item.id)}
                        renderItem={renderReels}
                        snapToAlignment="start"
                        snapToInterval={ITEM_HEIGHT}
                        decelerationRate="fast"
                        getItemLayout={getItemLayout}
                        showsVerticalScrollIndicator={false}
                        onScrollBeginDrag={onScrollBeginDrag}
                        onMomentumScrollEnd={onMomentumScrollEnd}
                        
                
                    />
               </>

            }
            
            
        </View>
    )

}

export default Reels2;