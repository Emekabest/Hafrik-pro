// src/navigation/MainTabNavigator.js
import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';

// Import your screens
import HomePage from '../pages/home/Home'; // Make sure this is the correct path
import Reels from '../pages/reels/reels';
import Reels2 from '../pages/reels/reels2';
import Profile from '../pages/Profile';
import CreateReels from '../pages/createreels/createreelscreen'; // Add this import

import { useSafeAreaInsets } from 'react-native-safe-area-context';

const Tab = createBottomTabNavigator();


// Custom Tab Bar Component
const CustomTabBar = ({ state, descriptors, navigation }) => {

  const { bottom } = useSafeAreaInsets();

  const focusedOptions = descriptors[state.routes[state.index].key].options;

  if (focusedOptions.tabBarStyle?.display === 'none') {
    return null;
  }
  

  return (
    <View style={[styles.tabBarContainer, {paddingBottom: bottom}]}>
      {state.routes.map((route, index) => {
        const { options } = descriptors[route.key];
        const isFocused = state.index === index;

        const onPress = async () => {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });

          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name);
          }
        };

        const onLongPress = () => {
          navigation.emit({
            type: 'tabLongPress',
            target: route.key,
          });
        };

        let iconName;
        let label;

        if (route.name === 'Home') {
          iconName = isFocused ? 'home' : 'home-outline';
          label = 'Home';
        } else if (route.name === 'Reels') {
          iconName = isFocused ? 'play-circle' : 'play-circle-outline';
          label = 'Reels';
        } else if (route.name === 'CreatePost') {
          iconName = isFocused ? 'add-circle' : 'add-circle-outline';
          label = 'Create';
        } else if (route.name === 'Profile') {
          iconName = isFocused ? 'person' : 'person-outline';
          label = 'Profile';
        }

        return (
          <TouchableOpacity
            key={route.key}
            accessibilityRole="button"
            accessibilityState={isFocused ? { selected: true } : {}}
            accessibilityLabel={options.tabBarAccessibilityLabel}
            testID={options.tabBarTestID}
            onPress={onPress}
            onLongPress={onLongPress}
            style={styles.tabItem}
            activeOpacity={1}
          >
            <View style={styles.iconContainer}>
              <Ionicons
                name={iconName}
                size={route.name === 'CreatePost' ? 28 : 24} // Slightly larger for CreatePost
                color={isFocused ? '#0C3F44' : '#757575'}
              />

            </View>
            <Text style={[
              styles.tabLabel,
              { color: isFocused ? '#0C3F44' : '#757575' }
            ]}>
              {label}
            </Text>
          </TouchableOpacity>
          
        );
      })}
    </View>
  );
};

const MainTabNavigator = () => {
  
  return (
    <Tab.Navigator
      initialRouteName="Home"
      tabBar={props => <CustomTabBar {...props} />}
      screenOptions={{
        headerShown: false,
      }}
    >
      <Tab.Screen 
        name="Home" 
        component={HomePage}
        options={{
          tabBarLabel: 'Home',
        }}
      />
      
      <Tab.Screen 
        name="Reels" 
        component={Reels2}
        options={{
          tabBarLabel: 'Reels',
        }}
      />
      
      <Tab.Screen 
        name="CreatePost" 
        component={CreateReels}
        options={{
          tabBarLabel: 'Create',
        }}
      />
      
      <Tab.Screen 
        name="Profile" 
        component={Profile}
        options={{
          tabBarLabel: 'Profile',
        }}
      />
    </Tab.Navigator>
  );
};

const styles = StyleSheet.create({
  tabBarContainer: {
    flexDirection: 'row',
    height: 60,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#E5E5E5',
    backgroundColor: '#ffffff',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 24,
    marginBottom: 4,
  },
  tabLabel: {
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: 14,
    fontFamily:"ReadexPro_500Medium",
    includeFontPadding: false,
  },
});

export default MainTabNavigator;