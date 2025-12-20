import React, { useState, useCallback } from 'react';
import {
  StyleSheet,
  SafeAreaView,
} from 'react-native';
import DrawerNavigation from './drawernavigation.jsx';
import Header from '../../pages/header.jsx';
import QuickActions from './quickactions.jsx';
import RecentUpdatesScreen from './recentupdatescreen.jsx';

const HomePage = () => {
  const [isDrawerVisible, setIsDrawerVisible] = useState(false);

  const openDrawer = useCallback(() => {
    setIsDrawerVisible(true);
  }, []);

  const closeDrawer = useCallback(() => {
    setIsDrawerVisible(false);
  }, []);

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right', 'bottom']} >

      <Header onOpenDrawer={openDrawer} />

      <QuickActions />

      <DrawerNavigation isVisible={isDrawerVisible} onClose={closeDrawer} />

      <RecentUpdatesScreen />
    </SafeAreaView>
  );
};


const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    height: 20,

  }
});

export default HomePage;