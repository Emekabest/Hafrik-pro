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
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AppDetails from '../../service/appdetails';

const { width: screenWidth } = Dimensions.get('window');

const DrawerNavigation = ({ isVisible, onClose }) => {
  const drawerAnim = useRef(new Animated.Value(-screenWidth * 0.7)).current;
  const [drawerColors, setDrawerColors] = useState([]);
  const [showModal, setShowModal] = useState(false); // Internal state for Modal visibility

  useEffect(() => {
    // Generate random colors for drawer items
    const colors = Array.from({length: 6}, () => '#' + Math.floor(Math.random()*16777215).toString(16).padStart(6, '0'));
    setDrawerColors(colors);
    console.log('drawerColors generated:', colors); // Debug log
  }, []); // <--- This useEffect is for drawerColors

  useEffect(() => {
    console.log('AppDetails:', AppDetails); // Debug log
    if (isVisible) {
      setShowModal(true); // Show modal immediately for opening
      Animated.timing(drawerAnim, {
        toValue: 0,
        duration: 100,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(drawerAnim, {
        toValue: -screenWidth * 0.7,
        duration: 100,
        useNativeDriver: true,
      }).start(() => {
        setShowModal(false); // Hide modal after closing animation completes
        onClose(); // Notify parent only after fully closed
      });
    }
  }, [isVisible, onClose]);

  return (
    <Modal
      animationType="none"
      transparent={true}
      visible={showModal}
      onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
          <View style={styles.drawerOverlay}>
              <Animated.View
                  style={[
                      styles.drawerContainer,
                      { transform: [{ translateX: drawerAnim }] },
                  ]}
              >
                <ScrollView style={{ flex: 1, paddingTop: 10 }}>
                  {drawerColors.map((color, index) => {
                      if (index === 0) {
                          return (
                              <View
                                  key={index}
                                  style={{
                                      height: 80,
                                      borderWidth: 1,
                                      borderColor: 'lightgray',
                                      marginHorizontal: 10,
                                      marginBottom: 10,
                                      borderRadius: 5,
                                      flexDirection: 'row',
                                      alignItems: 'center',
                                      paddingHorizontal: 10,
                                      justifyContent: 'space-between',
                                      backgroundColor: '#f9f9f9', // Added background color
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
                                  <Ionicons name="checkmark-circle" size={24} color={AppDetails.primaryColor || '#0C3F44'} />
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
                                  marginHorizontal: 10,
                                  marginBottom: 10,
                                  borderRadius: 5,
                                  backgroundColor: '#f9f9f9', // Added background color
                                  justifyContent: 'center', // Center content vertically
                                  paddingLeft: 15, // Add some padding
                              }}
                          >
                              <Text style={{ color: '#333' }}>Menu Item {index}</Text>
                          </View>
                      )
                  })}
                </ScrollView>
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
