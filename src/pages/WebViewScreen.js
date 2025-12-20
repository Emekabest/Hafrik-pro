// src/pages/WebViewScreen.js
import React, { useRef, useState, useEffect, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  SafeAreaView, 
  StatusBar, 
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
  Alert,
  BackHandler,
  Platform
} from 'react-native';
import { WebView } from 'react-native-webview';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../AuthContext';

const { height: screenHeight } = Dimensions.get('window');

const WebViewScreen = ({ navigation, route }) => {


  const { url, title } = route.params || {};
  const { token, user } = useAuth();
  const webViewRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [canGoBack, setCanGoBack] = useState(false);
  const [currentUrl, setCurrentUrl] = useState(url || 'https://hafrik.com');

  // Enhanced authentication injection script
  const getAuthInjectionScript = useCallback(() => {
    if (!token || !user) return '';
    
    const userData = JSON.stringify(user).replace(/'/g, "\\'");
    
    return `
      (function() {
        console.log('🔐 Mobile App Authentication Injection');
        
        // Function to set authentication tokens
        function setAuthTokens() {
          try {
            // Set localStorage tokens
            if (typeof localStorage !== 'undefined') {
              localStorage.setItem('hafrik_token', '${token}');
              localStorage.setItem('access_token', '${token}');
              localStorage.setItem('app_user', '${userData}');
              localStorage.setItem('user_data', '${userData}');
              localStorage.setItem('is_mobile_app', 'true');
              localStorage.setItem('app_auth_timestamp', Date.now().toString());
              
              // Set user data
              const user = ${userData};
              if (user && user.id) {
                localStorage.setItem('user_id', user.id.toString());
                localStorage.setItem('username', user.username || '');
                localStorage.setItem('email', user.email || '');
              }
            }
            
            // Set cookies for domain
            const domain = 'hafrik.com';
            const subdomains = ['', '.hafrik.com', 'www.hafrik.com'];
            
            const cookieNames = [
              'hafrik_token',
              'access_token',
              'auth_token',
              'token',
              'app_session'
            ];
            
            subdomains.forEach(domainPart => {
              const domainStr = domainPart ? ' domain=' + domainPart + domain + ';' : ' domain=' + domain + ';';
              cookieNames.forEach(cookieName => {
                try {
                  document.cookie = \`\${cookieName}=${token}; path=/;\${domainStr} max-age=31536000; Secure; SameSite=None\`;
                } catch (e) {
                  console.log('Cookie error:', e);
                }
              });
            });
            
            // Dispatch authentication event
            const authEvent = new CustomEvent('mobileAppAuth', {
              detail: { token: '${token}', user: ${userData} }
            });
            window.dispatchEvent(authEvent);
            
            return true;
          } catch (error) {
            console.error('Auth injection error:', error);
            return false;
          }
        }
        
        // Function to hide login elements
        function hideLoginElements() {
          try {
            // Elements to hide
            const selectors = [
              '.login-container',
              '#login-form',
              '.signin-form',
              '.auth-modal',
              '[href*="/login"]',
              '[href*="/signin"]',
              '[href*="/auth"]',
              '.login-button',
              '.sign-in-button',
              'form[action*="login"]',
              'form[action*="signin"]',
              'form[action*="auth"]'
            ];
            
            selectors.forEach(selector => {
              try {
                const elements = document.querySelectorAll(selector);
                elements.forEach(el => {
                  el.style.display = 'none';
                  el.style.visibility = 'hidden';
                  el.style.opacity = '0';
                });
              } catch (e) {
                // Ignore selector errors
              }
            });
            
            // Also hide by text content
            const authTexts = [
              'login', 'sign in', 'signin', 'log in',
              'please login', 'please sign in', 'log in to continue'
            ];
            
            authTexts.forEach(text => {
              const elements = document.querySelectorAll('*');
              elements.forEach(el => {
                if (el.textContent && el.textContent.toLowerCase().includes(text)) {
                  el.style.display = 'none';
                  el.style.visibility = 'hidden';
                }
              });
            });
            
            return true;
          } catch (error) {
            console.error('Hide elements error:', error);
            return false;
          }
        }
        
        // Function to simulate logged in state
        function simulateLoggedIn() {
          try {
            // Update user display elements
            const userElements = document.querySelectorAll('.username, .user-name, .profile-name');
            userElements.forEach(el => {
              if (el.textContent) {
                const user = ${userData};
                el.textContent = user.username || user.email || 'User';
              }
            });
            
            // Update navigation
            const loginLinks = document.querySelectorAll('a[href*="/login"], a[href*="/signin"]');
            loginLinks.forEach(link => {
              link.href = '/profile';
              link.textContent = 'Profile';
              link.onclick = null;
            });
            
            return true;
          } catch (error) {
            console.error('Simulate login error:', error);
            return false;
          }
        }
        
        // Function to check if we're on an auth page
        function isAuthPage() {
          const path = window.location.pathname.toLowerCase();
          const authPaths = ['/login', '/signin', '/auth', '/register', '/signup'];
          return authPaths.some(authPath => path.includes(authPath));
        }
        
        // Function to redirect from auth pages
        function redirectFromAuthPages() {
          if (isAuthPage()) {
            console.log('Redirecting from auth page to home');
            window.history.replaceState(null, null, '/');
            window.location.href = '/';
          }
        }
        
        // Main execution
        if (window.authInjected) {
          console.log('Auth already injected');
          return;
        }
        
        window.authInjected = true;
        
        // Set auth tokens immediately
        const authSuccess = setAuthTokens();
        
        if (authSuccess) {
          console.log('✅ Auth tokens injected successfully');
          
          // Hide login elements
          hideLoginElements();
          
          // Simulate logged in state
          simulateLoggedIn();
          
          // Redirect from auth pages if needed
          redirectFromAuthPages();
          
          // Send success message to app
          if (window.ReactNativeWebView) {
            window.ReactNativeWebView.postMessage(JSON.stringify({
              type: 'auth_success',
              timestamp: Date.now()
            }));
          }
        } else {
          console.log('❌ Auth injection failed');
          
          if (window.ReactNativeWebView) {
            window.ReactNativeWebView.postMessage(JSON.stringify({
              type: 'auth_failed',
              timestamp: Date.now()
            }));
          }
        }
        
        // Re-inject on page changes
        window.addEventListener('load', function() {
          setTimeout(() => {
            setAuthTokens();
            hideLoginElements();
            simulateLoggedIn();
            redirectFromAuthPages();
          }, 1000);
        });
        
      })();
      true;
    `;
  }, [token, user]);

  // Initial headers with authentication
  const getInitialHeaders = () => {
    if (!token || !user) return {};
    
    return {
      'Authorization': `Bearer ${token}`,
      'X-Auth-Token': token,
      'X-Access-Token': token,
      'X-User-Id': user?.id?.toString() || '',
      'X-Username': user?.username || '',
      'X-Email': user?.email || '',
      'X-Is-Mobile-App': 'true',
      'Accept': 'application/json, text/html, */*',
      'Cookie': `hafrik_token=${token}; access_token=${token};`
    };
  };

  const handleLoadStart = (syntheticEvent) => {
    const { nativeEvent } = syntheticEvent;
    setLoading(true);
    setError(false);
  };

  const handleLoadEnd = (syntheticEvent) => {
    const { nativeEvent } = syntheticEvent;
    setLoading(false);
    
    // Inject authentication script after load
    if (webViewRef.current && token && user) {
      setTimeout(() => {
        webViewRef.current.injectJavaScript(getAuthInjectionScript());
      }, 500);
    }
  };

  const handleError = (syntheticEvent) => {
    const { nativeEvent } = syntheticEvent;
    console.error('WebView error:', nativeEvent);
    setLoading(false);
    setError(true);
  };

  const handleNavigationStateChange = (navState) => {
    setCanGoBack(navState.canGoBack);
    setCurrentUrl(navState.url);
    
    if (!navState.loading && token && user) {
      // Re-inject auth on navigation
      setTimeout(() => {
        if (webViewRef.current) {
          webViewRef.current.injectJavaScript(getAuthInjectionScript());
        }
      }, 300);
    }
  };

  const handleMessage = (event) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      console.log('Message from WebView:', data.type);
      
      if (data.type === 'auth_failed') {
        Alert.alert(
          'Authentication Required',
          'Please log in through the app to access this content.',
          [
            {
              text: 'Go to Login',
              onPress: () => navigation.navigate('Auth')
            },
            {
              text: 'Cancel',
              style: 'cancel'
            }
          ]
        );
      }
    } catch (e) {
      // Ignore parse errors
    }
  };

  const handleReload = () => {
    setError(false);
    setLoading(true);
    if (webViewRef.current) {
      webViewRef.current.reload();
    }
  };

  const handleBack = () => {
    if (canGoBack && webViewRef.current) {
      webViewRef.current.goBack();
    } else {
      navigation.goBack();
    }
  };

  // Handle Android back button
  useEffect(() => {
    const backHandler = BackHandler.addEventListener(
      'hardwareBackPress',
      () => {
        if (canGoBack && webViewRef.current) {
          webViewRef.current.goBack();
          return true;
        }
        return false;
      }
    );

    return () => backHandler.remove();
  }, [canGoBack]);

  // Show login required if no token
  console.log("Webviewscreen is working")

  if (!token || !user) {



    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" />
        <View style={styles.authRequiredContainer}>
          <Ionicons name="lock-closed-outline" size={64} color="#0C3F44" />
          <Text style={styles.authRequiredTitle}>Authentication Required</Text>
          <Text style={styles.authRequiredText}>
            Please log in to access web content
          </Text>
          <TouchableOpacity 
            style={styles.loginButton}
            onPress={() => navigation.navigate('Auth')}
          >
            <Text style={styles.loginButtonText}>Go to Login</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButtonHeader}
          onPress={handleBack}
        >
          <Ionicons name="arrow-back" size={24} color="#0C3F44" />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {title || 'Hafrik'}
        </Text>
        <TouchableOpacity 
          style={styles.reloadButton}
          onPress={handleReload}
        >
          <Ionicons name="refresh" size={24} color="#0C3F44" />
        </TouchableOpacity>
      </View>

      {/* WebView */}
      <WebView
        ref={webViewRef}
        source={{ 
          uri: currentUrl,
          headers: getInitialHeaders()
        }}
        style={styles.webview}
        startInLoadingState={true}
        allowsBackForwardNavigationGestures={true}
        onLoadStart={handleLoadStart}
        onLoadEnd={handleLoadEnd}
        onError={handleError}
        onNavigationStateChange={handleNavigationStateChange}
        onMessage={handleMessage}
        injectedJavaScript={getAuthInjectionScript()}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        sharedCookiesEnabled={true}
        thirdPartyCookiesEnabled={true}
        cacheEnabled={true}
        originWhitelist={['*']}
        mixedContentMode="always"
        overScrollMode="content"
        userAgent={`Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 HafrikApp/${Platform.OS}/${user.id}`}
        applicationNameForUserAgent="HafrikApp"
        setSupportMultipleWindows={false}
      />

      {/* Loading Indicator */}
      {loading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0C3F44" />
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      )}

      {/* Error State */}
      {error && (
        <View style={styles.errorContainer}>
          <Ionicons name="warning-outline" size={64} color="#ff6b6b" />
          <Text style={styles.errorTitle}>Connection Error</Text>
          <Text style={styles.errorText}>
            Unable to load the content. Please check your connection and try again.
          </Text>
          <TouchableOpacity style={styles.retryButton} onPress={handleReload}>
            <Text style={styles.retryButtonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Debug Info (Dev only) */}
      {__DEV__ && (
        <View style={styles.debugInfo}>
          <Text style={styles.debugText}>
            User: {user?.username} | URL: {currentUrl?.substring(0, 30)}...
          </Text>
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    backgroundColor: '#fff',
  },
  backButtonHeader: {
    padding: 5,
  },
  headerTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
    marginHorizontal: 10,
  },
  reloadButton: {
    padding: 5,
  },
  webview: {
    flex: 1,
  },
  loadingContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
    zIndex: 10,
  },
  loadingText: {
    marginTop: 10,
    color: '#666',
    fontSize: 16,
  },
  errorContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 20,
    zIndex: 10,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 16,
    marginBottom: 8,
  },
  errorText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: '#0C3F44',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  authRequiredContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  authRequiredTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 16,
    marginBottom: 8,
  },
  authRequiredText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 20,
  },
  loginButton: {
    backgroundColor: '#0C3F44',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: 10,
  },
  loginButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  backButton: {
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  backButtonText: {
    color: '#333',
    fontSize: 16,
    fontWeight: '600',
  },
  debugInfo: {
    backgroundColor: '#0C3F44',
    padding: 5,
  },
  debugText: {
    color: '#fff',
    fontSize: 10,
  },
});

export default WebViewScreen;