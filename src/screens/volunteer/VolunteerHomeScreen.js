import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useAuth } from '../../context/AuthContext';

export default function VolunteerHomeScreen() {
  const { userProfile } = useAuth();
  const name = userProfile?.name || 'Volunteer';

  return (
    <View style={styles.container}>
      <Text style={styles.emoji}>🚴</Text>
      <Text style={styles.greeting}>Ready to help,</Text>
      <Text style={styles.title}>{name}</Text>
      <Text style={styles.role}>Volunteer</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
  },
  emoji: { fontSize: 48, marginBottom: 16 },
  greeting: { fontSize: 16, color: '#6B7280', marginBottom: 4 },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: '#111827',
  },
  role: {
    fontSize: 14,
    color: '#1A7A4A',
    fontWeight: '700',
    marginTop: 8,
  },
});
