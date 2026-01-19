import { use, useCallback, useEffect, useRef, useState } from "react";
import { Dimensions, FlatList, Platform, Text, View } from "react-native";
import GetReelsController from "../../controllers/getreelscontroller";
import { useAuth } from "../../AuthContext";
import ReelHeader from "./reelheader";
import ReelCard from "./reelcard";
import MainLoader from "../mainloader";
import AppDetails from "../../helpers/appdetails";
import useStore from "../../repository/store";
import ReelsManager from "../../helpers/reelsmanager";
import SkeletonReelCard from "./skelentonreelcard";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");
const ITEM_HEIGHT = SCREEN_HEIGHT - AppDetails.mainTabNavigatorHeight;




const Reels2 = () => {
    const { token } = useAuth();

    const [reels, setReels] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const reelsRef = useRef(reels);

    useEffect(() => {
        reelsRef.current = reels;
    }, [reels]);

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
        // append a dummy skeleton item at the end so it behaves like a reel
        const skeletonId = '__skeleton_end__';
        const data = Array.isArray(reelsFromStore) ? [...reelsFromStore] : [];
        if (!data.length || data[data.length - 1]?.id !== skeletonId) {
            data.push({ id: skeletonId, type: 'skeleton' });
        }
        setReels(data);

    },[reelsFromStore])




    const handleLoadMoreReels = async () => {

        console.log("Load more reels called");

        



    }


    const getItemLayout = useCallback((_, index) => ({
        length: ITEM_HEIGHT,
        offset: ITEM_HEIGHT * index,
        index
    }), []);



    const renderReels = ({item})=>{

        if (item && item.type === 'skeleton') {
            return <SkeletonReelCard />;
        }

        return (
            <ReelCard reel={item} />
        );
    }


    useEffect(() => {
        if (!reels || reels.length === 0) return;
        // call viewable callback for the first item on mount
        const firstReel = { index: 0, isViewable: true, item: reels[0], key: String(reels[0].id) };
        // run on next tick so FlatList and children have mounted
        const t = setTimeout(() => {
            onViewableItemsChanged({ viewableItems: [firstReel], changed: [firstReel] });
        }, 0);
        return () => clearTimeout(t);
    }, [reels, onViewableItemsChanged]);


    


   const onViewableItemsChanged = useRef(({ viewableItems, changed }) => {
        ReelsManager.singlePause();//Pause the current playing reel

        const visibleItems = viewableItems.filter(item => item.isViewable);
        const primary = visibleItems.length > 0 ? visibleItems[0] : null;
        const currentVisibleItem = primary ? primary.item : null;

        // only trigger playing for real reels (not the skeleton placeholder)
        if (currentVisibleItem && currentVisibleItem.type !== 'skeleton') {
            setCurrentReel_store({ shouldPlay: true, reelId: currentVisibleItem.id });
        }
        else{
            setCurrentReel_store({ shouldPlay: false, reelId: null });
        }

        // console.log()

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
                        decelerationRate="fast"
                        getItemLayout={getItemLayout}
                        showsVerticalScrollIndicator={false}
                        onViewableItemsChanged={onViewableItemsChanged}
                        viewabilityConfig={viewabilityConfig}
                        pagingEnabled
                        initialNumToRender={1}
                        maxToRenderPerBatch={1}
                        windowSize={10}  
                
                    />
               </>

            }
            
            
        </View>
    )

}

export default Reels2;