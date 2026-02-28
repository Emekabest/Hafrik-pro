import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Dimensions,
  StatusBar,
  TouchableOpacity,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { PanGestureHandler, State } from 'react-native-gesture-handler';
import DrawerNavigation from './drawernavigation.jsx';
import AppHeader from '../../pages/AppHeader.jsx';
import QuickActions from './quickactions.jsx';
import RecentUpdatesScreen from './recentupdatescreen.jsx';
import WhatsNearbyScreen from './whatsnearbyscreen.jsx';
import TrendingOnHafrikScreen from './trendingonhafrikscreen.jsx';
import SearchModal from '../search/searchmodal.jsx';
import useStore from '../../repository/store.js';
import SearchScreen from '../search/searchscreen.jsx';
import PostComposerModal from './PostComposerModal.jsx';
import AppDetails from '../../helpers/appdetails.js';
import { getProfileAvatarController } from '../../controllers/profilecontroller.js';
import { useAuth } from '../../AuthContext.js';
import { useLiveCounts } from '../../hooks/useLiveCounts.js';

const BRAND = '#0C3F44';

const HomePage = () => {
  const { height } = Dimensions.get("window");
  const { token } = useAuth();

  const tabletMode      = useStore((state) => state.tabletMode);
  const tabletDimension = useStore((state) => state.tabletDimension);
  const openComposer    = useStore((state) => state.openComposer);

  const homeViewHeight = height - (AppDetails.headerHeight + AppDetails.mainTabNavigatorHeight + (tabletMode ? StatusBar.currentHeight : 0));

  const [isDrawerVisible, setIsDrawerVisible] = useState(false);
  const [activeTab, setActiveTab] = useState(2);

  const isSearchVisible        = useStore((state) => state.isSearchVisible);
  const isSearchResultsVisible = useStore((state) => state.isSearchResultsVisible);
  const setFeedWidth           = useStore((state) => state.setFeedWidth);
  const setUserAvatar          = useStore((state) => state.setUserAvatar);

  const feedWidthRef = useRef(0);

  // Live notification + message counts
  useLiveCounts();

  useEffect(() => {
    const getUserAvatar = async () => {
      const response = await getProfileAvatarController(token);
      if (response.status === 200 && response.data) {
        setUserAvatar(response.data.avatar);
      }
    };
    getUserAvatar();
  }, [token]);

  const openDrawer  = useCallback(() => setIsDrawerVisible(true),  []);
  const closeDrawer = useCallback(() => setIsDrawerVisible(false), []);

  // ── Swipe-to-switch tabs ───────────────────────────────────────────────────
  const swipeX = useRef(new Animated.Value(0)).current;

  const handleScreenSwipe = Animated.event(
    [{ nativeEvent: { translationX: swipeX } }],
    { useNativeDriver: true },
  );

  const handleScreenSwipeEnd = useCallback((event) => {
    const { translationX, velocityX, state } = event.nativeEvent;
    if (state === State.END || state === State.FAILED || state === State.CANCELLED) {
      const swipe = translationX + velocityX * 0.1;
      if (swipe < -60 && activeTab < 2) {
        setActiveTab(prev => prev + 1);
      } else if (swipe > 60 && activeTab > 0) {
        setActiveTab(prev => prev - 1);
      }
      Animated.spring(swipeX, {
        toValue: 0,
        useNativeDriver: true,
        tension: 200,
        friction: 20,
      }).start();
    }
  }, [activeTab, swipeX]); // eslint-disable-line);

  const handleFeedLayout = useCallback((e) => {
    const w = e.nativeEvent.layout.width;
    if (w > 0 && w !== feedWidthRef.current) {
      feedWidthRef.current = w;
      setFeedWidth(w);
    }
  }, [setFeedWidth]);

  const homeItem = () => (
    <>
      {isSearchResultsVisible ? (
        <SearchScreen />
      ) : (
        <>
          <QuickActions activeTab={activeTab} onTabChange={setActiveTab} />
          <PanGestureHandler
            onGestureEvent={handleScreenSwipe}
            onHandlerStateChange={handleScreenSwipeEnd}
            activeOffsetX={[-15, 15]}
            failOffsetY={[-20, 20]}
          >
            <Animated.View
              style={[
                styles.screenArea,
                { transform: [{ translateX: swipeX }] },
              ]}
            >
              {activeTab === 0 && <WhatsNearbyScreen />}
              {activeTab === 1 && <TrendingOnHafrikScreen />}
              {activeTab === 2 && <RecentUpdatesScreen feedWidth={feedWidthRef.current} />}
            </Animated.View>
          </PanGestureHandler>
        </>
      )}
      <DrawerNavigation isVisible={isDrawerVisible} onClose={closeDrawer} />
      {isSearchVisible && <SearchModal />}
    </>
  );

  return (
    // View (not SafeAreaView) — Header handles top inset via useSafeAreaInsets internally
    <View style={styles.container}>
      <AppHeader onOpenDrawer={openDrawer} />

      {tabletMode ? (
        <View style={[styles.homeContainer, { height: homeViewHeight, flexDirection: 'row' }]}>
          <View style={{ width: tabletDimension === 'XL' ? '20%' : tabletDimension === 'L' ? '10%' : '20%', height: '100%', backgroundColor: '#f0f0f0' }} />
          <View onLayout={handleFeedLayout} style={{ width: tabletDimension === 'XL' ? '60%' : tabletDimension === 'L' ? '80%' : '60%', height: '100%', backgroundColor: '#fff' }}>
            {homeItem()}
          </View>
          <View style={{ width: tabletDimension === 'XL' ? '20%' : tabletDimension === 'L' ? '10%' : '20%', height: '100%', backgroundColor: '#f0f0f0' }} />
        </View>
      ) : (
        <View style={[styles.homeContainer, { height: homeViewHeight }]}>
          {homeItem()}
        </View>
      )}

      {/* FAB — compose new post */}
      <TouchableOpacity
        style={styles.fab}
        activeOpacity={0.88}
        onPress={() => openComposer()}
      >
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>

      <PostComposerModal />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  homeContainer: { width: '100%' },
  screenArea: { flex: 1 },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: BRAND,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: BRAND,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 10,
    zIndex: 100,
  },
});

export default HomePage;
