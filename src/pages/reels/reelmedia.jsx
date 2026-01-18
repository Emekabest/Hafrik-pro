import { View } from "react-native";
import { VideoView, useVideoPlayer } from "expo-video";
import { Image as ExpoImage } from 'expo-image';
import ReelsManager from "../../helpers/reelsmanager";
import { useEffect, useState } from "react";
import { useEvent } from "expo";
import { useFocusEffect } from "@react-navigation/native";

const ReelMedia = ({reelId, media}) => {

    // const source = media.video_url ? media.video_url : null;

    const [source, setSource] = useState(null)




    const player = useVideoPlayer(source || null, (p) => {
        if (p && source) {
            try { 
                p.loop = true;
            } catch (e) {

            }
        }
    });


    useFocusEffect(()=>{

            // console.log(reelId, player?.status)

    });


    // const { isPlaying: singlePlaying } = useEvent(player, 'playingChange', { isPlaying: player?.playing ?? false });
    

    // console.log('This is isPlaying', singlePlaying);
    
        // const player = useVideoPlayer(source || null);
    
        // useEffect(() => {
        //     if (!player) return;
        //     try { player.loop = true; }
        //     catch (e) {}
        // }, [player]);
    
    



    useEffect(()=>{

        if (media && media.video_url){
            // console.log("Setting source for reelId:", reelId, "to", media.video_url);
            setSource(media.video_url)

        }

    },[media])



    useEffect(() => {
            const registerPlayer = async () => {

                if (!player) return;
    
                const isReadyToPlay = player.status === 'readyToPlay';
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
    
        },[reelId, player?.status]);


        
        useEffect(()=>{

            console.log(reelId, player?.status)
            
        },[reelId, player?.status])
    

    return(
        <View style={{flex: 1}}>
             {player.status === 'readyToPlay' ? (
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


export default ReelMedia;