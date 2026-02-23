import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  FlatList,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../../AuthContext';
import GetBannersController from '../../controllers/getbannerscontroller';

const { width } = Dimensions.get('window');

const BRAND_DEEP   = '#0A2E32';
const BRAND_MID    = '#0C3F44';
const BRAND_ACCENT = '#13C296';
const BRAND_LIME   = '#A8E063';
const RADIUS       = 20;

const SLIDE_WIDTH  = width * 0.88;
const SLIDE_HEIGHT = SLIDE_WIDTH * 0.52;

const Banner = () => {
  const navigation = useNavigation();
  const { token, user } = useAuth();

  const [banners, setBanners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);

  const flatListRef = useRef(null);

  useEffect(() => {
    loadBanners();
  }, []);

  const loadBanners = async () => {
    setLoading(true);
    const res = await GetBannersController();
    if (res?.status === 200) {
      if (Array.isArray(res.data)) setBanners(res.data);
      else if (Array.isArray(res.data?.data)) setBanners(res.data.data);
    }
    setLoading(false);
  };

  // 🔁 Smooth Auto Slide
  useEffect(() => {
    if (banners.length <= 1) return;

    const interval = setInterval(() => {
      const nextIndex =
        currentIndex + 1 >= banners.length ? 0 : currentIndex + 1;

      flatListRef.current?.scrollToOffset({
        offset: nextIndex * (SLIDE_WIDTH + 14),
        animated: true,
      });

      setCurrentIndex(nextIndex);
    }, 5000);

    return () => clearInterval(interval);
  }, [currentIndex, banners]);

  const handleBannerPress = (banner) => {
    if (banner.button_link && banner.button_link !== '#') {
      navigation.navigate('WebView', {
        url: banner.button_link,
        title: banner.title || 'Hafrik',
        token,
        user
      });
    }
  };

  const onMomentumScrollEnd = (event) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    const newIndex = Math.round(offsetX / (SLIDE_WIDTH + 14));
    setCurrentIndex(newIndex);
  };

  if (loading) {
    return (
      <View style={[styles.loadingShell, { height: SLIDE_HEIGHT + 30 }]}>
        <ActivityIndicator size="small" color={BRAND_ACCENT} />
        <Text style={styles.loadingText}>Loading banners...</Text>
      </View>
    );
  }

  if (!banners.length) return null;

  const renderItem = ({ item }) => {
    const imageUrl = item.image || item.banner_image || item.image_url;

    return (
      <View style={{ width: SLIDE_WIDTH, height: SLIDE_HEIGHT, marginRight: 14 }}>
        <TouchableOpacity
          style={styles.card}
          activeOpacity={0.95}
          onPress={() => handleBannerPress(item)}
        >
          {imageUrl ? (
            <Image
              source={{ uri: imageUrl }}
              style={StyleSheet.absoluteFillObject}
              resizeMode="cover"
            />
          ) : (
            <LinearGradient
              colors={[BRAND_DEEP, BRAND_MID]}
              style={StyleSheet.absoluteFillObject}
            />
          )}

          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.75)']}
            style={StyleSheet.absoluteFillObject}
          />

          <View style={styles.contentArea}>
            <Text style={styles.title} numberOfLines={2}>
              {item.title}
            </Text>

            <Text style={styles.subtitle} numberOfLines={2}>
              {item.subtitle || item.description}
            </Text>

            <View style={styles.cta}>
              <LinearGradient
                colors={[BRAND_ACCENT, BRAND_LIME]}
                style={styles.ctaGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <Text style={styles.ctaLabel}>
                  {item.button_text || 'Explore'}
                </Text>
                <Ionicons name="arrow-forward" size={14} color={BRAND_DEEP} />
              </LinearGradient>
            </View>
          </View>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <View style={{ marginVertical: 12 }}>
      <FlatList
        ref={flatListRef}
        data={banners}
        renderItem={renderItem}
        keyExtractor={(item) => `banner-${item.id}`}
        horizontal
        showsHorizontalScrollIndicator={false}
        snapToInterval={SLIDE_WIDTH + 14}
        decelerationRate="fast"
        contentContainerStyle={{
          paddingHorizontal: (width - SLIDE_WIDTH) / 2
        }}
        onMomentumScrollEnd={onMomentumScrollEnd}
      />

      {/* Dot Indicators */}
      {banners.length > 1 && (
        <View style={styles.dotRow}>
          {banners.map((_, i) => (
            <View
              key={i}
              style={[
                styles.dot,
                { opacity: i === currentIndex ? 1 : 0.4 }
              ]}
            />
          ))}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  loadingShell: {
    marginHorizontal: 20,
    borderRadius: RADIUS,
    justifyContent: 'center',
    alignItems: 'center',
  },

  loadingText: {
    marginTop: 10,
    fontSize: 12,
    color: BRAND_MID,
  },

  card: {
    flex: 1,
    borderRadius: RADIUS,
    overflow: 'hidden',
    backgroundColor: BRAND_DEEP,
  },

  contentArea: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
  },

  title: {
    fontSize: 22,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 6,
  },

  subtitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.7)',
    marginBottom: 16,
  },

  cta: {
    alignSelf: 'flex-start',
    borderRadius: 30,
    overflow: 'hidden'
  },

  ctaGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 10,
    gap: 6
  },

  ctaLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: BRAND_DEEP
  },

  dotRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 10,
    gap: 6
  },

  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: BRAND_ACCENT
  }
});

export default React.memo(Banner);