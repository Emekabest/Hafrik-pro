// App.js
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import Login from './src/pages/Login';
import MainTabNavigator from './src/csslx.js/MainTabNavigator';
import { AuthProvider, useAuth } from './src/AuthContext';
import WebViewScreen from './src/pages/WebViewScreen';
import CategoriesScreen from './src/pages/CategoriesScreen';
import EventsScreen from './src/pages/EventsScreen';
import GroupsScreen from './src/pages/GroupsScreen';

const Stack = createStackNavigator();

// Create a component that handles the navigation based on auth state
function AppNavigator() {
  const { user, token, loading } = useAuth();

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
      
      <Stack.Navigator 
        initialRouteName={user && token ? "MainTabs" : "Login"}
        screenOptions={{
          headerShown: false
        }}
      >
        <Stack.Screen name="Login" component={Login} />
        <Stack.Screen 
          name="MainTabs" 
          component={MainTabNavigator}
          options={{
            gestureEnabled: false,
          }}
        />
        
        {/* Add your new screens here */}
        <Stack.Screen name="Categories" component={CategoriesScreen} />
        <Stack.Screen name="Events" component={EventsScreen} />
        <Stack.Screen name="Groups" component={GroupsScreen} />
        <Stack.Screen name="WebView" component={WebViewScreen} />
      </Stack.Navigator>
      <StatusBar style="auto" />
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
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
});