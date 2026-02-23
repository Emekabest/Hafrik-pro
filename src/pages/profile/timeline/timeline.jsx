import React, { useEffect, useMemo, useState } from 'react';
import { View, StyleSheet } from "react-native";
import Feeds from '../../home/feeds/feeds';
import { useAuth } from '../../../AuthContext';
import { ProfileTimelineController } from '../../../controllers/profilecontroller';
import AppDetails from '../../../helpers/appdetails';
import useStore from '../../../repository/store';

const Timeline = ({ header, tabs, activeTab, onTabChange, isOwner, userId }) => {

    const feedsName = "profileTimelineFeeds";

     const [posts, setPosts] = useState([]);

    const clearFeedsList_store = useStore(state => state.clearFeedsList);

    const addFeedsToList_store = useStore((state)=> state.addFeedsToList)

    const ids = useStore(state => state.feeds.lists.profileTimelineFeeds);
    const feedsById = useStore(state => state.feeds.feedsById);


      const profileTimelineFeedsFromStore = useMemo(
        () => ids.map(id => feedsById[id]).filter(Boolean), // filter out undefined
        [ids, feedsById]
      );
    

    const { token } = useAuth();


    const API_URL = `${AppDetails.apis.profileTimeline}?user_id=${userId}`

      
    const getFeeds = async () => {

        
        const response = await ProfileTimelineController(API_URL, token, 1);

        if (response.status === 200){
            // Handle various API response structures
            const data = response.data.data;
            addFeedsToList_store(feedsName, data);
           
        }
        else{
            Alert.alert("Error", "Failed to fetch Feeds.");

        }

    }


    useEffect(()=>{

        clearFeedsList_store(feedsName);
        getFeeds()
    },[userId]);


    useEffect(()=>{      
        
        setPosts(profileTimelineFeedsFromStore);
    
    },[profileTimelineFeedsFromStore])



         
    
    // Transform profile posts to match FeedCard expected structure
        const transformedPosts = useMemo(() => {
            return posts.map(post => ({
                id: post.id,
                type: post.type || 'text',
                text: post.text,
                media: post.media || [],
                payload: post.payload || null,
                shared_post: post.shared_post || null,
                context: post.context || { type: 'feed' },
                likes_count: post.likes_count || 0,
                is_liked: post.is_liked || false,
                comments_count: post.comments_count || 0,
                created: post.created || post.time,
                user: post.user || null,
            }));
    }, [posts]);
    
    const combinedData = useMemo(() => {
        const profileHeader = { type: 'profileHeader', component: header };
        const profileTabs = { type: 'profileTabs', tabs, activeTab, onTabChange };
        const timelineComponents = { type: 'profileTimelineComponents', isOwner, getFeeds };
        
        
        const data = [
            profileHeader,
            profileTabs,  // Index 1 - will be sticky
            timelineComponents,
            ...transformedPosts.map(post => {
                return { type: 'feed', data: post };
            }),
        ];
        return data;
    }, [header, transformedPosts, tabs, activeTab, onTabChange, isOwner, getFeeds]);

    // Sticky header indices - tabs at index 1
    const stickyHeaderIndices = useMemo(() => [1], []);


    return (
        <View style={styles.container}>
            <Feeds 
                feedsName="profileTimelineFeeds" 
                combinedData={combinedData} 
                feeds={transformedPosts} 
                API_URL={API_URL}
                feedsController={ProfileTimelineController}
                stickyHeaderIndices={stickyHeaderIndices}
            />
        </View>
    )
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
});

export default Timeline;