import React, { useState, useCallback, useEffect, useMemo } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  TextInput, ScrollView, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Feeds from './feeds/feeds';
import { useAuth } from '../../AuthContext';
import GetFeedsController from '../../controllers/getfeedscontroller';
import useStore from '../../repository/store';
import AppDetails from '../../helpers/appdetails';

// ─── Categories ───────────────────────────────────────────────────────────────
const CATEGORIES = [
  { id: 'communities', label: 'Communities', icon: '👥', color: '#0C3F44' },
  { id: 'jobs',        label: 'Opportunities', icon: '💼', color: '#B5440F' },
  { id: 'market',      label: 'Marketplace',   icon: '🛒', color: '#1a3a5c' },
  { id: 'shipping',    label: 'Shipping',       icon: '🚢', color: '#1a4a1a' },
  { id: 'tv',          label: 'HafrikTV',       icon: '📺', color: '#3a1a5c' },
  { id: 'legal',       label: 'Legal Help',     icon: '⚖️', color: '#5c1a1a' },
];

// ─── Nearby mock people (replace with real API later) ─────────────────────────
const NEARBY_PEOPLE = [
  { id: 1, flag: '🇸🇳', name: 'Fatou Diallo',  dist: '1.2km' },
  { id: 2, flag: '🇪🇹', name: 'Biruk Haile',   dist: '2.8km' },
  { id: 3, flag: '🇿🇦', name: 'Sipho Dlamini', dist: '3.1km' },
  { id: 4, flag: '🇺🇬', name: 'Aisha Nakato',  dist: '4.5km' },
  { id: 5, flag: '🇨🇲', name: 'Jean-Paul M.',  dist: '5.2km' },
];

// ─── Category Card ────────────────────────────────────────────────────────────
const CategoryCard = ({ item, onPress }) => (
  <TouchableOpacity
    style={[styles.catCard, { backgroundColor: item.color }]}
    onPress={() => onPress(item)}
    activeOpacity={0.8}
  >
    <Text style={styles.catIcon}>{item.icon}</Text>
    <Text style={styles.catLabel}>{item.label}</Text>
  </TouchableOpacity>
);

// ─── Nearby Person Card ───────────────────────────────────────────────────────
const NearbyCard = ({ person }) => (
  <View style={styles.nearbyCard}>
    <View style={styles.nearbyAva}>
      <Text style={styles.nearbyFlag}>{person.flag}</Text>
    </View>
    <Text style={styles.nearbyName} numberOfLines={1}>{person.name}</Text>
    <Text style={styles.nearbyDist}>📍 {person.dist}</Text>
    <TouchableOpacity style={styles.connectBtn} activeOpacity={0.8}>
      <Text style={styles.connectText}>Connect</Text>
    </TouchableOpacity>
  </View>
);

