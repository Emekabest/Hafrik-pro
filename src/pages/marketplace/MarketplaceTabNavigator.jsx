// src/pages/marketplace/MarketplaceTabNavigator.jsx
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import MarketplaceScreen       from './index';
import CartScreen              from './CartScreen';
import MarketplaceOrdersScreen from './MarketplaceOrdersScreen';
import MyListingsScreen        from './MyListingsScreen';

import useStore      from '../../repository/store';
import { Colors }    from '../../theme/colors';
import AppDetails    from '../../helpers/appdetails';

const Tab   = createBottomTabNavigator();
const BRAND = Colors.primaryDark;
const MUTED = Colors.secondaryText;

// ─── Tab definitions ────────────────────────────────────────────────────────
const TAB_CONFIG = [
  { name: 'MktShop',   label: 'Shop',     icon: 'storefront',  iconOutline: 'storefront-outline'  },
  { name: 'MktCart',   label: 'Cart',     icon: 'bag',         iconOutline: 'bag-outline',          badge: true },
  { name: 'MktOrders', label: 'Orders',   icon: 'receipt',     iconOutline: 'receipt-outline'      },
  { name: 'MktSell',   label: 'My Shop',  icon: 'pricetag',    iconOutline: 'pricetag-outline'     },
];

// ─── Custom Tab Bar ──────────────────────────────────────────────────────────
const MarketplaceTabBar = ({ state, navigation }) => {
  const { bottom } = useSafeAreaInsets();
  const cartCount  = useStore(s => s.cartCount);

  return (
    <View style={[styles.tabBar, { paddingBottom: bottom, height: 58 + bottom }]}>
      {state.routes.map((route, index) => {
        const isFocused = state.index === index;
        const tab       = TAB_CONFIG[index];
        const badge     = tab.badge ? cartCount : 0;

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

        return (
          <TouchableOpacity
            key={route.key}
            onPress={onPress}
            style={styles.tabItem}
            activeOpacity={0.7}
          >
            <View style={[styles.iconWrap, isFocused && styles.iconWrapActive]}>
              <View>
                <Ionicons
                  name={isFocused ? tab.icon : tab.iconOutline}
                  size={22}
                  color={isFocused ? BRAND : MUTED}
                />
                {badge > 0 && (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>
                      {badge > 99 ? '99+' : badge}
                    </Text>
                  </View>
                )}
              </View>
            </View>
            <Text style={[styles.label, isFocused && styles.labelActive]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

// ─── Navigator ───────────────────────────────────────────────────────────────
const MarketplaceTabNavigator = () => (
  <Tab.Navigator
    initialRouteName="MktShop"
    tabBar={(props) => <MarketplaceTabBar {...props} />}
    screenOptions={{ headerShown: false }}
  >
    <Tab.Screen name="MktShop"   component={MarketplaceScreen} />
    <Tab.Screen name="MktCart"   component={CartScreen} />
    <Tab.Screen name="MktOrders" component={MarketplaceOrdersScreen} />
    <Tab.Screen name="MktSell"   component={MyListingsScreen} />
  </Tab.Navigator>
);

// ─── Styles ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  tabBar: {
    flexDirection: 'row',
    backgroundColor: Colors.white,
    borderTopWidth: 1,
    borderTopColor: Colors.neutral190,
    paddingTop: 6,
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 12,
  },

  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },

  iconWrap: {
    padding: 5,
    borderRadius: 10,
  },

  iconWrapActive: {
    backgroundColor: Colors.primary + '22',
  },

  label: {
    fontSize: 10,
    marginTop: 1,
    color: MUTED,
    fontFamily: AppDetails.fontFamily.redex.medium,
  },

  labelActive: {
    color: BRAND,
  },

  badge: {
    position: 'absolute',
    top: -4,
    right: -7,
    minWidth: 15,
    height: 15,
    borderRadius: 8,
    backgroundColor: Colors.coral,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
    borderWidth: 1.5,
    borderColor: Colors.white,
  },

  badgeText: {
    color: Colors.white,
    fontSize: 8.5,
    fontWeight: '900',
  },
});

export default MarketplaceTabNavigator;
