import React, { useState } from 'react';
import {
  View, TouchableOpacity,
  StyleSheet, ActivityIndicator, KeyboardAvoidingView,
  Platform, ScrollView,
} from 'react-native';
import LocalizedText from '../../components/LocalizedText';
import LocalizedTextInput from '../../components/LocalizedTextInput';
import { useLanguage } from '../../context/LanguageContext';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../../config/firebase';

const GREEN = '#1A7A4A';
const ROLES = ['Donor', 'Recipient', 'Volunteer', 'Coordinator'];
const ROLE_EMOJI = { Donor: '🤝', Recipient: '🍽️', Volunteer: '🚴', Coordinator: '🏪' };
const ROLE_TRANSLATION_KEYS = {
  Donor: 'auth.roleDonor',
  Recipient: 'auth.roleRecipient',
  Volunteer: 'auth.roleVolunteer',
  Coordinator: 'auth.roleCoordinator',
};
const ROLE_DESCRIPTION_KEYS = {
  Donor: 'auth.shareSurplus',
  Recipient: 'auth.requestFood',
  Volunteer: 'auth.deliverFood',
  Coordinator: 'auth.manageStorage',
};

export default function RegisterScreen({ navigation }) {
  const { t } = useLanguage();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [selectedRole, setSelectedRole] = useState('Donor');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleRegister = async () => {
    if (!name || !email || !phone || !password) {
      setError(t('auth.fillFields'));
      return;
    }
    setError('');
    setLoading(true);
    try {
      const { user } = await createUserWithEmailAndPassword(auth, email, password);
      await setDoc(doc(db, 'users', user.uid), {
        name,
        email,
        phone,
        role: selectedRole.toLowerCase(),
        createdAt: serverTimestamp(),
      });
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
          <LocalizedText style={styles.title}>{t('auth.createAccount')}</LocalizedText>
          <LocalizedText style={styles.subtitle}>{t('auth.joinCommunity')}</LocalizedText>
        </View>

        {error ? <LocalizedText style={styles.errorText}>{error}</LocalizedText> : null}

        <View style={styles.fieldGroup}>
          <LocalizedText style={styles.label}>{t('auth.fullName')}</LocalizedText>
          <LocalizedTextInput style={styles.input} placeholder={t('auth.yourName')} value={name} onChangeText={setName} />
        </View>

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
          <LocalizedText style={styles.label}>{t('auth.phone')}</LocalizedText>
          <LocalizedTextInput
            style={styles.input}
            placeholder={t('auth.phonePlaceholder')}
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
          />
        </View>

        <View style={styles.fieldGroup}>
          <LocalizedText style={styles.label}>{t('auth.password')}</LocalizedText>
          <LocalizedTextInput
            style={styles.input}
            placeholder={t('auth.passwordPlaceholder')}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />
        </View>

        <View style={styles.fieldGroup}>
          <LocalizedText style={styles.label}>{t('auth.joinAs')}</LocalizedText>
          <View style={styles.roleGrid}>
            {ROLES.map((role) => (
              <TouchableOpacity
                key={role}
                style={[styles.roleCard, selectedRole === role && styles.roleCardActive]}
                onPress={() => setSelectedRole(role)}
              >
                <LocalizedText style={styles.roleEmoji}>{ROLE_EMOJI[role]}</LocalizedText>
                <LocalizedText style={[styles.roleName, selectedRole === role && styles.roleNameActive]}>
                  {t(ROLE_TRANSLATION_KEYS[role])}
                </LocalizedText>
                <LocalizedText style={styles.roleDesc}>{t(ROLE_DESCRIPTION_KEYS[role])}</LocalizedText>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <TouchableOpacity
          style={[styles.btnPrimary, loading && styles.btnDisabled]}
          onPress={handleRegister}
          disabled={loading}
        >
          {loading
            ? <ActivityIndicator color="#fff" />
            : <LocalizedText style={styles.btnPrimaryText}>{t('auth.createAccount')}</LocalizedText>}
        </TouchableOpacity>

        <TouchableOpacity onPress={() => navigation.navigate('Login')}>
          <LocalizedText style={styles.linkText}>
            {t('auth.alreadyHaveAccount')} <LocalizedText style={styles.linkBold}>{t('onboarding.signIn')}</LocalizedText>
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
    backgroundColor: '#fff',
  },
  header: { marginBottom: 24, marginTop: 16 },
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
  },
  roleGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  roleCard: {
    width: '47%',
    padding: 14,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    backgroundColor: '#fff',
  },
  roleCardActive: {
    borderColor: GREEN,
    backgroundColor: '#F0FAF4',
  },
  roleEmoji: { fontSize: 22, marginBottom: 4 },
  roleName: { fontSize: 14, fontWeight: '700', color: '#1F2937' },
  roleNameActive: { color: GREEN },
  roleDesc: { fontSize: 12, color: '#6B7280', marginTop: 2 },
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
  linkText: { textAlign: 'center', fontSize: 13, color: '#6B7280', marginBottom: 24 },
  linkBold: { color: GREEN, fontWeight: '700' },
});