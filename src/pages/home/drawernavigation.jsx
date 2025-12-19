import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Image,
  Animated,
  Dimensions,
  TouchableWithoutFeedback,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AppDetails from '../../service/appdetails';

const { width: screenWidth } = Dimensions.get('window');

const DrawerNavigation = ({ isVisible, onClose }) => {
  const drawerAnim = useRef(new Animated.Value(-screenWidth * 0.7)).current;
  const [drawerColors, setDrawerColors] = useState([]);

  useEffect(() => {
    // Generate random colors for drawer items
    const colors = Array.from({length: 6}, () => '#' + Math.floor(Math.random()*16777215).toString(16).padStart(6, '0'));
    setDrawerColors(colors);
  }, []);

  useEffect(() => {
    if (isVisible) {
      Animated.timing(drawerAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();

      console.log("I started")
    } else {
      Animated.timing(drawerAnim, {
        toValue: -screenWidth * 0.7,
        duration: 800,
        useNativeDriver: true,
      }).start();
    }
  }, [isVisible]);

  return (
    <Modal
      animationType="none"
      transparent={true}
      visible={isVisible}
      onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
          <View style={styles.drawerOverlay}>
              <Animated.View
                  style={[
                      styles.drawerContainer,
                      { transform: [{ translateX: drawerAnim }] },
                  ]}
              >
                  {drawerColors.map((color, index) => {
                      if (index === 0) {
                          return (
                              <View
                                  key={index}
                                  style={{
                                      height: 80,
                                      borderWidth: 1,
                                      borderColor: 'lightgray',
                                      margin: 10,
                                      borderRadius: 5,
                                      flexDirection: 'row',
                                      alignItems: 'center',
                                      paddingHorizontal: 10,
                                      justifyContent: 'space-between'
                                  }}
                              >
                                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                      <Image
                                          source={require('../../assl.js/logo.png')}
                                          style={{ height: 50, width: 50, borderRadius: 25, marginRight: 10 }}
                                      />
                                      <View>
                                          <Text style={{ fontWeight: 'bold', fontSize: 16 }}>Username</Text>
                                          <Text style={{ color: 'gray' }}>@username</Text>
                                      </View>
                                  </View>
                                  <Ionicons name="checkmark-circle" size={24} color={AppDetails.primaryColor} />
                              </View>
                          )
                      }
                      return (
                          <View
                              key={index}
                              style={{
                                  height: 60,
                                  borderWidth: 1,
                                  borderColor: 'lightgray',
                                  margin: 10,
                                  borderRadius: 5,
                              }}
                          />
                      )
                  })}
              </Animated.View>
          </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  drawerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  drawerContainer: {
    width: '70%',
    height: '100%',
    backgroundColor: 'white',
    paddingTop: 0,
  },
});

export default DrawerNavigation;
