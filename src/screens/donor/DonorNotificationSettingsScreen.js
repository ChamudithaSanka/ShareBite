import React, { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';

const DEFAULT_PREFERENCES = {
  donationReviewUpdates: true,
  newRequests: true,
  deliveryStatusUpdates: true,
};

const OPTIONS = [
  {
    key: 'donationReviewUpdates',
    icon: 'checkmark-circle-outline',
    title: 'Donation review updates',
    subtitle: 'Know when a coordinator approves or declines your donation.',
  },
  {
    key: 'newRequests',
    icon: 'mail-unread-outline',
    title: 'New recipient requests',
    subtitle: 'Get notified when someone requests your donation.',
  },
  {
    key: 'deliveryStatusUpdates',
    icon: 'bicycle-outline',
    title: 'Delivery updates',
    subtitle: 'Follow pickup and delivery progress.',
  },
];

export default function DonorNotificationSettingsScreen({ navigation }) {
  const { userProfile, updateUserProfile } = useAuth();
  const { colors, isDark } = useTheme();
  const [preferences, setPreferences] = useState({
    ...DEFAULT_PREFERENCES,
    ...(userProfile?.notificationPreferences || {}),
  });
  const [saving, setSaving] = useState(false);

  const togglePreference = (key) => {
    setPreferences((current) => ({ ...current, [key]: !current[key] }));
  };

  const savePreferences = () => {
    Alert.alert('Save notification preferences?', 'Your donation notification choices will be updated.', [
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

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={[styles.intro, { color: colors.textSecondary }]}>Choose which donation updates you want to receive.</Text>
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

        <Text style={[styles.note, { color: colors.textMuted }]}>These preferences are saved to your ShareBite account. Local alerts require the app to be open; remote push notifications are not enabled.</Text>
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
  card: { borderRadius: 17, borderWidth: 1, paddingHorizontal: 14 },
  option: { alignItems: 'center', flexDirection: 'row', minHeight: 88 },
  optionIcon: { alignItems: 'center', borderRadius: 12, height: 42, justifyContent: 'center', width: 42 },
  optionCopy: { flex: 1, marginHorizontal: 11 },
  optionTitle: { fontSize: 14, fontWeight: '800' },
  optionSubtitle: { fontSize: 11, lineHeight: 16, marginTop: 3 },
  separator: { height: 1 },
  note: { fontSize: 11, lineHeight: 16, marginTop: 16 },
  saveButton: { alignItems: 'center', borderRadius: 14, marginTop: 22, paddingVertical: 15 },
  saveButtonText: { fontSize: 15, fontWeight: '800' },
  disabledButton: { opacity: 0.6 },
});