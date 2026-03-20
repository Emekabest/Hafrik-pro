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
      const [storedToken, storedUser] = await Promise.all([
        AsyncStorage.getItem('hafrik_token'),
        AsyncStorage.getItem('hafrik_user'),
      ]);

      if (storedToken && storedUser) {
        const userData = JSON.parse(storedUser);
        setToken(storedToken);
        setUser(userData);
      }
    } catch (error) {
      console.error('❌ Error loading stored auth:', error);
      await AsyncStorage.multiRemove(['hafrik_token', 'hafrik_user', 'hafrik_session_token']);
    } finally {
      setLoading(false);
    }
  };

  const login = useCallback(async (userData, authToken, sessionToken = null) => {
    try {
      setUser(userData);
      setToken(authToken);

      const writes = [
        AsyncStorage.setItem('hafrik_token', authToken),
        AsyncStorage.setItem('hafrik_user', JSON.stringify(userData)),
      ];
      if (sessionToken) writes.push(AsyncStorage.setItem('hafrik_session_token', sessionToken));
      await Promise.all(writes);
    } catch (error) {
      console.error('❌ Error storing auth data:', error);
      throw error;
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      setUser(null);
      setToken(null);
      await AsyncStorage.multiRemove(['hafrik_token', 'hafrik_user', 'hafrik_session_token']);
    } catch (error) {
      console.error('❌ Error during logout:', error);
    }
  }, []);

  const updateUser = useCallback(async (updatedUserData) => {
    try {
      setUser(updatedUserData);
      await AsyncStorage.setItem('hafrik_user', JSON.stringify(updatedUserData));
    } catch (error) {
      console.error('❌ Error updating user data:', error);
    }
  }, []);

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