// src/navigation/MainTabNavigator.js
import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
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

  return (
    <View style={[styles.tabBarContainer, { paddingBottom: bottom, height: AppDetails.mainTabNavigatorHeight + bottom, backgroundColor: tc.tabBarBg, borderTopColor: tc.tabBarBorder }]}>
      {state.routes.map((route, index) => {
        const isFocused = state.index === index;

        const onPress = () => {
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
          // Home tab now opens Explore / Discovery
          label = 'Explore';
          icon = (
            <Ionicons
              name={isFocused ? 'compass' : 'compass-outline'}
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
  return (
    <TouchableOpacity onPress={onPress} style={styles.fabTab} activeOpacity={0.85}>
      <View style={styles.fabButton}>
        <Ionicons name="home" size={28} color={Colors.white} />
        {notifCount > 0 && (
          <View style={styles.fabBadge}>
            <Text style={styles.badgeText}>
              {notifCount > 99 ? '99+' : notifCount}
            </Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
};

// ─── Navigator ────────────────────────────────────
const MainTabNavigator = () => {
  const { token }      = useAuth();
  const unreadCount    = useStore((s) => s.messageCount      ?? 0);
  const notifCount     = useStore((s) => s.notificationCount ?? 0);

  return (
    <Tab.Navigator
      initialRouteName="Feed"
      tabBar={props => <CustomTabBar {...props} unreadCount={unreadCount} notifCount={notifCount} />}
      screenOptions={{ headerShown: false }}
    >
      {/* Home tab → Explore / Discovery */}
      <Tab.Screen name="Home"          component={DiscoveryScreen} />
      <Tab.Screen name="Reels"         component={Reels2} />

      {/* BIG CENTER FAB → Feed */}
      <Tab.Screen name="Feed"          component={HomePage} />

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