// ─── WhatsNearbyScreen ────────────────────────────────────────────────────────
const WhatsNearbyScreen = () => {
  const { top } = useSafeAreaInsets();
  const { token } = useAuth();

  const feedsName = 'whatsNearbyFeeds';
  const API_URL   = AppDetails.apis.whatsnearbyApi;

  const clearFeedsList_store = useStore(state => state.clearFeedsList);
  const addFeedsToList_store = useStore(state => state.addFeedsToList);
  const ids        = useStore(state => state.feeds.lists.whatsNearbyFeeds);
  const feedsById  = useStore(state => state.feeds.feedsById);
  const refreshSignal = useStore(state => state.refreshSignal);

  const [feeds,   setFeeds]   = useState([]);
  const [version, setVersion] = useState(0);
  const [search,  setSearch]  = useState('');

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

  const handleCategoryPress = useCallback((cat) => {
    console.log('Category pressed:', cat.id);
    // navigate to category screen later
  }, []);

  // ── Build combinedData with explore UI injected as special item types ──────
  const combinedData = useMemo(() => [
    {
      type: 'exploreHero',
      renderComponent: () => (
        <View style={[styles.hero, { paddingTop: top + 10 }]}>
          <Text style={styles.heroLabel}>DISCOVER</Text>
          <Text style={styles.heroTitle}>Your diaspora.{'\n'}Your community.</Text>
          <View style={styles.searchWrap}>
            <Ionicons
              name="search-outline"
              size={16}
              color="rgba(255,255,255,0.5)"
              style={styles.searchIcon}
            />
            <TextInput
              style={styles.searchInput}
              placeholder="Search people, groups, cities…"
              placeholderTextColor="rgba(255,255,255,0.4)"
              value={search}
              onChangeText={setSearch}
            />
          </View>
        </View>
      ),
    },
    {
      type: 'exploreCategories',
      renderComponent: () => (
        <View style={styles.catSection}>
          <Text style={styles.secTitle}>Browse by Category</Text>
          <View style={styles.catGrid}>
            {CATEGORIES.map(cat => (
              <CategoryCard key={cat.id} item={cat} onPress={handleCategoryPress} />
            ))}
          </View>
        </View>
      ),
    },
    {
      type: 'exploreNearby',
      renderComponent: () => (
        <View style={styles.nearbySection}>
          <View style={styles.secHeader}>
            <Text style={styles.secTitle}>People Near You</Text>
            <TouchableOpacity>
              <Text style={styles.secLink}>See all</Text>
            </TouchableOpacity>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.nearbyScroll}
            nestedScrollEnabled
          >
            {NEARBY_PEOPLE.map(p => (
              <NearbyCard key={p.id} person={p} />
            ))}
          </ScrollView>
        </View>
      ),
    },
    { type: 'feedsheader', name: "Nearby Posts", id: feedsName },
    ...feeds.map(feed => ({ type: 'feed', data: feed })),
  ], [feeds, search, top, handleCategoryPress]);

  return (
    <View style={styles.container}>
      <Feeds
        key={version}
        feedsName={feedsName}
        combinedData={combinedData}
        feeds={feeds}
        API_URL={API_URL}
        feedsController={GetFeedsController}
      />
    </View>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F0E8' },

  // Hero
  hero: {
    backgroundColor: AppDetails.primaryColor,
    paddingHorizontal: 20,
    paddingBottom: 28,
  },
  heroLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.5,
    color: '#13C296',
    fontFamily: AppDetails.fontFamily.redex.bold,
    marginBottom: 6,
  },
  heroTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: '#fff',
    fontFamily: AppDetails.fontFamily.redex.bold,
    lineHeight: 32,
    marginBottom: 18,
  },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 100,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
    paddingHorizontal: 14,
    height: 44,
  },
  searchIcon: { marginRight: 8 },
  searchInput: {
    flex: 1,
    color: '#fff',
    fontSize: 14,
    fontFamily: AppDetails.fontFamily.inter.regular,
  },

  // Categories
  catSection: {
    backgroundColor: '#F5F0E8',
    padding: 16,
    paddingBottom: 8,
  },
  secHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  secTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0D1B1E',
    fontFamily: AppDetails.fontFamily.redex.bold,
    marginBottom: 12,
  },
  secLink: {
    fontSize: 12,
    fontWeight: '600',
    color: '#13C296',
    fontFamily: AppDetails.fontFamily.inter.medium,
  },
  catGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  catCard: {
    width: '47%',
    borderRadius: 16,
    padding: 18,
    minHeight: 90,
    justifyContent: 'flex-end',
  },
  catIcon: {
    fontSize: 28,
    marginBottom: 8,
  },
  catLabel: {
    fontSize: 13,
    fontWeight: '800',
    color: '#fff',
    fontFamily: AppDetails.fontFamily.redex.bold,
  },

  // Nearby
  nearbySection: {
    backgroundColor: '#F5F0E8',
    paddingBottom: 12,
    paddingTop: 4,
  },
  nearbyScroll: {
    paddingHorizontal: 16,
    gap: 10,
  },
  nearbyCard: {
    width: 120,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(12,63,68,0.09)',
  },
  nearbyAva: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: 'rgba(12,63,68,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  nearbyFlag: { fontSize: 22 },
  nearbyName: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0D1B1E',
    fontFamily: AppDetails.fontFamily.redex.bold,
    textAlign: 'center',
    marginBottom: 2,
  },
  nearbyDist: {
    fontSize: 10,
    color: '#7A9198',
    marginBottom: 10,
    textAlign: 'center',
  },
  connectBtn: {
    width: '100%',
    paddingVertical: 5,
    borderRadius: 100,
    borderWidth: 1.5,
    borderColor: '#0C3F44',
    alignItems: 'center',
  },
  connectText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0C3F44',
    fontFamily: AppDetails.fontFamily.redex.bold,
  },
});

export default WhatsNearbyScreen;