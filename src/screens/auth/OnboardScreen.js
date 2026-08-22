import React from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, SafeAreaView,
} from 'react-native';
import { Image } from 'expo-image';
import { useFonts } from 'expo-font';

export default function OnboardScreen({ navigation }) {
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
        <Text style={[styles.appName, fontsLoaded && styles.customAppName]}>
          Share<Text style={styles.biteAccent}>Bite</Text>
        </Text>
        <Text style={styles.tagline}>
          SHARE FOOD • SHARE HOPE
        </Text>
      </View>

      <View style={styles.actions}>
        <TouchableOpacity
          style={styles.btnPrimary}
          onPress={() => navigation.navigate('Register')}
        >
          <Text style={styles.btnPrimaryText}>Get started</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.btnSecondary}
          onPress={() => navigation.navigate('Login')}
        >
          <Text style={styles.btnSecondaryText}>Sign in</Text>
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
    width: 130,
    height: 120,
    borderRadius: 28,
    overflow: 'hidden',
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 0,
  },
  iconText: { fontSize: 44 },
  logo: { width: 180, height: 140, borderRadius: 10 },
  appName: {
    fontSize: 36,
    fontWeight: '700',
    color: '#1A7A4A',
    letterSpacing: 2,
    marginBottom: -20,
  },
  customAppName: {
    fontFamily: 'BilderbergItalic',
  },
  biteAccent: {
    color: '#FBBF24',
  },
  tagline: {
    fontSize: 16,
    color: '#1A7A4A',
    textAlign: 'center',
    fontWeight: '500',
    lineHeight: 24,
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
