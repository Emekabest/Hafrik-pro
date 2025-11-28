import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Image,
  Modal,
  ActivityIndicator,
  RefreshControl,
  Dimensions,
  Alert,
  FlatList,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useIsFocused } from '@react-navigation/native';
import Video from 'react-native-video';
import { useAuth } from '../AuthContext';

const { width: screenWidth } = Dimensions.get('window');
const GRID_ITEM_WIDTH = (screenWidth) / 2;
// Base grid item height - will adjust based on caption
const GRID_ITEM_BASE_HEIGHT = 380;

const HomePage = () => {
  const navigation = useNavigation();
  const isFocused = useIsFocused();
  const { token, user } = useAuth();
  const [locationModalVisible, setLocationModalVisible] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState({ id: 'all', name: 'All Locations' });
  const [selectedFilter, setSelectedFilter] = useState('Latest');
  const [allFeeds, setAllFeeds] = useState([]);
  const [filteredFeeds, setFilteredFeeds] = useState([]);
  const [banners, setBanners] = useState([]);
  const [quickLinks, setQuickLinks] = useState([]);
  const [suggestedPeople, setSuggestedPeople] = useState([]);
  const [loading, setLoading] = useState(true);
  const [bannerLoading, setBannerLoading] = useState(true);
  const [quickLinksLoading, setQuickLinksLoading] = useState(true);
  const [peopleLoading, setPeopleLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [pageNum, setPageNum] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [currentBannerIndex, setCurrentBannerIndex] = useState(0);
  const [currentQuickLinksIndex, setCurrentQuickLinksIndex] = useState(0);
  const [currentPlayingVideo, setCurrentPlayingVideo] = useState(null);
  const [mutedVideos, setMutedVideos] = useState({});
  const [isGridView, setIsGridView] = useState(true);

  const videoRefs = useRef({});
  const flatListRef = useRef(null);
  const quickLinksScrollViewRef = useRef(null);
  const viewableItems = useRef([]);

  // Location mapping based on your database table
  const locations = [
    { id: 'all', name: 'All Locations' },
    { id: 279, name: 'Beijing', code: 'BJ' },
    { id: 280, name: 'Shanghai', code: 'SH' },
    { id: 281, name: 'Guangzhou', code: 'GZ' },
    { id: 282, name: 'Shenzhen', code: 'SZ' },
    { id: 283, name: 'Chengdu', code: 'CD' },
    { id: 284, name: 'Hangzhou', code: 'HZ' },
    { id: 285, name: 'Nanjing', code: 'NJ' },
    { id: 286, name: 'Wuhan', code: 'WH' },
    { id: 287, name: 'Chongqing', code: 'CO' },
    { id: 288, name: 'Xi\'an', code: 'XA' },
    { id: 289, name: 'Tianjin', code: 'TJ' },
    { id: 290, name: 'Suzhou', code: 'SZ' },
    { id: 291, name: 'Qingdao', code: 'QD' },
    { id: 292, name: 'Changsha', code: 'CS' },
    { id: 293, name: 'Zhengzhou', code: 'ZZ' },
    { id: 294, name: 'Shenyang', code: 'SY' },
    { id: 295, name: 'Harbin', code: 'HB' },
    { id: 296, name: 'Kunming', code: 'KM' },
    { id: 297, name: 'Fuzhou', code: 'FZ' },
    { id: 298, name: 'Jinan', code: 'JN' },
    { id: 299, name: 'Ningbo', code: 'NB' },
    { id: 300, name: 'Wuxi', code: 'WX' },
    { id: 301, name: 'Xiamen', code: 'XM' },
    { id: 302, name: 'Hefei', code: 'HF' },
    { id: 303, name: 'Urumqi', code: 'UR' },
  ];

  const filterOptions = [
    'Latest',
    'Trending',
    'Popular',
    'Featured',
    'Near You',
    'Top Rated',
    'Most Viewed',
    'New Arrivals'
  ];

  // Fetch banners from API
  const fetchBanners = async () => {
    try {
      setBannerLoading(true);
      const response = await fetch('https://hafrik.com/api/v1/home/banners.php');

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const responseText = await response.text();
      let bannersData = [];

      try {
        const data = JSON.parse(responseText);
        if (data.status === 'success') {
          if (Array.isArray(data.data)) {
            bannersData = data.data;
          } else if (data.data && Array.isArray(data.data.data)) {
            bannersData = data.data.data;
          } else if (data.data && typeof data.data === 'object') {
            bannersData = Object.values(data.data).filter(item => Array.isArray(item))[0] || [];
          }
        }
      } catch (parseError) {
        console.error('Banners JSON Parse Error:', parseError);
      }

      setBanners(bannersData);

    } catch (error) {
      console.error('Error fetching banners:', error);
      setBanners([]);
    } finally {
      setBannerLoading(false);
    }
  };

  // Fetch quick links from API
  const fetchQuickLinks = async () => {
    try {
      setQuickLinksLoading(true);
      const response = await fetch('https://hafrik.com/api/v1/home/quick_links.php');

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const responseText = await response.text();
      let quickLinksData = [];

      try {
        const data = JSON.parse(responseText);
        if (data.status === 'success') {
          if (Array.isArray(data.data)) {
            quickLinksData = data.data;
          } else if (data.data && Array.isArray(data.data.data)) {
            quickLinksData = data.data.data;
          } else if (data.data && typeof data.data === 'object') {
            quickLinksData = Object.values(data.data).filter(item => Array.isArray(item))[0] || [];
          }
        }
      } catch (parseError) {
        console.error('Quick links JSON Parse Error:', parseError);
      }

      setQuickLinks(quickLinksData);

    } catch (error) {
      console.error('Error fetching quick links:', error);
      setQuickLinks([]);
    } finally {
      setQuickLinksLoading(false);
    }
  };

  // Fetch suggested people from API
  const fetchSuggestedPeople = async () => {
    try {
      setPeopleLoading(true);
      const response = await fetch('https://hafrik.com/api/v1/people/list.php');

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const responseText = await response.text();
      let peopleData = [];

      try {
        const data = JSON.parse(responseText);
        if (data.status === 'success') {
          if (Array.isArray(data.data)) {
            peopleData = data.data;
          } else if (data.data && Array.isArray(data.data.data)) {
            peopleData = data.data.data;
          } else if (data.data && typeof data.data === 'object') {
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

  // Get API URL - No city parameters needed
  const getApiUrl = (page = 1, filter = 'Latest') => {
    const baseUrl = 'https://hafrik.com/api/v1/feed/list.php';
    const limit = 10;

    let url = `${baseUrl}?page=${page}&limit=${limit}`;

    switch (filter) {
      case 'Trending':
        url += '&sort=top';
        break;
      case 'Popular':
        url += '&sort=popular';
        break;
      default:
        url += '&sort=latest';
        break;
    }

    console.log('🌐 API URL:', url);
    return url;
  };

  // Fetch feeds from API
  const fetchFeeds = async (page = 1, isRefresh = false, filter = 'Latest') => {
    try {
      console.log(`📝 Fetching feeds - Page: ${page}, Refresh: ${isRefresh}, Filter: ${filter}`);

      if (isRefresh) {
        setRefreshing(true);
        setPageNum(1);
      } else {
        if (page === 1) setLoading(true);
      }

      const apiUrl = getApiUrl(page, filter);
      console.log('🌐 Making API call to:', apiUrl);

      const response = await fetch(apiUrl);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const responseText = await response.text();
      let feedsData = [];

      try {
        const data = JSON.parse(responseText);
        console.log('✅ Feeds API response:', {
          status: data.status,
          dataLength: data.data?.data?.length || 0,
          totalPosts: data.data?.total_posts || 0
        });

        if (data.status === 'success') {
          if (data.data && Array.isArray(data.data)) {
            feedsData = data.data;
          } else if (data.data && data.data.data && Array.isArray(data.data.data)) {
            feedsData = data.data.data;
          } else if (Array.isArray(data.data)) {
            feedsData = data.data;
          }

          // Debug: Check what fields are available in the feeds
          if (feedsData.length > 0) {
            console.log('🔍 DEBUG: First feed object structure:', Object.keys(feedsData[0]));
            console.log('🔍 DEBUG: Sample feed data:',
              feedsData.slice(0, 3).map(feed => ({
                id: feed.id,
                availableFields: Object.keys(feed),
                country: feed.country,
                location: feed.location,
                city: feed.city,
                user: feed.user ? Object.keys(feed.user) : 'no user',
                username: feed.username
              }))
            );
          }
        }
      } catch (parseError) {
        console.error('❌ JSON Parse Error:', parseError);
        throw new Error('Invalid JSON response from server');
      }

      if (Array.isArray(feedsData) && feedsData.length > 0) {
        if (isRefresh) {
          setAllFeeds(feedsData);
          console.log(`✅ Refreshed all feeds: ${feedsData.length} items`);
        } else {
          setAllFeeds(prev => {
            const newFeeds = [...prev, ...feedsData];
            console.log(`✅ Added ${feedsData.length} feeds, total: ${newFeeds.length}`);
            return newFeeds;
          });
        }
        setHasMore(feedsData.length >= 10);
      } else {
        console.log('📭 No feeds available from API');
        if (isRefresh) {
          setAllFeeds([]);
          setFilteredFeeds([]);
        }
        setHasMore(false);
      }
    } catch (error) {
      console.error('❌ Error fetching feeds:', error);
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

  // Filter feeds based on selected location
  const filterFeedsByLocation = (feeds, locationId) => {
    if (locationId === 'all') {
      return feeds;
    }

    console.log(`📍 Filtering ${feeds.length} feeds for location ID: ${locationId}`);

    // Since country field is undefined, we'll need to find where the location data is stored
    // For now, return all feeds until we figure out the location data structure
    const filtered = feeds.filter(feed => {
      // Try different possible location fields
      const feedCountryId = feed.country || feed.country_id || feed.location_id || feed.city_id || feed.province_id;
      const feedLocation = feed.location || feed.city || feed.province || feed.region;

      console.log(`🔍 Feed ${feed.id} - Country ID: ${feedCountryId}, Location: ${feedLocation}`);

      // If we have a country ID, use it
      if (feedCountryId) {
        return feedCountryId == locationId;
      }

      // If we have a location name, try to match it
      if (feedLocation) {
        const location = locations.find(loc => loc.id === locationId);
        if (location && feedLocation.toLowerCase().includes(location.name.toLowerCase())) {
          return true;
        }
      }

      // For now, include all feeds until we figure out the location structure
      return true;
    });

    console.log(`📍 Filtered ${filtered.length} feeds for location: ${locations.find(loc => loc.id === locationId)?.name}`);
    return filtered;
  };

  // Update filtered feeds when allFeeds or selectedLocation changes
  useEffect(() => {
    if (allFeeds.length > 0) {
      const filtered = filterFeedsByLocation(allFeeds, selectedLocation.id);
      setFilteredFeeds(filtered);
      console.log(`🎯 Updated filtered feeds: ${filtered.length} items for ${selectedLocation.name}`);
    }
  }, [allFeeds, selectedLocation]);

  // Load more feeds
  const loadMoreFeeds = () => {
    if (!loading && hasMore && !refreshing) {
      const nextPage = pageNum + 1;
      setPageNum(nextPage);
      fetchFeeds(nextPage, false, selectedFilter);
    }
  };

  // Refresh all data
  const onRefresh = () => {
    fetchFeeds(1, true, selectedFilter);
    fetchBanners();
    fetchQuickLinks();
    fetchSuggestedPeople();
  };

  // Handle location change
  const handleLocationChange = (location) => {
    console.log(`📍 Location changed to: ${location.name} (ID: ${location.id})`);
    setSelectedLocation(location);
    setLocationModalVisible(false);
  };

  // Handle filter change
  const handleFilterChange = (filter) => {
    setSelectedFilter(filter);
    setPageNum(1);
    setAllFeeds([]);
    setFilteredFeeds([]);
    setHasMore(true);
    fetchFeeds(1, false, filter);
  };

  // Handle banner press
   const handleBannerPress = (banner) => {
    if (banner.button_link && banner.button_link !== '#') {
      navigation.navigate('WebView', {
        url: banner.button_link,
        title: banner.title || 'Banner',
        token: token, // Pass token
        user: user    // Pass user data
      });
    }
  };


  // Handle quick link press
  const handleQuickLinkPress = (link) => {
    const linkName = link.name || link.title || 'Quick Link';
    const linkUrl = link.url || link.button_link || '';

    const normalizedName = linkName.toLowerCase().trim();

    if (normalizedName.includes('categor')) {
      navigation.navigate('Categories', { title: linkName });
    }
    else if (normalizedName.includes('event')) {
      navigation.navigate('Events', { title: linkName });
    }
    else if (normalizedName.includes('group')) {
      navigation.navigate('Groups', { title: linkName });
    }
    else if (normalizedName.includes('market') || normalizedName.includes('shop') || normalizedName.includes('store')) {
      navigation.navigate('Marketplace', { title: linkName });
    }
    else if (normalizedName.includes('news') || normalizedName.includes('blog')) {
      navigation.navigate('News', { title: linkName });
    }
    else if (normalizedName.includes('job') || normalizedName.includes('career')) {
      navigation.navigate('Jobs', { title: linkName });
    }
    else if (normalizedName.includes('forum') || normalizedName.includes('discuss')) {
      navigation.navigate('Forum', { title: linkName });
    }
     else if (linkUrl && linkUrl !== '#' && linkUrl !== '' &&
      (linkUrl.startsWith('http://') || linkUrl.startsWith('https://'))) {
      navigation.navigate('WebView', {
        url: linkUrl,
        title: linkName,
        token: token, // Pass token
        user: user    // Pass user data
      });
    }
    else {
      Alert.alert(
        'Coming Soon',
        `The "${linkName}" feature is coming soon!`,
        [{ text: 'OK' }]
      );
    }
  };

  // Video visibility handler for auto-play
  const handleViewableItemsChanged = useRef(({ viewableItems: visibleItems }) => {
    viewableItems.current = visibleItems;

    if (visibleItems.length > 0 && isFocused) {
      const visibleVideo = visibleItems.find(item =>
        item.item.type === 'video' || item.item.type === 'reel'
      );

      if (visibleVideo) {
        const videoToPlay = visibleVideo.item;
        setCurrentPlayingVideo(videoToPlay.id);
      } else {
        setCurrentPlayingVideo(null);
      }
    } else if (!isFocused) {
      setCurrentPlayingVideo(null);
    }
  }).current;


  // Add this function back - Handle quick links scroll to update current index
  const handleQuickLinksScroll = (event) => {
    const containerWidth = screenWidth - 30;
    const contentOffsetX = event.nativeEvent.contentOffset.x;
    const currentIndex = Math.round(contentOffsetX / containerWidth);

    if (currentIndex !== currentQuickLinksIndex) {
      setCurrentQuickLinksIndex(currentIndex);
    }
  };

  const viewabilityConfig = {
    itemVisiblePercentThreshold: 70,
    waitForInteraction: false,
  };

  // Handle video mute/unmute
  const handleVideoMute = (feedId) => {
    setMutedVideos(prev => ({
      ...prev,
      [feedId]: !prev[feedId]
    }));
  };

  // Handle video playback control
  const handleVideoPress = (feedId) => {
    if (currentPlayingVideo === feedId) {
      setCurrentPlayingVideo(null);
    } else {
      setCurrentPlayingVideo(feedId);
    }
  };

  // Handle video load and error
  const handleVideoLoad = (feedId) => {
    console.log(`✅ Video loaded: ${feedId}`);
  };

  const handleVideoError = (error, feedId) => {
    console.log(`❌ Video error for ${feedId}:`, error);
  };

  // Stop all videos when component unmounts or screen loses focus
  useEffect(() => {
    if (!isFocused) {
      setCurrentPlayingVideo(null);
    }
  }, [isFocused]);

  // Clean up video refs when feeds change
  useEffect(() => {
    return () => {
      Object.keys(videoRefs.current).forEach(key => {
        if (videoRefs.current[key]) {
          videoRefs.current[key] = null;
        }
      });
    };
  }, []);

  // Format view count
  const formatViewCount = (views) => {
    if (!views) return '0';
    if (views >= 1000000) return (views / 1000000).toFixed(1) + 'M';
    if (views >= 1000) return (views / 1000).toFixed(1) + 'K';
    return views.toString();
  };

  // Get thumbnail for feed
  const getFeedThumbnail = (feed) => {
    if (feed.media && feed.media.length > 0) {
      const firstMedia = feed.media[0];
      if (firstMedia.thumbnail) return firstMedia.thumbnail;
      if (firstMedia.url) return firstMedia.url;
      if (firstMedia.video_url) return firstMedia.thumbnail;
    }
    return null;
  };

  // Handle follow action
  const handleFollow = (personId) => {
    console.log(`👤 Follow action for person ID: ${personId}`);
    Alert.alert('Follow', `You started following person with ID: ${personId}`);
  };

  // Handle feed press
  const handleFeedPress = (feed) => {
    if (feed.type === 'reel' || feed.type === 'video') {
      navigation.navigate('Reels', {
        initialReelId: feed.id,
        reelsData: filteredFeeds.filter(f => f.type === 'reel' || f.type === 'video'),
      });
    } else {
      navigation.navigate('FeedDetail', { feedId: feed.id });
    }
  };

  // Calculate grid item height based on caption
  const getGridItemHeight = (feed) => {
    const caption = feed.text || feed.caption || '';
    const hasCaption = caption.trim().length > 0;

    if (hasCaption) {
      return GRID_ITEM_BASE_HEIGHT;
    } else {
      // Remove caption space when no caption
      return GRID_ITEM_BASE_HEIGHT - 60;
    }
  };

  // Initial load
  useEffect(() => {
    console.log('🚀 HomePage component mounted - Starting initial data load');
    fetchFeeds(1, false, selectedFilter);
    fetchBanners();
    fetchQuickLinks();
    fetchSuggestedPeople();
  }, []);

  // Auto-rotate banners
  useEffect(() => {
    if (banners.length > 1) {
      const interval = setInterval(() => {
        setCurrentBannerIndex(prev =>
          prev === banners.length - 1 ? 0 : prev + 1
        );
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [banners.length]);

  // Auto-rotate quick links
  useEffect(() => {
    if (quickLinks.length > 8) {
      const interval = setInterval(() => {
        const containersCount = Math.ceil(quickLinks.length / 8);
        setCurrentQuickLinksIndex(prev =>
          prev === containersCount - 1 ? 0 : prev + 1
        );
      }, 6000);
      return () => clearInterval(interval);
    }
  }, [quickLinks.length]);

  // Scroll to current quick links container when index changes
  useEffect(() => {
    if (quickLinksScrollViewRef.current && quickLinks.length > 8) {
      const containerWidth = screenWidth - 30;
      quickLinksScrollViewRef.current.scrollTo({
        x: currentQuickLinksIndex * containerWidth,
        animated: true
      });
    }
  }, [currentQuickLinksIndex, quickLinks.length]);

  // Render Banner Section
  const renderBanner = () => {
    if (bannerLoading) {
      return (
        <View style={styles.bannerContainer}>
          <View style={styles.bannerLoading}>
            <ActivityIndicator size="small" color="#0C3F44" />
            <Text style={styles.bannerLoadingText}>Loading banner...</Text>
          </View>
        </View>
      );
    }

    if (banners.length === 0) {
      return null;
    }

    const currentBanner = banners[currentBannerIndex] || banners[0];
    const imageUrl = currentBanner.image || currentBanner.banner_image || currentBanner.image_url;

    return (
      <View style={styles.bannerContainer}>
        <TouchableOpacity
          style={styles.bannerContent}
          onPress={() => handleBannerPress(currentBanner)}
          activeOpacity={0.9}
        >
          <View style={styles.bannerRow}>
            <View style={styles.bannerTextContent}>
              <Text style={styles.bannerTitle}>{currentBanner.title || 'No Title'}</Text>
              <Text style={styles.bannerDescription}>
                {currentBanner.subtitle || currentBanner.description || 'No description'}
              </Text>
              {currentBanner.button_text && (
                <TouchableOpacity style={styles.bannerButton}>
                  <Text style={styles.bannerButtonText}>{currentBanner.button_text}</Text>
                </TouchableOpacity>
              )}
            </View>
            <View style={styles.bannerImageContainer}>
              {imageUrl ? (
                <Image
                  source={{ uri: imageUrl }}
                  style={styles.bannerImage}
                  resizeMode="cover"
                />
              ) : (
                <View style={styles.bannerPlaceholder}>
                  <Ionicons name="image-outline" size={40} color="#fff" />
                  <Text style={styles.placeholderText}>No Image</Text>
                </View>
              )}
            </View>
          </View>

          {banners.length > 1 && (
            <View style={styles.bannerIndicators}>
              {banners.map((_, index) => (
                <View
                  key={index}
                  style={[
                    styles.bannerIndicator,
                    index === currentBannerIndex && styles.bannerIndicatorActive
                  ]}
                />
              ))}
            </View>
          )}
        </TouchableOpacity>
      </View>
    );
  };

  // Render Quick Links Section with Pagination
  const renderQuickLinks = () => {
    if (quickLinksLoading) {
      return (
        <View style={styles.quickLinksSection}>
          <View style={styles.quickLinksLoading}>
            <ActivityIndicator size="small" color="#0C3F44" />
            <Text style={styles.quickLinksLoadingText}>Loading categories...</Text>
          </View>
        </View>
      );
    }

    if (quickLinks.length === 0) {
      return null;
    }

    const containers = [];
    for (let i = 0; i < quickLinks.length; i += 8) {
      containers.push(quickLinks.slice(i, i + 8));
    }

    return (
      <View style={styles.quickLinksSection}>
        <ScrollView
          ref={quickLinksScrollViewRef}
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.quickLinksScrollView}
          contentContainerStyle={styles.quickLinksScrollContent}
          pagingEnabled
          onMomentumScrollEnd={handleQuickLinksScroll}
          scrollEventThrottle={16}
        >
          {containers.map((container, containerIndex) => (
            <View key={`container-${containerIndex}`} style={styles.quickLinksContainer}>
              <View style={styles.quickLinksRow}>
                {container.slice(0, 4).map((link, index) => {
                  const imageUrl = link.image || link.icon || link.image_url;
                  return (
                    <TouchableOpacity
                      key={`link-${link.id || index}`}
                      style={styles.quickLinkItem}
                      onPress={() => handleQuickLinkPress(link)}
                    >
                      <View style={styles.quickLinkImageContainer}>
                        {imageUrl ? (
                          <Image
                            source={{ uri: imageUrl }}
                            style={styles.quickLinkImage}
                            resizeMode="cover"
                          />
                        ) : (
                          <View style={styles.quickLinkPlaceholder}>
                            <Ionicons name="grid-outline" size={16} color="#666" />
                          </View>
                        )}
                      </View>
                      <Text style={styles.quickLinkText} numberOfLines={2}>
                        {link.name || link.title || `Category ${index + 1}`}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <View style={styles.quickLinksRow}>
                {container.slice(4, 8).map((link, index) => {
                  const imageUrl = link.image || link.icon || link.image_url;
                  return (
                    <TouchableOpacity
                      key={`link-${link.id || index + 4}`}
                      style={styles.quickLinkItem}
                      onPress={() => handleQuickLinkPress(link)}
                    >
                      <View style={styles.quickLinkImageContainer}>
                        {imageUrl ? (
                          <Image
                            source={{ uri: imageUrl }}
                            style={styles.quickLinkImage}
                            resizeMode="cover"
                          />
                        ) : (
                          <View style={styles.quickLinkPlaceholder}>
                            <Ionicons name="grid-outline" size={16} color="#666" />
                          </View>
                        )}
                      </View>
                      <Text style={styles.quickLinkText} numberOfLines={2}>
                        {link.name || link.title || `Category ${index + 5}`}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          ))}
        </ScrollView>

        {containers.length > 1 && (
          <View style={styles.quickLinksIndicators}>
            {containers.map((_, index) => (
              <View
                key={`indicator-${index}`}
                style={[
                  styles.quickLinksIndicator,
                  index === currentQuickLinksIndex && styles.quickLinksIndicatorActive
                ]}
              />
            ))}
          </View>
        )}
      </View>
    );
  };

  // Render "People You May Know" section
  const renderPeopleSection = () => {
    if (peopleLoading) {
      return (
        <View style={styles.peopleSection}>
          <View style={styles.peopleHeader}>
            <Text style={styles.peopleTitle}>People You May Know</Text>
          </View>
          <View style={styles.peopleLoading}>
            <ActivityIndicator size="small" color="#0C3F44" />
            <Text style={styles.peopleLoadingText}>Loading suggestions...</Text>
          </View>
        </View>
      );
    }

    if (suggestedPeople.length === 0) {
      return null;
    }

    return (
      <View style={styles.peopleSection}>
        <View style={styles.peopleHeader}>
          <Text style={styles.peopleTitle}>People You May Know</Text>
          <TouchableOpacity>
            <Text style={styles.seeAllText}>See All</Text>
          </TouchableOpacity>
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
            const avatar = item.avatar || item.profile_picture || item.image_url || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-4.0.3&auto=format&fit=crop&w=200&q=80';
            const profession = item.profession || item.bio || item.occupation || 'Member';
            const mutualFriends = item.mutual_friends || item.mutualFriends || Math.floor(Math.random() * 20) + 1;

            return (
              <View style={styles.personCard}>
                <Image
                  source={{ uri: avatar }}
                  style={styles.personAvatar}
                />
                <View style={styles.personInfo}>
                  <Text style={styles.personName}>{personName}</Text>
                  <Text style={styles.personUsername}>@{username}</Text>
                  <Text style={styles.personProfession}>{profession}</Text>
                  <Text style={styles.mutualFriends}>{mutualFriends} mutual friends</Text>
                </View>
                <TouchableOpacity
                  style={styles.followButton}
                  onPress={() => handleFollow(item.id || item.user_id)}
                >
                  <Text style={styles.followButtonText}>Follow</Text>
                </TouchableOpacity>
              </View>
            );
          }}
        />
      </View>
    );
  };

  // Render grid feed item 
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
    <TouchableOpacity
      style={[styles.gridItem, { height: gridItemHeight }]}
      onPress={() => handleFeedPress(feed)}
      activeOpacity={0.9}
    >
      {hasMedia && thumbnail ? (
        <View style={styles.gridMediaContainer}>
          {isVideo && videoUrl ? (
            <TouchableOpacity
              style={styles.videoContainer}
              onPress={() => handleFeedPress(feed)}
              activeOpacity={0.9}
            >
              <Video
                ref={ref => videoRefs.current[feed.id] = ref}
                source={{ uri: videoUrl }}
                style={styles.gridVideoPlayer}
                resizeMode="cover"
                paused={!isPlaying}
                repeat={true}
                muted={true} // Always muted for auto-play
                controls={false}
                playWhenInactive={false}
                playInBackground={false}
                ignoreSilentSwitch="obey"
                onLoad={() => handleVideoLoad(feed.id)}
                onError={(error) => handleVideoError(error, feed.id)}
              />

              {/* User Info Overlay */}
              <View style={styles.userInfoOverlay}>
                <View style={styles.userInfoRow}>
                  <Image
                    source={{ uri: user.avatar || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-4.0.3&auto=format&fit=crop&w=200&q=80' }}
                    style={styles.overlayUserAvatar}
                  />
                  <Text style={styles.overlayUsername}>
                    {user.username || 'User'}
                  </Text>
                </View>
                <View style={styles.likesOverlay}>
                  <Ionicons name="heart" size={14} color="#fff" />
                  <Text style={styles.likesCount}>
                    {feed.likes_count || 0}
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          ) : (
            <View style={styles.imageContainer}>
              <Image
                source={{ uri: thumbnail }}
                style={styles.gridImage}
                resizeMode="cover"
              />

              {/* User Info Overlay for Images */}
              <View style={styles.userInfoOverlay}>
                <View style={styles.userInfoRow}>
                  <Image
                    source={{ uri: user.avatar || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-4.0.3&auto=format&fit=crop&w=200&q=80' }}
                    style={styles.overlayUserAvatar}
                  />
                  <Text style={styles.overlayUsername}>
                    {user.username || 'User'}
                  </Text>
                </View>
                <View style={styles.likesOverlay}>
                  <Ionicons name="heart" size={14} color="#fff" />
                  <Text style={styles.likesCount}>
                    {feed.likes_count || 0}
                  </Text>
                </View>
              </View>
            </View>
          )}
        </View>
      ) : (
        <View style={[styles.gridContentContainer, styles.gridGreenBackground]}>
          <Text style={styles.gridText} numberOfLines={6}>
            {caption}
          </Text>
        </View>
      )}

      {/* Only show caption container if there's a caption */}
      {hasCaption && (
        <View style={styles.gridCaptionContainer}>
          <Text style={styles.gridCaption} numberOfLines={2}>
            {caption}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
};

  // Render feeds list
  const renderFeedsList = () => {
    if (loading && filteredFeeds.length === 0) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0C3F44" />
          <Text style={styles.loadingText}>Loading feeds...</Text>
        </View>
      );
    }

    const displayFeeds = filteredFeeds.filter(feed => {
      const hasMedia = feed.media && feed.media.length > 0;
      const caption = feed.text || feed.caption || '';
      return hasMedia || caption;
    });

    if (displayFeeds.length === 0 && !loading) {
      return (
        <View style={styles.emptyContainer}>
          <Ionicons name="newspaper-outline" size={64} color="#ccc" />
          <Text style={styles.emptyText}>
            {selectedLocation.id === 'all'
              ? 'No feeds found'
              : `No feeds found in ${selectedLocation.name}`
            }
          </Text>
          <Text style={styles.emptySubText}>
            {selectedLocation.id !== 'all'
              ? 'Try selecting "All Locations" to see feeds from all cities'
              : 'The API might be experiencing issues'
            }
          </Text>
          <TouchableOpacity style={styles.retryButton} onPress={onRefresh}>
            <Text style={styles.retryText}>Try Again</Text>
          </TouchableOpacity>
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
            {suggestedPeople.length > 0 && renderPeopleSection()}

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
            {renderBanner()}
            {banners.length > 0 && <View style={styles.divider} />}
            {renderQuickLinks()}
            {quickLinks.length > 0 && <View style={styles.divider} />}

            <View style={styles.viewToggleSection}>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.filterScrollView}
                contentContainerStyle={styles.filterScrollContent}
              >
                {filterOptions.map((filter, index) => (
                  <TouchableOpacity
                    key={`filter-${index}`}
                    style={[
                      styles.filterItem,
                      selectedFilter === filter && styles.filterItemActive
                    ]}
                    onPress={() => handleFilterChange(filter)}
                  >
                    <Text style={[
                      styles.filterText,
                      selectedFilter === filter && styles.filterTextActive
                    ]}>
                      {filter}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <TouchableOpacity
                style={styles.viewToggleButton}
                onPress={() => setIsGridView(!isGridView)}
              >
                <Ionicons
                  name={isGridView ? "list" : "grid"}
                  size={20}
                  color="#0C3F44"
                />
              </TouchableOpacity>
            </View>
          </>
        }
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#0C3F44']}
            tintColor="#0C3F44"
          />
        }
      />
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />

      <View style={styles.topNav}>
        <TouchableOpacity style={styles.leftIcon}>
          <Ionicons name="menu-outline" size={24} color="#333" />
        </TouchableOpacity>

        <View style={styles.logoTextContainer}>
          <Image
            source={require('../assl.js/logoTop.png')}
            style={styles.logo}
            resizeMode="contain"
          />
        </View>

        <TouchableOpacity
          style={styles.locationSelector}
          onPress={() => setLocationModalVisible(true)}
        >
          <Ionicons name="location-outline" size={16} color="#666" />
          <Text style={styles.locationText} numberOfLines={1}>
            {selectedLocation.name}
          </Text>
          <Ionicons name="chevron-down-outline" size={14} color="#666" />
        </TouchableOpacity>
      </View>

      <Modal
        animationType="slide"
        transparent={true}
        visible={locationModalVisible}
        onRequestClose={() => setLocationModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Location</Text>
              <TouchableOpacity onPress={() => setLocationModalVisible(false)}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>
            {locations.map((location, index) => (
              <TouchableOpacity
                key={`location-${index}`}
                style={[
                  styles.locationOption,
                  selectedLocation.id === location.id && styles.selectedLocation
                ]}
                onPress={() => handleLocationChange(location)}
              >
                <Text style={styles.locationOptionText}>{location.name}</Text>
                {selectedLocation.id === location.id && (
                  <Ionicons name="checkmark" size={20} color="#0C3F44" />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </Modal>

      {renderFeedsList()}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
    marginTop: Platform.OS === 'android' ? 25 : 0,
  },
  topNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    backgroundColor: 'transparent',
  },
  leftIcon: {
    padding: 8,
  },
  logoTextContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logo: {
    width: 105,
    height: 35,
    marginRight: 120,
  },
  brandText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  locationSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
  },
  locationText: {
    fontSize: 12,
    color: '#333',
    marginHorizontal: 6,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '50%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  locationOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  selectedLocation: {
    backgroundColor: '#f8f8f8',
  },
  locationOptionText: {
    fontSize: 16,
    color: '#333',
  },
  // Banner Styles
  bannerContainer: {
    margin: 5,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#0C3F44',
  },
  bannerContent: {
    height: 200,
    padding: 16,
  },
  bannerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  bannerImageContainer: {
    width: 120,
    height: 120,
    borderRadius: 12,
    overflow: 'hidden',
    marginRight: 9,
  },
  bannerImage: {
    width: '100%',
    height: '100%',
  },
  bannerTextContent: {
    flex: 1,
    justifyContent: 'center',
  },
  bannerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 10,
  },
  bannerDescription: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.9)',
    marginBottom: 12,
    lineHeight: 16,
  },
  bannerButton: {
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  bannerButtonText: {
    color: '#0C3F44',
    fontWeight: '600',
    fontSize: 12,
  },
  bannerIndicators: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 12,
  },
  bannerIndicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    marginHorizontal: 3,
  },
  bannerIndicatorActive: {
    backgroundColor: '#fff',
    width: 20,
  },
  bannerPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    color: '#fff',
    fontSize: 10,
    marginTop: 4,
  },
  bannerLoading: {
    height: 120,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    borderRadius: 16,
  },
  bannerLoadingText: {
    marginTop: 8,
    color: '#666',
    fontSize: 12,
  },

  divider: {
    height: 1,
    backgroundColor: '#f0f0f0',
    marginHorizontal: 20,
    marginVertical: 10,
  },
  // Quick Links Styles
  quickLinksSection: {
    padding: 15,
    paddingBottom: 10,
  },
  quickLinksScrollView: {
    flexGrow: 0,
  },
  quickLinksScrollContent: {
    paddingRight: 15,
  },
  quickLinksContainer: {
    width: screenWidth - 30,
    marginRight: 15,
  },
  quickLinksRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  quickLinkItem: {
    alignItems: 'center',
    width: (screenWidth - 60) / 4,
  },
  quickLinkImageContainer: {
    width: 30,
    height: 30,
    borderRadius: 22,
    overflow: 'hidden',
    marginBottom: 6,
    borderWidth: 1,
    borderColor: '#f0f0f0',
    backgroundColor: '#f8f9fa',
  },
  quickLinkImage: {
    width: '100%',
    height: '100%',
  },
  quickLinkPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#f8f9fa',
    justifyContent: 'center',
    alignItems: 'center',
  },
  quickLinkText: {
    fontSize: 10,
    color: '#333',
    textAlign: 'center',
    fontWeight: '500',
    lineHeight: 12,
  },
  quickLinksLoading: {
    height: 140,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quickLinksLoadingText: {
    marginTop: 8,
    color: '#666',
    fontSize: 12,
  },
  // Quick Links Pagination Indicators
  quickLinksIndicators: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 12,
  },
  quickLinksIndicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#e0e0e0',
    marginHorizontal: 3,
  },
  quickLinksIndicatorActive: {
    backgroundColor: '#0C3F44',
    width: 20,
  },

  // View Toggle and Filter Section
  viewToggleSection: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    paddingTop: 5,
    paddingBottom: 10,
  },
  filterScrollView: {
    flexGrow: 1,
  },
  filterScrollContent: {
    paddingRight: 15,
  },
  filterItem: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    marginRight: 10,
    backgroundColor: 'transparent',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  filterItemActive: {
    backgroundColor: 'transparent',
    borderColor: '#0C3F44',
  },
  filterText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  filterTextActive: {
    color: '#0C3F44',
    fontWeight: '600',
  },
  viewToggleButton: {
    padding: 8,
    marginLeft: 10,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },

  // ========== UPDATED GRID LAYOUT STYLES ==========
  gridColumnWrapper: {
    justifyContent: 'space-between',
    paddingHorizontal: 0,
  },
  gridItem: {
    width: GRID_ITEM_WIDTH,
    marginBottom: 2,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#f0f0f0',
    borderRadius: 8,
  },
  gridMediaContainer: {
    width: '100%',
    flex: 1, // Take all available space
    position: 'relative',
    backgroundColor: '#000',
  },
  gridVideoPlayer: {
    width: '100%',
    height: '100%',
    backgroundColor: '#000',
  },
  gridVideoOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  gridImage: {
    width: '100%',
    height: '100%',
    backgroundColor: '#f8f9fa',
  },

  // User Info Overlay Styles
  userInfoOverlay: {
    position: 'absolute',
    top: 8,
    left: 8,
    right: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  userInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  overlayUserAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    marginRight: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  overlayUsername: {
    fontSize: 12,
    color: '#fff',
    fontWeight: '600',
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  likesOverlay: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  likesCount: {
    fontSize: 12,
    color: '#fff',
    fontWeight: '600',
    marginLeft: 4,
  },

  // Video and Photo Type Badges
  videoTypeBadge: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 8,
  },
  photoTypeBadge: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 8,
  },
  videoTypeText: {
    fontSize: 10,
    color: '#fff',
    fontWeight: '600',
    marginLeft: 2,
  },
  photoTypeText: {
    fontSize: 10,
    color: '#fff',
    fontWeight: '600',
    marginLeft: 2,
  },

  // Content container
  gridContentContainer: {
    width: '100%',
    flex: 1,
    padding: 12,
    backgroundColor: '#f8f9fa',
    justifyContent: 'center',
    alignItems: 'center',
  },
  gridGreenBackground: {
    backgroundColor: '#0C3F44',
  },
  gridText: {
    fontSize: 12,
    color: '#ffffffff',
    lineHeight: 16,
    textAlign: 'center',
  },

  // Mute button style

  // Grid Caption Styles
  gridCaptionContainer: {
    padding: 8,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    minHeight: 40,
    justifyContent: 'center',
  },
  gridCaption: {
    fontSize: 12,
    color: '#333',
    lineHeight: 16,
  },

  // Loading and Empty States
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    color: '#666',
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    marginTop: 10,
    color: '#666',
    fontSize: 16,
  },
  retryButton: {
    marginTop: 15,
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: '#0C3F44',
    borderRadius: 20,
  },
  retryText: {
    color: '#fff',
    fontWeight: '600',
  },
  loadingMoreContainer: {
    padding: 20,
    alignItems: 'center',
  },
  loadingMoreText: {
    marginTop: 5,
    color: '#666',
    fontSize: 12,
  },
  endOfFeedsContainer: {
    padding: 20,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    marginTop: 10,
  },
  endOfFeedsText: {
    color: '#666',
    fontSize: 14,
    fontStyle: 'italic',
  },

  // People You May Know section
  peopleSection: {
    marginVertical: 20,
    paddingHorizontal: 5,
  },
  peopleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
    paddingHorizontal: 10,
  },
  peopleTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  seeAllText: {
    color: '#0C3F44',
    fontSize: 14,
    fontWeight: '600',
  },
  peopleList: {
    paddingRight: 15,
    paddingLeft: 10,
  },
  personCard: {
    width: 160,
    backgroundColor: 'transparent',
    borderRadius: 12,
    padding: 12,
    marginRight: 12,
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  personAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignSelf: 'center',
    marginBottom: 10,
  },
  personInfo: {
    marginBottom: 12,
  },
  personName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 2,
  },
  personUsername: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    marginBottom: 2,
  },
  personProfession: {
    fontSize: 11,
    color: '#888',
    textAlign: 'center',
    marginBottom: 4,
  },
  mutualFriends: {
    fontSize: 10,
    color: '#0C3F44',
    textAlign: 'center',
    fontWeight: '500',
  },
  followButton: {
    backgroundColor: '#0C3F44',
    paddingVertical: 8,
    borderRadius: 20,
    alignItems: 'center',
  },
  followButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  peopleLoading: {
    height: 120,
    justifyContent: 'center',
    alignItems: 'center',
  },
  peopleLoadingText: {
    marginTop: 8,
    color: '#666',
    fontSize: 12,
  },
});

export default HomePage;