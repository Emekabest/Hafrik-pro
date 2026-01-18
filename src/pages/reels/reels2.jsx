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

    const setCurrentReel_store = useStore((state)=> state.setCurrentReel);



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


        /** A function that mutate IsNextVideo in the store......................... */

    // const lastCurrentReelRef = useRef({ shouldPlay: null, reelId: null });

    // const setNextIfChanged = (next) => {

    //     const prev = lastCurrentReelRef.current;
    //     if (prev.shouldPlay === next.shouldPlay && prev.reelId === next.reelId) return;


    //         setCurrentReel_store(next);
    //         lastCurrentReelRef.current = next;
    // };
    // /**......................................................................... */


   const onViewableItemsChanged = useRef(({ viewableItems, changed }) => {

        const visibleItems = viewableItems.filter(item => item.isViewable);
        const currentVisibleItem = visibleItems.length > 0 ? visibleItems[0].item : null;

        setCurrentReel_store({shouldPlay: true, reelId: currentVisibleItem.id});
    }).current;


    const viewabilityConfig = useRef({
        itemVisiblePercentThreshold: 50, 
        minimumViewTime: 100,
        waitForInteraction: true,
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
                        viewabilityConfig={viewabilityConfig}
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