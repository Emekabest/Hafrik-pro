import { Dimensions, StyleSheet, View, StatusBar, Platform, AppState } from "react-native";
import ReelMedia from "./reelmedia";
import ReelInteractionContainer from "./reelinteractioncontainer";
import { memo, useEffect, useRef, useState } from "react";
import AppDetails from "../../helpers/appdetails";
import ReelsManager from "../../helpers/reelsmanager";
import useStore from "../../repository/store";
import { useIsFocused } from "@react-navigation/native";
// import { StatusBar } from "expo-status-bar";


const { height: SCREEN_HEIGHT } = Dimensions.get("window");


const ReelCard = ({ reel, isActive }) => {

    const isFocused = useIsFocused()
    const isFocusedRef = useRef(isFocused);
    const currentReel_store = useStore((state)=> state.currentReel);
    
    
    useEffect(()=>{
        isFocusedRef.current = isFocused;

    },[isFocused])

    const handleAppStateChange = (AppState) => {

    if (AppState === 'active'){

            // console.log(reel.id, isActive) Check why this is always logging!!!

            if (isFocusedRef.current){
                ReelsManager.singlePlay()
            }

             //Resume playing the reel video if app is restored
    }

    }
    useEffect(() => {

        const subscription = AppState.addEventListener('change', handleAppStateChange);
        return ()=>{

        subscription.remove()

        };

    }, []);

    


    return(
        <View style={styles.container}>
            <ReelMedia reelId={reel.id} media={ reel.media} isActive={isActive} />

            <ReelInteractionContainer 
                user={reel?.user} 
                created={reel?.created} 
                caption={reel?.text} 
                likesCount={reel?.likes_count}    
                commentCount={reel?.comments_count}
                views={reel?.views}
            />
        </View>
    )

}


const styles = StyleSheet.create({

    container:{
        height: Platform.OS === 'android' ? SCREEN_HEIGHT - AppDetails.mainTabNavigatorHeight : SCREEN_HEIGHT,
        width: '100%',
        backgroundColor: '#000000'
    }


})


const handleMemomize = (prevProps, nextProps) => {



}
export default memo(ReelCard, handleMemomize);