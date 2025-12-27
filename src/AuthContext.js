// AuthContext.js
import React, { createContext, useState, useContext, useEffect, useMemo, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }

  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true); // Start with loading true

  useEffect(() => {
    loadStoredAuth();
  }, []);


  const loadStoredAuth = async () => {
    try {
      console.log('🔐 Loading stored authentication...');
      
      const [storedToken, storedUser] = await Promise.all([
        AsyncStorage.getItem('hafrik_token'),
        AsyncStorage.getItem('hafrik_user')
      ]);
      
      console.log('🔐 Stored auth data:', {
        hasToken: !!storedToken,
        hasUser: !!storedUser,
        tokenLength: storedToken?.length,
        userData: storedUser ? 'exists' : 'none'
      });

      if (storedToken && storedUser) {
        const userData = JSON.parse(storedUser);
        setToken(storedToken);
        setUser(userData);
        
        
        console.log('✅ Auto-login successful:', {
          userId: userData.id,
          username: userData.username,
          tokenPreview: storedToken.substring(0, 20) + '...'
        });
      } else {
        console.log('❌ No stored auth data found');
      }
    } catch (error) {
      console.error('❌ Error loading stored auth:', error);
      // Clear corrupted data
      await AsyncStorage.multiRemove(['hafrik_token', 'hafrik_user']);
    } finally {
      setLoading(false);
      console.log('🔐 Auth loading complete');
    }
  };

  const login = useCallback(async (userData, authToken) => {
    try {
      console.log('🔐 Logging in user:', {
        userId: userData.id,
        username: userData.username,
        tokenPreview: authToken.substring(0, 20) + '...'
      });

      setUser(userData);
      setToken(authToken);
      
      // Store both token and user data
      await Promise.all([
        AsyncStorage.setItem('hafrik_token', authToken),
        AsyncStorage.setItem('hafrik_user', JSON.stringify(userData))
      ]);
      
      console.log('✅ Login data stored successfully');
    } catch (error) {
      console.error('❌ Error storing auth data:', error);
      throw error;
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      console.log('🔐 Logging out user');
      
      setUser(null);
      setToken(null);
      
      await AsyncStorage.multiRemove(['hafrik_token', 'hafrik_user']);
      
      console.log('✅ Logout completed');
    } catch (error) {
      console.error('❌ Error during logout:', error);
    }
  }, []);

  const updateUser = useCallback(async (updatedUserData) => {
    try {
      setUser(updatedUserData);
      await AsyncStorage.setItem('hafrik_user', JSON.stringify(updatedUserData));
      console.log('✅ User data updated');
    } catch (error) {
      console.error('❌ Error updating user data:', error);
    }
  }, []);

  console.log(user)

  const value = useMemo(() => ({
    user,
    token,
    login,
    logout,
    updateUser,
    loading,
    isAuthenticated: !!user && !!token,
  }), [user, token, loading, login, logout, updateUser]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};