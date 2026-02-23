import React, { memo, useState, useEffect, useRef } from 'react';
import {
  View,
  Dimensions,
  TouchableOpacity,
  StyleSheet,
  Image,
  ScrollView,
  Text
} from 'react-native';
import { Image as ExpoImage } from 'expo-image';

const screenWidth = Dimensions.get('window').width;
const MAX_HEIGHT = 600;

const PhotoPostContent = ({ media, onImagePress }) => {
  const validMedia = (media || []).filter(item => item?.url);
  if (validMedia.length === 0) return null;

  const feedCardWidth = screenWidth - 75;
  const isMultiple = validMedia.length > 1;

  const [activeIndex, setActiveIndex] = useState(0);
  const scrollRef = useRef(null);

  const handleScroll = (event) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    const index = Math.round(offsetX / feedCardWidth);
    setActiveIndex(index);
  };

  return (
    <View style={styles.container}>
      <View>
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
              width={feedCardWidth}
              onPress={() => onImagePress?.(item.url)}
            />
          ))}
        </ScrollView>

        {/* Counter */}
        {isMultiple && (
          <View style={styles.counterContainer}>
            <Text style={styles.counterText}>
              {activeIndex + 1} / {validMedia.length}
            </Text>
          </View>
        )}
      </View>
    </View>
  );
};

const ThreadImage = ({ uri, onPress, width }) => {
  const [ratio, setRatio] = useState(1);

  useEffect(() => {
    if (uri) {
      Image.getSize(
        uri,
        (w, h) => {
          if (w && h) {
            setRatio(w / h);
          }
        },
        () => setRatio(1)
      );
    }
  }, [uri]);

  let height = width / ratio;
  if (height > MAX_HEIGHT) {
    height = MAX_HEIGHT;
  }

  return (
    <TouchableOpacity
      activeOpacity={0.95}
      onPress={onPress}
      style={styles.imageWrapper}
    >
      <ExpoImage
        source={{ uri }}
        style={{ width, height }}
        contentFit="cover"
        cachePolicy="memory-disk"
        transition={200}   // smooth fade
      />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    marginTop: 6,
  },

  imageWrapper: {
    borderRadius: 16,
    overflow: 'hidden',
    marginRight: 10,
    backgroundColor: '#f3f3f3',
  },

  counterContainer: {
    position: 'absolute',
    top: 10,
    right: 12,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },

  counterText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
});

export default memo(PhotoPostContent);