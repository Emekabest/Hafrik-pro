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

const { width: screenWidth } = Dimensions.get('window');
const GRID_ITEM_WIDTH = (screenWidth) / 2;
const GRID_ITEM_BASE_HEIGHT = 380;

const RecentUpdatesScreen = () => {
  const navigation = useNavigation();
  const isFocused = useIsFocused();
  const { token, user } = useAuth();
  const [selectedLocation, setSelectedLocation] = useState({ id: 'all', name: 'All Locations' });
  const [selectedFilter, setSelectedFilter] = useState('Latest');
  const [allFeeds, setAllFeeds] = useState([]);
  const [filteredFeeds, setFilteredFeeds] = useState([]);
  const [suggestedPeople, setSuggestedPeople] = useState([]);
  const [loading, setLoading] = useState(true);
  const [peopleLoading, setPeopleLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [pageNum, setPageNum] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [currentPlayingVideo, setCurrentPlayingVideo] = useState(null);
  const [mutedVideos, setMutedVideos] = useState({});
  const [isGridView, setIsGridView] = useState(true);

  const videoRefs = useRef({});
  const flatListRef = useRef(null);
  const viewableItems = useRef([]);

  const locations = [
    { id: 'all', name: 'All Locations' },
    { id: 279, name: 'Beijing', code: 'BJ' },
    // ... (rest of locations if needed, or fetch dynamically)
  ];

  const fetchSuggestedPeople = async () => {
    try {
      setPeopleLoading(true);
      const response = await fetch('https://hafrik.com/api/v1/people/list.php');
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const responseText = await response.text();
      let peopleData = [];
      try {
        const data = JSON.parse(responseText);
        if (data.status === 'success') {
          if (Array.isArray(data.data)) peopleData = data.data;
          else if (data.data && Array.isArray(data.data.data)) peopleData = data.data.data;
          else if (data.data && typeof data.data === 'object') {
            const arrayValues = Object.values(data.data).filter(item => Array.isArray(item));
            peopleData = arrayValues[0] || [];
          }
        }
      } catch (parseError) {
        console.error('JSON Parse Error:', parseError);
      }
      setSuggestedPeople(peopleData);
    } catch (error) {
      console.error('Error fetching suggested people:', error);
      setSuggestedPeople([]);
    } finally {
      setPeopleLoading(false);
    }
  };

  const getApiUrl = (page = 1, filter = 'Latest') => {
    const baseUrl = 'https://hafrik.com/api/v1/feed/list.php';
    const limit = 10;
    let url = `${baseUrl}?page=${page}&limit=${limit}`;
    switch (filter) {
      case 'Trending': url += '&sort=top'; break;
      case 'Popular': url += '&sort=popular'; break;
      default: url += '&sort=latest'; break;
    }
    return url;
  };

  const fetchFeeds = async (page = 1, isRefresh = false, filter = 'Latest') => {
    try {
      if (isRefresh) {
        setRefreshing(true);
        setPageNum(1);
      } else {
        if (page === 1) setLoading(true);
      }
      const apiUrl = getApiUrl(page, filter);
      const response = await fetch(apiUrl);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const responseText = await response.text();
      let feedsData = [];
      try {
        const data = JSON.parse(responseText);
        if (data.status === 'success') {
          if (data.data && Array.isArray(data.data)) feedsData = data.data;
          else if (data.data && data.data.data && Array.isArray(data.data.data)) feedsData = data.data.data;
          else if (Array.isArray(data.data)) feedsData = data.data;
        }
      } catch (parseError) {
        console.error('JSON Parse Error:', parseError);
      }

      if (Array.isArray(feedsData) && feedsData.length > 0) {
        if (isRefresh) setAllFeeds(feedsData);
        else setAllFeeds(prev => [...prev, ...feedsData]);
        setHasMore(feedsData.length >= 10);
      } else {
        if (isRefresh) {
          setAllFeeds([]);
          setFilteredFeeds([]);
        }
        setHasMore(false);
      }
    } catch (error) {
      console.error('Error fetching feeds:', error);
      Alert.alert('Error', 'Failed to load feeds. Please try again.');
      if (isRefresh) {
        setAllFeeds([]);
        setFilteredFeeds([]);
      }
      setHasMore(false);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const filterFeedsByLocation = (feeds, locationId) => {
    if (locationId === 'all') return feeds;
    return feeds.filter(feed => {
      const feedCountryId = feed.country || feed.country_id || feed.location_id || feed.city_id || feed.province_id;
      const feedLocation = feed.location || feed.city || feed.province || feed.region;
      if (feedCountryId) return feedCountryId == locationId;
      if (feedLocation) {
        const location = locations.find(loc => loc.id === locationId);
        if (location && feedLocation.toLowerCase().includes(location.name.toLowerCase())) return true;
      }
      return true;
    });
  };

  useEffect(() => {
    if (allFeeds.length > 0) {
      const filtered = filterFeedsByLocation(allFeeds, selectedLocation.id);
      setFilteredFeeds(filtered);
    }
  }, [allFeeds, selectedLocation]);

  const loadMoreFeeds = () => {
    if (!loading && hasMore && !refreshing) {
      const nextPage = pageNum + 1;
      setPageNum(nextPage);
      fetchFeeds(nextPage, false, selectedFilter);
    }
  };

  const onRefresh = () => {
    fetchFeeds(1, true, selectedFilter);
    fetchSuggestedPeople();
  };

  const handleViewableItemsChanged = useRef(({ viewableItems: visibleItems }) => {
    viewableItems.current = visibleItems;
    if (visibleItems.length > 0 && isFocused) {
      const visibleVideo = visibleItems.find(item => item.item.type === 'video' || item.item.type === 'reel');
      if (visibleVideo) setCurrentPlayingVideo(visibleVideo.item.id);
      else setCurrentPlayingVideo(null);
    } else if (!isFocused) {
      setCurrentPlayingVideo(null);
    }
  }).current;

  const viewabilityConfig = { itemVisiblePercentThreshold: 70, waitForInteraction: false };

  const handleVideoLoad = (feedId) => console.log(`Video loaded: ${feedId}`);
  const handleVideoError = (error, feedId) => console.log(`Video error for ${feedId}:`, error);

  useEffect(() => {
    if (!isFocused) setCurrentPlayingVideo(null);
  }, [isFocused]);

  useEffect(() => {
    return () => {
      Object.keys(videoRefs.current).forEach(key => {
        if (videoRefs.current[key]) videoRefs.current[key] = null;
      });
    };
  }, []);

  const getFeedThumbnail = (feed) => {
    if (feed.media && feed.media.length > 0) {
      const firstMedia = feed.media[0];
      if (firstMedia.thumbnail) return firstMedia.thumbnail;
      if (firstMedia.url) return firstMedia.url;
      if (firstMedia.video_url) return firstMedia.thumbnail;
    }
    return null;
  };

  const handleFollow = (personId) => Alert.alert('Follow', `You started following person with ID: ${personId}`);

  const handleFeedPress = (feed) => {
    if (feed.type === 'reel' || feed.type === 'video') {
      const reelsData = filteredFeeds.filter(f => f.type === 'reel' || f.type === 'video');
      const currentIndex = reelsData.findIndex(f => f.id === feed.id);
      navigation.navigate('Reels', { initialReelId: feed.id, reelsData: reelsData, initialIndex: currentIndex });
    } else {
      navigation.navigate('FeedDetail', { feedId: feed.id });
    }
  };

  const getGridItemHeight = (feed) => {
    const caption = feed.text || feed.caption || '';
    return caption.trim().length > 0 ? GRID_ITEM_BASE_HEIGHT : GRID_ITEM_BASE_HEIGHT - 60;
  };

  useEffect(() => {
    fetchFeeds(1, false, selectedFilter);
    fetchSuggestedPeople();
  }, []);

  const renderPeopleSection = () => {
    if (peopleLoading) {
      return (
        <View style={styles.peopleSection}>
          <View style={styles.peopleHeader}><Text style={styles.peopleTitle}>People You May Know</Text></View>
          <View style={styles.peopleLoading}><ActivityIndicator size="small" color="#0C3F44" /><Text style={styles.peopleLoadingText}>Loading suggestions...</Text></View>
        </View>
      );
    }
    if (suggestedPeople.length === 0) return null;
    return (
      <View style={styles.peopleSection}>
        <View style={styles.peopleHeader}>
          <Text style={styles.peopleTitle}>People You May Know</Text>
          <TouchableOpacity><Text style={styles.seeAllText}>See All</Text></TouchableOpacity>
        </View>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={suggestedPeople}
          keyExtractor={(item) => `person-${item.id || item.user_id || Math.random()}`}
          contentContainerStyle={styles.peopleList}
          renderItem={({ item }) => {
            const personName = item.name || item.username || item.full_name || 'Unknown User';
            const username = item.username || `user_${item.id}`;
            const avatar = item.avatar || item.profile_picture || item.image_url || 'https://hafrik.com/default-avatar.png';
            const profession = item.profession || item.bio || item.occupation || 'Member';
            const mutualFriends = item.mutual_friends || item.mutualFriends || Math.floor(Math.random() * 20) + 1;
            return (
              <View style={styles.personCard}>
                <Image source={{ uri: avatar }} style={styles.personAvatar} />
                <View style={styles.personInfo}>
                  <Text style={styles.personName}>{personName}</Text>
                  <Text style={styles.personUsername}>@{username}</Text>
                  <Text style={styles.personProfession}>{profession}</Text>
                  <Text style={styles.mutualFriends}>{mutualFriends} mutual friends</Text>
                </View>
                <TouchableOpacity style={styles.followButton} onPress={() => handleFollow(item.id || item.user_id)}>
                  <Text style={styles.followButtonText}>Follow</Text>
                </TouchableOpacity>
              </View>
            );
          }}
        />
      </View>
    );
  };

  const renderGridFeedItem = ({ item: feed }) => {
    const thumbnail = getFeedThumbnail(feed);
    const caption = feed.text || feed.caption || '';
    const user = feed.user || {};
    const hasMedia = feed.media && feed.media.length > 0;
    const type = feed.type || 'post';
    const videoUrl = feed.media?.[0]?.video_url;
    const isVideo = type === 'video' || type === 'reel';
    const isPlaying = currentPlayingVideo === feed.id;
    const hasCaption = caption.trim().length > 0;
    const gridItemHeight = getGridItemHeight(feed);

    return (
      <TouchableOpacity style={[styles.gridItem, { height: gridItemHeight }]} onPress={() => handleFeedPress(feed)} activeOpacity={0.9}>
        {hasMedia && thumbnail ? (
          <View style={styles.gridMediaContainer}>
            {isVideo && videoUrl ? (
              <TouchableOpacity style={styles.videoContainer} onPress={() => handleFeedPress(feed)} activeOpacity={0.9}>
                <Video
                  ref={ref => videoRefs.current[feed.id] = ref}
                  source={{ uri: videoUrl }}
                  style={styles.gridVideoPlayer}
                  resizeMode="cover"
                  paused={!isPlaying}
                  repeat={true}
                  muted={true}
                  isLooping
                  shouldPlay={isPlaying}
                  onLoad={() => handleVideoLoad(feed.id)}
                  onError={(error) => handleVideoError(error, feed.id)}
                />
                <View style={styles.userInfoOverlay}>
                  <View style={styles.userInfoRow}>
                    <Image source={{ uri: user.avatar || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-4.0.3&auto=format&fit=crop&w=200&q=80' }} style={styles.overlayUserAvatar} />
                    <Text style={styles.overlayUsername}>{user.username || 'User'}</Text>
                  </View>
                  <View style={styles.likesOverlay}>
                    <Ionicons name="heart" size={14} color="#fff" />
                    <Text style={styles.likesCount}>{feed.likes_count || 0}</Text>
                  </View>
                </View>
              </TouchableOpacity>
            ) : (
              <View style={styles.imageContainer}>
                <Image source={{ uri: thumbnail }} style={styles.gridImage} resizeMode="cover" />
                <View style={styles.userInfoOverlay}>
                  <View style={styles.userInfoRow}>
                    <Image source={{ uri: user.avatar || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-4.0.3&auto=format&fit=crop&w=200&q=80' }} style={styles.overlayUserAvatar} />
                    <Text style={styles.overlayUsername}>{user.username || 'User'}</Text>
                  </View>
                  <View style={styles.likesOverlay}>
                    <Ionicons name="heart" size={14} color="#fff" />
                    <Text style={styles.likesCount}>{feed.likes_count || 0}</Text>
                  </View>
                </View>
              </View>
            )}
          </View>
        ) : (
          <View style={[styles.gridContentContainer, styles.gridGreenBackground]}>
            <Text style={styles.gridText} numberOfLines={6}>{caption}</Text>
          </View>
        )}
        {hasCaption && (
          <View style={styles.gridCaptionContainer}>
            <Text style={styles.gridCaption} numberOfLines={2}>{caption}</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  if (loading && filteredFeeds.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0C3F44" />
        <Text style={styles.loadingText}>Loading feeds...</Text>
      </View>
    );
  }

  const displayFeeds = filteredFeeds.filter(feed => (feed.media && feed.media.length > 0) || (feed.text || feed.caption));

  if (displayFeeds.length === 0 && !loading) {
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="newspaper-outline" size={64} color="#ccc" />
        <Text style={styles.emptyText}>{selectedLocation.id === 'all' ? 'No feeds found' : `No feeds found in ${selectedLocation.name}`}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={onRefresh}><Text style={styles.retryText}>Try Again</Text></TouchableOpacity>
      </View>
    );
  }

  return (
    <FlatList
      ref={flatListRef}
      data={displayFeeds}
      renderItem={renderGridFeedItem}
      keyExtractor={(item, index) => `feed-${item.id || index}`}
      showsVerticalScrollIndicator={false}
      onEndReached={loadMoreFeeds}
      onEndReachedThreshold={0.3}
      onViewableItemsChanged={handleViewableItemsChanged}
      viewabilityConfig={viewabilityConfig}
      numColumns={isGridView ? 2 : 1}
      columnWrapperStyle={isGridView ? styles.gridColumnWrapper : null}
      getItemLayout={(data, index) => {
        const item = data[index];
        const itemHeight = getGridItemHeight(item);
        return { length: itemHeight, offset: itemHeight * index, index };
      }}
      ListFooterComponent={
        <>
          {renderPeopleSection()}
          {loading && displayFeeds.length > 0 && (
            <View style={styles.loadingMoreContainer}>
              <ActivityIndicator size="small" color="#0C3F44" />
              <Text style={styles.loadingMoreText}>Loading more feeds...</Text>
            </View>
          )}
          {!hasMore && displayFeeds.length > 0 && (
            <View style={styles.endOfFeedsContainer}>
              <Text style={styles.endOfFeedsText}>You've reached the end of feeds</Text>
            </View>
          )}
        </>
      }
      ListHeaderComponent={
        <>
          <Banner />
          <QuickLinks />
        </>
      }
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#0C3F44']} tintColor="#0C3F44" />
      }
    />
  );
};

const styles = StyleSheet.create({
  loadingContainer: { padding: 40, alignItems: 'center' },
  loadingText: { marginTop: 10, color: '#666' },
  emptyContainer: { padding: 40, alignItems: 'center' },
  emptyText: { marginTop: 10, color: '#666', fontSize: 16 },
  retryButton: { marginTop: 15, paddingHorizontal: 20, paddingVertical: 10, backgroundColor: '#0C3F44', borderRadius: 20 },
  retryText: { color: '#fff', fontWeight: '600' },
  loadingMoreContainer: { padding: 20, alignItems: 'center' },
  loadingMoreText: { marginTop: 5, color: '#666', fontSize: 12 },
  endOfFeedsContainer: { padding: 20, alignItems: 'center', borderTopWidth: 1, borderTopColor: '#f0f0f0', marginTop: 10 },
  endOfFeedsText: { color: '#666', fontSize: 14, fontStyle: 'italic' },
  gridColumnWrapper: { justifyContent: 'space-between', paddingHorizontal: 0 },
  gridItem: { width: GRID_ITEM_WIDTH, marginBottom: 2, overflow: 'hidden', borderWidth: 1, borderColor: '#f0f0f0', borderRadius: 8 },
  gridMediaContainer: { width: '100%', flex: 1, position: 'relative', backgroundColor: '#000' },
  gridVideoPlayer: { width: '100%', height: '100%', backgroundColor: '#000' },
  gridImage: { width: '100%', height: '100%', backgroundColor: '#f8f9fa' },
  imageContainer: { width: '100%', height: '100%' },
  videoContainer: { width: '100%', height: '100%' },
  userInfoOverlay: { position: 'absolute', top: 8, left: 8, right: 8, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  userInfoRow: { flexDirection: 'row', alignItems: 'center' },
  overlayUserAvatar: { width: 28, height: 28, borderRadius: 14, marginRight: 8, borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.3)' },
  overlayUsername: { fontSize: 12, color: '#fff', fontWeight: '600', textShadowColor: 'rgba(0, 0, 0, 0.8)', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 3 },
  likesOverlay: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(0, 0, 0, 0.5)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  likesCount: { fontSize: 12, color: '#fff', fontWeight: '600', marginLeft: 4 },
  gridContentContainer: { width: '100%', flex: 1, padding: 12, backgroundColor: '#f8f9fa', justifyContent: 'center', alignItems: 'center' },
  gridGreenBackground: { backgroundColor: '#0C3F44' },
  gridText: { fontSize: 12, color: '#ffffffff', lineHeight: 16, textAlign: 'center' },
  gridCaptionContainer: { padding: 8, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#f0f0f0', minHeight: 40, justifyContent: 'center' },
  gridCaption: { fontSize: 12, color: '#333', lineHeight: 16 },
  peopleSection: { marginVertical: 20, paddingHorizontal: 5 },
  peopleHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15, paddingHorizontal: 10 },
  peopleTitle: { fontSize: 18, fontWeight: 'bold', color: '#333' },
  seeAllText: { color: '#0C3F44', fontSize: 14, fontWeight: '600' },
  peopleList: { paddingRight: 15, paddingLeft: 10 },
  personCard: { width: 160, backgroundColor: 'transparent', borderRadius: 12, padding: 12, marginRight: 12, borderWidth: 1, borderColor: '#f0f0f0' },
  personAvatar: { width: 60, height: 60, borderRadius: 30, alignSelf: 'center', marginBottom: 10 },
  personInfo: { marginBottom: 12 },
  personName: { fontSize: 14, fontWeight: 'bold', color: '#333', textAlign: 'center', marginBottom: 2 },
  personUsername: { fontSize: 12, color: '#666', textAlign: 'center', marginBottom: 2 },
  personProfession: { fontSize: 11, color: '#888', textAlign: 'center', marginBottom: 4 },
  mutualFriends: { fontSize: 10, color: '#0C3F44', textAlign: 'center', fontWeight: '500' },
  followButton: { backgroundColor: '#0C3F44', paddingVertical: 8, borderRadius: 20, alignItems: 'center' },
  followButtonText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  peopleLoading: { height: 120, justifyContent: 'center', alignItems: 'center' },
  peopleLoadingText: { marginTop: 8, color: '#666', fontSize: 12 },
});

export default RecentUpdatesScreen;