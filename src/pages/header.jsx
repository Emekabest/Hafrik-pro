import React from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Image,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AppDetails from '../helpers/appdetails';
import { useAuth } from '../AuthContext';
import useStore from '../repository/store';


const { width: screenWidth } = Dimensions.get('window');

const Header = ({ onOpenDrawer }) => {
  const setSearchVisible = useStore((state) => state.setSearchVisible);

    const { user, token, loading } = useAuth();

    

  return (
    <View style={styles.header}>
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
            <TouchableOpacity onPress={() => setSearchVisible(true)} style={styles.headerSearch} activeOpacity={1}>
              <Ionicons name="search" size={28} color={AppDetails.primaryColor} />
            </TouchableOpacity>
          </View>
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