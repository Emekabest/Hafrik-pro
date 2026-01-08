import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
} from 'react-native';
import DrawerNavigation from './drawernavigation.jsx';
import Header from '../../pages/header.jsx';
import QuickActions from './quickactions.jsx';
import RecentUpdatesScreen from './recentupdatescreen.jsx';
import WhatsNearbyScreen from './whatsnearbyscreen.jsx';
import TrendingOnHafrikScreen from './trendingonhafrikscreen.jsx';
import SearchModal from '../search/searchmodal.jsx';
import useStore from '../../repository/store.js';
import SearchScreen from '../search/searchscreen.jsx';



const HomePage = () => {
  const [isDrawerVisible, setIsDrawerVisible] = useState(false);
  const [activeTab, setActiveTab] = useState(2);
  
  const isSearchVisible = useStore((state) => state.isSearchVisible);
  const isSearchResultsVisible = useStore((state) => state.isSearchResultsVisible);

  const openDrawer = useCallback(() => {
    setIsDrawerVisible(true);
  }, []);

  const closeDrawer = useCallback(() => {
    setIsDrawerVisible(false);
  }, []);

  
  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right', 'bottom']} >

      <Header onOpenDrawer={openDrawer} />

      {isSearchResultsVisible ? (
        <SearchScreen />
      ) : (
        <>
          <QuickActions activeTab={activeTab} onTabChange={setActiveTab} />

          {activeTab === 0 && <WhatsNearbyScreen />}
          {activeTab === 1 && (
            <TrendingOnHafrikScreen />
          )}
          {activeTab === 2 && <RecentUpdatesScreen />}
        </>
      )}

      <DrawerNavigation isVisible={isDrawerVisible} onClose={closeDrawer} />
      {isSearchVisible && <SearchModal />}
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