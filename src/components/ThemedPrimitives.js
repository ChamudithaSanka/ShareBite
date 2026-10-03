import React from 'react';
import {
  ActivityIndicator as NativeActivityIndicator,
  FlatList as NativeFlatList,
  ScrollView as NativeScrollView,
  StyleSheet,
  StatusBar as NativeStatusBar,
  Text as NativeText,
  TextInput as NativeTextInput,
  TouchableOpacity as NativeTouchableOpacity,
  View as NativeView,
} from 'react-native';
import { SafeAreaView as NativeSafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';

const DARK_TINTS = {
  '#E8F5EE': '#234C35',
  '#F0FAF4': '#234C35',
  '#FEF3C7': '#493817',
  '#FFFBF0': '#493817',
  '#EFF6FF': '#1B314D',
  '#F0F7FF': '#1B314D',
  '#FDECEC': '#452522',
  '#FDE8E4': '#452522',
  '#F5F3FF': '#302844',
};

function themedColor(value, property, colors, isDark, background = 'surface') {
  if (typeof value !== 'string' || !isDark) return value;

  const color = value.toUpperCase();
  if (property === 'color') {
    if (color === '#111827' || color === '#1F2937') return colors.text;
    if (color === '#374151' || color === '#4B5563' || color === '#6B7280') return colors.textSecondary;
    if (color === '#9CA3AF') return colors.textMuted;
    if (color === '#1A7A4A') return colors.primary;
    if (color === '#D97706') return '#F4C56E';
    if (color === '#2563EB') return '#8BB8FF';
    if (color === '#B42318' || color === '#E05A2B' || color === '#EF4444') return colors.danger;
    if (color === '#2E9D61') return colors.primary;
    return value;
  }

  if (property.toLowerCase().includes('border') && ['#E5E7EB', '#D1D5DB'].includes(color)) {
    return colors.border;
  }
  if (property.toLowerCase().includes('background')) {
    if (color === '#FFFFFF') return background === 'page' ? colors.background : colors.surface;
    if (color === '#F9FAFB' || color === '#F3F4F6') return colors.surfaceMuted;
    if (color === '#1A7A4A') return value;
    if (color === '#E5E7EB' || color === '#D1D5DB') return colors.surfaceMuted;
    if (DARK_TINTS[color]) return DARK_TINTS[color];
    if (color === '#E8F5EE' || color === '#F0FAF4') return colors.primarySoft;
  }

  return value;
}

function themedStyle(style, colors, isDark, background = 'surface') {
  const flatStyle = StyleSheet.flatten(style);
  if (!flatStyle || typeof flatStyle !== 'object' || Array.isArray(flatStyle)) return style;

  return Object.fromEntries(Object.entries(flatStyle).map(([key, value]) => [
    key,
    isDark && (key === 'borderTopWidth' || key === 'borderBottomWidth')
      ? 0
      : themedColor(value, key, colors, isDark, background),
  ]));
}

export function ThemedView({ style, ...props }) {
  const { colors, isDark } = useTheme();
  return <NativeView {...props} style={themedStyle(style, colors, isDark)} />;
}

export function ThemedText({ style, ...props }) {
  const { colors, isDark } = useTheme();
  return <NativeText {...props} style={themedStyle(style, colors, isDark)} />;
}

export function ThemedTouchableOpacity({ style, ...props }) {
  const { colors, isDark } = useTheme();
  return <NativeTouchableOpacity {...props} style={themedStyle(style, colors, isDark)} />;
}

export function ThemedScrollView({ style, contentContainerStyle, ...props }) {
  const { colors, isDark } = useTheme();
  return (
    <NativeScrollView
      {...props}
      style={themedStyle(style, colors, isDark, 'page')}
      contentContainerStyle={themedStyle(contentContainerStyle, colors, isDark)}
    />
  );
}

export function ThemedFlatList({ style, contentContainerStyle, ...props }) {
  const { colors, isDark } = useTheme();
  return (
    <NativeFlatList
      {...props}
      style={themedStyle(style, colors, isDark, 'page')}
      contentContainerStyle={themedStyle(contentContainerStyle, colors, isDark)}
    />
  );
}

export function ThemedSafeAreaView({ style, ...props }) {
  const { colors, isDark } = useTheme();
  return <NativeSafeAreaView {...props} style={themedStyle(style, colors, isDark, 'page')} />;
}

export function ThemedTextInput({ style, placeholderTextColor, ...props }) {
  const { colors, isDark } = useTheme();
  return (
    <NativeTextInput
      {...props}
      style={themedStyle(style, colors, isDark)}
      placeholderTextColor={themedColor(placeholderTextColor, 'color', colors, isDark)}
    />
  );
}

export function ThemedActivityIndicator({ color, ...props }) {
  const { colors, isDark } = useTheme();
  return <NativeActivityIndicator {...props} color={themedColor(color, 'color', colors, isDark)} />;
}

export function ThemedStatusBar({ barStyle, backgroundColor, ...props }) {
  const { colors, isDark } = useTheme();
  return (
    <NativeStatusBar
      {...props}
      barStyle={isDark ? 'light-content' : barStyle}
      backgroundColor={themedColor(backgroundColor, 'backgroundColor', colors, isDark, 'page')}
    />
  );
}