import { Ionicons } from "@expo/vector-icons";
import { FlatList, StyleSheet, Text, TouchableOpacity, View, ActivityIndicator } from "react-native"
import FeedCard from "./feedcard.jsx";
import { useEffect, useState, useCallback, useRef } from "react";
import GetFeedsController from "../../../controllers/getfeedscontroller.js";
import Banner from "../banner.jsx";
import QuickLinks from "../quicklinks.jsx";
import PostFeed from "../postfeed.jsx";
import { useAuth } from "../../../AuthContext.js";



const Feeds = ()=>{

    const [feeds, setFeeds] = useState([])
    const [page, setPage] = useState(1);
    const [loadingMore, setLoadingMore] = useState(false);
    const [currentPlayingId, setCurrentPlayingId] = useState(null);
    const { token } = useAuth();


    useEffect(()=>{
        const getFeeds = async()=>{

            const response = await GetFeedsController(token, 1);   
            setFeeds(response.data);
        }
        getFeeds()
    },[])


    const handleLoadMore = async () => {
        if (loadingMore) return;
        
        setLoadingMore(true);
        const nextPage = page + 1;
        const response = await GetFeedsController(token, nextPage);
        
        if (response.data && Array.isArray(response.data)) {
            setFeeds(prevFeeds => {
                const existingIds = new Set(prevFeeds.map(feed => feed.id));
                const newFeeds = response.data.filter(feed => !existingIds.has(feed.id));
                return [...prevFeeds, ...newFeeds];
            });
            setPage(nextPage);
        }
        setLoadingMore(false);
    };

    const renderHeader = () => (
        <View>
            <Banner />
            <QuickLinks />
            <PostFeed />
            <View style = {styles.containerHeader} >
                <View style = {styles.containerHeaderLeft}>
                    <Text style ={{fontSize:17, fontWeight:"500"}}>Recent Updates</Text>
                </View>
                <View style = {styles.containerHeaderRight}>
                    <TouchableOpacity style = {styles.containerHeaderRightExplore}>  
                        <Ionicons name="globe-outline" size={20} color="#000" />
                        <Text style = {{fontSize:12, fontWeight:"500"}}>Explore by cities</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style = {styles.containerHeaderRightAll}>
                        <Ionicons name="apps" size={15} />
                        <Text style ={{fontSize:12, fontWeight:"500"}}>All</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    );

    const renderFooter = () => (
        <View style={styles.footerContainer}>
            {loadingMore ? (
                <ActivityIndicator size="small" color="#000" />
            ) : (
                <TouchableOpacity style={styles.moreStoriesButton} onPress={handleLoadMore}>
                    <Text style={styles.moreStoriesText}>More Stories</Text>
                </TouchableOpacity>
            )}
        </View>
    );

    const renderItem = useCallback(({item}) => {
        return <FeedCard feed={item} currentPlayingId={currentPlayingId} setCurrentPlayingId={setCurrentPlayingId} />
    }, [currentPlayingId]);

    const onViewableItemsChanged = useRef(({ viewableItems }) => {
        const viewableVideoItem = viewableItems.find(item => {
            const feed = item.item;
            if (item.isViewable) {
                if (feed.type === 'shared' && feed.shared_post) {
                    if (feed.shared_post.type === 'video' || feed.shared_post.type === 'reel') {
                        return true;
                    }
                } else if (feed.type === 'video' || feed.type === 'reel') {
                    if (feed.media && feed.media.length > 0) {
                        return true;
                    }
                }
            }
            return false;
        });

        let playId = null;
        if (viewableVideoItem) {
            const feed = viewableVideoItem.item;
            if (feed.type === 'shared' && feed.shared_post) {
                playId = `${feed.id}_shared`;
            } else {
                playId = `${feed.id}_video_0`;
            }
        }
        
        setCurrentPlayingId(currentId => {
            if (currentId !== playId) {
                return playId;
            }
            return currentId;
        });

    }).current;

    const viewabilityConfig = useRef({
        itemVisiblePercentThreshold: 75, // Item must be 75% visible to be considered "viewable"
        waitForInteraction: true,
    }).current;

    return (
        <View style={styles.container}>
            <FlatList 
                data={feeds}
                keyExtractor={(item) => item.id}
                renderItem={renderItem}
                ListHeaderComponent={renderHeader}
                ListFooterComponent={renderFooter}
                initialNumToRender={5}
                maxToRenderPerBatch={5}
                windowSize={5}
                removeClippedSubviews={false}
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
    moreStoriesButton: {
        backgroundColor: '#e9e9e9',
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 20,
    },
    moreStoriesText: {
        fontSize: 14,
        fontWeight: '500',
        color: '#333',
    }


})

export default Feeds;