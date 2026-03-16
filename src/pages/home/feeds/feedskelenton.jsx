import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Dimensions, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '../../../theme/colors';

const { width: SCREEN_W } = Dimensions.get('window');
const MEDIA_H = Math.round(SCREEN_W * 0.52);
const BASE    = Colors.neutral150 ?? '#EFEFEF';
const SHINE   = Colors.neutral130 ?? '#F8F8F8';

// ── Single shimmer bar ────────────────────────────────────────────────────────
const ShimmerBar = ({ width, height, borderRadius = 7, style }) => {
  const x = useRef(new Animated.Value(-SCREEN_W)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.timing(x, {
        toValue:         SCREEN_W,
        duration:        1100,
        useNativeDriver: true,
      })
    );
    anim.start();
    return () => anim.stop();
  }, []);

  return (
    <View
      style={[
        { width, height, borderRadius, backgroundColor: BASE, overflow: 'hidden' },
        style,
      ]}
    >
      <Animated.View
        style={{
          ...StyleSheet.absoluteFillObject,
          transform: [{ translateX: x }],
        }}
      >
        <LinearGradient
          colors={['transparent', SHINE, 'transparent']}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={{ width: SCREEN_W, height: '100%' }}
        />
      </Animated.View>
    </View>
  );
};

// ── Full feed card skeleton ───────────────────────────────────────────────────
const FeedSkelenton = () => (
  <View style={sk.card}>
    {/* Header row: avatar + name / timestamp */}
    <View style={sk.headerRow}>
      <ShimmerBar width={46} height={46} borderRadius={23} />
      <View style={sk.headerText}>
        <ShimmerBar width={130} height={13} style={{ marginBottom: 8 }} />
        <ShimmerBar width={80}  height={10} />
      </View>
    </View>

    {/* Caption lines */}
    <ShimmerBar width="92%" height={11} style={sk.line} />
    <ShimmerBar width="70%" height={11} style={sk.line} />

    {/* Media placeholder */}
    <ShimmerBar width="100%" height={MEDIA_H} borderRadius={10} style={sk.media} />

    {/* Action bar */}
    <View style={sk.actionRow}>
      {[100, 90, 80, 70].map((w, i) => (
        <ShimmerBar key={i} width={w} height={28} borderRadius={14} />
      ))}
    </View>
  </View>
);

// ── List of skeletons shown during initial load ───────────────────────────────
export const FeedSkeletonList = () => (
  <View>
    {[0, 1, 2].map((i) => (
      <FeedSkelenton key={i} />
    ))}
  </View>
);

const sk = StyleSheet.create({
  card: {
    backgroundColor: Colors.white,
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 10,
    marginBottom: 6,
    borderTopWidth: 1,
    borderTopColor: Colors.neutral175 ?? '#E8E8E8',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems:   'center',
    marginBottom: 12,
  },
  headerText: {
    marginLeft: 12,
    flex: 1,
    justifyContent: 'center',
  },
  line: {
    marginBottom: 7,
  },
  media: {
    marginTop: 12,
    marginBottom: 12,
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: Colors.neutral175 ?? '#E8E8E8',
  },
});

export default FeedSkelenton;
