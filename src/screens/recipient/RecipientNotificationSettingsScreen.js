import React, { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useTabBarContentPadding } from '../../hooks';

const DEFAULT_PREFERENCES = {
  recipientRequestDecisions: true,
  recipientDeliveryAssignments: true,
  recipientDeliveryProgress: true,
};

const OPTIONS = [
  { key: 'recipientRequestDecisions', icon: 'checkmark-circle-outline', title: 'Approval and decline', subtitle: 'Know when a coordinator approves or declines a request.' },
  { key: 'recipientDeliveryAssignments', icon: 'bicycle-outline', title: 'Volunteer assignment', subtitle: 'Know when a volunteer accepts your delivery.' },
  { key: 'recipientDeliveryProgress', icon: 'navigate-outline', title: 'Delivery progress', subtitle: 'Get updates for pickup, transit, arrival, and delivery.' },
];

export default function RecipientNotificationSettingsScreen({ navigation }) {
  const { userProfile, updateUserProfile } = useAuth();
  const { colors, isDark } = useTheme();
  const tabBarContentPadding = useTabBarContentPadding();
  const [preferences, setPreferences] = useState({
    ...DEFAULT_PREFERENCES,
    ...(userProfile?.notificationPreferences || {}),
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setPreferences({ ...DEFAULT_PREFERENCES, ...(userProfile?.notificationPreferences || {}) });
  }, [userProfile?.notificationPreferences]);

  const togglePreference = (key) => {
    setPreferences((current) => ({ ...current, [key]: !current[key] }));
  };

  const savePreferences = () => {
    Alert.alert('Save notification preferences?', 'Your request notification choices will be updated.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Save changes',
        onPress: async () => {
          setSaving(true);
          try {
            await updateUserProfile({
              notificationPreferences: {
                ...(userProfile?.notificationPreferences || {}),
                ...preferences,
              },
            });
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
        <Pressable
          onPress={() => navigation.goBack()}
          style={[styles.backButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Ionicons name="arrow-back" size={21} color={colors.text} />
        </Pressable>
        <View style={styles.headerCopy}>
          <Text style={[styles.eyebrow, { color: colors.primary }]}>PREFERENCES</Text>
          <Text style={[styles.title, { color: colors.text }]}>Notifications</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: tabBarContentPadding }]} showsVerticalScrollIndicator={false}>
        <Text style={[styles.intro, { color: colors.textSecondary }]}>Choose which request updates you want to receive.</Text>
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          {OPTIONS.map((option, index) => (
            <React.Fragment key={option.key}>
              {index > 0 ? <View style={[styles.separator, { backgroundColor: colors.divider }]} /> : null}
              <View style={styles.option}>
                <View style={[styles.optionIcon, { backgroundColor: colors.primarySoft }]}>
                  <Ionicons name={option.icon} size={21} color={colors.primary} />
                </View>
                <View style={styles.optionCopy}>
                  <Text style={[styles.optionTitle, { color: colors.text }]}>{option.title}</Text>
                  <Text style={[styles.optionSubtitle, { color: colors.textSecondary }]}>{option.subtitle}</Text>
                </View>
                <Switch
                  value={preferences[option.key]}
                  onValueChange={() => togglePreference(option.key)}
                  trackColor={{ false: '#D1D5DB', true: '#A7DDBA' }}
                  thumbColor={preferences[option.key] ? colors.primary : '#F9FAFB'}
                  accessibilityLabel={`${option.title} notifications`}
                />
              </View>
            </React.Fragment>
          ))}
        </View>

        <Text style={[styles.note, { color: colors.textMuted }]}>Local alerts appear while ShareBite is open. Remote push notifications are not enabled.</Text>
        <Pressable
          onPress={savePreferences}
          disabled={saving}
          style={[styles.saveButton, { backgroundColor: colors.primary }, saving && styles.disabledButton]}
          accessibilityRole="button"
        >
          <Text style={[styles.saveButtonText, { color: isDark ? '#102218' : '#FFFFFF' }]}>{saving ? 'Saving...' : 'Save preferences'}</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },
  header: { alignItems: 'center', flexDirection: 'row', marginBottom: 20, marginTop: 8 },
  backButton: { alignItems: 'center', borderRadius: 20, borderWidth: 1, height: 40, justifyContent: 'center', width: 40 },
  headerCopy: { marginLeft: 12 },
  eyebrow: { fontSize: 10, fontWeight: '800' },
  title: { fontSize: 27, fontWeight: '800', marginTop: 4 },
  content: { paddingBottom: 120 },
  intro: { fontSize: 14, lineHeight: 20, marginBottom: 14 },
  card: { borderRadius: 12, borderWidth: 1, paddingHorizontal: 14 },
  option: { alignItems: 'center', flexDirection: 'row', minHeight: 88 },
  optionIcon: { alignItems: 'center', borderRadius: 12, height: 42, justifyContent: 'center', width: 42 },
  optionCopy: { flex: 1, marginHorizontal: 11 },
  optionTitle: { fontSize: 14, fontWeight: '800' },
  optionSubtitle: { fontSize: 11, lineHeight: 16, marginTop: 3 },
  separator: { height: 1 },
  note: { fontSize: 11, lineHeight: 16, marginTop: 16 },
  saveButton: { alignItems: 'center', borderRadius: 12, marginTop: 22, paddingVertical: 15 },
  saveButtonText: { fontSize: 15, fontWeight: '800' },
  disabledButton: { opacity: 0.6 },
});