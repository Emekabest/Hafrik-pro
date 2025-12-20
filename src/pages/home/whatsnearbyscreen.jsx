import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Header from '../../pages/header.jsx';
import QuickActions from './quickactions.jsx';
import DrawerNavigation from './drawernavigation.jsx';

const WhatsNearbyScreen = () => {
  const [isDrawerVisible, setIsDrawerVisible] = useState(false);

  const openDrawer = useCallback(() => setIsDrawerVisible(true), []);
  const closeDrawer = useCallback(() => setIsDrawerVisible(false), []);

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right', 'bottom']}>
      <Header onOpenDrawer={openDrawer} />
      <QuickActions currentScreen="WhatsNearby" />
      <DrawerNavigation isVisible={isDrawerVisible} onClose={closeDrawer} />
      <View style={styles.content}>
        <Text>Hello world</Text>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default WhatsNearbyScreen;