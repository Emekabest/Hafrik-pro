

import React, { useEffect, useRef, useState, useCallback, memo } from 'react';
import {
  View,
  Text,
  Image,
  FlatList,
  Dimensions,
  TouchableOpacity,
  ActivityIndicator,
  Animated,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../../AuthContext';

const { width: screenWidth } = Dimensions.get('window');
const SLIDE_WIDTH = screenWidth * 0.9;
const SLIDE_MARGIN = (screenWidth - SLIDE_WIDTH) / 2;

const AnimatedFlatList = Animated.createAnimatedComponent(FlatList);

const Banner = () => {
  const navigation = useNavigation();
  const { token, user } = useAuth();

  const [banners, setBanners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);

  const flatListRef = useRef(null);
  const scrollX = useRef(new Animated.Value(0)).current;

  /** FETCH */
  useEffect(() => {
    let mounted = true;

    const fetchBanners = async () => {
      try {
        const res = await fetch('https://hafrik.com/api/v1/home/banners.php');
        const text = await res.text();
        const json = JSON.parse(text);

        if (mounted && json?.status === 'success') {
          setBanners(Array.isArray(json.data) ? json.data : []);
        }
      } catch (e) {
        console.log('Banner error:', e);
      } finally {
        mounted && setLoading(false);
      }
    };

    fetchBanners();
    return () => (mounted = false);
  }, []);

  /** SAFE AUTO ADVANCE (no interval) */
  const onMomentumScrollEnd = (e) => {
    const index = Math.round(e.nativeEvent.contentOffset.x / SLIDE_WIDTH);
    setCurrentIndex(index);
  };

  const handleBannerPress = useCallback(
    (banner) => {
      if (banner?.button_link && banner.button_link !== '#') {
        navigation.navigate('WebView', {
          url: banner.button_link,
          title: banner.title || 'Banner',
          token,
          user,
        });
      }
    },
    [navigation, token, user]
  );

  const renderItem = useCallback(
    ({ item }) => (
      <View style={{ width: SLIDE_WIDTH }}>
        <BannerCard
          banner={item}
          imageUrl={item.image || item.banner_image || item.image_url}
          onPress={() => handleBannerPress(item)}
        />
      </View>
    ),
    [handleBannerPress]
  );

  if (loading) {
    return (
      <View style={{ padding: 20 }}>
        <ActivityIndicator size="small" color="#0C3F44" />
      </View>
    );
  }

  if (!banners.length) return null;

  return (
    <View>
      <AnimatedFlatList
        ref={flatListRef}
        data={banners}
        keyExtractor={(item) => `banner-${item.id}`}
        horizontal
        showsHorizontalScrollIndicator={false}
        snapToInterval={SLIDE_WIDTH}
        decelerationRate="fast"
        contentContainerStyle={{ paddingHorizontal: SLIDE_MARGIN }}
        renderItem={renderItem}
        onMomentumScrollEnd={onMomentumScrollEnd}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { x: scrollX } } }],
          { useNativeDriver: true }
        )}
        scrollEventThrottle={16}
        removeClippedSubviews
        initialNumToRender={1}
        maxToRenderPerBatch={1}
        windowSize={3}
      />

      {/* INDICATORS */}
      {banners.length > 1 && (
        <View style={{ flexDirection: 'row', justifyContent: 'center', marginTop: 8 }}>
          {banners.map((_, i) => (
            <View
              key={i}
              style={{
                width: 8,
                height: 8,
                borderRadius: 4,
                marginHorizontal: 4,
                backgroundColor: i === currentIndex ? '#0C3F44' : '#ccc',
              }}
            />
          ))}
        </View>
      )}
    </View>
  );
};


/* ------------------ CARD ------------------ */

const BannerCard = memo(({ banner, imageUrl, onPress }) => {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.9}
      style={{ height: 180, borderRadius: 12, overflow: 'hidden' }}
    >
      {imageUrl ? (
        <Image
          source={{ uri: imageUrl }}
          style={{ width: '100%', height: '100%' }}
          resizeMode="cover"
        />
      ) : (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <Ionicons name="image-outline" size={40} color="#fff" />
          <Text>No Image</Text>
        </View>
      )}

      <View
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          padding: 12,
          backgroundColor: 'rgba(0,0,0,0.4)',
        }}
      >
        <Text style={{ color: '#fff', fontWeight: 'bold' }} numberOfLines={2}>
          {banner.title}
        </Text>
        <Text style={{ color: '#fff' }} numberOfLines={2}>
          {banner.subtitle || banner.description}
        </Text>
      </View>
    </TouchableOpacity>
  );
});





const styles = StyleSheet.create({
    sliderContainer: { height: 200, marginVertical: 10 },
    slideContainer: { width: SLIDE_WIDTH, height: 180, paddingHorizontal: 10 },
    bannerContent: {
        flex: 1,
        position: 'relative',
        borderRadius: 12,
        overflow: 'hidden',
        backgroundColor: '#0C3F44'
    },
    bannerBackgroundImage: { width: '100%', height: '100%', position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
    bannerPlaceholderBackground: { width: '100%', height: '100%', backgroundColor: 'rgba(12, 63, 68, 0.8)', justifyContent: 'center', alignItems: 'center', position: 'absolute' },
    bannerOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0, 0, 0, 0.3)' },
    bannerTextContainer: { flex: 1, justifyContent: 'center', padding: 20, zIndex: 1 },
    bannerTitle: { fontSize: 22, fontWeight: 'bold', color: '#fff', marginBottom: 8, textShadowColor: 'rgba(0, 0, 0, 0.75)', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 3 },
    bannerDescription: { fontSize: 14, color: 'rgba(255, 255, 255, 0.95)', marginBottom: 16, lineHeight: 20, textShadowColor: 'rgba(0, 0, 0, 0.5)', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 2 },
    bannerIndicators: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 10 },
    bannerIndicator: { width: 8, height: 8, borderRadius: 4, backgroundColor: 'rgba(255, 255, 255, 0.5)', marginHorizontal: 4 },
    bannerIndicatorActive: { backgroundColor: '#fff', width: 24 },
    placeholderText: { color: '#fff', fontSize: 12, marginTop: 8 },
    bannerLoading: { height: 220, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f8f9fa' },
    bannerLoadingText: { marginTop: 8, color: '#666', fontSize: 12 },
});

export default React.memo(Banner);              