import { useCallback, useEffect, useRef, useState } from "react";
import { Dimensions, FlatList, Text, View } from "react-native";
import { PanGestureHandler, State } from 'react-native-gesture-handler';
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
    const currentIndexRef = useRef(0);
    const startDragRef = useRef({ offset: 0, t: 0 });
    const ignoreMomentumRef = useRef(false);
    const snapTimeoutRef = useRef(null);


    const [reels, setReels] = useState([]);
    const [isLoading, setIsLoading] = useState(true);



    useEffect(()=>{
        const getReelsData = async()=>{
            setIsLoading(true);
            const response = await GetReelsController(token)

            if (response.status === 200){
                setReels(response.data);
                currentIndexRef.current = 0;
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

    const gestureTriggeredRef = useRef(false);
    const SWIPE_TRIGGER = Math.min(80, ITEM_HEIGHT * 0.15); // px threshold to trigger immediate snap

    const onGestureEvent = useCallback(({ nativeEvent }) => {
        const translationY = nativeEvent.translationY ?? 0;
        if (gestureTriggeredRef.current) return;
        // swipe up (negative translation) -> next
        if (translationY <= -SWIPE_TRIGGER) {
            gestureTriggeredRef.current = true;
            const start = currentIndexRef.current;
            const target = Math.min(reels.length - 1, start + 1);
            if (target !== start && flatListRef.current) {
                flatListRef.current.scrollToIndex({ index: target, animated: true });
                currentIndexRef.current = target;
            }
        }
        // swipe down (positive translation) -> prev
        if (translationY >= SWIPE_TRIGGER) {
            gestureTriggeredRef.current = true;
            const start = currentIndexRef.current;
            const target = Math.max(0, start - 1);
            if (target !== start && flatListRef.current) {
                flatListRef.current.scrollToIndex({ index: target, animated: true });
                currentIndexRef.current = target;
            }
        }
    }, [reels]);

    const onScrollBeginDrag = useRef(({ nativeEvent }) => {

        const offsetY = nativeEvent.contentOffset?.y ?? 0;
        startIndexRef.current = Math.round(offsetY / ITEM_HEIGHT);
        startDragRef.current = { offset: offsetY, t: Date.now() };
        ignoreMomentumRef.current = false;
        console.log('[reels] onScrollBeginDrag', { offsetY, startIndex: startIndexRef.current });
    }).current;

    
    const onMomentumScrollEnd = useRef(({ nativeEvent }) => {

        if (ignoreMomentumRef.current) {
            // we already corrected during onScrollEndDrag
            ignoreMomentumRef.current = false;
            return;
        }

        const offsetY = nativeEvent.contentOffset?.y ?? 0;
        let targetIndex = Math.round(offsetY / ITEM_HEIGHT);
        const start = startIndexRef.current;
        const delta = targetIndex - start;
        console.log('[reels] onMomentumScrollEnd', { offsetY, targetIndex, start, delta });

        // clamp to only move one item in either direction
        if (Math.abs(delta) > 1) {
            targetIndex = start + Math.sign(delta);
            // clamp to bounds
            const maxIndex = Math.max(0, reels.length - 1);
            targetIndex = Math.max(0, Math.min(maxIndex, targetIndex));
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

    const onHandlerStateChange = useCallback(({ nativeEvent }) => {
        if (nativeEvent.state === State.END) {
            const translationY = nativeEvent.translationY ?? 0;
            const startIndex = currentIndexRef.current;
            let targetIndex = startIndex;
            if (translationY < 0) targetIndex = startIndex + 1; // swipe up -> next
            else if (translationY > 0) targetIndex = startIndex - 1; // swipe down -> prev



            const maxIndex = Math.max(0, reels.length - 1);
            targetIndex = Math.max(0, Math.min(maxIndex, targetIndex));

            if (flatListRef.current && typeof flatListRef.current.scrollToIndex === 'function') {
                // ensure exact start position first
                flatListRef.current.scrollToIndex({ index: startIndex, animated: false });
            }

            if (targetIndex !== startIndex && flatListRef.current && typeof flatListRef.current.scrollToIndex === 'function') {
                ignoreMomentumRef.current = true;
                flatListRef.current.scrollToIndex({ index: targetIndex, animated: true });
                currentIndexRef.current = targetIndex;
                setTimeout(() => { ignoreMomentumRef.current = false; }, 300);
            }
        }
    }, [reels]);


    return(

        <View style={{ flex: 1}}>

            {
                isLoading ?
                    <MainLoader visible={isLoading} />

                :

               <>
                    <ReelHeader />


                    <PanGestureHandler onGestureEvent={onGestureEvent} onHandlerStateChange={onHandlerStateChange} enabled={true}>
                        <FlatList
                            ref={flatListRef}
                            style={{backgroundColor:"#000"}}
                            data={reels}
                            keyExtractor={(item)=> String(item.id)}
                            renderItem={renderReels}
                            snapToAlignment="start"
                            snapToInterval={ITEM_HEIGHT}
                            decelerationRate="fast"
                            getItemLayout={getItemLayout}
                            showsVerticalScrollIndicator={false}
                            scrollEnabled={false}
                        />
                    </PanGestureHandler>
               </>

            }
            
            
        </View>
    )

}

export default Reels2;