import React, { memo, useState, useRef, useEffect, useCallback } from 'react';
import {
  View, Dimensions, TouchableOpacity, StyleSheet,
  Image, Text, Animated,
} from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';
import { Image as ExpoImage } from 'expo-image';
import { Colors } from '../../../../theme/colors';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

const DEFAULT_IMAGE_W = SCREEN_W - 88;
const RADIUS          = 16;
const MAX_SINGLE_H    = 460;
const GRID_GAP        = 3;

// h/w ratio clamped between 0.5 (2:1 landscape) and 1.33 (4:3 portrait)
const clampRatio = (w, h) => {
  if (!(w > 0 && h > 0)) return null;
  return Math.min(Math.max(h / w, 0.5), 1.33);
};

const withOpacity = (hex, opacity) => {
  const normalized = (hex || '').replace('#', '');
  const alpha = Math.round(Math.max(0, Math.min(1, opacity)) * 255).toString(16).padStart(2, '0');
  return `#${normalized}${alpha}`;
};

// ─── FadeImage — fades in once loaded ────────────────────────────────────────
const FadeImage = ({ uri, style, contentFit = 'cover' }) => {
  const opacity = useRef(new Animated.Value(0)).current;
  const onLoad = useCallback(() => {
    Animated.timing(opacity, { toValue: 1, duration: 280, useNativeDriver: true }).start();
  }, [opacity]);

  return (
    <Animated.View style={[style, { opacity, backgroundColor: Colors.neutral150 }]}>
      <ExpoImage
        source={{ uri }}
        style={StyleSheet.absoluteFill}
        contentFit={contentFit}
        cachePolicy="memory-disk"
        onLoad={onLoad}
      />
    </Animated.View>
  );
};

// ─── SingleImage — natural aspect ratio ──────────────────────────────────────
const SingleImage = ({ item, width, radius, maxHeight, onPress }) => {
  const [height, setHeight] = useState(() => {
    const r = clampRatio(item.width, item.height);
    return r ? Math.min(width * r, maxHeight) : Math.min(width * 0.85, maxHeight);
  });

  useEffect(() => {
    if (clampRatio(item.width, item.height) !== null) return;
    if (!item.url) return;
    Image.getSize(
      item.url,
      (w, h) => { const r = clampRatio(w, h); if (r) setHeight(Math.min(width * r, maxHeight)); },
      () => {}
    );
  }, [item.url, item.width, item.height, width, maxHeight]);

  return (
    <TouchableOpacity
      activeOpacity={0.88}
      onPress={onPress}
      style={{ borderRadius: radius, overflow: 'hidden' }}
    >
      <FadeImage uri={item.url} style={{ width, height }} />
    </TouchableOpacity>
  );
};

