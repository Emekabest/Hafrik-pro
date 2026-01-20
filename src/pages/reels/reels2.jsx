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
    const currentIndexRef = useRef(0);
    const startDragRef = useRef({ offset: 0, t: 0 });
    const ignoreMomentumRef = useRef(false);
    const snapTimeoutRef = useRef(null);


    const [reels, setReels] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    const isLoadingMore = useRef(false);
    const pageRef = useRef(1);
    const reelsRef = useRef(reels);

    const reelsFromStore = useStore((state)=> state.reels);
    const setReelsToStore = useStore((state)=> state.setReels);

    const setCurrentReel_store = useStore((state)=> state.setCurrentReel);



    useEffect(()=>{
        reelsRef.current = reels;
    },[reels])


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


    useEffect(()=>{

        // append a dummy skeleton item at the end so it behaves like a reel
        const skeletonId = '__skeleton_end__';
        const raw = Array.isArray(reelsFromStore) ? [...reelsFromStore] : [];

        const filteredData = raw.filter(item => item && item.type !== 'skeleton' && String(item.id) !== skeletonId);
        const data = [...filteredData];

        if (!data.length || data[data.length - 1]?.id !== skeletonId) {
            // data.push({ id: skeletonId, type: 'skeleton' });
        }
        setReels(data);

    },[reelsFromStore])




    const handleLoadMoreReels = async () => {
        if (isLoadingMore.current) return;
        isLoadingMore.current = true;


        console.log("Loading more reels...")

        // pause to avoid register/unregister race while we modify the list
        ReelsManager.singlePause();

        const nextPage = pageRef.current + 1;
        const response = await GetReelsController(token, nextPage);

        if (response.status === 200) {
            // base list WITHOUT skeleton placeholders
            const base = (reelsRef.current || []).filter(
            r => r && r.type !== 'skeleton' && String(r.id) !== '__skeleton_end__'
            );

            // dedupe incoming items against base ids
            const existingIds = new Set(base.map(r => String(r.id)));
            const newItems = (response.data || []).filter(i => i && !existingIds.has(String(i.id)));

            if (newItems.length > 0) {
            setReelsToStore([...base, ...newItems]);
            pageRef.current = nextPage;
            console.log("New reels Loaded, new page:", nextPage);
            }
        } else {
            console.log("Failed to load more reels at page:", nextPage);
        }

        isLoadingMore.current = false;
    };


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