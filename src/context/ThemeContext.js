import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { Appearance, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const THEME_STORAGE_KEY = 'sharebite-theme';

const LIGHT_COLORS = {
  background: '#F9FAFB',
  surface: '#FFFFFF',
  surfaceMuted: '#F3F4F6',
  border: '#E5E7EB',
  divider: '#F3F4F6',
  text: '#111827',
  textSecondary: '#6B7280',
  textMuted: '#9CA3AF',
  primary: '#1A7A4A',
  primarySoft: '#E8F5EE',
  danger: '#E05A2B',
};

const DARK_COLORS = {
  background: '#101713',
  surface: '#18231D',
  surfaceMuted: '#223029',
  border: '#304238',
  divider: '#2A3931',
  text: '#F3F7F4',
  textSecondary: '#B5C4BA',
  textMuted: '#8D9D92',
  primary: '#72D69A',
  primarySoft: '#234C35',
  danger: '#FF9A78',
};

const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  const [isDark, setIsDark] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(THEME_STORAGE_KEY)
      .then((value) => setIsDark(value === 'dark'))
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, []);

  useEffect(() => {
    if (!loaded || Platform.OS === 'web') return;
    Appearance.setColorScheme(isDark ? 'dark' : 'light');
  }, [isDark, loaded]);

  const setDarkMode = async (enabled) => {
    setIsDark(enabled);
    try {
      await AsyncStorage.setItem(THEME_STORAGE_KEY, enabled ? 'dark' : 'light');
    } catch (error) {
      // Keep the current session theme even if persistence is unavailable.
    }
  };

  const value = useMemo(() => ({
    colors: isDark ? DARK_COLORS : LIGHT_COLORS,
    isDark,
    loaded,
    setDarkMode,
  }), [isDark, loaded]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export const useTheme = () => useContext(ThemeContext);

export default ThemeContext;
