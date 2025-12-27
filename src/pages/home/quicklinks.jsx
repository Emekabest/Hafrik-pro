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

    console.log(normalizedName)


    if (normalizedName.includes('categor')) navigation.navigate('Categories', { title: linkName });
    // else if (normalizedName.includes('event')) navigation.navigate('Events', { title: linkName });
    else if (normalizedName.includes('group')) navigation.navigate('Groups', { title: linkName });
    else if (normalizedName.includes('market') || normalizedName.includes('shop') || normalizedName.includes('store')) navigation.navigate('Marketplace', { title: linkName });
    else if (normalizedName.includes('news') || normalizedName.includes('blog')) navigation.navigate('News', { title: linkName });
    // else if (normalizedName.includes('job') || normalizedName.includes('career')) navigation.navigate('Jobs', { title: linkName });
    else if (normalizedName.includes('forum') || normalizedName.includes('discuss')) navigation.navigate('Forum', { title: linkName });
    else if (linkUrl && linkUrl !== '#' && linkUrl !== '' && (linkUrl.startsWith('http://') || linkUrl.startsWith('https://'))) {
      navigation.navigate('WebView', { url: linkUrl, title: linkName, token: token, user: user });
    


    } else {
      Alert.alert('Coming Soon', `The "${linkName}" feature is coming soon!`, [{ text: 'OK' }]);

    }
  };

  useEffect(() => { fetchQuickLinks(); }, []);

  if (quickLinksLoading) {
    return (
      <View style={styles.quickLinksSection}>
        <View style={styles.quickLinksLoading}><ActivityIndicator size="small" color="#0C3F44" /><Text style={styles.quickLinksLoadingText}>Loading categories...</Text></View>
      </View>
    );
  }

  if (quickLinks.length === 0) return null;

  return (
    <>
      <View style={styles.quickLinksSection}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.quickLinksScrollContent}>
          {quickLinks.map((link, index) => {
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
        </ScrollView>
      </View>
    </>
  );
};

const styles = StyleSheet.create({


  quickLinksSection: {
    paddingBottom:15,
    borderBottomWidth:1,
    borderBottomColor:"#f0f0f0"
  },

  quickLinksScrollContent: {
    paddingHorizontal: 5,
    paddingVertical:15
  },

  quickLinkItem: {
    alignItems: 'center', // Centers the image and text vertically
    width: 70, // Defines the touchable area width
    marginRight: 15, // Space between items
  },

  quickLinkImageContainer: {
    width: 50, // Larger container for the icon
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12, // Rounded corners for the container
    overflow: 'hidden',
    padding:10,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: '#dadadaff', // Subtle border color
    backgroundColor: '#ddeaedff',
  },


  quickLinkImage: { width: '100%', height: '100%' },
  quickLinkPlaceholder: { width: '100%', height: '100%', backgroundColor: '#f8f9fa', justifyContent: 'center', alignItems: 'center' },
  quickLinkText: { fontSize: 10, color: '#214f53ff', textAlign: 'center', fontWeight: '500', lineHeight: 12 },
  quickLinksLoading: { height: 80, justifyContent: 'center', alignItems: 'center' },
  quickLinksLoadingText: { marginTop: 8, color: '#666', fontSize: 12 },
});

export default React.memo(QuickLinks);