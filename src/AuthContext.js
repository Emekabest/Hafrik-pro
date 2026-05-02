// AuthContext.js
import React, { createContext, useState, useContext, useEffect, useMemo, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const AuthContext = createContext();

// Manual base64 decode — works without atob (not always available in RN/Hermes)
const BASE64_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
const base64Decode = (str) => {
  const s = str.replace(/-/g, '+').replace(/_/g, '/');
  const padded = s + '=='.slice(0, (4 - s.length % 4) % 4);
  let result = '';
  for (let i = 0; i < padded.length; i += 4) {
    const a = BASE64_CHARS.indexOf(padded[i]);
    const b = BASE64_CHARS.indexOf(padded[i + 1]);
    const c = BASE64_CHARS.indexOf(padded[i + 2]);
    const d = BASE64_CHARS.indexOf(padded[i + 3]);
    result += String.fromCharCode((a << 2) | (b >> 4));
    if (c !== -1) result += String.fromCharCode(((b & 15) << 4) | (c >> 2));
    if (d !== -1) result += String.fromCharCode(((c & 3) << 6) | d);
  }
  return result;
};

const decodeJwt = (jwt) => {
  try {
    const parts = jwt.split('.');
    if (parts.length !== 3) return null;
    return JSON.parse(base64Decode(parts[1]));
  } catch { return null; }
};

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
  const [onboardingStep, setOnboardingStep] = useState(6); // 6 = completed (default for existing users)

  useEffect(() => {
    loadStoredAuth();
  }, []);


  const loadStoredAuth = async () => {
    try {
      const [storedToken, storedUser, storedStep] = await Promise.all([
        AsyncStorage.getItem('hafrik_token'),
        AsyncStorage.getItem('hafrik_user'),
        AsyncStorage.getItem('hafrik_onboarding_step'),
      ]);

      if (storedToken && storedUser) {
        const userData = JSON.parse(storedUser);
        setToken(storedToken);
        setUser(userData);
      }
      setOnboardingStep(storedStep !== null ? parseInt(storedStep) : 6);
    } catch (error) {
      console.error('❌ Error loading stored auth:', error);
      await AsyncStorage.multiRemove(['hafrik_token', 'hafrik_user', 'hafrik_session_token']);
    } finally {
      setLoading(false);
    }
  };

  const updateOnboardingStep = useCallback(async (step) => {
    setOnboardingStep(step);
    await AsyncStorage.setItem('hafrik_onboarding_step', String(step));
  }, []);

  const savePendingEmail = useCallback(async (email) => {
    await AsyncStorage.setItem('hafrik_pending_email', email);
  }, []);

  const getPendingEmail = useCallback(async () => {
    return AsyncStorage.getItem('hafrik_pending_email');
  }, []);

  const clearPendingEmail = useCallback(async () => {
    await AsyncStorage.removeItem('hafrik_pending_email');
  }, []);

  const login = useCallback(async (userData, authToken) => {
    try {
      // Always store the JWT (token field) — NOT session_token.
      // The backend expects: Authorization: Bearer <JWT>
      // Write to AsyncStorage FIRST — state updates after so no render
      // can observe token in state before it exists in storage.
      await AsyncStorage.setItem('hafrik_token', authToken);
      await AsyncStorage.setItem('hafrik_user', JSON.stringify(userData ?? {}));

      setUser(userData ?? null);
      setToken(authToken);
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
    onboardingStep,
    updateOnboardingStep,
    savePendingEmail,
    getPendingEmail,
    clearPendingEmail,
  }), [user, token, loading, login, logout, updateUser, onboardingStep, updateOnboardingStep, savePendingEmail, getPendingEmail, clearPendingEmail]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
