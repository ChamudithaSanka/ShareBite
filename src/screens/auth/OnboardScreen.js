import React from 'react';
import {
  View, TouchableOpacity, StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { useFonts } from 'expo-font';
import LocalizedText from '../../components/LocalizedText';
import { useLanguage } from '../../context/LanguageContext';

export default function OnboardScreen({ navigation }) {
  const { t } = useLanguage();
  const [fontsLoaded] = useFonts({
    BilderbergItalic: require('../../../assets/Bilderberg Italic OTF.otf'),
  });

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.hero}>
        <View style={styles.iconBox}>
          <Image
            source={require('../../../assets/onboard.png')}
            style={styles.logo}
            contentFit="contain"
            cachePolicy="memory-disk"
            transition={0}
          />
        </View>
        <LocalizedText style={[styles.appName, fontsLoaded && styles.customAppName]}>
          Share<LocalizedText style={styles.biteAccent}>Bite</LocalizedText>
        </LocalizedText>
        <LocalizedText style={styles.tagline}>{t('onboarding.tagline')}</LocalizedText>
      </View>

      <View style={styles.actions}>
        <TouchableOpacity
          style={styles.btnPrimary}
          onPress={() => navigation.navigate('Register')}
        >
          <LocalizedText style={styles.btnPrimaryText}>{t('onboarding.getStarted')}</LocalizedText>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.btnSecondary}
          onPress={() => navigation.navigate('Login')}
        >
          <LocalizedText style={styles.btnSecondaryText}>{t('onboarding.signIn')}</LocalizedText>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const GREEN = '#ffffff';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: GREEN,
    justifyContent: 'space-between',
    paddingBottom: 40,
  },
  hero: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingTop: 40,
  },
  iconBox: {
    width: 140,
    height: 130,
    borderRadius: 28,
    overflow: 'hidden',
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  iconText: { fontSize: 44 },
  logo: { width: '100%', height: '100%', borderRadius: 10 },
  appName: {
    fontSize: 36,
    fontWeight: '700',
    color: '#1A7A4A',
    letterSpacing: 2,
    marginBottom: 8,
  },
  customAppName: {
    fontFamily: 'BilderbergItalic',
  },
  biteAccent: {
    color: '#FBBF24',
  },
  tagline: {
    fontSize: 14,
    color: '#1A7A4A',
    textAlign: 'center',
    fontWeight: '600',
    letterSpacing: 1.5,
    marginBottom: 28,
  },
  roles: {
    flexDirection: 'row',
    gap: 16,
  },
  roleTag: {
    fontSize: 13,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.85)',
  },
  actions: {
    paddingHorizontal: 24,
    gap: 12,
  },
  btnPrimary: {
    backgroundColor: '#1A7A4A',
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
  },
  btnPrimaryText: {
    fontSize: 16,
    fontWeight: '700',
    color: GREEN,
  },
  btnSecondary: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
  },
  btnSecondaryText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A7A4A',
  },
});
