// App.js
// import { StatusBar } from 'expo-status-bar';
import { AppState, StyleSheet, View, Platform, Dimensions, Animated } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator, CardStyleInterpolators } from '@react-navigation/stack';
import Login from './src/pages/Login';
import ForgotPasswordScreen from './src/pages/ForgotPasswordScreen.jsx';
import ResetPasswordScreen from './src/pages/ResetPasswordScreen.jsx';
import VerifyResetScreen from './src/pages/VerifyResetScreen.jsx';
import ChangePasswordScreen from './src/pages/ChangePasswordScreen.jsx';
import MainTabNavigator from './src/csslx.js/MainTabNavigator';
import { AuthProvider, useAuth } from './src/AuthContext';
import { ThemeProvider } from './src/theme/ThemeContext';
import UniversalWebView from './src/pages/common/UniversalWebView';
import CategoriesScreen from './src/pages/CategoriesScreen';
import EventsScreen from './src/pages/EventsScreen';
import GroupsScreen from './src/pages/GroupsScreen';
import { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { SafeAreaView, SafeAreaProvider } from 'react-native-safe-area-context';
import AppDetails from './src/helpers/appdetails';
import WhatsNearbyScreen from './src/pages/home/whatsnearbyscreen';
import CommentScreen from './src/pages/home/feeds/comments/commentscreen';
import useSharedStore from './src/repository/store';
import { useFonts } from 'expo-font';
import { WorkSans_300Light, WorkSans_400Regular, WorkSans_500Medium, WorkSans_600SemiBold, WorkSans_700Bold, WorkSans_800ExtraBold} from '@expo-google-fonts/work-sans';
import { ReadexPro_200ExtraLight,  ReadexPro_300Light, ReadexPro_400Regular, ReadexPro_500Medium, ReadexPro_600SemiBold, ReadexPro_700Bold, } from "@expo-google-fonts/readex-pro"
import { ShadowsIntoLight_400Regular } from '@expo-google-fonts/shadows-into-light';
import { Inter_300Light, Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold, Inter_400Regular_Italic, Inter_500Medium_Italic, Inter_600SemiBold_Italic } from '@expo-google-fonts/inter';
import { Outfit_400Regular, Outfit_500Medium, Outfit_600SemiBold  } from "@expo-google-fonts/outfit";
import GroupDetails from "./src/pages/groups/GroupDetails";
import GuideScreen from './src/pages/GuideScreen';
import JobsScreen from './src/pages/JobsScreen';
import MarketplaceScreen from './src/pages/marketplace/index';
import ProductDetailScreen from './src/pages/marketplace/ProductDetailScreen';
import CreateListingScreen from './src/pages/marketplace/CreateListingScreen';
// MarketplaceWebviewScreen replaced by UniversalWebView
import MyListingsScreen from './src/pages/marketplace/MyListingsScreen';
import ArticlesScreen from './src/pages/blogs/ArticlesScreen';
import ArticleDetailsScreen from './src/pages/blogs/ArticleDetailsScreen';
import EventDetailScreen from './src/pages/events/EventDetailScreen';

import VideoManager from './src/helpers/videomanager';
import ReelsManager from './src/helpers/reelsmanager';
import VideoPreloader from './src/helpers/VideoPreloader';
import GlobalUploadBanner from './src/components/GlobalUploadBanner';
import Toast from './src/components/Toast';
import GroupScreen from './src/pages/groups/groupscreen';
import { GlobalVideoPlayerProvider } from './src/helpers/GlobalVideoPlayerContext';
import ProfileScreen from './src/pages/profile/profilescreen';
import PagesScreen from './src/pages/pages_/pagesscreen';
import BusinessDetails from "./src/pages/pages_/BusinessDetails";
import BusinessList from './src/pages/pages_/BusinessList';
import Reels2 from './src/pages/reels/reels2';
import CreateReels from './src/pages/createreels/createreelscreen';
import UserProfileScreen from './src/pages/users/UserProfileScreen';
import NotificationsScreen from './src/pages/notifications/NotificationsScreen';
import InboxScreen from './src/pages/messages/InboxScreen';
import ThreadScreen from './src/pages/messages/ThreadScreen';
// InAppBrowser replaced by UniversalWebView
import SplashScreen from './src/pages/common/SplashScreen';
import PostDetailScreen from './src/pages/home/feeds/PostDetailScreen';
import TrendingOnHafrikScreen from './src/pages/home/trendingonhafrikscreen';
import SettingsScreen from './src/pages/settings/SettingsScreen';
import SearchScreen from './src/pages/search/searchscreen';
import EarningsScreen        from './src/pages/earnings/EarningsScreen';
import PointsScreen          from './src/pages/earnings/PointsScreen';
import WalletScreen          from './src/pages/earnings/WalletScreen';
import AffiliatesScreen      from './src/pages/earnings/AffiliatesScreen';
import SendMoneyScreen       from './src/pages/earnings/SendMoneyScreen';
import MyPagesAndGroupsScreen   from './src/pages/mypages/MyPagesAndGroupsScreen';
import JoinedCommunitiesScreen from './src/pages/communities/JoinedCommunitiesScreen';
import LikedBusinessesScreen   from './src/pages/businesses/LikedBusinessesScreen';
import ExchangeHomeScreen    from './src/pages/exchange/ExchangeHomeScreen';
import ExchangeConfirmScreen from './src/pages/exchange/ExchangeConfirmScreen';
import ExchangeHistoryScreen from './src/pages/exchange/ExchangeHistoryScreen';
import ExchangeAdminScreen   from './src/pages/exchange/ExchangeAdminScreen';
import SavedPostsScreen      from './src/pages/saved/SavedPostsScreen';
// import VerifyEmailScreen from './src/pages/onboarding/VerifyEmailScreen'; // re-enable with email verification
import UploadAvatarScreen     from './src/pages/onboarding/UploadAvatarScreen';
import FollowScreen           from './src/pages/onboarding/FollowScreen';
import SelectCountryScreen    from './src/pages/onboarding/SelectCountryScreen';
import WelcomeScreen          from './src/pages/onboarding/WelcomeScreen';
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { NotificationProvider } from './context/notificationcontext';
import { navigationRef } from './src/helpers/navigationRef';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});



