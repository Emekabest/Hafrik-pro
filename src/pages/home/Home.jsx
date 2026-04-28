import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import {
  View,
  StyleSheet,
  Dimensions,
  StatusBar,
  TouchableOpacity,
  Animated,
  Modal,
  Text,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { PanGestureHandler, State } from 'react-native-gesture-handler';
import { useIsFocused } from '@react-navigation/native';
import DrawerNavigation from './drawernavigation.jsx';
import AppHeader from '../../pages/AppHeader.jsx';
import FeedTabBar, { ContentFilterBar, FEED_TABS } from './FeedTabBar.jsx';
import UnifiedFeedScreen from './UnifiedFeedScreen.jsx';
import { HafrikTVContent } from '../tv/HafrikTVScreen.jsx';
import SearchModal from '../search/searchmodal.jsx';
import useStore from '../../repository/store.js';
import SearchScreen from '../search/searchscreen.jsx';
import AppDetails from '../../helpers/appdetails.js';
import { getProfileAvatarController } from '../../controllers/profilecontroller.js';
import { useAuth } from '../../AuthContext.js';
import { useLiveCounts } from '../../hooks/useLiveCounts.js';
import { Colors } from '../../theme/colors';

const BRAND = Colors.primaryDark;
const WHITE = Colors.white;

const HomePage = ({ route, navigation }) => {
  const { height } = Dimensions.get("window");
  const { token } = useAuth();
  const isFocused = useIsFocused();

  const tabletMode         = useStore((state) => state.tabletMode);
  const tabletDimension    = useStore((state) => state.tabletDimension);
  const openComposer       = useStore((state) => state.openComposer);
  const openCreateMenu     = useStore((state) => state.openCreateMenu);
  const showWelcomeModal   = useStore((state) => state.showWelcomeModal);
  const setShowWelcomeModal = useStore((state) => state.setShowWelcomeModal);
  const feedDoubleTap      = useStore((state) => state.tabRefreshSignals?.Feed ?? 0);
  const triggerRefresh     = useStore((state) => state.triggerRefresh);

  // Double-tap on Feed tab → refresh active feed
  const prevFeedDoubleTap = useRef(feedDoubleTap);
  useEffect(() => {
    if (feedDoubleTap === prevFeedDoubleTap.current) return;
    prevFeedDoubleTap.current = feedDoubleTap;
    triggerRefresh();
  }, [feedDoubleTap, triggerRefresh]);

  const homeViewHeight = height - (AppDetails.headerHeight + AppDetails.mainTabNavigatorHeight + (tabletMode ? StatusBar.currentHeight : 0));

  const [isDrawerVisible, setIsDrawerVisible] = useState(false);
  const [activeTab,       setActiveTab]       = useState(0); // 0 = For You
  const [contentFilter,   setContentFilter]   = useState('');

  useEffect(() => {
    const tabKey = route?.params?.initialTabKey;
    if (!tabKey) return;
    const idx = FEED_TABS.findIndex((tab) => tab.key === tabKey);
    if (idx >= 0) {
      setActiveTab(idx);
      setContentFilter('');
    }
    navigation?.setParams?.({ initialTabKey: undefined });
  }, [route?.params?.initialTabKey, navigation]);

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

  // Reset content filter when switching primary tabs
  const handleTabChange = useCallback((index) => {
    setActiveTab(index);
    setContentFilter('');
  }, []);

  // ── Swipe-to-switch tabs ───────────────────────────────────────────────────
  const swipeX = useRef(new Animated.Value(0)).current;
  const maxTabIndex = FEED_TABS.length - 1;

  const handleScreenSwipe = Animated.event(
    [{ nativeEvent: { translationX: swipeX } }],
    { useNativeDriver: true },
  );

  const handleScreenSwipeEnd = useCallback((event) => {
    const { translationX, velocityX, state } = event.nativeEvent;
    if (state === State.END || state === State.FAILED || state === State.CANCELLED) {
      const swipe = translationX + velocityX * 0.1;
      // Skip nav-only tabs (e.g. TV) when swiping
      const nextIndex = swipe < -60 ? activeTab + 1 : swipe > 60 ? activeTab - 1 : activeTab;
      if (nextIndex !== activeTab && nextIndex >= 0 && nextIndex <= maxTabIndex) {
        handleTabChange(nextIndex);
      }
      Animated.spring(swipeX, {
        toValue: 0,
        useNativeDriver: true,
        tension: 200,
        friction: 20,
      }).start();
    }
  }, [activeTab, swipeX, maxTabIndex, handleTabChange]);

  const handleFeedLayout = useCallback((e) => {
    const w = e.nativeEvent.layout.width;
    if (w > 0 && w !== feedWidthRef.current) {
      feedWidthRef.current = w;
      setFeedWidth(w);
    }
  }, [setFeedWidth]);

  const currentTabConfig = FEED_TABS[activeTab];
  const showContentFilter = true;

  const homeItem = () => (
    <>
      {isSearchResultsVisible ? (
        <SearchScreen />
      ) : (
        <>
          {/* ── Primary Tab Bar ── */}
          <FeedTabBar
            activeIndex={activeTab}
            onTabChange={handleTabChange}
          />

          {/* ── Secondary Content Filter Pills (hidden on TV tab) ── */}
          {showContentFilter && !currentTabConfig.isTV && (
            <ContentFilterBar
              activeFilter={contentFilter}
              onFilterChange={setContentFilter}
            />
          )}

          {/* ── Feed Content ── */}
          {currentTabConfig.isTV ? (
            <View style={styles.screenArea}>
              <HafrikTVContent />
            </View>
          ) : (
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
                <UnifiedFeedScreen
                  key={currentTabConfig.key}
                  tabConfig={currentTabConfig}
                  contentFilter={contentFilter}
                  feedWidth={feedWidthRef.current}
                />
              </Animated.View>
            </PanGestureHandler>
          )}
        </>
      )}
      <DrawerNavigation isVisible={isDrawerVisible} onClose={closeDrawer} />
      {isSearchVisible && <SearchModal />}
    </>
  );

  return (
    <View style={styles.container}>
      <AppHeader onOpenDrawer={openDrawer} />

      {tabletMode ? (
        <View style={[styles.homeContainer, { height: homeViewHeight, flexDirection: 'row' }]}>
          <View style={{ width: tabletDimension === 'XL' ? '20%' : tabletDimension === 'L' ? '10%' : '20%', height: '100%', backgroundColor: Colors.neutral150 }} />
          <View onLayout={handleFeedLayout} style={{ width: tabletDimension === 'XL' ? '60%' : tabletDimension === 'L' ? '80%' : '60%', height: '100%', backgroundColor: Colors.white }}>
            {homeItem()}
          </View>
          <View style={{ width: tabletDimension === 'XL' ? '20%' : tabletDimension === 'L' ? '10%' : '20%', height: '100%', backgroundColor: Colors.neutral150 }} />
        </View>
      ) : (
        <View style={[styles.homeContainer, { height: homeViewHeight }]}>
          {homeItem()}
        </View>
      )}

      {/* FAB removed — composer accessible via daily prompt card */}

      {/* PostComposerModal and CreateMenuSheet are now mounted globally in App.js */}

      {/* ── Welcome modal (shown once after new registration) ── */}
      <Modal
        visible={showWelcomeModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowWelcomeModal(false)}
        statusBarTranslucent
      >
        <View style={welcome.overlay}>
          <View style={welcome.card}>
            {/* Globe pill */}
            <View style={welcome.globePill}>
              <Text style={welcome.globe}>🌍</Text>
            </View>

            <Text style={welcome.heading}>Welcome to Hafrik</Text>
            <Text style={welcome.sub}>
              Connect with Africans and foreigners around the world.
            </Text>
            <Text style={welcome.body}>
              Join communities, discover businesses, and share your experience.
            </Text>

            {/* Feature pills */}
            <View style={welcome.pillRow}>
              {[
                { emoji: '👥', label: 'Communities' },
                { emoji: '🏪', label: 'Businesses' },
                { emoji: '✍️', label: 'Share & Post' },
              ].map(({ emoji, label }) => (
                <View key={label} style={welcome.pill}>
                  <Text style={welcome.pillEmoji}>{emoji}</Text>
                  <Text style={welcome.pillLabel}>{label}</Text>
                </View>
              ))}
            </View>

            <TouchableOpacity
              style={welcome.cta}
              activeOpacity={0.88}
              onPress={() => setShowWelcomeModal(false)}
            >
              <Text style={welcome.ctaText}>Explore Hafrik</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.white,
  },
  homeContainer: { width: '100%' },
  screenArea: { flex: 1 },

  // FAB
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    shadowColor: BRAND,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.38,
    shadowRadius: 14,
    elevation: 10,
    zIndex: 100,
  },

});

