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
import Banner from './banner.jsx';
import QuickLinks from './quicklinks.jsx';


const RecentUpdatesScreen = () => {
  const navigation = useNavigation();
  const { token, user } = useAuth();



  return (
   
    <View>
        <Banner />
        <QuickLinks />
    </View>

  );
};

const styles = StyleSheet.create({

});

export default RecentUpdatesScreen;