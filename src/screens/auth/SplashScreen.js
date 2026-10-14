import React, { useEffect } from 'react';
import { Image, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLanguage } from '../../context/LanguageContext';

const SPLASH_DURATION = 3000;

export default function SplashScreen({ navigation }) {
  const { languageSelected } = useLanguage();

  useEffect(() => {
    const timer = setTimeout(() => {
      navigation.replace(languageSelected ? 'Onboard' : 'LanguageSelection');
    }, SPLASH_DURATION);

    return () => clearTimeout(timer);
  }, [languageSelected, navigation]);

  return (
    <SafeAreaView style={styles.container}>
      <Image
        source={require('../../../assets/splash.png')}
        style={styles.image}
        resizeMode="contain"
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  image: {
    width: '50%',
    height: '50%',
  },
});
