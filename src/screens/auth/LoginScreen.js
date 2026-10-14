import React, { useState } from 'react';
import {
  View, TouchableOpacity,
  StyleSheet, ActivityIndicator, KeyboardAvoidingView,
  Platform, ScrollView,
} from 'react-native';
import LocalizedText from '../../components/LocalizedText';
import LocalizedTextInput from '../../components/LocalizedTextInput';
import { useLanguage } from '../../context/LanguageContext';
import { Image } from 'expo-image';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../../config/firebase';

const GREEN = '#1A7A4A';

export default function LoginScreen({ navigation }) {
  const { t } = useLanguage();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async () => {
    if (!email || !password) {
      setError(t('auth.fillFields'));
      return;
    }
    setError('');
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      // AuthContext onAuthStateChanged handles navigation automatically
    } catch (err) {
      setError(err.message.replace('Firebase: ', '').replace(/ \(auth\/.*\)\.?/, ''));
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Image
            source={require('../../../assets/splash.png')}
            style={styles.logo}
            contentFit="contain"
            cachePolicy="memory-disk"
            transition={0}
          />
          <LocalizedText style={styles.title}>{t('auth.welcome')}</LocalizedText>
          <LocalizedText style={styles.subtitle}>{t('auth.signInToAccount')}</LocalizedText>
        </View>

        {error ? <LocalizedText style={styles.errorText}>{error}</LocalizedText> : null}

        <View style={styles.fieldGroup}>
          <LocalizedText style={styles.label}>{t('auth.email')}</LocalizedText>
          <LocalizedTextInput
            style={styles.input}
            placeholder={t('auth.emailPlaceholder')}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
          />
        </View>

        <View style={styles.fieldGroup}>
          <LocalizedText style={styles.label}>{t('auth.password')}</LocalizedText>
          <LocalizedTextInput
            style={styles.input}
            placeholder="••••••••"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />
        </View>

        <TouchableOpacity
          style={[styles.btnPrimary, loading && styles.btnDisabled]}
          onPress={handleLogin}
          disabled={loading}
        >
          {loading
            ? <ActivityIndicator color="#fff" />
            : <LocalizedText style={styles.btnPrimaryText}>{t('onboarding.signIn')}</LocalizedText>}
        </TouchableOpacity>

        <TouchableOpacity onPress={() => navigation.navigate('Register')}>
          <LocalizedText style={styles.linkText}>
            {t('auth.dontHaveAccount')} <LocalizedText style={styles.linkBold}>{t('auth.register')}</LocalizedText>
          </LocalizedText>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 24,
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  logo: { width: 120, height: 120, borderRadius: 60, marginBottom: 10 },
  title: { fontSize: 26, fontWeight: '800', color: '#111827', letterSpacing: -0.3 },
  subtitle: { fontSize: 14, color: '#6B7280', marginTop: 4 },
  errorText: {
    color: '#E05A2B',
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 12,
    textAlign: 'center',
  },
  fieldGroup: { marginBottom: 16 },
  label: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 6 },
  input: {
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 12,
    fontSize: 15,
    color: '#111827',
    backgroundColor: '#fff',
  },
  btnPrimary: {
    backgroundColor: GREEN,
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 20,
  },
  btnDisabled: { opacity: 0.6 },
  btnPrimaryText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  linkText: { textAlign: 'center', fontSize: 13, color: '#6B7280' },
  linkBold: { color: GREEN, fontWeight: '700' },
});