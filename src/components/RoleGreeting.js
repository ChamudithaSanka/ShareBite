import React from 'react';
import { StyleSheet, View } from 'react-native';
import LocalizedText from './LocalizedText';

export default function RoleGreeting({
  greeting,
  name,
  fallbackName,
  role,
  textColor = '#111827',
  secondaryColor = '#6B7280',
  accentColor = '#1A7A4A',
}) {
  const fullName = typeof name === 'string' ? name.trim() : '';
  const firstName = (fullName || fallbackName || 'there').split(/\s+/)[0];

  return (
    <View>
      <LocalizedText style={[styles.greeting, { color: secondaryColor }]}>{greeting}</LocalizedText>
      <LocalizedText style={[styles.name, { color: textColor }]}>{firstName}</LocalizedText>
      <LocalizedText style={[styles.role, { color: accentColor }]}>{role}</LocalizedText>
    </View>
  );
}

const styles = StyleSheet.create({
  greeting: { fontSize: 13, fontWeight: '600', marginBottom: 3 },
  name: { fontSize: 22, fontWeight: '800' },
  role: { fontSize: 12, fontWeight: '700', marginTop: 4 },
});