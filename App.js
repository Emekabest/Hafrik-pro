// App.js
// import { StatusBar } from 'expo-status-bar';
import { AppState, StyleSheet, View,  Platform, Dimensions } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import Login from './src/pages/Login';
import MainTabNavigator from './src/csslx.js/MainTabNavigator';
import { AuthProvider, useAuth } from './src/AuthContext';
import WebViewScreen from './src/pages/WebViewScreen';
import CategoriesScreen from './src/pages/CategoriesScreen';
import EventsScreen from './src/pages/EventsScreen';
import GroupsScreen from './src/pages/GroupsScreen';
import { useEffect, useRef, useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import AppDetails from './src/helpers/appdetails';
import WhatsNearbyScreen from './src/pages/home/whatsnearbyscreen';
import CommentScreen from './src/pages/home/feeds/comments/commentscreen';
import useSharedStore from './src/repository/store';
import { useFonts } from 'expo-font';
import { WorkSans_300Light, WorkSans_400Regular, WorkSans_500Medium, WorkSans_600SemiBold, WorkSans_700Bold, WorkSans_800ExtraBold} from '@expo-google-fonts/work-sans';
import { ReadexPro_200ExtraLight,  ReadexPro_300Light, ReadexPro_400Regular, ReadexPro_500Medium, ReadexPro_600SemiBold, ReadexPro_700Bold, } from "@expo-google-fonts/readex-pro"
import { Inter_300Light, Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold, Inter_400Regular_Italic, Inter_500Medium_Italic, Inter_600SemiBold_Italic } from '@expo-google-fonts/inter';
import { Outfit_400Regular, Outfit_500Medium, Outfit_600SemiBold  } from "@expo-google-fonts/outfit";
import GroupDetails from "./src/pages/groups/GroupDetails";
import GuideScreen from './src/pages/GuideScreen';
import JobsScreen from './src/pages/JobsScreen';
import MarketplaceScreen from './src/pages/marketplace/index';
import ProductDetailScreen from './src/pages/marketplace/ProductDetailScreen';
import CreateListingScreen from './src/pages/marketplace/CreateListingScreen';
import MarketplaceWebviewScreen from './src/pages/marketplace/MarketplaceWebviewScreen';
import MyListingsScreen from './src/pages/marketplace/MyListingsScreen';
import ArticlesScreen from './src/pages/blogs/ArticlesScreen';
import ArticleDetailsScreen from './src/pages/blogs/ArticleDetailsScreen';
import EventDetailScreen from './src/pages/events/EventDetailScreen';

import VideoManager from './src/helpers/videomanager';
import ReelsManager from './src/helpers/reelsmanager';
import VideoPreloader from './src/helpers/VideoPreloader';
import GroupScreen from './src/pages/groups/groupscreen';
import { GlobalVideoPlayerProvider } from './src/helpers/GlobalVideoPlayerContext';
import ProfileScreen from './src/pages/profile/profilescreen';
import PagesScreen from './src/pages/pages_/pagesscreen';
import BusinessDetails from "./src/pages/pages_/BusinessDetails";
import Reels2 from './src/pages/reels/reels2';
import UserProfileScreen from './src/pages/users/UserProfileScreen';
import NotificationsScreen from './src/pages/notifications/NotificationsScreen';
import InboxScreen from './src/pages/messages/InboxScreen';
import ThreadScreen from './src/pages/messages/ThreadScreen';
import InAppBrowser from './src/pages/common/InAppBrowser';
import SettingsScreen from './src/pages/settings/SettingsScreen';
import SearchScreen from './src/pages/search/searchscreen';

const Stack = createStackNavigator();

// Create a component that handles the navigation based on auth state/........
function AppNavigator() {

  const isAppActiveRef = useRef(true);
  const isAppActive_store = useSharedStore(state => state.isAppActive);
  const setIsAppActive_store = useSharedStore(state => state.setIsAppActive);

  const setTabletMode = useSharedStore(state => state.setTabletMode);
  const setTabletDimension = useSharedStore(state => state.setTabletDimension);


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

    const handleAppStateChange = (nextAppState) => {
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
    };




    useEffect(() => {

      const subscription = AppState.addEventListener('change', handleAppStateChange);
      return ()=>{

        subscription.remove()

      };

  }, []);
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



    const [fontsLoaded] = useFonts({
  
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
    })
  
  

  const [isFontStored, setIsFontStored] = useState(false);
  const { user, token, loading } = useAuth();

  // Start badge polling once the user is authenticated
  const startBadgePolling = useSharedStore((s) => s.startBadgePolling);
  const stopBadgePolling  = useSharedStore((s) => s.stopBadgePolling);
  useEffect(() => {
    if (token) startBadgePolling(token);
    return () => stopBadgePolling();
  }, [token]);




  if (!fontsLoaded) {
    

    return null;
  }
 




  // Show a loading screen while checking authentication
  if (loading) {
    
    return (
      <View style={styles.loadingContainer}>
        <StatusBar style="auto" />
        {/* You can add a loading spinner here */}
      </View>
    );
  }

  

  return (
    <NavigationContainer>
      
        <StatusBar style="light" translucent={Platform.OS === "android" ? false : true} />

        <SafeAreaView style={[styles.container, { backgroundColor: AppDetails.primaryColor }]} edges={['top', 'left', 'right', 'bottom']} >

            <Stack.Navigator 
              initialRouteName={user && token ? "MainTabs" : "Login"} 
              screenOptions={{ 
                headerShown: false,
                cardStyle: { backgroundColor: '#fff' },
              }}
            >

              <Stack.Screen name="Login" component={Login} />
              <Stack.Screen name="MainTabs" component={MainTabNavigator} options={{ gestureEnabled: false, }} />
              
              {/* Add your new screens here */}
              <Stack.Screen name="Categories" component={CategoriesScreen} />
              <Stack.Screen name="EventsScreen" component={EventsScreen} />
              <Stack.Screen name="GuideScreen" component={GuideScreen} />
              <Stack.Screen name="JobsScreen" component={JobsScreen} />
              <Stack.Screen name="MarketplaceScreen" component={MarketplaceScreen} />
              <Stack.Screen name="ProductDetail" component={ProductDetailScreen} />
              <Stack.Screen name="CreateListing" component={CreateListingScreen} />
              <Stack.Screen name="MarketplaceWebview" component={MarketplaceWebviewScreen} />
              <Stack.Screen name="MyListings" component={MyListingsScreen} />
              <Stack.Screen name="Groups" component={GroupsScreen} />
              <Stack.Screen name="WebView" component={WebViewScreen} />
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
        <Stack.Screen name="Reels2" component={Reels2} />
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
              <Stack.Screen name="InAppBrowser" component={InAppBrowser} options={{ headerShown: false }} />
              <Stack.Screen name="Settings" component={SettingsScreen} />
              <Stack.Screen name="SearchScreen" component={SearchScreen} />
            </Stack.Navigator>
        </SafeAreaView>


    </NavigationContainer>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <GlobalVideoPlayerProvider>
        <AppNavigator />
      </GlobalVideoPlayerProvider>
    </AuthProvider>
  );
}


const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
});