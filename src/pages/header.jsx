import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Image,
  Text,
  Animated,
} from 'react-native';

import { Image as ExpoImage } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import AppDetails from '../helpers/appdetails';
import useStore from '../repository/store';

const BRAND = '#0C3F44';
const ACCENT = '#13C296';

const isRealImage = (url) =>
  !!url &&
  typeof url === 'string' &&
  url.trim().length > 6 &&
  !url.includes('blank_profile') &&
  !url.includes('/default.');

const PulsingRing = () => {
  const scale = useRef(new Animated.Value(1)).current;
  const opacity = useRef(new Animated.Value(0.7)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.parallel([
        Animated.sequence([
          Animated.timing(scale, { toValue: 1.35, duration: 1100, useNativeDriver: true }),
          Animated.timing(scale, { toValue: 1, duration: 1100, useNativeDriver: true }),
        ]),
        Animated.sequence([
          Animated.timing(opacity, { toValue: 0, duration: 1100, useNativeDriver: true }),
          Animated.timing(opacity, { toValue: 0.7, duration: 1100, useNativeDriver: true }),
        ]),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, [opacity, scale]);

  return (
    <Animated.View
      style={[styles.pulseRing, { transform: [{ scale }], opacity }]}
      pointerEvents="none"
    />
  );
};

const IconBtn = ({ name, count = 0, onPress, size = 22 }) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePress = () => {
    Animated.sequence([
      Animated.timing(scaleAnim, { toValue: 0.85, duration: 80, useNativeDriver: true }),
      Animated.spring(scaleAnim, { toValue: 1, friction: 4, useNativeDriver: true }),
    ]).start();

    if (typeof onPress === 'function') onPress();
  };

  return (
    <TouchableOpacity onPress={handlePress} activeOpacity={1} style={styles.iconBtnWrap}>
      <Animated.View style={[styles.iconBtn, { transform: [{ scale: scaleAnim }] }]}>
        <Ionicons name={name} size={size} color="#fff" />
        {count > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{count > 99 ? '99+' : count > 9 ? '9+' : count}</Text>
          </View>
        )}
      </Animated.View>
    </TouchableOpacity>
  );
};

const Header = ({
  onOpenDrawer,
  onOpenNotifications,
  onOpenMessages,
}) => {
  const { top } = useSafeAreaInsets();
  const navigation = useNavigation();

  const userAvatar = useStore((s) => s.userAvatar);

  const notificationCount = useStore((s) => s.notificationCount ?? 0);
  const messageCount = useStore((s) => s.messageCount ?? 0);

  const [avatarUrl, setAvatarUrl] = useState(userAvatar);
  const avatarScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    setAvatarUrl(userAvatar);
  }, [userAvatar]);

  const handleAvatarPress = () => {
    Animated.sequence([
      Animated.timing(avatarScale, { toValue: 0.88, duration: 90, useNativeDriver: true }),
      Animated.spring(avatarScale, { toValue: 1, friction: 4, useNativeDriver: true }),
    ]).start();

    if (typeof onOpenDrawer === 'function') onOpenDrawer();
  };

  return (
    <View style={[styles.wrapper, { paddingTop: top }]}>
      <View style={styles.glowLine} />

      <View style={styles.container}>
        {/* LEFT */}
        <TouchableOpacity activeOpacity={1} onPress={handleAvatarPress} style={styles.avatarWrap}>
          <PulsingRing />
          <Animated.View style={[styles.avatarRing, { transform: [{ scale: avatarScale }] }]}>
            {isRealImage(avatarUrl) ? (
              <ExpoImage
                source={{ uri: avatarUrl }}
                style={styles.avatar}
                contentFit="cover"
                cachePolicy="memory-disk"
              />
            ) : (
              <View style={styles.avatarFallback}>
                <Ionicons name="person" size={18} color="#fff" />
              </View>
            )}
          </Animated.View>
          <View style={styles.onlineDot} />
        </TouchableOpacity>

        {/* CENTER */}
        <View style={styles.logoWrap} pointerEvents="none">
          <Image
            source={require('../assl.js/logoTop.png')}
            style={styles.logo}
            resizeMode="contain"
          />
        </View>

        {/* RIGHT */}
        <View style={styles.actions}>
          <IconBtn
            name="search-outline"
            onPress={() => navigation.navigate('SearchScreen')}
          />

          <IconBtn
            name="notifications-outline"
            count={notificationCount}
            onPress={onOpenNotifications}
          />

          <IconBtn
            name="chatbubble-ellipses-outline"
            count={messageCount}
            onPress={onOpenMessages}
          />
        </View>
      </View>

      <View style={styles.borderBottom} />
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    backgroundColor: BRAND,
    shadowColor: BRAND,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.28,
    shadowRadius: 14,
    elevation: 10,
    zIndex: 10,
  },
  glowLine: {
    position: 'absolute',
    top: 0, left: 0, right: 0,
    height: 1,
    backgroundColor: 'rgba(19,194,150,0.35)',
  },
  container: {
    height: 58,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  avatarWrap: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  pulseRing: { position: 'absolute', width: 44, height: 44, borderRadius: 22, borderWidth: 2, borderColor: ACCENT },
  avatarRing: { width: 38, height: 38, borderRadius: 19, borderWidth: 2, borderColor: ACCENT, overflow: 'hidden' },
  avatar: { width: '100%', height: '100%' },
  avatarFallback: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.18)' },
  onlineDot: { position: 'absolute', bottom: 1, right: 1, width: 10, height: 10, borderRadius: 5, backgroundColor: ACCENT, borderWidth: 2, borderColor: BRAND },

  logoWrap: { position: 'absolute', left: 0, right: 0, alignItems: 'center', justifyContent: 'center' },
  logo: { height: 26, width: 108 },

  actions: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  iconBtnWrap: { padding: 2 },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  badge: {
    position: 'absolute',
    top: -5,
    right: -5,
    minWidth: 17,
    height: 17,
    borderRadius: 9,
    backgroundColor: ACCENT,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
    borderWidth: 1.5,
    borderColor: BRAND,
  },
  badgeText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: '900',
    fontFamily: AppDetails?.fontFamily?.redex?.bold ?? 'System',
  },

  borderBottom: { height: 1, backgroundColor: 'rgba(19,194,150,0.18)' },
});

export default Header;