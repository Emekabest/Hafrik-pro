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

  const [feeds,         setFeeds]         = useState([]);
  const [version,       setVersion]       = useState(0);
  const [adsList,       setAdsList]       = useState([]);
  const [peopleList,    setPeopleList]    = useState([]);
  const [bizList,       setBizList]       = useState([]);
  const [communityList, setCommunityList] = useState([]);

  useEffect(() => {
    if (!token) return;
    const headers = { Authorization: `Bearer ${token}` };

    fetch('https://hafrik.com/api/v1/ads/list.php', { headers })
      .then(r => r.json())
      .then(d => {
        const raw = d?.data;
        setAdsList(Array.isArray(raw) ? raw : (raw?.id ? [raw] : []));
      })
      .catch(() => {});

    fetch('https://hafrik.com/api/v1/people/list.php', { headers })
      .then(r => r.json())
      .then(d => setPeopleList(Array.isArray(d?.data) ? d.data : Array.isArray(d) ? d : []))
      .catch(() => {});

    fetch('https://hafrik.com/api/v1/business/list.php?limit=5', { headers })
      .then(r => r.json())
      .then(d => {
        const list = d?.data?.data ?? d?.data?.businesses ?? d?.data?.pages ?? d?.data ?? [];
        setBizList(Array.isArray(list) ? list : []);
      })
      .catch(() => {});

    fetch('https://hafrik.com/api/v1/communities/list.php?limit=5', { headers })
      .then(r => r.json())
      .then(d => {
        const list = d?.data?.data ?? d?.data?.groups ?? d?.data?.communities ?? d?.data ?? [];
        setCommunityList(Array.isArray(list) ? list : []);
      })
      .catch(() => {});
  }, [token]);

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

  // ── Build combinedData with interstitials ─────────────────────────────────
  const combinedData = useMemo(() => {
    const items = [{ type: 'feedsheader', name: 'Nearby Posts', id: feedsName }];

    const pool = [];
    if (adsList.length       > 0) pool.push({ type: 'ad',            data: adsList[0] });
    if (peopleList.length    > 0 && Math.random() < 0.5) pool.push({ type: 'peoplecard',    data: peopleList });
    if (bizList.length       > 0) pool.push({ type: 'bizcard',       data: bizList });
    if (communityList.length > 0) pool.push({ type: 'communitycard', data: communityList });
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }

    const MAX_INTERSTITIALS = 2;
    const FIRST_AT          = 5;
    const STEP              = 8;
    let poolIdx    = 0;
    let nextInsert = FIRST_AT;

    feeds.forEach((feed, i) => {
      items.push({ type: 'feed', data: feed });
      if ((i + 1) === nextInsert && poolIdx < pool.length && poolIdx < MAX_INTERSTITIALS) {
        items.push(pool[poolIdx++]);
        nextInsert += STEP;
      }
    });

    return items;
  }, [feeds, adsList, peopleList, bizList, communityList]);

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