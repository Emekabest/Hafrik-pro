import { View } from "react-native";
import { VideoView, useVideoPlayer } from "expo-video";
import { Image as ExpoImage } from 'expo-image';
import ReelsManager from "../../helpers/reelsmanager";
import { useEffect, useState } from "react";
import { useEvent } from "expo";
import { useFocusEffect, useIsFocused } from "@react-navigation/native";
import useStore from "../../repository/store";

const ReelMedia = ({reelId, media}) => {

    // const source = media.video_url ? media.video_url : null;

    const [source, setSource] = useState(null)
    const [isReadyToPlay, setIsReadyToPlay] = useState(false);
    const [showThumbnail, setShowThumbnail] = useState(true);
    const isFocused = useIsFocused();
    

    const currentReel_store = useStore((state)=> state.currentReel);
    const setCurrentReel_store = useStore((state)=> state.setCurrentReel);

    
    
    const player = useVideoPlayer(source || null);

    useEffect(() => {
        if (!player) return;
        try { player.loop = true; }
        catch (e) {}
    }, [player]);

    const { isPlaying: singlePlaying } = useEvent(player, 'playingChange', { isPlaying: player?.playing ?? false });
    const { status: singleStatus } = useEvent(player, 'statusChange', { status: player?.status ?? {} });


        


    // useFocusEffect(()=>{

    //     if (currentReel_store.reelId === null){

    //         setCurrentReel_store({ shouldPlay: true, reelId } );
    //     }

    // })


        useEffect(()=>{
            
            if (!isFocused ){
    
                ReelsManager.singlePause();
            }
            else if((isFocused && currentReel_store.shouldPlay && currentReel_store.reelId !== null)){
                ReelsManager.play(currentReel_store.reelId);
            }
        },[isFocused])
    


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
                const videoPlayerExisting = ReelsManager.getVideoPlayer(reelId);
    

                if (videoPlayerExisting){
                    ReelsManager.unregister(reelId);
                }
    
            };
            
        },[reelId])


        
            useEffect(() => {
                if (singlePlaying) setShowThumbnail(false);

            }, [singlePlaying]);
    

        
    return(
        <View style={{flex: 1}}>
             {player.status === 'readyToPlay' ? (
            <VideoView
                style={{height:"100%", width: "100%"}}
                player={player}
                nativeControls={false}
                contentFit="contain"
                // posterSource={{ uri: media.thumbnail }}
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


export default ReelMedia;