// ─── GridImages — Facebook-style grid for feed cards ─────────────────────────
// Layout rules:
//   1 image  → full width (handled by SingleImage above)
//   2 images → two equal columns
//   3 images → one full-width top + two equal columns below
//   4+       → one full-width top + two columns below (last cell shows "+N" overflow)
const GridImages = ({ images, width, radius, onImagePress }) => {
  const gridH     = Math.round(width * 0.62); // height for bottom row cells
  const topH      = Math.round(width * 0.62); // height for the top / full-width cell
  const halfW     = (width - GRID_GAP) / 2;

  const SHOW_MAX   = 3; // total cells to show before overflow badge
  const total      = images.length;
  const showImages = images.slice(0, SHOW_MAX);
  const overflow   = total > SHOW_MAX ? total - SHOW_MAX : 0;

  if (total === 2) {
    // Two equal side-by-side
    return (
      <View style={[gs.row, { borderRadius: radius, overflow: 'hidden' }]}>
        {images.map((item, i) => (
          <TouchableOpacity key={i} activeOpacity={0.88} onPress={() => onImagePress?.(item.url)}>
            <FadeImage uri={item.url} style={{ width: halfW, height: gridH }} />
          </TouchableOpacity>
        ))}
      </View>
    );
  }

  // 3 or 4+ : full-width top + two columns below
  const top      = showImages[0];
  const bottoms  = showImages.slice(1); // at most 2 cells

  return (
    <View style={[{ borderRadius: radius, overflow: 'hidden' }]}>
      {/* Top image */}
      <TouchableOpacity activeOpacity={0.88} onPress={() => onImagePress?.(top.url)}>
        <FadeImage uri={top.url} style={{ width, height: topH }} />
      </TouchableOpacity>

      {/* Bottom row */}
      <View style={[gs.row, { marginTop: GRID_GAP }]}>
        {bottoms.map((item, i) => {
          const isLast       = i === bottoms.length - 1;
          const showOverflow = isLast && overflow > 0;
          return (
            <TouchableOpacity
              key={i}
              activeOpacity={0.88}
              onPress={() => onImagePress?.(item.url)}
              style={{ marginLeft: i > 0 ? GRID_GAP : 0 }}
            >
              <FadeImage uri={item.url} style={{ width: halfW, height: gridH }} />
              {showOverflow && (
                <View style={gs.overflowOverlay}>
                  <Text style={gs.overflowText}>+{overflow}</Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

const gs = StyleSheet.create({
  row: { flexDirection: 'row' },
  overflowOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.52)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  overflowText: {
    color: '#fff',
    fontSize: 26,
    fontWeight: '900',
    letterSpacing: -1,
  },
});

// ─── CarouselImages — horizontal paging used in detail / full-width view ──────
const CarouselImages = ({ images, width, radius, maxHeight, onImagePress }) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const scrollRef = useRef(null);

  const [carouselH, setCarouselH] = useState(() => {
    const first = images[0];
    const r = clampRatio(first.width, first.height);
    return r ? Math.min(width * r, maxHeight) : Math.min(width * 0.85, maxHeight);
  });

  useEffect(() => {
    const first = images[0];
    if (clampRatio(first.width, first.height) !== null) return;
    if (!first.url) return;
    Image.getSize(
      first.url,
      (w, h) => { const r = clampRatio(w, h); if (r) setCarouselH(Math.min(width * r, maxHeight)); },
      () => {}
    );
  }, [images, width, maxHeight]);

  const handleScroll = useCallback((e) => {
    const idx = Math.round(e.nativeEvent.contentOffset.x / width);
    setActiveIndex(Math.max(0, Math.min(idx, images.length - 1)));
  }, [width, images.length]);

  return (
    <View>
      <View style={{ borderRadius: radius, overflow: 'hidden' }}>
        <ScrollView
          ref={scrollRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          decelerationRate="fast"
          onScroll={handleScroll}
          scrollEventThrottle={16}
        >
          {images.map((item, i) => (
            <TouchableOpacity
              key={i}
              activeOpacity={0.88}
              onPress={() => onImagePress?.(item.url)}
            >
              <FadeImage uri={item.url} style={{ width, height: carouselH }} />
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Dot indicators */}
      <View style={styles.dotsRow}>
        {images.map((_, i) => (
          <View key={i} style={[styles.dot, i === activeIndex && styles.dotActive]} />
        ))}
      </View>
    </View>
  );
};

// ─── PhotoPostContent ─────────────────────────────────────────────────────────
const PhotoPostContent = ({ media, onImagePress, imageWidth: imageWidthProp }) => {
  const validMedia = (media || []).filter(item => item?.url);
  if (validMedia.length === 0) return null;

  const imgW      = imageWidthProp ?? DEFAULT_IMAGE_W;
  const isFullW   = imgW >= SCREEN_W - 2;   // true = detail screen, false = feed card
  const imgRadius = isFullW ? 0 : RADIUS;
  const imgMaxH   = isFullW ? SCREEN_H * 0.68 : MAX_SINGLE_H;

  return (
    <View style={styles.container}>
      {validMedia.length === 1 ? (
        // Single image: same in both feed and detail
        <SingleImage
          item={validMedia[0]}
          width={imgW}
          radius={imgRadius}
          maxHeight={imgMaxH}
          onPress={() => onImagePress?.(validMedia[0].url)}
        />
      ) : isFullW ? (
        // Detail screen: horizontal carousel with full natural size
        <CarouselImages
          images={validMedia}
          width={imgW}
          radius={imgRadius}
          maxHeight={imgMaxH}
          onImagePress={onImagePress}
        />
      ) : (
        // Feed card: Facebook-style grid
        <GridImages
          images={validMedia}
          width={imgW}
          radius={imgRadius}
          onImagePress={onImagePress}
        />
      )}
    </View>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { marginTop: 10 },

  dotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
    gap: 4,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: withOpacity(Colors.black, 0.18),
  },
  dotActive: {
    width: 18,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.tealAccent,
  },
});

export default memo(PhotoPostContent);
