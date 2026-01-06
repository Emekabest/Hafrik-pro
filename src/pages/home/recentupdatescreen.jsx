import React, { useState, useEffect, useRef } from 'react';
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

import { useAuth } from '../../AuthContext';
import Feeds from "./feeds/feeds.jsx"
import Quicklinks from './quicklinks.jsx';
import Banner from './banner.jsx';


const RecentUpdatesScreen = () => {
  
  const bannerItem = { type: 'banner' };
  const quickLinksItem = { type: 'quicklinks' };
  const postFeedItem = { type: 'postfeed' }
  const feedsheader = { type: 'feedsheader' }

  const data =[
    bannerItem,
    quickLinksItem,
    postFeedItem,
    feedsheader,

  ]



  return (
      <View style={styles.container}>
          <Feeds />
      </View>
  );
};

const styles = StyleSheet.create({
  container:{
    flex: 1,
  }

});

export default RecentUpdatesScreen;