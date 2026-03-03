import React, { memo, useState, useRef } from 'react';
import {
  View,
  Dimensions,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { Colors } from '../../../../theme/colors';

const withOpacity = (hex, opacity) => {
  const normalized = (hex || "").replace("#", "");
  const alpha = Math.round(Math.max(0, Math.min(1, opacity)) * 255).toString(16).padStart(2, "0");
  return `#${normalized}${alpha}`;
};


const { width: screenWidth } = Dimensions.get('window');
// Feed right-column width: screen - container pad 32 - leftCol 44 - col gap 12
const DEFAULT_IMAGE_W = screenWidth - 88;

// ─── PhotoPostContent ─────────────────────────────────────────────────────────
// imageWidth: optional override (pass from comment screen for full-width context)
// contentFit: 'cover' (feed — square crop) | 'contain' (post detail — full image, no crop)
const PhotoPostContent = ({ media, onImagePress, imageWidth: imageWidthProp, contentFit = 'cover' }) => {
  const validMedia = (media || []).filter(item => item?.url);
  if (validMedia.length === 0) return null;

  const imgW       = imageWidthProp ?? DEFAULT_IMAGE_W;
  const isMultiple = validMedia.length > 1;

  const [activeIndex, setActiveIndex] = useState(0);
  const scrollRef = useRef(null);

  const handleScroll = (event) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    const index   = Math.round(offsetX / imgW);
    setActiveIndex(Math.max(0, Math.min(index, validMedia.length - 1)));
  };

  return (
    <View style={styles.container}>
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        decelerationRate="fast"
        onScroll={handleScroll}
        scrollEventThrottle={16}
      >
        {validMedia.map((item, index) => (
          <ThreadImage
            key={index}
            uri={item.url}
            width={imgW}
            onPress={() => onImagePress?.(item.url)}
            contentFit={contentFit}
          />
        ))}
      </ScrollView>

      {/* Dot indicators for multi-image posts */}
      {isMultiple && (
        <View style={styles.dotsRow}>
          {validMedia.map((_, i) => (
            <View
              key={i}
              style={[styles.dot, i === activeIndex && styles.dotActive]}
            />
          ))}
        </View>
      )}
    </View>
  );
};

// ─── ThreadImage — no setState on load ────────────────────────────────────────
// contentFit='cover'   → 1:1 square crop (feed card)
// contentFit='contain' → full image letterboxed inside same square (post detail)
const ThreadImage = ({ uri, onPress, width, contentFit = 'cover' }) => (
  <TouchableOpacity activeOpacity={0.95} onPress={onPress}>
    <ExpoImage
      source={{ uri }}
      style={{
        width,
        aspectRatio: 1,
        borderRadius: 12,
        backgroundColor: contentFit === 'contain' ? Colors.neutral900 : Colors.neutral150,
      }}
      contentFit={contentFit}
      cachePolicy="memory-disk"
      transition={200}
    />
  </TouchableOpacity>
);

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    marginTop: 6,
  },

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
