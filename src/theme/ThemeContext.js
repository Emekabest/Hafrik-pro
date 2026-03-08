/**
 * ThemeContext — light mode only.
 * Dark mode has been removed. useTheme() always returns LightColors.
 * The ThemeProvider and useTheme hook are kept so existing imports don't break.
 */
import React, { createContext, useContext, useMemo } from 'react';
import { Colors } from './colors';

const LightColors = {
  background:      Colors.background,
  surface:         Colors.white,
  surfaceTint:     Colors.surfaceTint,
  card:            Colors.white,
  text:            Colors.deepSlate,
  textSecondary:   Colors.secondaryText,
  textMuted:       Colors.mutedText,
  border:          Colors.border,
  headerBg:        Colors.primaryDark,
  headerText:      Colors.white,
  inputBg:         Colors.neutral130,
  inputText:       Colors.deepSlate,
  inputPlaceholder: Colors.placeholder,
  tabBarBg:        Colors.white,
  tabBarBorder:    Colors.border,
  iconDefault:     Colors.neutral700,
  statusBar:       'light',
};

const ThemeContext = createContext();

export const useTheme = () => {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within a ThemeProvider');
  return ctx;
};

export const ThemeProvider = ({ children }) => {
  const value = useMemo(() => ({
    isDark:      false,
    colors:      LightColors,
    toggleTheme: () => {},
    setTheme:    () => {},
    loaded:      true,
  }), []);

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};
