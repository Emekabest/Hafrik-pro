import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  TextInput,
  Animated,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AppDetails from '../helpers/appdetails';
import { useAuth } from '../AuthContext';


const { width: screenWidth } = Dimensions.get('window');

const Header = ({ onOpenDrawer }) => {
  const [isSearchVisible, setIsSearchVisible] = useState(false);
  const searchBarAnim = useRef(new Animated.Value(0)).current;

    const { user, token, loading } = useAuth();

  useEffect(() => {
    if (isSearchVisible) {
      Animated.timing(searchBarAnim, {
        toValue: 1,
        duration: 75,
        useNativeDriver: false, // width animation not supported by native driver
      }).start();
    } else {
      searchBarAnim.setValue(0);
    }
  }, [isSearchVisible]);

  const closeButtonWidth = 40; // Approx width for the close button area
  const headerPadding = 20; // 10 on each side
  const searchBarFinalWidth = screenWidth - headerPadding - closeButtonWidth;

  const animatedWidth = searchBarAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [searchBarFinalWidth * 0.4, searchBarFinalWidth],
  });



    

  return (
    <View style={styles.header}>
      {isSearchVisible ? (
        <View style={styles.headerSearchContainer}>
          <Animated.View style={[styles.searchInputWrapper, { width: animatedWidth }]}>
            <Ionicons name="search" size={20} color="#999" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search"
              placeholderTextColor="#999"
              autoFocus={true}
            />
          </Animated.View>
          <TouchableOpacity onPress={() => setIsSearchVisible(false)} style={styles.headerSearch} activeOpacity={1}>
            <Ionicons name="close" size={28} color={AppDetails.primaryColor} />
          </TouchableOpacity>
        </View>
      ) : (
        <>
          <View style={styles.headerLeft}>
            <TouchableOpacity style={styles.leftIcon} activeOpacity={1} onPress={onOpenDrawer}>
              <Image
                source={{uri: user.avatar}}
                style={{ height: "100%", width: "100%" }}
                resizeMode="cover"
              />
            </TouchableOpacity>
          </View>

          <View style={styles.headerMiddle}>
            <View style={styles.logoContainer}>
              <Image
                source={require('../assl.js/logoTop.png')}
                style={styles.logo}
                resizeMode="contain"
              />
            </View>
          </View>

          <View style={styles.headerRight}>
            <TouchableOpacity onPress={() => setIsSearchVisible(true)} style={styles.headerSearch} activeOpacity={1}>
              <Ionicons name="search" size={28} color={AppDetails.primaryColor} />
            </TouchableOpacity>
          </View>
        </>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: 'center',
    justifyContent: "space-between",
    paddingHorizontal: 10,
    height: 50,
    width: "100%",
  },
  headerLeft: {
    height: "100%",
    width: "25%",
    justifyContent: "center",
  },
  headerMiddle: {
    height: "100%",
    width: "50%",
  },
  headerRight: {
    height: "100%",
    width: "25%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
  },
  leftIcon: {
    height: 35,
    width: 35,
    borderRadius: 50,
    overflow: "hidden"
  },
  logoContainer: {
    height: "100%",
    width: "100%",
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
  },
  logo: {
    width: 105,
    height: 35,
  },
  headerSearchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    justifyContent: 'flex-end',
  },
  searchInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#edededff',
    borderRadius: 50,
    height: 35,
    paddingHorizontal: 10,
  },
  searchInput: {
    flex: 1,
    height: 35,
    marginLeft: 5,
    fontSize: 14,
    color: '#333',
    paddingVertical: 0,
    textAlignVertical: 'center',
  },
  headerSearch: {
    marginLeft: 10,
  },
});

export default Header;