// ─── Welcome modal styles ─────────────────────────────────────────────────────
const welcome = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: Colors.black + 'AA',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  card: {
    width: '100%',
    backgroundColor: Colors.white,
    borderRadius: 28,
    paddingHorizontal: 28,
    paddingTop: 32,
    paddingBottom: 28,
    alignItems: 'center',
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.18,
    shadowRadius: 24,
    elevation: 16,
  },
  globePill: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: Colors.primaryDark + '18',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
  },
  globe: { fontSize: 38 },
  heading: {
    fontSize: 24,
    fontWeight: '900',
    color: Colors.primaryDark,
    fontFamily: 'ReadexPro-Bold',
    textAlign: 'center',
    marginBottom: 10,
    letterSpacing: -0.4,
  },
  sub: {
    fontSize: 15,
    color: Colors.black,
    fontWeight: '600',
    fontFamily: 'ReadexPro-Medium',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 8,
  },
  body: {
    fontSize: 13,
    color: Colors.secondaryText,
    fontFamily: 'ReadexPro-Regular',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 22,
  },
  pillRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 26,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: Colors.surfaceTint,
    borderRadius: 100,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  pillEmoji: { fontSize: 14 },
  pillLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.primaryDark,
    fontFamily: 'ReadexPro-Bold',
  },
  cta: {
    width: '100%',
    backgroundColor: Colors.primaryDark,
    borderRadius: 100,
    paddingVertical: 16,
    alignItems: 'center',
  },
  ctaText: {
    fontSize: 15,
    fontWeight: '800',
    color: Colors.white,
    fontFamily: 'ReadexPro-Bold',
    letterSpacing: 0.2,
  },
});

export default HomePage;
