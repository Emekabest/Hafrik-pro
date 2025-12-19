// App.js
// import { StatusBar } from 'expo-status-bar';
import { AppState, StyleSheet, View, StatusBar } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import Login from './src/pages/Login';
import MainTabNavigator from './src/csslx.js/MainTabNavigator';
import { AuthProvider, useAuth } from './src/AuthContext';
import WebViewScreen from './src/pages/WebViewScreen';
import CategoriesScreen from './src/pages/CategoriesScreen';
import EventsScreen from './src/pages/EventsScreen';
import GroupsScreen from './src/pages/GroupsScreen';
import { useEffect } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import AppDetails from './src/service/appdetails';

const Stack = createStackNavigator();

// Create a component that handles the navigation based on auth state
function AppNavigator() {

  /** Ensures that the status bar style remains the same even after the state of the app is changed */
      const handleAppStateChange = () => {
      StatusBar.setBarStyle('light-content', true);
      StatusBar.setBackgroundColor(AppDetails.primaryColor, true);

    };


    useEffect(() => {

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription.remove();

  }, []);
  /**................................................................................................*/




  const { user, token, loading } = useAuth();

  console.log(user)

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
      
      
        <StatusBar barStyle="light-content"  backgroundColor={AppDetails.primaryColor} />

        <SafeAreaView style={styles.container} edges={['top', 'left', 'right', 'bottom']} >

            <Stack.Navigator initialRouteName={user && token ? "MainTabs" : "Login"} screenOptions={{ headerShown: false }}>

              <Stack.Screen name="Login" component={Login} />
              <Stack.Screen name="MainTabs" component={MainTabNavigator} options={{ gestureEnabled: false, }} />
              

              {/* Add your new screens here */}
              <Stack.Screen name="Categories" component={CategoriesScreen} />
              <Stack.Screen name="Events" component={EventsScreen} />
              <Stack.Screen name="Groups" component={GroupsScreen} />
              <Stack.Screen name="WebView" component={WebViewScreen} />
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
    backgroundColor: '#fff',
    height: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
});