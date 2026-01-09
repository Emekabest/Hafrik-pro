import React, { useState, useEffect, useRef, useMemo, use } from 'react';
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
import useStore from "../../repository/store.js"
import AsyncStorage from '@react-native-async-storage/async-storage';


const RecentUpdatesScreen = () => {
  const [feeds, setFeeds] = useState([])

  const { token } = useAuth();

  const API_URL = `https://hafrik.com/api/v1/feed/list.php`;

  const recentFeedsFromStore = useStore((state)=> state.recentUpdateFeeds)
  const setRecentFeedsToStore = useStore((state)=> state.setRecentUpdateFeeds)

  const refreshSignal = useStore(state => state.refreshSignal);
  const [version, setVersion] = useState(0);




  const getFeeds = async()=>{
    // await AsyncStorage.removeItem('selected_country');

        const response = await GetFeedsController(API_URL, token, 1);  

        if (response.status === 200) {
          setRecentFeedsToStore([...response.data]);

        }
        else{
          Alert.alert("Error", "Failed to fetch recent updates.");
        }
  }

    useEffect(()=>{
        getFeeds()
    },[])
    useEffect(()=>{
        // increment version to force remount of child components
        setVersion(v => v + 1);
        getFeeds()
    },[refreshSignal])


    useEffect(()=>{      

        setFeeds(recentFeedsFromStore);
    
    },[recentFeedsFromStore])




  

    const combinedData = useMemo(() => {
        const bannerItem = { type: 'banner' };
        const quickLinksItem = { type: 'quicklinks' };
        const postFeedItem = { type: 'postfeed' }
        const feedsheader = { type: 'feedsheader' }

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
          <Feeds key={version} combinedData={combinedData} feeds={feeds} setFeeds={setFeeds} API_URL={API_URL} feedsController={GetFeedsController} />
      </View>
  );
};



const styles = StyleSheet.create({
  container:{
    flex: 1,
  }

});

export default RecentUpdatesScreen;