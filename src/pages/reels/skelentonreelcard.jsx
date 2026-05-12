import React, { useEffect, useRef } from 'react';
import { Animated, Dimensions, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import AppDetails from '../../helpers/appdetails';
import { Colors } from '../../theme/colors';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const FALLBACK_HEIGHT = SCREEN_HEIGHT - (AppDetails.mainTabNavigatorHeight || 0);

const alpha = (hex, opacity) => {
  const normalized = String(hex || '').replace('#', '');
  if (normalized.length !== 6) return hex || 'transparent';
  return `#${normalized}${Math.round(Math.max(0, Math.min(1, opacity)) * 255).toString(16).padStart(2, '0')}`;
};

const SkeletonBlock = ({ style, pulse }) => (
  <Animated.View style={[styles.skeleton, style, { opacity: pulse }]} />
);

const SkeletonReelCard = ({ height = FALLBACK_HEIGHT }) => {
  const pulse = useRef(new Animated.Value(0.42)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 0.78, duration: 760, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0.42, duration: 760, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  return (
    <View style={[styles.container, { height }]}>
      <LinearGradient colors={['#071F23', '#0D5056', '#020909']} style={StyleSheet.absoluteFill} />
      <View style={styles.centerBadge}>
        <Ionicons name="play" size={28} color={Colors.white} />
      </View>

      <View style={styles.rightRail}>
        {[0, 1, 2, 3, 4].map((item) => (
          <View key={item} style={styles.actionWrap}>
            <SkeletonBlock pulse={pulse} style={styles.actionCircle} />
            <SkeletonBlock pulse={pulse} style={styles.actionLabel} />
          </View>
        ))}
      </View>

      <View style={styles.bottomPanel}>
        <View style={styles.creatorRow}>
          <SkeletonBlock pulse={pulse} style={styles.avatar} />
          <View style={{ flex: 1 }}>
            <SkeletonBlock pulse={pulse} style={styles.nameLine} />
            <SkeletonBlock pulse={pulse} style={styles.handleLine} />
          </View>
        </View>
        <SkeletonBlock pulse={pulse} style={styles.captionLine} />
        <SkeletonBlock pulse={pulse} style={[styles.captionLine, { width: '70%' }]} />
        <View style={styles.chips}>
          <SkeletonBlock pulse={pulse} style={styles.chip} />
          <SkeletonBlock pulse={pulse} style={[styles.chip, { width: 82 }]} />
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    backgroundColor: Colors.black,
    position: 'relative',
    overflow: 'hidden',
  },
  centerBadge: {
    position: 'absolute',
    alignSelf: 'center',
    top: '43%',
    width: 74,
    height: 74,
    borderRadius: 37,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: alpha('#000000', 0.24),
    borderWidth: 1,
    borderColor: alpha(Colors.white, 0.14),
  },
  skeleton: {
    backgroundColor: alpha(Colors.white, 0.22),
  },
  rightRail: {
    position: 'absolute',
    right: 12,
    bottom: 112,
    width: 66,
    alignItems: 'center',
    gap: 13,
  },
  actionWrap: {
    alignItems: 'center',
  },
  actionCircle: {
    width: 47,
    height: 47,
    borderRadius: 24,
  },
  actionLabel: {
    width: 32,
    height: 8,
    borderRadius: 4,
    marginTop: 7,
  },
  bottomPanel: {
    position: 'absolute',
    left: 14,
    right: 92,
    bottom: 112,
  },
  creatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 14,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  nameLine: {
    width: '72%',
    height: 14,
    borderRadius: 7,
    marginBottom: 8,
  },
  handleLine: {
    width: '44%',
    height: 10,
    borderRadius: 5,
  },
  captionLine: {
    width: '94%',
    height: 12,
    borderRadius: 6,
    marginBottom: 8,
  },
  chips: {
    flexDirection: 'row',
    gap: 7,
    marginTop: 4,
  },
  chip: {
    width: 64,
    height: 24,
    borderRadius: 12,
  },
});

export default SkeletonReelCard;
