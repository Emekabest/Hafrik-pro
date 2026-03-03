import React, { useState, useCallback, useEffect, useMemo } from 'react';
import {
  View, StyleSheet, Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Feeds from './feeds/feeds';
import { useAuth } from '../../AuthContext';
import GetFeedsController from '../../controllers/getfeedscontroller';
import useStore from '../../repository/store';
import AppDetails from '../../helpers/appdetails';
import { Colors } from '../../theme/colors';



// ─── WhatsNearbyScreen ────────────────────────────────────────────────────────
const WhatsNearbyScreen = () => {
  const { token } = useAuth();
  const navigation = useNavigation();

  const feedsName = 'whatsNearbyFeeds';
  const API_URL   = AppDetails.apis.whatsnearbyApi;

  const clearFeedsList_store = useStore(state => state.clearFeedsList);
  const addFeedsToList_store = useStore(state => state.addFeedsToList);
  const ids        = useStore(state => state.feeds.lists.whatsNearbyFeeds);
  const feedsById  = useStore(state => state.feeds.feedsById);
  const refreshSignal = useStore(state => state.refreshSignal);

  const [feeds,   setFeeds]   = useState([]);
  const [version, setVersion] = useState(0);

  const feedsFromStore = useMemo(
    () => ids.map(id => feedsById[id]).filter(Boolean),
    [ids, feedsById]
  );

  const getFeeds = useCallback(async () => {
    clearFeedsList_store(feedsName);
    const response = await GetFeedsController(API_URL, token, 1);
    if (response.status === 200) {
      addFeedsToList_store(feedsName, response.data);
    } else {
      Alert.alert('Error', "Failed to fetch What's Nearby Feeds.");
    }
  }, [API_URL, token]);

  useEffect(() => { getFeeds(); }, []);

  useEffect(() => {
    clearFeedsList_store(feedsName);
    getFeeds();
    setVersion(v => v + 1);
  }, [refreshSignal]);

  useEffect(() => {
    setFeeds(feedsFromStore);
  }, [feedsFromStore]);

  const handlePostPress = useCallback((postId) => {
    navigation.navigate('PostDetail', { postId });
  }, [navigation]);

  // ── Build combinedData ────────────────────────────────────────────────────
  const combinedData = useMemo(() => [
    { type: 'feedsheader', name: 'Nearby Posts', id: feedsName },
    ...feeds.map(feed => ({ type: 'feed', data: feed })),
  ], [feeds]);

  return (
    <View style={styles.container}>
      <Feeds
        key={version}
        feedsName={feedsName}
        combinedData={combinedData}
        feeds={feeds}
        API_URL={API_URL}
        feedsController={GetFeedsController}
        onPostPress={handlePostPress}
      />
    </View>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.surfaceWarm },
});

export default WhatsNearbyScreen;