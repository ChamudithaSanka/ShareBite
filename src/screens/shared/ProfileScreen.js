import React, { useState } from 'react';
import {
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useAuth } from '../../context/AuthContext';

const GREEN = '#1A7A4A';
const ROLE_INFO = {
  donor: { label: 'Donor', emoji: '🤝', tint: '#E8F5EE', stat: 'Meals shared' },
  recipient: { label: 'Recipient', emoji: '🍽️', tint: '#FEF3C7', stat: 'Requests received' },
  volunteer: { label: 'Volunteer', emoji: '🚴', tint: '#EFF6FF', stat: 'Deliveries completed' },
  coordinator: { label: 'Coordinator', emoji: '🏪', tint: '#F5F3FF', stat: 'Items managed' },
};

const MENU_ITEMS = [
  { icon: '✎', title: 'Edit profile', subtitle: 'Update your name and phone number', key: 'edit' },
  { icon: '⌖', title: 'Saved addresses', subtitle: 'Manage your pickup and delivery addresses', key: 'addresses' },
  { icon: '◉', title: 'Notifications', subtitle: 'Choose which updates you receive', key: 'notifications' },
  { icon: '★', title: 'My impact', subtitle: 'See your contribution to the community', key: 'impact' },
  { icon: '⚙', title: 'Settings', subtitle: 'Privacy and account preferences', key: 'settings' },
];

