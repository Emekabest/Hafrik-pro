// App.js
// import { StatusBar } from 'expo-status-bar';
import { AppState, StyleSheet, View,  Platform } from 'react-native';
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
import { useEffect, useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import AppDetails from './src/helpers/appdetails';
import WhatsNearbyScreen from './src/pages/home/whatsnearbyscreen';
import CommentScreen from './src/pages/home/feeds/comments/commentscreen';
import useSharedStore from './src/repository/store';
import { useFonts } from 'expo-font';
import { WorkSans_300Light, WorkSans_400Regular, WorkSans_500Medium, WorkSans_600SemiBold, WorkSans_700Bold, WorkSans_800ExtraBold} from '@expo-google-fonts/work-sans';
import { ReadexPro_200ExtraLight,  ReadexPro_300Light, ReadexPro_400Regular, ReadexPro_500Medium, ReadexPro_600SemiBold, ReadexPro_700Bold, } from "@expo-google-fonts/readex-pro"




const Stack = createStackNavigator();

// Create a component that handles the navigation based on auth state
function AppNavigator() {

  /** Ensures that the status bar style remains the same even after the state of the app is changed */
      const handleAppStateChange = () => {
      // StatusBar.setBarStyle('light-content', true);
      // StatusBar.setBackgroundColor(AppDetails.primaryColor, true);

    };


    useEffect(() => {

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription.remove();

  }, []);
  /**................................................................................................*/

  

    const [fontsLoaded] = useFonts({
  
          WorkSans_300Light,
          WorkSans_400Regular,
          WorkSans_500Medium,
          WorkSans_600SemiBold, 
          WorkSans_700Bold,

          ReadexPro_200ExtraLight,
          ReadexPro_300Light,
          ReadexPro_400Regular,
          ReadexPro_500Medium,
          ReadexPro_600SemiBold,
          ReadexPro_700Bold,
    })
  
  

  const [isFontStored, setIsFontStored] = useState(false);
  const { user, token, loading } = useAuth();




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

            <Stack.Navigator initialRouteName={user && token ? "MainTabs" : "Login"} screenOptions={{ headerShown: false }}>

              <Stack.Screen name="Login" component={Login} />
              <Stack.Screen name="MainTabs" component={MainTabNavigator} options={{ gestureEnabled: false, }} />
              
              {/* Add your new screens here */}
              <Stack.Screen name="Categories" component={CategoriesScreen} />
              <Stack.Screen name="Events" component={EventsScreen} />
              <Stack.Screen name="Groups" component={GroupsScreen} />
              <Stack.Screen name="WebView" component={WebViewScreen} />
              <Stack.Screen name="WhatsNearby" component={WhatsNearbyScreen} />
              <Stack.Screen name="CommentScreen" component={CommentScreen} />

            </Stack.Navigator>
        </SafeAreaView>


    </NavigationContainer>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppNavigator />
    </AuthProvider>
  );
}


const styles = StyleSheet.create({
  container: {
    flex: 1,
    height: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
});