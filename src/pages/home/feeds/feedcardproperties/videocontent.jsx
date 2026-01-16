import React, { memo, useState, useEffect, useRef } from 'react';
import { View, Image, ScrollView, TouchableWithoutFeedback, TouchableOpacity, ActivityIndicator, StyleSheet, Dimensions } from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { VideoView, useVideoPlayer } from 'expo-video';
import { useEvent } from 'expo';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import VideoManager from '../../../../helpers/videomanager';
import useStore from "../../../../repository/store.js";


const aspectRatioCache = new Map();
const MEDIA_HEIGHT = 470;
const MEDIA_WIDTH = 240;

const VideoPostContent = ({feedId, media, imageWidth, leftOffset, rightOffset, currentPlayingId, setCurrentPlayingId, parentFeedId, isMuted, setIsMuted, isFocused }) => {
   
    
   
    const navigation = useNavigation();
    const isMultiMedia = media.length > 1;
    const mediaItem = media.length > 0 ? media[0] : null;
    const mediaUrl = mediaItem ? mediaItem.thumbnail : null;
    

    
    const [isSingleVideoPlaying, setIsSingleVideoPlaying] = useState(false);
    const [isSingleVideoFinished, setIsSingleVideoFinished] = useState(false);
    const [isSingleVideoBuffering, setIsSingleVideoBuffering] = useState(false);
    const [isSingleVideoError, setIsSingleVideoError] = useState(false);
    const [showSinglePoster, setShowSinglePoster] = useState(true);
    const uniqueId = `${parentFeedId}_video_0`;
    const [source, setSource] = useState(null);
    const [shouldPlay, setShouldPlay] = useState(false);
    const [isDownloadingSingle, setIsDownloadingSingle] = useState(false);
    const [retryKeySingle, setRetryKeySingle] = useState(0);
    const bufferTimeoutSingleRef = useRef(null);

    const [isReadyToPlay, setIsReadyToPlay] = useState(false);

    const isNextVideo_store = useStore(state => state.isNextVideo);


  


    // const isMultiMedia = media.length > 1;
    // const mediaItem = media.length > 0 ? media[0] : null;
    



    useEffect(() => {
        // Use the network/source URL directly for feed videos to ensure player
        // instance can be created immediately.
        setSource(null);
        if (!isMultiMedia && mediaItem && mediaItem.video_url) {
            setSource(mediaItem.video_url);
            setIsDownloadingSingle(false);
        }
    }, [isMultiMedia, mediaItem]);




    // Player hooks for the single video (always call hooks in component body)
    const player = useVideoPlayer(source || null, (p) => {
        if (p && source) {
            try { 
                p.loop = true;
            } catch (e) {

            }
        }
    });






    // const preloadedSingle = getPlayer(source) || getPlayer(mediaItem?.video_url);


    // const singlePlayer = ;

    // useEffect(() => {
    //     if (player) {
    //         player.muted = isMuted;
    //     }
    // }, [player, isMuted]);



    const { isPlaying: singlePlaying } = useEvent(player, 'playingChange', { isPlaying: player?.playing ?? false });
    const { status: singleStatus } = useEvent(player, 'statusChange', { status: player?.status ?? {} });




    useEffect(() => {

        const registerPlayer = async () => {


            if (!player) return;

            const isReadyToPlay = player.status === 'readyToPlay';
            setIsReadyToPlay(isReadyToPlay);
            if (!isReadyToPlay) return;

            try{

                VideoManager.register(feedId, player);

            }
            catch(e){

                console.log("Error registering video player:", e);
            }

        }

        registerPlayer();
    },[feedId, player?.status]);



    useEffect(()=>{

        if (isReadyToPlay){
        
            if (isNextVideo_store.shouldPlay && isNextVideo_store.feedId === feedId){
                // console.log("Play!!", feedId)
                    VideoManager.switchVideo(feedId);
                    console.log("Playing video from VideoContent for feedId:", feedId);

            }
    }
    },[isReadyToPlay, isNextVideo_store]);




    useEffect(()=>{

        console.log("From videocontent::"+isNextVideo_store.shouldPlay)


    },[isNextVideo_store])




    useEffect(()=>{

        return () => {
                console.log("render")
                VideoManager.unregister(feedId);

        };
    },[feedId])

    







    // useEffect(() => {
    //     if (!player) return;
    //     try {
    //         if (shouldPlay) player.play(); else player.pause();
    //     } catch (e) {}
    // }, [shouldPlay, player]);

    

    useEffect(() => {
        setIsSingleVideoPlaying(singleStatus?.isPlaying ?? false);
        setIsSingleVideoBuffering(singleStatus?.isBuffering ?? false);
        if (singleStatus?.didJustFinish) setIsSingleVideoFinished(true);
        if (singleStatus?.isPlaying) setIsSingleVideoFinished(false);
    }, [singleStatus]);



    useEffect(() => {
        if (singlePlaying) setShowSinglePoster(false);
    }, [singlePlaying]);

    // useEffect(() => {
    //     if (preloadedSingle) setShowSinglePoster(false);
    // }, [preloadedSingle]);



    /** Delay video playback */
    // useEffect(() => {
    //     let timer;
    //     if (currentPlayingId === uniqueId && isFocused) {
    //         timer = setTimeout(() => {
    //             setShouldPlay(true);
    //         }, 200);
    //     } else {
    //         setShouldPlay(false);
    //     }
    //     return () => clearTimeout(timer);
    // }, [currentPlayingId, uniqueId, isFocused]);



    useEffect(() => {
        return () => {
            if (bufferTimeoutSingleRef.current) {
                clearTimeout(bufferTimeoutSingleRef.current);
                bufferTimeoutSingleRef.current = null;
            }
        };
    }, []);







    const handlePress = () => {
        navigation.navigate('CommentScreen', {feedId: parentFeedId});
    };

    // useEffect(() => {
    //     if (mediaUrl && !aspectRatioCache.has(mediaUrl)) {
    //         Image.getSize(mediaUrl, (width, height) => {
    //             const ratio = width / height;
    //             aspectRatioCache.set(mediaUrl, ratio);
    //             setAspectRatio(ratio);
    //         }, (error) => console.log(error));
    //     }
    // }, [mediaUrl]);

    if (!media || media.length === 0) return null;

    return (
        <View style={[
            styles.mediaSection,
            { height: isMultiMedia ? MEDIA_HEIGHT : undefined },
            { width: Dimensions.get("window").width, marginLeft: -leftOffset, borderRadius: 0, backgroundColor: 'transparent' }
        ]}>
            {isMultiMedia ? (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingLeft: leftOffset, paddingRight: rightOffset }}>
                    {media.map((item, index) => (
                        <FeedVideoItem
                            key={index}
                            videoUrl={item.video_url}
                            thumbnail={item.thumbnail}
                            targetHeight={MEDIA_HEIGHT}
                            maxWidth={MEDIA_WIDTH}
                            marginRight={10}
                            currentPlayingId={currentPlayingId}
                            setCurrentPlayingId={setCurrentPlayingId}
                            uniqueId={`${parentFeedId}_video_${index}`}
                            isFocused={isFocused}
                            isMuted={isMuted}
                            setIsMuted={setIsMuted}
                            feedId={parentFeedId}
                        />
                    ))}
                </ScrollView>
            ) : (
                isSingleVideoError ? (
                    <View style={{width: MEDIA_WIDTH, height: MEDIA_HEIGHT, marginLeft: leftOffset, borderRadius: 10, overflow: 'hidden', backgroundColor: '#202020', justifyContent: 'center', alignItems: 'center'}}>
                        <Ionicons name="alert-circle-outline" size={30} color="#fff" />
                        <Text style={{color: '#fff', fontSize: 14, marginTop: 10}}>Something went wrong</Text>
                        <TouchableOpacity onPress={() => setIsSingleVideoError(false)} style={{marginTop: 15, paddingVertical: 8, paddingHorizontal: 15, backgroundColor: '#333', borderRadius: 20}}>
                            <Text style={{color: '#fff', fontSize: 12}}>Try Again</Text>
                        </TouchableOpacity>
                    </View>
                ) : (
                <TouchableWithoutFeedback onPress={handlePress}>
                <View style={{width: MEDIA_WIDTH, height: MEDIA_HEIGHT, marginLeft: leftOffset, borderRadius: 10, overflow: 'hidden', backgroundColor: '#000'}}>
                    {source ? (
                        <VideoView
                            // ref={videoPlayerRefs}
                            style={{height:"100%", width: "100%"}}
                            player={player}
                            nativeControls={false}
                            contentFit="contain"
                            posterSource={{ uri: mediaItem.thumbnail }}
                            usePoster={false}
                            onError={(error) => {
                                console.log('Single VideoView onError', error);
                            }}
                        />
                        ) : (
                        <ExpoImage
                            source={{ uri: mediaItem.thumbnail }}
                            style={{ width: "100%", height: "100%" }}
                            contentFit="contain"
                            cachePolicy="memory-disk"
                            pointerEvents='none'
                        />
                    )}
                    {showSinglePoster && (
                        <ExpoImage
                            source={{ uri: mediaItem.thumbnail }}
                            style={[StyleSheet.absoluteFill, { width: '100%', height: '100%' }]}
                            contentFit="cover"
                            cachePolicy="memory-disk"
                            pointerEvents='none'
                        />
                    )}
                    <View style={[StyleSheet.absoluteFill, {justifyContent: 'center', alignItems: 'center', zIndex: 2, opacity: (isSingleVideoBuffering && !isSingleVideoPlaying) ? 1 : 0}]} pointerEvents="none">
                        <ActivityIndicator size="large" color="#fff" animating={isSingleVideoBuffering && !isSingleVideoPlaying} />
                    </View>

                    <View style={[StyleSheet.absoluteFill, {justifyContent: 'center', alignItems: 'center', zIndex: 3, opacity: isDownloadingSingle ? 1 : 0}]} pointerEvents="none">
                        <ActivityIndicator size="large" color="#fff" animating={isDownloadingSingle} />
                    </View>

                    <TouchableOpacity onPress={() => setIsMuted(!isMuted)} style={styles.muteButton}>
                        <Ionicons name={isMuted ? "volume-mute" : "volume-high"} size={20} color="white" />
                    </TouchableOpacity>
                </View>
                </TouchableWithoutFeedback>
                )
            )}
        </View>
    );
};


