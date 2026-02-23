// src/navigation/MainTabNavigator.js
import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// Screens
import HomePage         from '../pages/home/Home';
import ProfileScreen    from '../pages/profile/profilescreen';
import DiscoveryScreen  from '../pages/pages_/pagesscreen';
import MarketplaceScreen from '../pages/marketplace/index';
import Reels2           from '../pages/reels/reels2';

import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AppDetails from '../helpers/appdetails';
import SvgIcon    from '../assl.js/svg/svg';

const Tab  = createBottomTabNavigator();
const BRAND = '#0C3F44';
const MUTED = '#9BA8AD';

// ─── Custom Tab Bar ─────────────────────────────────────────
const CustomTabBar = ({ state, navigation }) => {
  const { bottom } = useSafeAreaInsets();

  return (
    <View style={[styles.tabBarContainer, { paddingBottom: bottom, height: AppDetails.mainTabNavigatorHeight + bottom }]}>
      {state.routes.map((route, index) => {
        const isFocused = state.index === index;

        const onPress = () => {
          navigation.navigate(route.name);
        };

        // ── BIG CENTER BUTTON = FEED ─────────────────────
        if (route.name === 'Feed') {
          return <FeedFab key={route.key} onPress={onPress} />;
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

        else if (route.name === 'Marketplace') {
          label = 'Market';
          icon = (
            <Ionicons
              name={isFocused ? 'storefront' : 'storefront-outline'}
              size={23}
              color={isFocused ? BRAND : MUTED}
            />
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
const FeedFab = ({ onPress }) => {
  return (
    <TouchableOpacity onPress={onPress} style={styles.fabTab} activeOpacity={0.85}>
      <View style={styles.fabButton}>
        <Ionicons name="home" size={28} color="#fff" />
      </View>
    </TouchableOpacity>
  );
};

// ─── Navigator ────────────────────────────────────
const MainTabNavigator = () => (
  <Tab.Navigator
    initialRouteName="Home"
    tabBar={props => <CustomTabBar {...props} />}
    screenOptions={{ headerShown: false }}
  >
    {/* Home tab → Explore / Discovery (new landing screen) */}
    <Tab.Screen name="Home"        component={DiscoveryScreen} />

    <Tab.Screen name="Reels"       component={Reels2} />

    {/* BIG CENTER FAB → Feed */}
    <Tab.Screen name="Feed"        component={HomePage} />

    <Tab.Screen name="Marketplace" component={MarketplaceScreen} />
    <Tab.Screen name="Profile"     component={ProfileScreen} />
  </Tab.Navigator>
);

// ─── Styles ───────────────────────────────────────
const styles = StyleSheet.create({
  tabBarContainer: {
    flexDirection: 'row',
    height: AppDetails.mainTabNavigatorHeight,
    paddingTop: 8,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: 'rgba(12,63,68,0.08)',
    shadowColor: '#000',
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
    backgroundColor: 'rgba(19,194,150,0.12)',
  },

  tabLabel: {
    fontSize: 10.5,
    color: '#9BA8AD',
    fontFamily: AppDetails.fontFamily.redex.medium,
  },

  tabLabelActive: {
    color: '#0C3F44',
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
    backgroundColor: '#0C3F44',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#0C3F44',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 12,
  },
});

export default MainTabNavigator;
