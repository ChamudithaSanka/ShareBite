import React, { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useTabBarContentPadding } from '../../hooks';

const GREEN = '#1A7A4A';
const DEFAULT_PREFERENCES = {
  deliveryAssignments: true,
  deliveryStatusUpdates: true,
};

export default function VolunteerNotificationSettingsScreen({ navigation }) {
  const { userProfile, updateUserProfile } = useAuth();
  const { colors, isDark } = useTheme();
  const tabBarContentPadding = useTabBarContentPadding();
  const [preferences, setPreferences] = useState({
    ...DEFAULT_PREFERENCES,
    ...(userProfile?.notificationPreferences || {}),
  });
  const [saving, setSaving] = useState(false);

  const togglePreference = (key) => {
    setPreferences((current) => ({ ...current, [key]: !current[key] }));
  };

  const savePreferences = () => {
    Alert.alert('Save notification preferences?', 'Your delivery notification choices will be updated.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Save changes',
        onPress: async () => {
          setSaving(true);
          try {
            await updateUserProfile({ notificationPreferences: preferences });
            Alert.alert('Preferences saved', 'Your notification choices have been updated.');
          } catch (error) {
            Alert.alert('Unable to save', 'Please check your connection and try again.');
          } finally {
            setSaving(false);
          }
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={[styles.backButton, { backgroundColor: colors.surface, borderColor: colors.border }]} accessibilityLabel="Go back">
          <Ionicons name="arrow-back" size={21} color={colors.text} />
        </Pressable>
        <View style={styles.headerCopy}>
          <Text style={[styles.eyebrow, { color: colors.primary }]}>PREFERENCES</Text>
          <Text style={[styles.title, { color: colors.text }]}>Notifications</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: tabBarContentPadding }]} showsVerticalScrollIndicator={false}>
        <Text style={[styles.intro, { color: colors.textSecondary }]}>Choose which delivery updates you want to receive.</Text>
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.option}>
            <View style={[styles.optionIcon, { backgroundColor: colors.primarySoft }]}><Ionicons name="bicycle-outline" size={21} color={colors.primary} /></View>
            <View style={styles.optionCopy}>
              <Text style={[styles.optionTitle, { color: colors.text }]}>Delivery assignments</Text>
              <Text style={[styles.optionSubtitle, { color: colors.textSecondary }]}>Get notified when a delivery is assigned to you.</Text>
            </View>
            <Switch
              value={preferences.deliveryAssignments}
              onValueChange={() => togglePreference('deliveryAssignments')}
              trackColor={{ false: '#D1D5DB', true: '#A7DDBA' }}
              thumbColor={preferences.deliveryAssignments ? GREEN : '#F9FAFB'}
              accessibilityLabel="Delivery assignments notifications"
            />
          </View>
          <View style={[styles.separator, { backgroundColor: colors.divider }]} />
          <View style={styles.option}>
            <View style={[styles.optionIcon, { backgroundColor: colors.primarySoft }]}><Ionicons name="navigate-outline" size={21} color={colors.primary} /></View>
            <View style={styles.optionCopy}>
              <Text style={[styles.optionTitle, { color: colors.text }]}>Delivery status updates</Text>
              <Text style={[styles.optionSubtitle, { color: colors.textSecondary }]}>Get notified when your delivery status changes.</Text>
            </View>
            <Switch
              value={preferences.deliveryStatusUpdates}
              onValueChange={() => togglePreference('deliveryStatusUpdates')}
              trackColor={{ false: '#D1D5DB', true: '#A7DDBA' }}
              thumbColor={preferences.deliveryStatusUpdates ? GREEN : '#F9FAFB'}
              accessibilityLabel="Delivery status notifications"
            />
          </View>
        </View>

        <Text style={[styles.note, { color: colors.textMuted }]}>These preferences are saved to your ShareBite account. Notification delivery will be connected when push notifications are enabled.</Text>
        <Pressable onPress={savePreferences} disabled={saving} style={[styles.saveButton, { backgroundColor: colors.primary }, saving && styles.disabledButton]}>
          <Text style={[styles.saveButtonText, { color: isDark ? '#102218' : '#FFFFFF' }]}>{saving ? 'Saving...' : 'Save preferences'}</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { backgroundColor: '#F9FAFB', flex: 1, padding: 20 },
  header: { alignItems: 'center', flexDirection: 'row', marginBottom: 20, marginTop: 8 },
  backButton: { alignItems: 'center', backgroundColor: '#FFFFFF', borderColor: '#E5E7EB', borderRadius: 20, borderWidth: 1, height: 40, justifyContent: 'center', width: 40 },
  headerCopy: { marginLeft: 12 },
  eyebrow: { color: GREEN, fontSize: 10, fontWeight: '800', letterSpacing: 1 },
  title: { color: '#111827', fontSize: 27, fontWeight: '800', marginTop: 4 },
  content: { paddingBottom: 120 },
  intro: { color: '#6B7280', fontSize: 14, lineHeight: 20, marginBottom: 14 },
  card: { backgroundColor: '#FFFFFF', borderColor: '#E5E7EB', borderRadius: 17, borderWidth: 1, paddingHorizontal: 14 },
  option: { alignItems: 'center', flexDirection: 'row', minHeight: 88 },
  optionIcon: { alignItems: 'center', backgroundColor: '#E8F5EE', borderRadius: 12, height: 42, justifyContent: 'center', width: 42 },
  optionCopy: { flex: 1, marginLeft: 11, marginRight: 9 },
  optionTitle: { color: '#1F2937', fontSize: 14, fontWeight: '800' },
  optionSubtitle: { color: '#6B7280', fontSize: 11, lineHeight: 16, marginTop: 3 },
  separator: { backgroundColor: '#F0F3F1', height: 1 },
  note: { color: '#9CA3AF', fontSize: 11, lineHeight: 16, marginTop: 16 },
  saveButton: { alignItems: 'center', backgroundColor: GREEN, borderRadius: 14, marginTop: 22, paddingVertical: 15 },
  saveButtonText: { color: '#FFFFFF', fontSize: 15, fontWeight: '800' },
  disabledButton: { opacity: 0.6 },
});
