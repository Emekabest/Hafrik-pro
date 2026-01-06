import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  RefreshControl,
  Dimensions,
  Alert,
  FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useIsFocused } from '@react-navigation/native';
import { Video } from 'expo-av';

import { useAuth } from '../../AuthContext.js';
import Feeds from "./feeds/feeds.jsx"
import Quicklinks from './quicklinks.jsx';
import Banner from './banner.jsx';
import GetFeedsController from '../../controllers/getfeedscontroller.js';


const RecentUpdatesScreen = () => {

  const [feeds, setFeeds] = useState([])

  const { token } = useAuth();

  const API_URL = `https://hafrik.com/api/v1/feed/list.php`;


 

    useEffect(()=>{
        const getFeeds = async()=>{
            const response = await GetFeedsController(API_URL, token, 1);  
            setFeeds(response.data);
        }
        getFeeds()
    },[])


  

    const combinedData = useMemo(() => {
        const bannerItem = { type: 'banner' };
        const quickLinksItem = { type: 'quicklinks' };
        const postFeedItem = { type: 'postfeed' }
        const feedsheader = { type: 'feedsheader' }

        // console.log(feeds)
        // Ensure unique feed items and handle shared_post correctly
        
        const data = [
            bannerItem,
            quickLinksItem,
            postFeedItem,
            feedsheader,
            ...feeds.map(feed => {
                
                return { type: 'feed', data: feed };
            }),
        ];

        return data;
    }, [feeds]);



  return (
      <View style={styles.container}>
          <Feeds combinedData={combinedData} feeds={feeds} setFeeds={setFeeds} API_URL={API_URL} />
      </View>
  );
};

const styles = StyleSheet.create({
  container:{
    flex: 1,
  }

});

export default RecentUpdatesScreen;