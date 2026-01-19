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


    const reelsFromStore = useStore((state)=> state.reels);
    const setReelsToStore = useStore((state)=> state.setReels);

    const setCurrentReel_store = useStore((state)=> state.setCurrentReel);

    const [reels, setReels] = useState([]);


    

    
    const reelsRef = useRef(reels);
    const pageRef = useRef(1);

    const isLoadingMore = useRef(false);


    

    useEffect(() => {
        reelsRef.current = reels;
    }, [reels]);





    useEffect(()=>{
        const getReelsData = async()=>{
            console.log("Fetching initial reels data");
            const response = await GetReelsController(token, 1)

            if (response.status === 200){
                setReelsToStore(response.data);
            }
        }
        getReelsData()
    },[])


    useEffect(()=>{

        // append a dummy skeleton item at the end so it behaves like a reel
        const skeletonId = '__skeleton_end__';
        const raw = Array.isArray(reelsFromStore) ? [...reelsFromStore] : [];

        const filteredData = raw.filter(item => item && item.type !== 'skeleton' && String(item.id) !== skeletonId);
        const data = [...filteredData];

        if (!data.length || data[data.length - 1]?.id !== skeletonId) {
            data.push({ id: skeletonId, type: 'skeleton' });
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


    // const isReelMounted = useRef(false);
    // useEffect(() => {
    //     if (!reels || reels.length === 0 || isReelMounted.current) return;
    //     console.log("I triggered", reels.length)
    //     // call viewable callback for the first item on mount
    //     const firstReel = { index: 0, isViewable: true, item: reels[0], key: String(reels[0].id) };
    //     // run on next tick so FlatList and children have mounted

    //     isReelMounted.current = true;
    //     const t = setTimeout(() => {
    //         onViewableItemsChanged({ viewableItems: [firstReel], changed: [firstReel] });
    //     }, 0);
    //     return () => clearTimeout(t);
    // }, [reels, onViewableItemsChanged]);


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


        //Trigger load more when second last reel is visible

        // if (primary.index === reelsRef.current.length -3 ){
        //     console.log("Next reel will trigger Loading more")

        // }

        // if (primary.index === reelsRef.current.length -2 ){
        //     handleLoadMoreReels();
        // }


    }).current;


    const viewabilityConfig = useRef({
        itemVisiblePercentThreshold: 50, 
        minimumViewTime: 100,
        waitForInteraction: true,
    }).current;






    return(

        <View style={{ flex: 1}}>

       
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
          
        </View>
    )

}

export default Reels2;