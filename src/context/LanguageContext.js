import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Alert } from 'react-native';
import { useFonts } from 'expo-font';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LANGUAGE_OPTIONS, translate, translateText } from '../i18n/translations';

const LANGUAGE_STORAGE_KEY = 'sharebite-language';
const FONT_SIZE_STORAGE_KEY = 'sharebite-font-size-percent';
const FONT_SIZE_MIN = 80;
const FONT_SIZE_MAX = 140;
const FONT_SIZE_STEP = 10;
const LANGUAGE_CODES = new Set(LANGUAGE_OPTIONS.map(({ code }) => code));
const LANGUAGE_FONTS = {
  en: undefined,
  si: 'NotoSansSinhala',
  ta: 'NotoSansTamil',
};

const LanguageContext = createContext(null);

export function LanguageProvider({ children }) {
  const [language, setLanguageState] = useState('en');
  const [fontSizePercent, setFontSizePercent] = useState(100);
  const [isSelected, setIsSelected] = useState(false);
  const [storageReady, setStorageReady] = useState(false);
  const [storageError, setStorageError] = useState(null);
  const [fontsLoaded, fontError] = useFonts({
    NotoSansSinhala: require('../../assets/fonts/NotoSansSinhala.ttf'),
    NotoSansTamil: require('../../assets/fonts/NotoSansTamil.ttf'),
  });

  useEffect(() => {
    let active = true;
    Promise.all([
      AsyncStorage.getItem(LANGUAGE_STORAGE_KEY),
      AsyncStorage.getItem(FONT_SIZE_STORAGE_KEY),
    ])
      .then(([storedLanguage, storedFontSize]) => {
        if (!active) return;
        if (LANGUAGE_CODES.has(storedLanguage)) {
          setLanguageState(storedLanguage);
          setIsSelected(true);
        }
        const parsedFontSize = Number(storedFontSize);
        if (
          Number.isInteger(parsedFontSize)
          && parsedFontSize >= FONT_SIZE_MIN
          && parsedFontSize <= FONT_SIZE_MAX
          && (parsedFontSize - FONT_SIZE_MIN) % FONT_SIZE_STEP === 0
        ) {
          setFontSizePercent(parsedFontSize);
        }
      })
      .catch((error) => {
        if (active) setStorageError(error);
      })
      .finally(() => {
        if (active) setStorageReady(true);
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (fontError) console.error('Failed to load language fonts:', fontError);
  }, [fontError]);

  useEffect(() => {
    const nativeAlert = Alert.alert;
    const localizedAlert = (title, message, buttons, options) => nativeAlert(
      translateText(language, title),
      message ? translateText(language, message) : message,
      buttons?.map((button) => ({
        ...button,
        text: button.text ? translateText(language, button.text) : button.text,
      })),
      options,
    );

    Alert.alert = localizedAlert;
    return () => {
      if (Alert.alert === localizedAlert) Alert.alert = nativeAlert;
    };
  }, [language]);

  const setLanguage = useCallback(async (nextLanguage) => {
    if (!LANGUAGE_CODES.has(nextLanguage)) {
      throw new Error(`Unsupported language: ${nextLanguage}`);
    }

    await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, nextLanguage);
    setLanguageState(nextLanguage);
    setIsSelected(true);
  }, []);

  const changeFontSize = useCallback(async (direction) => {
    if (direction !== -1 && direction !== 1) {
      throw new Error(`Unsupported font size direction: ${direction}`);
    }

    const nextFontSize = Math.min(
      FONT_SIZE_MAX,
      Math.max(FONT_SIZE_MIN, fontSizePercent + direction * FONT_SIZE_STEP),
    );
    if (nextFontSize === fontSizePercent) return;

    await AsyncStorage.setItem(FONT_SIZE_STORAGE_KEY, String(nextFontSize));
    setFontSizePercent(nextFontSize);
  }, [fontSizePercent]);

  const t = useCallback((key, values) => translate(language, key, values), [language]);
  const value = useMemo(() => ({
    language,
    fontScale: fontSizePercent / 100,
    fontSizePercent,
    canDecreaseFontSize: fontSizePercent > FONT_SIZE_MIN,
    canIncreaseFontSize: fontSizePercent < FONT_SIZE_MAX,
    languageSelected: isSelected,
    ready: storageReady && (fontsLoaded || Boolean(fontError)),
    error: storageError || fontError,
    fontFamily: LANGUAGE_FONTS[language],
    setLanguage,
    changeFontSize,
    t,
  }), [language, fontSizePercent, isSelected, storageReady, fontsLoaded, fontError, storageError, setLanguage, changeFontSize, t]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) throw new Error('useLanguage must be used inside LanguageProvider.');
  return context;
}