const styles = StyleSheet.create({
    mediaSection: {
        overflow: 'hidden',
        backgroundColor: '#b1aaaaff',
    },
    muteButton: {
        position: 'absolute',
        bottom: 10,
        right: 10,
        backgroundColor: 'rgba(0,0,0,0.6)',
        padding: 8,
        borderRadius: 20,
    },
});



const handleMemomize = (prevProps, nextProps) => {
    if (prevProps.parentFeedId !== nextProps.parentFeedId) return false;
    if ((prevProps.media?.length ?? 0) !== (nextProps.media?.length ?? 0)) return false;
    const prevFirst = prevProps.media?.[0] ?? {};
    const nextFirst = nextProps.media?.[0] ?? {};
    if (prevFirst.video_url !== nextFirst.video_url) return false;
    if (prevFirst.thumbnail !== nextFirst.thumbnail) return false;
    if (prevProps.isMuted !== nextProps.isMuted) return false;
    if (prevProps.isFocused !== nextProps.isFocused) return false;
    if (prevProps.currentPlayingId !== nextProps.currentPlayingId) return false;
    if (prevProps.imageWidth !== nextProps.imageWidth) return false;
    if (prevProps.leftOffset !== nextProps.leftOffset) return false;
    if (prevProps.rightOffset !== nextProps.rightOffset) return false;
    return true;
}
export default memo(VideoPostContent, handleMemomize);
