// src/navigation/MainTabNavigator.js
import React, { useEffect, useState, useRef, useCallback } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, Text, StyleSheet, TouchableOpacity, Image, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// Screens
import HomePage             from '../pages/home/Home';
import ProfileScreen        from '../pages/profile/profilescreen';
import DiscoveryScreen      from '../pages/pages_/pagesscreen';
import InboxScreen          from '../pages/messages/InboxScreen';
import Reels2               from '../pages/reels/reels2';

import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AppDetails from '../helpers/appdetails';
import SvgIcon    from '../assl.js/svg/svg';
import { useAuth } from '../AuthContext';
import useStore   from '../repository/store';
import { Colors } from '../theme/colors';
import { useTheme } from '../theme/ThemeContext';

const withOpacity = (hex, opacity) => {
  const normalized = (hex || "").replace("#", "");
  const alpha = Math.round(Math.max(0, Math.min(1, opacity)) * 255).toString(16).padStart(2, "0");
  return `#${normalized}${alpha}`;
};


const Tab     = createBottomTabNavigator();
const BRAND   = Colors.primaryDark;
const MUTED   = Colors.secondaryText;
const ACCENT  = Colors.primary;

// ─── Custom Tab Bar ─────────────────────────────────────────
const CustomTabBar = ({ state, navigation, unreadCount, notifCount }) => {
  const { bottom } = useSafeAreaInsets();
  const { colors: tc } = useTheme();
  const triggerTabRefresh = useStore(s => s.triggerTabRefresh);

  // Double-tap tracking: { routeName: lastTapTime }
  const lastTapRef = React.useRef({});

  // Reels screen is full-screen — no tab bar
  if (state.routes[state.index].name === 'Reels') return null;

  return (
    <View style={[styles.tabBarContainer, { paddingBottom: bottom, height: AppDetails.mainTabNavigatorHeight + bottom, backgroundColor: tc.tabBarBg, borderTopColor: tc.tabBarBorder }]}>
      {state.routes.map((route, index) => {
        const isFocused = state.index === index;

        const onPress = () => {
          const now = Date.now();
          const last = lastTapRef.current[route.name] ?? 0;
          const isDoubleTap = isFocused && (now - last) < 400;
          lastTapRef.current[route.name] = now;

          if (isDoubleTap) {
            triggerTabRefresh(route.name);
            return;
          }

          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });

          if (!event.defaultPrevented) {
            navigation.navigate(route.name);
          }
        };

        // ── BIG CENTER BUTTON = FEED ─────────────────────
        if (route.name === 'Feed') {
          return <FeedFab key={route.key} onPress={onPress} notifCount={notifCount} />;
        }

        let icon;
        let label;

        if (route.name === 'Home') {
          label = 'Home';
          icon = (
            <Ionicons
              name={isFocused ? 'home' : 'home-outline'}
              size={24}
              color={isFocused ? BRAND : MUTED}
            />
          );
        }

        else if (route.name === 'Reels') {
          label = 'Reels';
          icon = (
            <Ionicons
              name={isFocused ? 'play' : 'play-outline'}
              size={23}
              color={isFocused ? BRAND : MUTED}
            />
          );
        }

        else if (route.name === 'Messages') {
          label = 'Messages';
          icon = (
            <View>
              <Ionicons
                name={isFocused ? 'chatbubbles' : 'chatbubbles-outline'}
                size={23}
                color={isFocused ? BRAND : MUTED}
              />
              {unreadCount > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </Text>
                </View>
              )}
            </View>
          );
        }

        else if (route.name === 'Profile') {
          label = 'Profile';
          icon = (
            <SvgIcon
              name={isFocused ? 'profile' : 'profile_outline'}
              width={26}
              height={26}
              color={isFocused ? BRAND : MUTED}
            />
          );
        }

        return (
          <TouchableOpacity
            key={route.key}
            onPress={onPress}
            style={styles.tabItem}
            activeOpacity={0.8}
          >
            <View style={[
              styles.iconContainer,
              isFocused && styles.iconContainerActive
            ]}>
              {icon}
            </View>

            <Text style={[
              styles.tabLabel,
              isFocused && styles.tabLabelActive
            ]}>
              {label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

// ─── Feed FAB (center) ─────────────────────────────
const FeedFab = ({ onPress, notifCount }) => {
  const scale  = useRef(new Animated.Value(1)).current;
  const rotate = useRef(new Animated.Value(0)).current;

  const handlePress = useCallback(() => {
    Animated.parallel([
      Animated.sequence([
        Animated.spring(scale, { toValue: 0.82, useNativeDriver: true, speed: 50, bounciness: 0 }),
        Animated.spring(scale, { toValue: 1,    useNativeDriver: true, speed: 14, bounciness: 14 }),
      ]),
      Animated.sequence([
        Animated.timing(rotate, { toValue: 1, duration: 220, useNativeDriver: true }),
        Animated.timing(rotate, { toValue: 0, duration: 180, useNativeDriver: true }),
      ]),
    ]).start();
    onPress();
  }, [onPress, scale, rotate]);

  const spin = rotate.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '18deg'] });

  return (
    <TouchableOpacity onPress={handlePress} style={styles.fabTab} activeOpacity={1}>
      <Animated.View style={[styles.fabButton, { transform: [{ scale }, { rotate: spin }] }]}>
        <Image source={require('../assl.js/logo1.png')} style={{ width: 44, height: 44, tintColor: Colors.white }} resizeMode="contain" />
        {notifCount > 0 && (
          <View style={styles.fabBadge}>
            <Text style={styles.badgeText}>
              {notifCount > 99 ? '99+' : notifCount}
            </Text>
          </View>
        )}
      </Animated.View>
    </TouchableOpacity>
  );
};

// ─── Navigator ────────────────────────────────────
const MainTabNavigator = () => {

  const [unReadCount, setUnreadCount] = useState(0);

  const { token }      = useAuth();
  const unreadCount    = useStore((s) => s.messageCount);
  const notifCount     = useStore((s) => s.notificationCount ?? 0);

  useEffect(() => {
    setUnreadCount(unreadCount);
  }, [unreadCount]);

  return (
    <Tab.Navigator
      initialRouteName="Home"
      tabBar={props => <CustomTabBar {...props} unreadCount={unReadCount} notifCount={notifCount} />}
      screenOptions={{ headerShown: false }}
    >
      {/* Home tab → Main Feed */}
      <Tab.Screen name="Home"          component={HomePage} />
      <Tab.Screen name="Reels"         component={Reels2} />

      {/* BIG CENTER FAB → Explore / Discovery */}
      <Tab.Screen name="Feed"          component={DiscoveryScreen} />

      {/* Messages tab */}
      <Tab.Screen name="Messages" component={InboxScreen} />
      <Tab.Screen name="Profile"       component={ProfileScreen} />
    </Tab.Navigator>
  );
};

// ─── Styles ───────────────────────────────────────
const styles = StyleSheet.create({
  tabBarContainer: {
    flexDirection: 'row',
    height: AppDetails.mainTabNavigatorHeight,
    paddingTop: 8,
    backgroundColor: Colors.white,
    borderTopWidth: 1,
    borderTopColor: withOpacity(Colors.primaryDark, 0.08),
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 10,
  },

  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  iconContainer: {
    padding: 6,
    borderRadius: 12,
  },

  iconContainerActive: {
    backgroundColor: Colors.primary + '1F',
  },

  tabLabel: {
    fontSize: 10.5,
    color: Colors.secondaryText,
    fontFamily: AppDetails.fontFamily.redex.medium,
  },

  tabLabelActive: {
    color: Colors.primaryDark,
  },

  fabTab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -20,
  },

  fabButton: {
    width: 66,
    height: 66,
    borderRadius: 33,
    backgroundColor: Colors.primaryDark,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: Colors.primaryDark,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 12,
  },

  // Unread badge on Messages tab icon
  badge: {
    position: 'absolute',
    top: -4,
    right: -6,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: ACCENT,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
    borderWidth: 1.5,
    borderColor: Colors.white,
  },
  // Notification badge on Feed FAB
  fabBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    minWidth: 17,
    height: 17,
    borderRadius: 9,
    backgroundColor: Colors.coral,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
    borderWidth: 1.5,
    borderColor: Colors.primaryDark,
  },
  badgeText: {
    color: Colors.white,
    fontSize: 9,
    fontWeight: '900',
  },
});

export default MainTabNavigator;
