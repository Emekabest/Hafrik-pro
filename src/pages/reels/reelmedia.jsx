import { View } from "react-native";
import { VideoView, useVideoPlayer } from "expo-video";
import { Image as ExpoImage } from 'expo-image';
import ReelsManager from "../../helpers/reelsmanager";
import { memo, useEffect, useRef, useState } from "react";

import { useEvent } from "expo";
import { useFocusEffect, useIsFocused } from "@react-navigation/native";
import useStore from "../../repository/store";

const ReelMedia = ({reelId, media, isActive}) => {

    const [source, setSource] = useState(null)
    const [isReadyToPlay, setIsReadyToPlay] = useState(false);
    const isFocused = useIsFocused();

    const currentReel_store = useStore((state)=> state.currentReel);

    const setIsReelMediaFocused_store = useStore((state)=> state.setIsReelMediaFocused);

  
        const prevFocusedRef = useRef(true);
        useEffect(()=>{

            if (!isFocused && prevFocusedRef.current){
                console.log("Pausing reelId:", reelId, "as screen is not focused");
    
                ReelsManager.singlePause();
            }
            else if((isFocused && currentReel_store.shouldPlay && currentReel_store.reelId !== null)){
                // console.log("Ran...")
                ReelsManager.play(currentReel_store.reelId);
                
            }
              prevFocusedRef.current = isFocused;
        },[isFocused])


   

    
        const player = useVideoPlayer(source || null);
    
        useEffect(() => {
            if (!player) return;
            try { player.loop = true; }
            catch (e) {}
        }, [player]);

    const { isPlaying: singlePlaying } = useEvent(player, 'playingChange', { isPlaying: player?.playing ?? false });
    const { status: singleStatus } = useEvent(player, 'statusChange', { status: player?.status ?? {} });


        
    
    



    useEffect(()=>{

        if (media && media.video_url){
            // console.log("Setting source for reelId:", reelId, "to", media.video_url);
            setSource(media.video_url)

        }

    },[media])



        /**Register video player on mount.......................... */
    useEffect(() => {
            const registerPlayer = async () => {

                if (!player) return;
    
                const isReadyToPlay = player.status === 'readyToPlay';
                setIsReadyToPlay(isReadyToPlay);

                if (!isReadyToPlay) return;
    


                try{

                    // console.log("I tried to register video player for reelId:", reelId);

                    ReelsManager.register(reelId, player);
    
                }
                catch(e){
    
                    console.log("Error registering video player:", e);
                }
            }
    

    
            const videoPlayerExisting = ReelsManager.getVideoPlayer(reelId);
            if (!videoPlayerExisting){
                registerPlayer();
            }
    
        },[reelId, singleStatus]);



        useEffect(()=>{
    
            if (isReadyToPlay){
            
                if (currentReel_store.shouldPlay && currentReel_store.reelId === reelId){
                    console.log("Playing reelId:", reelId);
                        ReelsManager.switchVideo(reelId);
    
                }
        }
        },[isReadyToPlay, currentReel_store]);






        /**Unregister video player on unmount.......................... */
        useEffect(()=>{
            
            return () => {
                try {
                    const registered = ReelsManager.getVideoPlayer(reelId);
                    // only unregister if the registered player is exactly our `player` instance
                    if (registered && registered === player) {
                        ReelsManager.unregister(reelId);
                    }
                    } catch (e) {
                    console.log('unregister guard error', e);
                }
            };
            
        },[reelId, player])


        
        // useEffect(()=>{
            
        //     console.log(reelId, player?.status)
            
        // },[singleStatus])
    
    // track whether this video has started playing at least once
    const [hasPlayedOnce, setHasPlayedOnce] = useState(false);

    useEffect(() => {
        if (singlePlaying) setHasPlayedOnce(true);
    }, [singlePlaying]);

    const showVideo = Boolean(player && isActive && (hasPlayedOnce || player?.status === 'readyToPlay'));

    
    return (
        <View style={{flex: 1}}>
             {showVideo ? (
            <VideoView
                style={{height:"100%", width: "100%"}}
                player={player}
                nativeControls={false}
                contentFit="contain"
                posterSource={{ uri: media.thumbnail }}
                usePoster={false}
                onError={(error) => {
                    console.log('Single VideoView onError', error);
                }}
            />
            ) : (
            <ExpoImage
                source={{uri: media.thumbnail}}
                style={{width: '100%', height: "100%", backgroundColor: '#000'}}
                contentFit="cover"
                cachePolicy="memory-disk"
            />
            )}
        </View>
    )
}


const handleMemomize = (prev, next)=>{
    // Return true to skip re-render when props are effectively equal.
    if (!prev || !next) return false;
    if (prev.reelId !== next.reelId) return false;
    if (prev.isActive !== next.isActive) return false;
    
    // No relevant prop changed — skip render
    return true;
}

export default memo(ReelMedia, handleMemomize);