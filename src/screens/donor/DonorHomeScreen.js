import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useAuth } from '../../context/AuthContext';

export default function DonorHomeScreen() {
  const { userProfile } = useAuth();
  const name = userProfile?.name || 'Donor';
  const role = userProfile?.role || 'donor';

  return (
    <View style={styles.container}>
      <Text style={styles.eyebrow}>Donor</Text>
      <Text style={styles.title}>Welcome, {name}</Text>
      <Text style={styles.role}>Role: {role}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 24,
  },
  eyebrow: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6B7280',
    textTransform: 'uppercase',
    letterSpacing: 0.08,
    marginBottom: 8,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 8,
    textAlign: 'center',
  },
  role: {
    fontSize: 16,
    color: '#4B5563',
    textTransform: 'capitalize',
  },
});
