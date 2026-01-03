import { Ionicons } from "@expo/vector-icons";
import { FlatList, StyleSheet, Text, TouchableOpacity, View, ActivityIndicator, Platform, AppState } from "react-native"
import FeedCard from "./feedcard.jsx";
import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import GetFeedsController from "../../../controllers/getfeedscontroller.js";
import Banner from "../banner.jsx";
import QuickLinks from "../quicklinks.jsx";
import PostFeed from "../postfeed.jsx";
import { useAuth } from "../../../AuthContext.js";
import FeedsHeader from "../feedsheader.jsx";
import { useIsFocused } from '@react-navigation/native';
import useStore from "../../../repository/store.js";
import { clearCache, prefetchVideos } from "../../../helpers/cachemedia.js";
import Quicklinks from "../quicklinks.jsx";



const Feeds = ()=>{

    const [feeds, setFeeds] = useState([])
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
        if (isFocused && appState === 'active') {
            // Delay setting focus to true to allow navigation transition to complete
            const timer = setTimeout(() => setDelayedFocus(true), 500);
            return () => clearTimeout(timer);
        } else {
            // Immediately set to false when leaving
            setDelayedFocus(false);
        }
    }, [isFocused, appState]);

    useEffect(()=>{
        const getFeeds = async()=>{
            setInitialLoading(true);
            const response = await GetFeedsController(token, 1);   
            setFeeds(response.data);
            syncFeedData(response.data);
            setInitialLoading(false);
        }
        getFeeds()
    },[])

    const handleLoadMore = async () => {
        if (loadingMore || initialLoading) return;
        
        setLoadingMore(true);
        const nextPage = page + 1;
        const response = await GetFeedsController(token, nextPage);
        
        if (response.data && Array.isArray(response.data)) {
            setFeeds(prevFeeds => {
                const existingIds = new Set(prevFeeds.map(feed => feed.id));
                const newFeeds = response.data.filter(feed => feed && !existingIds.has(feed.id));
                return [...prevFeeds, ...newFeeds];
            });
            syncFeedData(response.data);
            setPage(nextPage);
        }
        setLoadingMore(false);
    };

    const renderFooter = () => (
        <View style={styles.footerContainer}>
            <ActivityIndicator size="small" color="#000" style={{ opacity: loadingMore ? 1 : 0 }} />
        </View>
    );

    const renderItem = useCallback(({item}) => {
        return <FeedCard feed={item} currentPlayingId={currentPlayingId} setCurrentPlayingId={setCurrentPlayingId} isFocused={delayedFocus} />
    }, [currentPlayingId, delayedFocus]);

    const renderCombinedItem = useCallback(({ item }) => {
        switch (item.type) {
          case 'banner':
            return <Banner />;
          case 'quicklinks':
            return <QuickLinks />;
          case 'postfeed':
            return <PostFeed />;
          case 'feed':
            const shouldPlay = currentPlayingId === item.data.id && delayedFocus;

            // console.log(currentPlayingId, item.data.id, shouldPlay);
         
            return (
              <FeedCard
                feed={item.data}
                currentPlayingId={currentPlayingId}
                setCurrentPlayingId={setCurrentPlayingId}
                isFocused={delayedFocus}
                shouldPlay={shouldPlay}
              />
            );
          default:
            return null;
        }
    }, [currentPlayingId, delayedFocus]);



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

        if (viewableVideoItem) {
            const feed = viewableVideoItem.item.data;
            if (feed.type === 'shared' && feed.shared_post) {
                playId = `${feed.id}_shared`;
            } else {
                playId = `${feed.id}_video_0`;
                console.log("Playing video for feed ID:", playId);


            }
        }
        
        setCurrentPlayingId(currentId => {
            
            if (currentId !== playId) {
                return playId;
            }
            return currentId;
        });

        // Debounced prefetch: wait for scrolling to settle before starting downloads
        try {
            const startIndex = (viewableVideoItem && typeof viewableVideoItem.index === 'number') ? viewableVideoItem.index : null;
            if (startIndex !== null) {
                // collect up to 10 upcoming candidates, we'll let prefetch filter cacheable ones
                const upcoming = feedsRef.current.slice(startIndex + 1, startIndex + 1 + 10);
                const urls = upcoming.map(f => {
                    if (!f) return null;
                    if (f.type === 'shared' && f.shared_post && (f.shared_post.type === 'video' || f.shared_post.type === 'reel')) {
                        return f.shared_post.media && f.shared_post.media[0] ? f.shared_post.media[0].video_url : null;
                    }
                    if ((f.type === 'video' || f.type === 'reel') && f.media && f.media[0]) {
                        return f.media[0].video_url;
                    }
                    return null;
                }).filter(Boolean);

                if (urls.length > 0) {
                    if (prefetchTimerRef.current) clearTimeout(prefetchTimerRef.current);
                    prefetchTimerRef.current = setTimeout(() => {
                        prefetchVideos(urls, { limit: 3, delayBetween: 500 });
                        prefetchTimerRef.current = null;
                    }, 700);
                }
            }
        } catch (e) {
            // ignore prefetch errors
        }

    }).current;

    const viewabilityConfig = useRef({
        itemVisiblePercentThreshold: 50, // Item must be 50% visible to be considered "viewable"
        waitForInteraction: true,
    }).current;





    const combinedData = useMemo(() => {
        const bannerItem = { type: 'banner' };
        const quickLinksItem = { type: 'quicklinks' };
        const postFeedItem = { type: 'postfeed' };

        // Ensure unique feed items and handle shared_post correctly
        

        const data = [
            bannerItem,
            quickLinksItem,
            postFeedItem,
            ...feeds.map(feed => {
                // if (feed.type === 'shared' && feed.shared_post) {
                //     return { type: 'feed', data: feed.shared_post, parentId: feed.id };
                // }
                return { type: 'feed', data: feed };
            }),
        ];

        return data;
    }, [feeds]);

    return (
        <View style={styles.container}>


              
            <FlatList 
                data={combinedData}
                keyExtractor={(item, index) => {
                    
                    if (item.type === 'feed') {

                        if (item.data.type === 'shared' && item.data.shared_post) {
                            // Use parentId for shared posts to ensure uniqueness
                            return `${item.type}-${item.data.id}-parent-${item.parentId}`;
                        }
                        return `${item.type}-${item.data.id}`;
                    }
                    // Ensure unique keys for non-feed items
                    return `${item.type}-${index}`;
                }}
                renderItem={renderCombinedItem}
                ListFooterComponent={renderFooter}
                onEndReached={handleLoadMore}
                onEndReachedThreshold={0.5}
                initialNumToRender={3}
                maxToRenderPerBatch={3}
                windowSize={5}
                removeClippedSubviews={Platform.OS === 'android'}
                contentContainerStyle={styles.containerFeeds}
                onViewableItemsChanged={onViewableItemsChanged}
                viewabilityConfig={viewabilityConfig}
            />
        </View>
    )


}


const styles = StyleSheet.create({

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