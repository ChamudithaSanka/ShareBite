import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ActivityIndicator, KeyboardAvoidingView,
  Platform, ScrollView,
} from 'react-native';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../../config/firebase';

const GREEN = '#1A7A4A';
const ROLES = ['Donor', 'Recipient', 'Volunteer', 'Coordinator'];
const ROLE_EMOJI = { Donor: '🤝', Recipient: '🍽️', Volunteer: '🚴', Coordinator: '🏪' };
const ROLE_DESC = {
  Donor: 'Share surplus food',
  Recipient: 'Request food',
  Volunteer: 'Deliver food',
  Coordinator: 'Manage storage',
};

export default function RegisterScreen({ navigation }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [selectedRole, setSelectedRole] = useState('Recipient');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleRegister = async () => {
    if (!name || !email || !phone || !password) {
      setError('Please fill in all fields.');
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
          <Text style={styles.title}>Create account</Text>
          <Text style={styles.subtitle}>Join the ShareBite community</Text>
        </View>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Full name</Text>
          <TextInput style={styles.input} placeholder="Your name" value={name} onChangeText={setName} />
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Email</Text>
          <TextInput
            style={styles.input}
            placeholder="you@email.com"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
          />
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Phone number</Text>
          <TextInput
            style={styles.input}
            placeholder="+94 77 123 4567"
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
          />
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Password</Text>
          <TextInput
            style={styles.input}
            placeholder="Min. 6 characters"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.label}>I want to join as</Text>
          <View style={styles.roleGrid}>
            {ROLES.map((role) => (
              <TouchableOpacity
                key={role}
                style={[styles.roleCard, selectedRole === role && styles.roleCardActive]}
                onPress={() => setSelectedRole(role)}
              >
                <Text style={styles.roleEmoji}>{ROLE_EMOJI[role]}</Text>
                <Text style={[styles.roleName, selectedRole === role && styles.roleNameActive]}>
                  {role}
                </Text>
                <Text style={styles.roleDesc}>{ROLE_DESC[role]}</Text>
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
            : <Text style={styles.btnPrimaryText}>Create account</Text>}
        </TouchableOpacity>

        <TouchableOpacity onPress={() => navigation.navigate('Login')}>
          <Text style={styles.linkText}>
            Already have an account? <Text style={styles.linkBold}>Sign in</Text>
          </Text>
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