const Stack = createStackNavigator();

// Create a component that handles the navigation based on auth state/........
function AppNavigator() {

  const isAppActiveRef = useRef(true);
  const isAppActive_store = useSharedStore(state => state.isAppActive);
  const setIsAppActive_store = useSharedStore(state => state.setIsAppActive);

  const setTabletMode = useSharedStore(state => state.setTabletMode);
  const setTabletDimension = useSharedStore(state => state.setTabletDimension);


    useEffect(() => {
    // registerForPushNotificationsAsync();
  }, []);



  const { width, height } = Dimensions.get("window");
  // console.log("Screen dimensions from HomePage:", width, height)//

  const TabletSize = 700; // You can adjust this threshold as needed
  const ExtraLargeTabletSize = 800; // You can adjust this threshold as needed

  
    useEffect(() => {
      const tabletMode = width > TabletSize; // You can adjust this threshold as needed../..,,.,
      setTabletMode(tabletMode);
      setTabletDimension(width > ExtraLargeTabletSize ? "XL" : width > TabletSize ? "L" : "M");
  }, [width, height, setTabletMode, setTabletDimension]);



  /**..................App State Listener..............................*/

    // Track previous app state to distinguish inactive vs background
    const prevAppStateRef = useRef('active');

    const handleAppStateChange = useCallback((nextAppState) => {
        const wasActive = prevAppStateRef.current === 'active';
        const isNowActive = nextAppState === 'active';
        const isNowBackground = nextAppState === 'background';
        const isNowInactive = nextAppState === 'inactive';

        prevAppStateRef.current = nextAppState;

        // CRITICAL: On iOS, 'inactive' fires when a notification pops up,
        // control center is opened, or during app transitions.
        // We must NOT release players for 'inactive' — only for 'background'.
        // Releasing on 'inactive' destroys players, and when the user dismisses
        // the notification the app goes back to 'active' with dead player refs → crash.

        if (isNowActive) {
            isAppActiveRef.current = true;
            setIsAppActive_store(true);
        } else if (isNowBackground) {
            isAppActiveRef.current = false;
            setIsAppActive_store(false);
        }
        // For 'inactive': do nothing — keep players alive, keep isAppActive true.
        // This prevents crashes from notification popups, control center, etc.
      }, [setIsAppActive_store]);




    useEffect(() => {

      const subscription = AppState.addEventListener('change', handleAppStateChange);
      return ()=>{

        subscription.remove()

      };

  }, [handleAppStateChange]);
  /**.........................................................................................*/




  /**Pause or any video playing in the feed */
  const isNextVideo = useSharedStore(state => state.isNextVideo);
  
  // IMPORTANT: Use the store value (isAppActive_store) as dependency, NOT isAppActiveRef.current
  // Refs don't reliably trigger useEffect - using the store value ensures this fires every time
  useEffect(() => {

    if (!isAppActive_store){
        // Release all video players to free memory when app goes to background
        // This prevents the OS from killing the app due to memory pressure
        VideoManager.releaseAll(); 
        ReelsManager.releaseAll();
        // Stop any in-flight video preloads/downloads
        VideoPreloader.clear();
        console.log("App backgrounded - released all video players to free memory");

    }
    else{
        console.log("App is restored, video players will re-register when visible");
        // Note: We don't need to manually resume here anymore
        // The video components will re-register their players when they detect
        // the player is missing from the manager, and playback will resume naturally..
    } 

    
  },[isAppActive_store])


        const [fontsLoaded, fontError] = useFonts({
          // Legacy keys (keep for existing screens)
          WorkSans_300Light,
          WorkSans_400Regular,
          WorkSans_500Medium,
          WorkSans_600SemiBold,
          WorkSans_700Bold,

          ReadexPro_300Light,
          ReadexPro_400Regular,
          ReadexPro_500Medium,
          ReadexPro_600SemiBold,
          ReadexPro_700Bold,

          Inter_300Light,
          Inter_400Regular,
          Inter_500Medium,
          Inter_600SemiBold,
          Inter_700Bold,
          Inter_400Regular_Italic,
          Inter_500Medium_Italic,
          Inter_600SemiBold_Italic,

          Outfit_400Regular,
          Outfit_500Medium,
          Outfit_600SemiBold,

          // Design-system aliases
          'ReadexPro-Regular': ReadexPro_400Regular,
          'ReadexPro-Medium': ReadexPro_500Medium,
          'ReadexPro-SemiBold': ReadexPro_600SemiBold,
          'ReadexPro-Bold': ReadexPro_700Bold,

          'WorkSans-Regular': WorkSans_400Regular,
          'WorkSans-Medium': WorkSans_500Medium,
          'WorkSans-Bold': WorkSans_700Bold,

          'ShadowsIntoLight-Regular': ShadowsIntoLight_400Regular,
      })
  
  
  
  const [isFontStored, setIsFontStored] = useState(false);
  const { user, token, loading, onboardingStep } = useAuth();

  // Start badge polling once the user is authenticated
  const startBadgePolling = useSharedStore((s) => s.startBadgePolling);
  const stopBadgePolling  = useSharedStore((s) => s.stopBadgePolling);
  useEffect(() => {
    if (token) startBadgePolling(token);
    return () => stopBadgePolling();
  }, [token]);

  // ── Animated splash fade-out ───────────────────────────────────────────────
  const SPLASHSCEEN_MIN_DURATION = 5000; // Minimum time to show splash screen (ms)
  const splashOpacity = useRef(new Animated.Value(1)).current;
  const [splashDone, setSplashDone] = useState(false);
  const [minDelayDone, setMinDelayDone] = useState(false);
  const isAppReady = useMemo(
    () => (fontsLoaded || !!fontError) && !loading && minDelayDone,
    [fontsLoaded, fontError, loading, minDelayDone],
  );
  const shouldBlockAppRender = useMemo(
    () => !fontsLoaded && !fontError,
    [fontsLoaded, fontError],
  );
  const showSplashOverlay = useMemo(() => !splashDone, [splashDone]);
  const splashNode = useMemo(
    () => <SplashScreen fadeAnim={splashOpacity} />,
    [splashOpacity],
  );
  const handleSplashFadeDone = useCallback(() => setSplashDone(true), []);

  useEffect(() => {
    const timer = setTimeout(() => setMinDelayDone(true), SPLASHSCEEN_MIN_DURATION);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (isAppReady && !splashDone) {
      Animated.timing(splashOpacity, {
        toValue: 0,
        duration: 650,
        delay: 350,
        useNativeDriver: true,
      }).start(handleSplashFadeDone);
    }
  }, [isAppReady, splashDone, splashOpacity, handleSplashFadeDone]);

  // Resume onboarding if user is logged in but hasn't completed it
  useEffect(() => {
    if (loading || !isAppReady) return;
    if (!user || !token) return;
    if (onboardingStep >= 6) return; // 6 = completed
    const routeMap = {
      2: 'OnboardingAvatar',   // registered
      3: 'OnboardingFollow',   // avatar done
      4: 'OnboardingCountry',  // followed people/pages/communities
      5: 'OnboardingWelcome',  // country selected
    };
    const screen = routeMap[onboardingStep];
    if (screen) {
      navigationRef.current?.reset({ index: 0, routes: [{ name: screen }] });
    }
  }, [isAppReady, user, token, onboardingStep, loading]);

  if (shouldBlockAppRender) {
    return splashNode;
  }

  

  return (
    <NotificationProvider>
      <View style={styles.root}>
      <NavigationContainer ref={navigationRef}>
      
        <StatusBar style="light" translucent={Platform.OS === "android" ? false : true} />

        <SafeAreaView style={[styles.container, { backgroundColor: AppDetails.primaryColor }]} edges={['left', 'right']} >

            <Stack.Navigator
              initialRouteName={user && token ? "MainTabs" : "Feed"}
              screenOptions={{
                headerShown: false,
                cardStyle: { backgroundColor: '#fff' },
                gestureEnabled: true,
                cardStyleInterpolator: CardStyleInterpolators.forHorizontalIOS,
              }}
            >

              <Stack.Screen name="Login" component={Login} />
              <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
              <Stack.Screen name="ResetPassword" component={ResetPasswordScreen} />
              <Stack.Screen name="VerifyReset" component={VerifyResetScreen} />
              <Stack.Screen name="ChangePassword" component={ChangePasswordScreen} />
              <Stack.Screen name="MainTabs" component={MainTabNavigator} options={{ gestureEnabled: false, }} />
              
              {/* Add your new screens here */}
              <Stack.Screen name="Categories" component={CategoriesScreen} />
              <Stack.Screen name="EventsScreen" component={EventsScreen} />
              <Stack.Screen name="GuideScreen" component={GuideScreen} />
              <Stack.Screen name="JobsScreen" component={JobsScreen} />
              <Stack.Screen name="MarketplaceScreen" component={MarketplaceScreen} />
              <Stack.Screen name="ProductDetail" component={ProductDetailScreen} />
              <Stack.Screen name="CreateListing" component={CreateListingScreen} />
              <Stack.Screen name="MarketplaceWebview" component={UniversalWebView} options={{ headerShown: false }} />
              <Stack.Screen name="MyListings" component={MyListingsScreen} />
              <Stack.Screen name="Groups" component={GroupsScreen} />
              <Stack.Screen name="WebView" component={UniversalWebView} options={{ headerShown: false }} />
              <Stack.Screen name="WhatsNearby" component={WhatsNearbyScreen} />
              <Stack.Screen 
                name="CommentScreen" 
                component={CommentScreen} 
                options={{
                  cardStyle: { backgroundColor: '#fff' },
                }}
              />
              <Stack.Screen name="Profile" component={ProfileScreen} />
              <Stack.Screen name="GroupScreen" component={GroupScreen} />
              <Stack.Screen name="PagesScreen" component={PagesScreen} />
              <Stack.Screen name="BusinessDetails" component={BusinessDetails} />
              <Stack.Screen name="BusinessPages" component={BusinessList} />
        <Stack.Screen name="Reels2" component={Reels2} />
        <Stack.Screen name="CreateReel" component={CreateReels} options={{ headerShown: false }} />
<Stack.Screen
  name="GroupDetails"
  component={GroupDetails}
/>
              <Stack.Screen name="ArticlesScreen" component={ArticlesScreen} />
              <Stack.Screen name="ArticleDetails" component={ArticleDetailsScreen} />
              <Stack.Screen name="EventDetail" component={EventDetailScreen} />
              <Stack.Screen name="UserProfile" component={UserProfileScreen} />
              <Stack.Screen name="Notifications" component={NotificationsScreen} />
              <Stack.Screen name="Inbox" component={InboxScreen} />
              <Stack.Screen name="Thread" component={ThreadScreen} />
              <Stack.Screen name="InAppBrowser" component={UniversalWebView} options={{ headerShown: false }} />
              <Stack.Screen name="Settings" component={SettingsScreen} />
              <Stack.Screen name="SearchScreen" component={SearchScreen} />
              <Stack.Screen name="PostDetail" component={PostDetailScreen} options={{ cardStyle: { backgroundColor: '#fff' } }} />
              <Stack.Screen name="TrendingOnHafrik" component={TrendingOnHafrikScreen} options={{ headerShown: false }} />
              <Stack.Screen name="MyPagesAndGroups"    component={MyPagesAndGroupsScreen}   options={{ headerShown: false }} />
              <Stack.Screen name="JoinedCommunities" component={JoinedCommunitiesScreen}  options={{ headerShown: false, gestureEnabled: true }} />
              <Stack.Screen name="LikedBusinesses"   component={LikedBusinessesScreen}    options={{ headerShown: false, gestureEnabled: true }} />
              <Stack.Screen name="SavedPosts"        component={SavedPostsScreen}          options={{ headerShown: false, gestureEnabled: true }} />
              <Stack.Screen name="Earnings"          component={EarningsScreen}   options={{ headerShown: false }} />
              <Stack.Screen name="PointsScreen"      component={PointsScreen}     options={{ headerShown: false }} />
              <Stack.Screen name="WalletScreen"      component={WalletScreen}     options={{ headerShown: false }} />
              <Stack.Screen name="AffiliatesScreen"  component={AffiliatesScreen} options={{ headerShown: false }} />
              <Stack.Screen name="SendMoneyScreen"   component={SendMoneyScreen}  options={{ headerShown: false }} />
              <Stack.Screen name="ExchangeHome"    component={ExchangeHomeScreen}    options={{ headerShown: false }} />
              <Stack.Screen name="ExchangeConfirm" component={ExchangeConfirmScreen} options={{ headerShown: false }} />
              <Stack.Screen name="ExchangeHistory" component={ExchangeHistoryScreen} options={{ headerShown: false }} />
              <Stack.Screen name="ExchangeAdmin"   component={ExchangeAdminScreen}   options={{ headerShown: false }} />

              {/* ── Onboarding flow ── */}
              {/* ── Onboarding: Avatar → Follow → Country → Welcome ── */}
              {/* VerifyEmail disabled — re-enable when email verification is turned back on */}
              <Stack.Screen name="OnboardingAvatar"  component={UploadAvatarScreen}  options={{ headerShown: false, gestureEnabled: false }} />
              <Stack.Screen name="OnboardingFollow"  component={FollowScreen}         options={{ headerShown: false, gestureEnabled: false }} />
              <Stack.Screen name="OnboardingCountry" component={SelectCountryScreen}  options={{ headerShown: false, gestureEnabled: false }} />
              <Stack.Screen name="OnboardingWelcome" component={WelcomeScreen}        options={{ headerShown: false, gestureEnabled: false }} />
            </Stack.Navigator>
        </SafeAreaView>


    </NavigationContainer>
      <GlobalUploadBanner />
      <Toast />
      {showSplashOverlay && splashNode}
    </View>
    </NotificationProvider>
  
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <ThemeProvider>
          <GlobalVideoPlayerProvider>
            <AppNavigator />
          </GlobalVideoPlayerProvider>
        </ThemeProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}


const styles = StyleSheet.create({
  root:      { flex: 1 },
  container: { flex: 1 },
});