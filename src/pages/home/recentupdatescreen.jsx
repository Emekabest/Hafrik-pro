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
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useIsFocused } from '@react-navigation/native';
import { Video } from 'expo-av';

import { useAuth } from '../../AuthContext';
import Banner from './banner.jsx';
import QuickLinks from './quicklinks.jsx';
import PostFeed from './postfeed.jsx';
import Feeds from './feeds.jsx';


const RecentUpdatesScreen = () => {
  const navigation = useNavigation();
  const { token, user } = useAuth();



  return (
   
    <ScrollView style={styles.container}>
        <Banner />
        <QuickLinks />
        <PostFeed />
        <Feeds />

    </ScrollView>

  );
};

const styles = StyleSheet.create({
  container:{
    
  }

});

export default RecentUpdatesScreen;