export default function ProfileScreen() {
  const { user, userProfile, signOut, updateUserProfile } = useAuth();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState(userProfile?.name || '');
  const [phone, setPhone] = useState(userProfile?.phone || '');
  const role = ROLE_INFO[userProfile?.role] || ROLE_INFO.recipient;
  const email = userProfile?.email || user?.email || 'No email added';

  const openEditor = () => {
    setName(userProfile?.name || '');
    setPhone(userProfile?.phone || '');
    setEditing(true);
  };

  const saveProfile = async () => {
    if (!name.trim()) {
      Alert.alert('Name required', 'Please enter your full name.');
      return;
    }

    setSaving(true);
    try {
      await updateUserProfile({ name: name.trim(), phone: phone.trim() });
      setEditing(false);
    } catch (error) {
      Alert.alert('Unable to save', 'Please check your connection and try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleMenuPress = (key) => {
    if (key === 'edit') {
      openEditor();
      return;
    }
    Alert.alert('Coming soon', 'This profile section will be available in a future update.');
  };

  const confirmSignOut = () => {
    Alert.alert('Sign out?', 'You will need to sign in again to access ShareBite.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: signOut },
    ]);
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.headerEyebrow}>ACCOUNT</Text>
          <Text style={styles.title}>My profile</Text>
          <Text style={styles.subtitle}>Your ShareBite community identity</Text>
        </View>

        <View style={styles.profileCard}>
          <View style={[styles.avatar, { backgroundColor: role.tint }]}>
            <Text style={styles.avatarText}>{role.emoji}</Text>
          </View>
          <View style={styles.identity}>
            <Text style={styles.name}>{userProfile?.name || 'ShareBite member'}</Text>
            <Text style={styles.email}>{email}</Text>
            <View style={styles.roleBadge}>
              <Text style={styles.roleBadgeText}>{role.label}</Text>
              <Text style={styles.verified}>✓ Verified</Text>
            </View>
          </View>
          <Pressable accessibilityLabel="Edit profile" onPress={openEditor} style={styles.editButton}>
            <Text style={styles.editButtonText}>Edit</Text>
          </Pressable>
        </View>

        <View style={styles.impactCard}>
          <View>
            <Text style={styles.impactEyebrow}>COMMUNITY IMPACT</Text>
            <Text style={styles.impactTitle}>Every action counts</Text>
            <Text style={styles.impactSubtitle}>Thank you for helping good food go further.</Text>
          </View>
          <Text style={styles.impactEmoji}>🌱</Text>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.stat}><Text style={styles.statNumber}>12</Text><Text style={styles.statLabel}>{role.stat}</Text></View>
          <View style={styles.stat}><Text style={styles.statNumber}>3</Text><Text style={styles.statLabel}>Active this month</Text></View>
          <View style={styles.stat}><Text style={styles.statNumber}>2026</Text><Text style={styles.statLabel}>Member since</Text></View>
        </View>

        <Text style={styles.sectionTitle}>Profile & preferences</Text>
        <View style={styles.menuCard}>
          {MENU_ITEMS.map((item, index) => (
            <Pressable
              key={item.key}
              onPress={() => handleMenuPress(item.key)}
              style={[styles.menuItem, index === MENU_ITEMS.length - 1 && styles.menuItemLast]}
              accessibilityRole="button"
            >
              <View style={styles.menuIcon}><Text style={styles.menuIconText}>{item.icon}</Text></View>
              <View style={styles.menuCopy}><Text style={styles.menuTitle}>{item.title}</Text><Text style={styles.menuSubtitle}>{item.subtitle}</Text></View>
              <Text style={styles.chevron}>›</Text>
            </Pressable>
          ))}
        </View>

        <Pressable onPress={confirmSignOut} style={styles.signOutButton} accessibilityRole="button">
          <Text style={styles.signOutIcon}>↪</Text>
          <Text style={styles.signOutText}>Sign out</Text>
        </Pressable>
        <Text style={styles.version}>ShareBite · Your community, shared</Text>
      </ScrollView>

      <Modal visible={editing} transparent animationType="slide" onRequestClose={() => setEditing(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}><View><Text style={styles.modalTitle}>Edit profile</Text><Text style={styles.modalSubtitle}>Keep your contact details up to date.</Text></View><Pressable onPress={() => setEditing(false)}><Text style={styles.close}>×</Text></Pressable></View>
            <Text style={styles.inputLabel}>Full name</Text>
            <TextInput value={name} onChangeText={setName} style={styles.input} placeholder="Your full name" autoCapitalize="words" />
            <Text style={styles.inputLabel}>Email</Text>
            <TextInput value={email} style={[styles.input, styles.inputDisabled]} editable={false} />
            <Text style={styles.inputLabel}>Phone number</Text>
            <TextInput value={phone} onChangeText={setPhone} style={styles.input} placeholder="Your phone number" keyboardType="phone-pad" />
            <Pressable onPress={saveProfile} disabled={saving} style={[styles.saveButton, saving && styles.disabledButton]}>
              <Text style={styles.saveButtonText}>{saving ? 'Saving...' : 'Save changes'}</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  content: { padding: 20, paddingBottom: 36 },
  header: { marginBottom: 18 },
  headerEyebrow: { color: GREEN, fontSize: 11, fontWeight: '800', letterSpacing: 1.2, marginBottom: 5 },
  title: { color: '#111827', fontSize: 28, fontWeight: '800', letterSpacing: -0.5 },
  subtitle: { color: '#6B7280', fontSize: 14, marginTop: 4 },
  profileCard: { backgroundColor: '#fff', borderRadius: 18, borderWidth: 1, borderColor: '#E5E7EB', padding: 16, flexDirection: 'row', alignItems: 'center' },
  avatar: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 30 },
  identity: { flex: 1, marginLeft: 12 },
  name: { color: '#111827', fontSize: 17, fontWeight: '800' },
  email: { color: '#6B7280', fontSize: 12, marginTop: 3 },
  roleBadge: { flexDirection: 'row', alignItems: 'center', marginTop: 7, gap: 8 },
  roleBadgeText: { color: GREEN, backgroundColor: '#E8F5EE', borderRadius: 12, paddingHorizontal: 9, paddingVertical: 3, fontSize: 11, fontWeight: '700' },
  verified: { color: '#6B7280', fontSize: 11, fontWeight: '600' },
  editButton: { borderWidth: 1, borderColor: GREEN, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 7 },
  editButtonText: { color: GREEN, fontSize: 12, fontWeight: '700' },
  impactCard: { backgroundColor: GREEN, borderRadius: 18, padding: 18, marginTop: 16, flexDirection: 'row', alignItems: 'center' },
  impactEyebrow: { color: '#BCE6CC', fontSize: 10, fontWeight: '800', letterSpacing: 1, marginBottom: 5 },
  impactTitle: { color: '#fff', fontSize: 18, fontWeight: '800' },
  impactSubtitle: { color: '#D9F3E2', fontSize: 12, lineHeight: 17, marginTop: 4, maxWidth: 245 },
  impactEmoji: { fontSize: 38, marginLeft: 'auto' },
  statsRow: { backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: '#E5E7EB', flexDirection: 'row', marginTop: 12, paddingVertical: 15 },
  stat: { flex: 1, alignItems: 'center', borderRightWidth: 1, borderRightColor: '#F3F4F6' },
  statNumber: { color: GREEN, fontSize: 20, fontWeight: '800' },
  statLabel: { color: '#6B7280', fontSize: 10, fontWeight: '600', marginTop: 4, textAlign: 'center' },
  sectionTitle: { color: '#374151', fontSize: 13, fontWeight: '800', marginTop: 24, marginBottom: 10 },
  menuCard: { backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: '#E5E7EB', paddingHorizontal: 14 },
  menuItem: { alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#F3F4F6', flexDirection: 'row', minHeight: 68 },
  menuItemLast: { borderBottomWidth: 0 },
  menuIcon: { alignItems: 'center', backgroundColor: '#E8F5EE', borderRadius: 11, height: 38, justifyContent: 'center', width: 38 },
  menuIconText: { color: GREEN, fontSize: 19, fontWeight: '700' },
  menuCopy: { flex: 1, marginLeft: 12 },
  menuTitle: { color: '#1F2937', fontSize: 14, fontWeight: '700' },
  menuSubtitle: { color: '#9CA3AF', fontSize: 11, marginTop: 3 },
  chevron: { color: '#9CA3AF', fontSize: 25, fontWeight: '300', marginLeft: 8 },
  signOutButton: { alignItems: 'center', borderColor: '#F2B8A7', borderRadius: 14, borderWidth: 1, flexDirection: 'row', justifyContent: 'center', marginTop: 20, paddingVertical: 13 },
  signOutIcon: { color: '#E05A2B', fontSize: 19, marginRight: 8 },
  signOutText: { color: '#E05A2B', fontSize: 14, fontWeight: '700' },
  version: { color: '#9CA3AF', fontSize: 11, marginTop: 18, textAlign: 'center' },
  modalBackdrop: { backgroundColor: 'rgba(17, 24, 39, 0.45)', flex: 1, justifyContent: 'flex-end' },
  modalCard: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 22, paddingBottom: 34 },
  modalHeader: { alignItems: 'flex-start', flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  modalTitle: { color: '#111827', fontSize: 21, fontWeight: '800' },
  modalSubtitle: { color: '#6B7280', fontSize: 12, marginTop: 4 },
  close: { color: '#6B7280', fontSize: 28, lineHeight: 26 },
  inputLabel: { color: '#374151', fontSize: 13, fontWeight: '700', marginBottom: 6, marginTop: 12 },
  input: { borderColor: '#D1D5DB', borderRadius: 12, borderWidth: 1.5, color: '#111827', fontSize: 15, paddingHorizontal: 13, paddingVertical: 12 },
  inputDisabled: { backgroundColor: '#F3F4F6', color: '#6B7280' },
  saveButton: { alignItems: 'center', backgroundColor: GREEN, borderRadius: 14, marginTop: 22, paddingVertical: 15 },
  saveButtonText: { color: '#fff', fontSize: 15, fontWeight: '800' },
  disabledButton: { opacity: 0.6 },
});
