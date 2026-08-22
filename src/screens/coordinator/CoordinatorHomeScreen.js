import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useAuth } from '../../context/AuthContext';

export default function CoordinatorHomeScreen() {
  const { userProfile, signOut } = useAuth();

  return (
    <View style={styles.container}>
      <Text style={styles.emoji}>👨‍💼</Text>
      <Text style={styles.welcome}>Welcome back,</Text>
      <Text style={styles.name}>{userProfile?.name || 'Coordinator'}</Text>
      <View style={styles.roleBadge}>
        <Text style={styles.roleText}>{userProfile?.role || 'Coordinator'}</Text>
      </View>

      <View style={styles.content}>
        <Text style={styles.subtitle}>Dashboard coming soon.</Text>
      </View>

      <TouchableOpacity style={styles.logoutBtn} onPress={signOut}>
        <Text style={styles.logoutText}>Log Out</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emoji: {
    fontSize: 64,
    marginBottom: 16,
  },
  welcome: {
    fontSize: 16,
    color: '#6B7280',
    marginBottom: 4,
  },
  name: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 8,
  },
  roleBadge: {
    backgroundColor: '#DEF7EC',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginBottom: 32,
  },
  roleText: {
    color: '#03543F',
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  content: {
    padding: 24,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    width: '100%',
    alignItems: 'center',
    marginBottom: 32,
  },
  subtitle: {
    color: '#6B7280',
    fontStyle: 'italic',
  },
  logoutBtn: {
    padding: 16,
  },
  logoutText: {
    color: '#EF4444',
    fontWeight: '600',
  }
});
