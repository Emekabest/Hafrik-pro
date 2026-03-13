// Shared app header — matches Explore/PagesScreen style.
import React, { useEffect, useRef } from 'react';
import {
  View, Text, Image, TouchableOpacity, StyleSheet, Animated,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import useStore from '../repository/store';
import AppDetails from '../helpers/appdetails';
import { Colors } from '../theme';

const BRAND  = Colors.primaryDark;
const ACCENT = Colors.primary;

/**
 * AppHeader — consistent top header used on Home & Profile screens.
 *
 * Props:
 *   onOpenDrawer  — opens the side drawer
 *   title         — if set, shows a text title in the centre instead of the logo
 */
const AppHeader = ({ onOpenDrawer, title }) => {
  const { top }       = useSafeAreaInsets();
  const navigation    = useNavigation();

  const notifCount    = useStore((s) => s.notificationCount ?? 0);
  const msgCount      = useStore((s) => s.messageCount ?? 0);

  // pulse animation for notification bell when count changes
  const bellPulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (notifCount > 0) {
      Animated.sequence([
        Animated.spring(bellPulse, { toValue: 1.25, useNativeDriver: true, tension: 200, friction: 5 }),
        Animated.spring(bellPulse, { toValue: 1,    useNativeDriver: true, tension: 200, friction: 5 }),
      ]).start();
    }
  }, [notifCount]);

  // Counts come from the store (App.js runs startBadgePolling persistently).
  // No local polling here — avoids duplicate requests and conflicting state.

  const Badge = ({ count }) =>
    count > 0 ? (
      <View style={styles.badge}>
        <Text style={styles.badgeText}>{count > 99 ? '99+' : count}</Text>
      </View>
    ) : null;

  return (
    <View style={[styles.header, { paddingTop: top + 6 }]}>
      <View style={styles.inner}>

        {/* LEFT — hamburger */}
        <TouchableOpacity
          style={styles.iconBtn}
          activeOpacity={0.85}
          onPress={onOpenDrawer}
        >
          <Ionicons name="menu-outline" size={22} color={Colors.white} />
        </TouchableOpacity>

        {/* CENTER — logo */}
        <View style={styles.center} pointerEvents="none">
          <Image
            source={require('../assl.js/Layer 3.png')}
            style={styles.logo}
            resizeMode="contain"
          />
        </View>

        {/* RIGHT — search · notifications · messages shortcut */}
        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.iconBtn}
            activeOpacity={0.85}
            onPress={() => navigation.navigate('SearchScreen')}
          >
            <Ionicons name="search-outline" size={20} color={Colors.white} />
          </TouchableOpacity>

          {/* Notifications bell */}
          <TouchableOpacity
            style={styles.iconBtn}
            activeOpacity={0.85}
            onPress={() => navigation.navigate('Notifications')}
          >
            <Animated.View style={{ transform: [{ scale: bellPulse }] }}>
              <Ionicons
                name={notifCount > 0 ? 'notifications' : 'notifications-outline'}
                size={21}
                color={Colors.white}
              />
            </Animated.View>
            <Badge count={notifCount} />
          </TouchableOpacity>


        </View>

      </View>
      {/* subtle accent underline */}
      <View style={styles.borderBottom} />
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    backgroundColor: BRAND,
    zIndex: 10,
    elevation: 6,
    shadowColor: BRAND,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.22,
    shadowRadius: 10,
  },
  inner: {
    height: 44,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  center: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
    pointerEvents: 'none',
  },
  logo: {
    height: 30,
    width: 120,
  },
  logoText: {
    color: Colors.white,
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 3,
    fontFamily: AppDetails?.fontFamily?.redex?.bold ?? 'System',
  },
  title: {
    color: Colors.white,
    fontSize: 17,
    fontWeight: '900',
    letterSpacing: 0.3,
    fontFamily: AppDetails?.fontFamily?.redex?.bold ?? 'System',
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 11,
    backgroundColor: Colors.white + '1A',
    borderWidth: 1,
    borderColor: Colors.white + '24',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: ACCENT,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
    borderWidth: 1.5,
    borderColor: BRAND,
  },
  badgeText: {
    color: Colors.white,
    fontSize: 9,
    fontWeight: '900',
    fontFamily: AppDetails?.fontFamily?.redex?.bold ?? 'System',
  },
  borderBottom: {
    height: 1,
    backgroundColor: ACCENT + '33',
  },
});

export default AppHeader;
