import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Dimensions,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../../AuthContext';

const { width: screenWidth } = Dimensions.get('window');

const QuickLinks = () => {
  const navigation = useNavigation();
  const { token, user } = useAuth();
  const [quickLinks, setQuickLinks] = useState([]);
  const [quickLinksLoading, setQuickLinksLoading] = useState(true);
  const [currentQuickLinksIndex, setCurrentQuickLinksIndex] = useState(0);
  const quickLinksScrollViewRef = useRef(null);

  const fetchQuickLinks = async () => {
    try {
      setQuickLinksLoading(true);
      const response = await fetch('https://hafrik.com/api/v1/home/quick_links.php');
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const responseText = await response.text();
      let quickLinksData = [];
      try {
        const data = JSON.parse(responseText);
        if (data.status === 'success') {
          if (Array.isArray(data.data)) quickLinksData = data.data;
          else if (data.data && Array.isArray(data.data.data)) quickLinksData = data.data.data;
          else if (data.data && typeof data.data === 'object') quickLinksData = Object.values(data.data).filter(item => Array.isArray(item))[0] || [];
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

  const handleQuickLinkPress = (link) => {
    const linkName = link.name || link.title || 'Quick Link';
    const linkUrl = link.url || link.button_link || '';
    const normalizedName = linkName.toLowerCase().trim();

    if (normalizedName.includes('categor')) navigation.navigate('Categories', { title: linkName });
    else if (normalizedName.includes('event')) navigation.navigate('Events', { title: linkName });
    else if (normalizedName.includes('group')) navigation.navigate('Groups', { title: linkName });
    else if (normalizedName.includes('market') || normalizedName.includes('shop') || normalizedName.includes('store')) navigation.navigate('Marketplace', { title: linkName });
    else if (normalizedName.includes('news') || normalizedName.includes('blog')) navigation.navigate('News', { title: linkName });
    else if (normalizedName.includes('job') || normalizedName.includes('career')) navigation.navigate('Jobs', { title: linkName });
    else if (normalizedName.includes('forum') || normalizedName.includes('discuss')) navigation.navigate('Forum', { title: linkName });
    else if (linkUrl && linkUrl !== '#' && linkUrl !== '' && (linkUrl.startsWith('http://') || linkUrl.startsWith('https://'))) {
      navigation.navigate('WebView', { url: linkUrl, title: linkName, token: token, user: user });
    } else {
      Alert.alert('Coming Soon', `The "${linkName}" feature is coming soon!`, [{ text: 'OK' }]);
    }
  };

  const handleQuickLinksScroll = (event) => {
    const containerWidth = screenWidth - 30;
    const contentOffsetX = event.nativeEvent.contentOffset.x;
    const currentIndex = Math.round(contentOffsetX / containerWidth);
    if (currentIndex !== currentQuickLinksIndex) setCurrentQuickLinksIndex(currentIndex);
  };

  useEffect(() => { fetchQuickLinks(); }, []);

  useEffect(() => {
    if (quickLinks.length > 8) {
      const interval = setInterval(() => {
        const containersCount = Math.ceil(quickLinks.length / 8);
        setCurrentQuickLinksIndex(prev => (prev === containersCount - 1 ? 0 : prev + 1));
      }, 6000);
      return () => clearInterval(interval);
    }
  }, [quickLinks.length]);

  useEffect(() => {
    if (quickLinksScrollViewRef.current && quickLinks.length > 8) {
      const containerWidth = screenWidth - 30;
      quickLinksScrollViewRef.current.scrollTo({ x: currentQuickLinksIndex * containerWidth, animated: true });
    }
  }, [currentQuickLinksIndex, quickLinks.length]);

  if (quickLinksLoading) {
    return (
      <View style={styles.quickLinksSection}>
        <View style={styles.quickLinksLoading}><ActivityIndicator size="small" color="#0C3F44" /><Text style={styles.quickLinksLoadingText}>Loading categories...</Text></View>
      </View>
    );
  }

  if (quickLinks.length === 0) return null;

  const containers = [];
  for (let i = 0; i < quickLinks.length; i += 8) containers.push(quickLinks.slice(i, i + 8));

  return (
    <>
      <View style={styles.quickLinksSection}>
        <ScrollView ref={quickLinksScrollViewRef} horizontal showsHorizontalScrollIndicator={false} style={styles.quickLinksScrollView} contentContainerStyle={styles.quickLinksScrollContent} onMomentumScrollEnd={handleQuickLinksScroll} scrollEventThrottle={16}>
          {containers.map((container, containerIndex) => (
            <View key={`container-${containerIndex}`} style={styles.quickLinksContainer}>
              {[0, 4].map(start => (
                <View key={`row-${start}`} style={styles.quickLinksRow}>
                  {container.slice(start, start + 4).map((link, index) => {
                    const imageUrl = link.image || link.icon || link.image_url;
                    return (
                      <TouchableOpacity key={`link-${link.id || index}`} style={styles.quickLinkItem} onPress={() => handleQuickLinkPress(link)}>
                        <View style={styles.quickLinkImageContainer}>
                          {imageUrl ? <Image source={{ uri: imageUrl }} style={styles.quickLinkImage} resizeMode="cover" /> : <View style={styles.quickLinkPlaceholder}><Ionicons name="grid-outline" size={16} color="#666" /></View>}
                        </View>
                        <Text style={styles.quickLinkText} numberOfLines={2}>{link.name || link.title || `Category ${index + 1}`}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              ))}
            </View>
          ))}
        </ScrollView>
        {containers.length > 1 && (
          <View style={styles.quickLinksIndicators}>
            {containers.map((_, index) => <View key={`indicator-${index}`} style={[styles.quickLinksIndicator, index === currentQuickLinksIndex && styles.quickLinksIndicatorActive]} />)}
          </View>
        )}
      </View>
      <View style={styles.divider} />
    </>
  );
};

const styles = StyleSheet.create({
  divider: { height: 8, backgroundColor: '#f8f9fa' },
  quickLinksSection: { padding: 15, paddingBottom: 10 },
  quickLinksScrollView: { flexGrow: 0 },
  quickLinksScrollContent: { paddingRight: 15 },
  quickLinksContainer: { width: screenWidth - 30, marginRight: 15 },
  quickLinksRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  quickLinkItem: { alignItems: 'center', width: (screenWidth - 60) / 4 },
  quickLinkImageContainer: { width: 40, height: 40, padding: 4, borderRadius: 2, overflow: 'hidden', marginBottom: 6, borderWidth: 1, borderColor: '#f0f0f0', backgroundColor: '#f8f9fa' },
  quickLinkImage: { width: '100%', height: '100%' },
  quickLinkPlaceholder: { width: '100%', height: '100%', backgroundColor: '#f8f9fa', justifyContent: 'center', alignItems: 'center' },
  quickLinkText: { fontSize: 10, color: '#333', textAlign: 'center', fontWeight: '500', lineHeight: 12 },
  quickLinksLoading: { height: 140, justifyContent: 'center', alignItems: 'center' },
  quickLinksLoadingText: { marginTop: 8, color: '#666', fontSize: 12 },
  quickLinksIndicators: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 12 },
  quickLinksIndicator: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#e0e0e0', marginHorizontal: 3 },
  quickLinksIndicatorActive: { backgroundColor: '#0C3F44', width: 20 },
});

export default QuickLinks;