import { Ionicons } from "@expo/vector-icons";
import { FlatList, StyleSheet, Text, TouchableOpacity, View, ActivityIndicator, Platform, AppState, Button } from "react-native"
import FeedCard from "./feedcard.jsx";
import React, { PureComponent } from "react";

import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import Banner from "../banner.jsx";
import QuickLinks from "../quicklinks.jsx";
import PostFeed from "../postfeed.jsx";
import { useAuth } from "../../../AuthContext.js";
import FeedsHeader from "../feedsheader.jsx";
import { useIsFocused } from '@react-navigation/native';
import useStore from "../../../repository/store.js";
import { clearCache, prefetchVideos } from "../../../helpers/cachemedia.js";
import Quicklinks from "../quicklinks.jsx";
import { useEvent } from 'expo';
import { useVideoPlayer, VideoView } from 'expo-video';
import VideoPreloader from './VideoPreloader';
import { clearRegistry } from './videoRegistry';
import AppDetails from "../../../helpers/appdetails.js";
import VideoManager from "../../../helpers/videomanager.js";



const Feeds = ( { combinedData, feeds, setFeeds, API_URL, feedsController } )=>{

    const [page, setPage] = useState(1);
   
    const [loadingMore, setLoadingMore] = useState(false);
    const [initialLoading, setInitialLoading] = useState(true);
    const [currentPlayingId, setCurrentPlayingId] = useState(null);
    const isFocused = useIsFocused();
    const [appState, setAppState] = useState(AppState.currentState);
    const [delayedFocus, setDelayedFocus] = useState(false);
    const { token } = useAuth();
    const syncFeedData = useStore(state => state.syncFeedData);
    const feedsRef = useRef(feeds);
    const [isVideoPlaying, setIsVideoPlaying] = useState(false);

    const isNextVideo_store = useStore(state => state.isNextVideo);
    const setIsNextVideo = useStore(state => state.setIsNextVideo);

    // setIsNextVideo({shouldPlay:false, feedId:null});

   
    // useState(()=>{

    //     console.log("From Feeds Component::"+isNextVideo_store.shouldPlay)

    //     if (isNextVideo_store.shouldPlay){
    //         setIsNextVideo({shouldPlay:false, feedId:null});
    //     }

    // },[isNextVideo_store])







    useEffect(()=>{
        const getFeeds = async()=>{
            setInitialLoading(true);
            
             if (feeds.length > 0) { 
                setInitialLoading(false);
                return;
              }   
        
        }
        getFeeds()
    },[feeds])
    


    
    useEffect(() => {
        feedsRef.current = feeds;
    }, [feeds]);
    const prefetchTimerRef = useRef(null);

    useEffect(() => {
        // console.log("Whats wrong here")
        clearCache();
    }, []);

    useEffect(() => {
        const subscription = AppState.addEventListener('change', nextAppState => {
            setAppState(nextAppState);
        });
        return () => {
            subscription.remove();
        };
    }, []);


    useEffect(() => {
        // When app goes to background, clear prewarmed players to avoid native Activity issues
        if (appState !== 'active') {
            try { clearRegistry(); } catch (e) {}
        }
    }, [appState]);




    useEffect(() => {
        if (isFocused && appState === 'active') {
            // Delay setting focus to true to allow navigation transition to complete
            const timer = setTimeout(() => setDelayedFocus(true), 500);
            return () => clearTimeout(timer);
        } else {
            // Immediately set to false when leaving
            setDelayedFocus(false);
        }
    }, [isFocused, appState]);

    useEffect(() => {
        // Clear registry when screen loses focus or on unmount to free native resources
        if (!isFocused) {
            try { clearRegistry(); } catch (e) {}
        }
        return () => {
            try { clearRegistry(); } catch (e) {}
        };
    }, [isFocused]);




    const handleLoadMore = async () => {

        if (feeds.length === 0 || loadingMore || initialLoading) return;

        
        setLoadingMore(true);
        const nextPage = page + 1;

        const response = await feedsController(API_URL, token, nextPage);


        
        if (response.data && Array.isArray(response.data)) {
            setFeeds(prevFeeds => {
                const existingIds = new Set(prevFeeds.map(feed => feed.id));
                const newFeeds = response.data.filter(feed => feed && !existingIds.has(feed.id));
                return [...prevFeeds, ...newFeeds];
            });
          


            setPage(nextPage);
        }
        setLoadingMore(false);
    };




    const renderFooter = () => (
        <View style={styles.footerContainer}>
            <ActivityIndicator size="small" color="#000" style={{ opacity: loadingMore ? 1 : 0 }} />
        </View>
    );

    

    const renderCombinedItem = useCallback(({ item }) => {
        switch (item.type) {
          case 'banner':
            return <Banner />;
          case 'quicklinks':
            return <QuickLinks />;
          case 'postfeed':
            return <PostFeed />;
          case 'feedsheader':
            return <FeedsHeader name={item.name} />
          case 'feed':

            const shouldPlay = currentPlayingId === item.data.id && delayedFocus;

            // console.log(currentPlayingId, item.data.id, shouldPlay);
            
            return (
              <FeedCard
                feed={item.data}
              />
            );
          default:
            return null;
        }
    }, [currentPlayingId, delayedFocus]);




    {/* Preload next videos (non-blocking) */}
    {delayedFocus && appState === 'active' && (
        <VideoPreloader urls={feeds.map(f => {
            if (!f) return null;
            if (f.type === 'shared' && f.shared_post && (f.shared_post.type === 'video' || f.shared_post.type === 'reel')) {
                    return f.shared_post.media && f.shared_post.media[0] ? f.shared_post.media[0].video_url : null;
            }
            if ((f.type === 'video' || f.type === 'reel') && f.media && f.media[0]) {
                    return f.media[0].video_url;
            }
            return null;
    }).filter(Boolean)} limit={3} />
    )}
    
    

    // useState(()=>{

    //         console.log("Is next video", isNextVideo_store)

    // },[isNextVideo_store])

    
    const onViewableItemsChanged = useRef(({ viewableItems }) => {
        // console.log("Viewable Items Changed:", viewableItems);


        const viewableVideoItem = viewableItems.find(item => {
            const feed = item.item;
                // console.log( item);

            if (item.isViewable) {
                if (feed.data?.type === 'shared' && feed.data?.shared_post) {
                    if (feed.data.shared_post.type === 'video' || feed.data.shared_post.type === 'reel') {
                        return true;
                    }
                } else if (feed.data?.type === 'video' || feed.data?.type === 'reel') {
                    if (feed.data.media && feed.data.media.length > 0) {

                            

                        return true;
                    }
                }
            }
            return false;
        });

        let playId = null;


        if (viewableVideoItem){

            setIsNextVideo({shouldPlay: true, feedId: viewableVideoItem.item.data.id});
            setIsVideoPlaying(true);

            
            // VideoManager.switchVideo(feedId);///

            const feed = viewableVideoItem.item.data;
            if (feed.type === 'shared' && feed.shared_post){
                playId = `${feed.id}_shared`;
            } else {
                playId = `${feed.id}_video_0`;
            }

            // VideoManager.switchVideo(viewableVideoItem.item.data.id);

        }
        else{
            
            VideoManager.singlePause();
            
        }
        

        setCurrentPlayingId(currentId => {
            
            if (currentId !== playId) {
                return playId;
            }
            return currentId;
        });


    }).current;


    

    const viewabilityConfig = useRef({
        itemVisiblePercentThreshold: 50, // Item must be 50% visible to be considered "viewable"
        waitForInteraction: true,
    }).current;

    



    



    return (
        <View style={styles.container}>

            <FlatList 
                data={combinedData}
                keyExtractor={(item, index) => {
                    
                    if (item.type === 'feed') {

                        if (item.data.type === 'shared' && item.data.shared_post) {
                            // Use parentId for shared posts to ensure uniquenesssskkksssss
                            return `${item.type}-${item.data.id}-parent-${item.parentId}`;
                        }
                        return `${item.type}-${item.data.id}`;
                    }
                    // Ensure unique keys for non-feed items......
                    return `${item.type}-${index}`;
                }}
                renderItem={renderCombinedItem}
                scrollEventThrottle={AppDetails.flatList.scrollEventThrottle} // Adjust the throttle rate (16ms for ~60fps)
                decelerationRate={AppDetails.flatList.decelerationRate} // Slows down the scroll momentum,
                ListFooterComponent={renderFooter}
                onEndReached={handleLoadMore}
                onEndReachedThreshold={0.5}
                initialNumToRender={3}
                maxToRenderPerBatch={3}
                windowSize={3}
                updateCellsBatchingPeriod={50}
                removeClippedSubviews={false}
                contentContainerStyle={styles.containerFeeds}
                onViewableItemsChanged={onViewableItemsChanged}
                viewabilityConfig={viewabilityConfig}
            />
        </View>
    )


}


const styles = StyleSheet.create({

      contentContainer: {
    flex: 1,
    padding: 10,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 50,
  },
  video: {
    width: 350,
    height: 275,
  },
  controlsContainer: {
    padding: 10,
  },

    container:{
        flex: 1,
        backgroundColor: '#fff',
    },

    containerHeader:{
        height:30,
        display:"flex",
        flexDirection:"row",
        justifyContent:"space-between",
        alignItems:"center",
        paddingVertical:35,
        paddingHorizontal:10,        

    },

    containerHeaderLeft:{

        width:"45%",
        height:30,

    },

    containerHeaderRight:{

        width:"55%",
        height:25,

        display:"flex",
        flexDirection:"row",
        justifyContent:"space-between"
    },

    containerHeaderRightExplore:{
        height:25,
        width:"65%",
        paddingHorizontal:5,
        backgroundColor:"#e9e9e9ff",
        display:"flex",
        flexDirection:"row",
        borderRadius:20,
        alignItems:"center",
        justifyContent:"space-around",

    },

    containerHeaderRightAll:{
        height:25,
        width:"25%",
        display:"flex",
        flexDirection:"row",
        backgroundColor:"#e9e9e9ff",
        borderRadius:20,
        alignItems:"center",
        justifyContent:"space-around",
        paddingHorizontal:7,

    },

    containerFeeds:{
        // paddingHorizontal:10,        

    },

    footerContainer: {
        paddingVertical: 20,
        alignItems: 'center',
        justifyContent: 'center',
    },


})

export default Feeds;