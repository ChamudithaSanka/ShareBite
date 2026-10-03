import React, { useEffect, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { subscribeToPendingDonations, subscribeToPendingRequests } from '../../services/coordinatorService';
import { subscribeToVolunteerDeliveries } from '../../services/deliveryService';
import { donationService } from '../../services/donationService';
import { subscribeToInventory } from '../../services/inventoryService';
import { subscribeToRecipientRequests } from '../../services/requestService';
import { sumMealPortionQuantities } from '../../utils/quantity';
import { useTabBarContentPadding } from '../../hooks';

const GREEN = '#1A7A4A';
const ACTIVE_DELIVERY_STATUSES = ['assigned', 'picked_up', 'in_transit'];
const ACTIVE_REQUEST_STATUSES = ['pending', 'approved', 'assigned', 'picked_up', 'in_transit', 'at_recipient'];
const COMPLETED_REQUEST_STATUSES = ['delivered', 'completed'];
const ROLE_INFO = {
  donor: { label: 'Donor', emoji: '🤝', tint: '#E8F5EE', stat: 'Meals shared' },
  recipient: { label: 'Recipient', emoji: '🍽️', tint: '#FEF3C7', stat: 'Requests received' },
  volunteer: { label: 'Volunteer', emoji: '🚴', tint: '#EFF6FF', stat: 'Deliveries completed' },
  coordinator: { label: 'Coordinator', emoji: '🏪', tint: '#F5F3FF', stat: 'Items managed' },
};

const MENU_ITEMS = [
  { icon: '✎', title: 'Edit profile', subtitle: 'Update your name and phone number', key: 'edit' },
  { icon: '⌖', title: 'Saved addresses', subtitle: 'Manage your delivery and pickup addresses', key: 'addresses' },
  { icon: '◉', title: 'Notifications', subtitle: 'Choose which updates you receive', key: 'notifications' },
  { icon: '◐', title: 'Appearance', subtitle: 'Choose light or dark mode', key: 'appearance' },
];

const formatMemberSince = (createdAt) => {
  if (!createdAt) return '-';

  const date = typeof createdAt.toDate === 'function' ? createdAt.toDate() : new Date(createdAt);
  if (Number.isNaN(date.getTime())) return '-';

  return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
};

export default function ProfileScreen({ navigation }) {
  const { user, userProfile, signOut, updateUserProfile } = useAuth();
  const { colors, isDark, setDarkMode } = useTheme();
  const tabBarContentPadding = useTabBarContentPadding();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [addressModalVisible, setAddressModalVisible] = useState(false);
  const [addresses, setAddresses] = useState(Array.isArray(userProfile?.savedAddresses) ? userProfile.savedAddresses : []);
  const [addressName, setAddressName] = useState('');
  const [addressValue, setAddressValue] = useState('');
  const [editingAddressIndex, setEditingAddressIndex] = useState(null);
  const [deliveryStats, setDeliveryStats] = useState({ active: 0, completed: 0, loading: false });
  const [donorStats, setDonorStats] = useState({ total: 0, active: 0, meals: 0, loading: false });
  const [recipientStats, setRecipientStats] = useState({ total: 0, active: 0, completed: 0, loading: false });
  const [coordinatorStats, setCoordinatorStats] = useState({ inventory: null, pendingDonations: null, pendingRequests: null });
  const [name, setName] = useState(userProfile?.name || '');
  const [phone, setPhone] = useState(userProfile?.phone || '');
  const userRole = String(userProfile?.role || userProfile?.Role || '').trim().toLowerCase();
  const role = ROLE_INFO[userRole] || ROLE_INFO.recipient;
  const email = userProfile?.email || user?.email || 'No email added';
  const visibleMenuItems = MENU_ITEMS.filter((item) => item.key !== 'addresses' || ['donor', 'recipient'].includes(userRole));
  const coordinatorInventoryCount = coordinatorStats.inventory ?? '—';
  const coordinatorPendingReviewCount = coordinatorStats.pendingDonations === null || coordinatorStats.pendingRequests === null
    ? '—'
    : coordinatorStats.pendingDonations + coordinatorStats.pendingRequests;

  useEffect(() => {
    setAddresses(Array.isArray(userProfile?.savedAddresses) ? userProfile.savedAddresses : []);
  }, [userProfile?.savedAddresses]);

  useEffect(() => {
    if (userRole !== 'volunteer' || !user?.uid) {
      setDeliveryStats({ active: 0, completed: 0, loading: false });
    } else {
      setDeliveryStats((current) => ({ ...current, loading: true }));
      return subscribeToVolunteerDeliveries(
        user.uid,
        (deliveries) => {
          setDeliveryStats({
            active: deliveries.filter((delivery) => ACTIVE_DELIVERY_STATUSES.includes(delivery.status)).length,
            completed: deliveries.filter((delivery) => delivery.status === 'delivered').length,
            loading: false,
          });
        },
        () => setDeliveryStats((current) => ({ ...current, loading: false })),
      );
    }

    return undefined;
  }, [user?.uid, userRole]);

  useEffect(() => {
    if (userRole !== 'recipient' || !user?.uid) {
      setRecipientStats({ total: 0, active: 0, completed: 0, loading: false });
      return undefined;
    }

    setRecipientStats((current) => ({ ...current, loading: true }));
    return subscribeToRecipientRequests(
      user.uid,
      (requests) => {
        const completed = requests.filter((request) => COMPLETED_REQUEST_STATUSES.includes((request.status || '').toLowerCase())).length;
        const active = requests.filter((request) => ACTIVE_REQUEST_STATUSES.includes((request.status || 'pending').toLowerCase())).length;
        setRecipientStats({ total: requests.length, active, completed, loading: false });
      },
      () => setRecipientStats((current) => ({ ...current, loading: false })),
    );
  }, [user?.uid, userRole]);

  useEffect(() => {
    if (userRole !== 'donor' || !user?.uid) {
      setDonorStats({ total: 0, active: 0, meals: 0, loading: false });
      return undefined;
    }

    let cancelled = false;

    const loadDonorStats = async () => {
      setDonorStats((current) => ({ ...current, loading: true }));

      try {
        const donations = await donationService.getDonationsByDonor(user.uid);
        if (cancelled) return;

        setDonorStats({
          total: donations.length,
          active: donations.filter((donation) => ['available', 'pending_review', 'reserved', 'picked_up'].includes(donation.status)).length,
          meals: sumMealPortionQuantities(donations),
          loading: false,
        });
      } catch (error) {
        if (!cancelled) {
          setDonorStats((current) => ({ ...current, loading: false }));
        }
      }
    };

    loadDonorStats();

    return () => {
      cancelled = true;
    };
  }, [user?.uid, userRole]);

  useEffect(() => {
    if (userRole !== 'coordinator') {
      setCoordinatorStats({ inventory: null, pendingDonations: null, pendingRequests: null });
      return undefined;
    }

    let active = true;
    setCoordinatorStats({ inventory: null, pendingDonations: null, pendingRequests: null });

    const updateStats = (update) => {
      if (!active) return;
      setCoordinatorStats((current) => ({ ...current, ...update }));
    };

    const unsubscribeInventory = subscribeToInventory(
      (items) => updateStats({ inventory: items.length }),
      () => {},
    );
    const unsubscribeDonations = subscribeToPendingDonations(
      (items) => updateStats({ pendingDonations: items.length }),
      () => {},
    );
    const unsubscribeRequests = subscribeToPendingRequests(
      (items) => updateStats({ pendingRequests: items.length }),
      () => {},
    );

    return () => {
      active = false;
      unsubscribeInventory();
      unsubscribeDonations();
      unsubscribeRequests();
    };
  }, [userRole]);

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

    Alert.alert('Save profile changes?', 'Your name and phone number will be updated.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Save changes',
        onPress: async () => {
          setSaving(true);
          try {
            await updateUserProfile({ name: name.trim(), phone: phone.trim() });
            setEditing(false);
          } catch (error) {
            Alert.alert('Unable to save', 'Please check your connection and try again.');
          } finally {
            setSaving(false);
          }
        },
      },
    ]);
  };

  const handleMenuPress = (key) => {
    if (key === 'edit') {
      openEditor();
      return;
    }
    if (key === 'addresses') {
      setEditingAddressIndex(null);
      setAddressName('');
      setAddressValue('');
      setAddressModalVisible(true);
      return;
    }
    if (key === 'notifications' && userRole === 'volunteer') {
      navigation.navigate('VolunteerNotifications');
      return;
    }
    if (key === 'notifications' && userRole === 'donor') {
      navigation.navigate('DonorNotifications');
      return;
    }
    if (key === 'notifications' && userRole === 'recipient') {
      navigation.navigate('RecipientNotifications');
      return;
    }
    if (key === 'notifications' && userRole === 'coordinator') {
      navigation.navigate('CoordinatorNotifications');
      return;
    }
    if (key === 'appearance') {
      setDarkMode(!isDark);
      return;
    }
    Alert.alert('Coming soon', 'This profile section will be available in a future update.');
  };

  const resetAddressForm = () => {
    setAddressName('');
    setAddressValue('');
    setEditingAddressIndex(null);
  };

  const saveAddress = async () => {
    const trimmedValue = addressValue.trim();
    if (!trimmedValue) {
      Alert.alert('Address required', 'Please enter a delivery or pickup address.');
      return;
    }

    const nextAddress = {
      id: editingAddressIndex !== null ? addresses[editingAddressIndex]?.id || `addr-${Date.now()}` : `addr-${Date.now()}`,
      label: addressName.trim() || 'Saved address',
      value: trimmedValue,
    };

    const nextAddresses = editingAddressIndex !== null
      ? addresses.map((address, index) => (index === editingAddressIndex ? nextAddress : address))
      : [nextAddress, ...addresses];

    Alert.alert('Save address?', 'This saved address will be stored in your profile.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Save address',
        onPress: async () => {
          try {
            await updateUserProfile({ savedAddresses: nextAddresses });
            setAddresses(nextAddresses);
            resetAddressForm();
            setAddressModalVisible(false);
          } catch (error) {
            Alert.alert('Unable to save', 'Please check your connection and try again.');
          }
        },
      },
    ]);
  };

  const removeAddress = (index) => {
    const target = addresses[index];
    if (!target) return;

    Alert.alert('Remove saved address?', `This will remove "${target.label || 'Saved address'}" from your profile.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          const nextAddresses = addresses.filter((_, addressIndex) => addressIndex !== index);

          try {
            await updateUserProfile({ savedAddresses: nextAddresses });
            setAddresses(nextAddresses);
          } catch (error) {
            Alert.alert('Unable to remove', 'Please check your connection and try again.');
          }
        },
      },
    ]);
  };

  const confirmSignOut = () => {
    Alert.alert('Sign out?', 'You will need to sign in again to access ShareBite.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: signOut },
    ]);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <ScrollView style={styles.scroll} contentContainerStyle={[styles.content, { paddingBottom: tabBarContentPadding }]} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={[styles.headerEyebrow, { color: colors.primary }]}>ACCOUNT</Text>
          <Text style={[styles.title, { color: colors.text }]}>My profile</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Your ShareBite community identity</Text>
        </View>

        <View style={[styles.profileCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={[styles.avatar, { backgroundColor: role.tint }]}>
            <Text style={styles.avatarText}>{role.emoji}</Text>
          </View>
          <View style={styles.identity}>
            <Text style={[styles.name, { color: colors.text }]}>{userProfile?.name || 'ShareBite member'}</Text>
            <Text style={[styles.email, { color: colors.textSecondary }]}>{email}</Text>
            <View style={styles.roleBadge}>
              <Text style={[styles.roleBadgeText, { color: colors.primary, backgroundColor: colors.primarySoft }]}>{role.label}</Text>
            </View>
          </View>
        </View>

        <View style={styles.impactCard}>
          <View>
            <Text style={styles.impactEyebrow}>COMMUNITY IMPACT</Text>
            <Text style={styles.impactTitle}>{userRole === 'volunteer' ? 'Your volunteer impact' : userRole === 'donor' ? 'Your donor impact' : userRole === 'coordinator' ? 'Your coordinator impact' : 'Every action counts'}</Text>
            <Text style={styles.impactSubtitle}>
              {userRole === 'volunteer'
                ? `${deliveryStats.loading ? '-' : deliveryStats.completed} deliveries completed so far. Every delivery helps good food go further.`
                : userRole === 'donor'
                  ? `${donorStats.loading ? 'Loading your recent impact...' : `${donorStats.total} donation${donorStats.total === 1 ? '' : 's'} shared so far. Every meal helps someone nearby.`}`
                  : userRole === 'recipient'
                    ? recipientStats.loading
                      ? 'Loading your request history...'
                      : `${recipientStats.completed} request${recipientStats.completed === 1 ? '' : 's'} delivered, with ${recipientStats.active} active.`
                    : userRole === 'coordinator'
                      ? 'Your reviews help good food reach people who need it.'
                      : 'Thank you for helping good food go further.'}
            </Text>
          </View>
          <Text style={styles.impactEmoji}>🌱</Text>
        </View>

        <View style={[styles.statsRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.stat}><Text style={[styles.statNumber, { color: colors.primary }]}>{userRole === 'volunteer' ? (deliveryStats.loading ? '-' : deliveryStats.completed) : userRole === 'donor' ? (donorStats.loading ? '-' : donorStats.total) : userRole === 'recipient' ? (recipientStats.loading ? '-' : recipientStats.total) : coordinatorInventoryCount}</Text><Text style={[styles.statLabel, { color: colors.textSecondary }]}>{userRole === 'volunteer' ? role.stat : userRole === 'donor' ? 'Donation listings' : userRole === 'recipient' ? 'Total requests' : role.stat}</Text></View>
          <View style={styles.stat}><Text style={[styles.statNumber, { color: colors.primary }]}>{userRole === 'volunteer' ? (deliveryStats.loading ? '-' : deliveryStats.active) : userRole === 'donor' ? (donorStats.loading ? '-' : donorStats.active) : userRole === 'recipient' ? (recipientStats.loading ? '-' : recipientStats.active) : coordinatorPendingReviewCount}</Text><Text style={[styles.statLabel, { color: colors.textSecondary }]}>{userRole === 'volunteer' ? 'Active deliveries' : userRole === 'donor' ? 'Active listings' : userRole === 'recipient' ? 'Active requests' : userRole === 'coordinator' ? 'Pending reviews' : 'Active this month'}</Text></View>
          <View style={styles.stat}><Text style={[styles.statNumber, { color: colors.primary }]}>{userRole === 'donor' ? (donorStats.loading ? '-' : donorStats.meals) : userRole === 'recipient' ? (recipientStats.loading ? '-' : recipientStats.completed) : formatMemberSince(userProfile?.createdAt)}</Text><Text style={[styles.statLabel, { color: colors.textSecondary }]}>{userRole === 'donor' ? 'Meals/portions listed' : userRole === 'recipient' ? 'Completed' : 'Member since'}</Text></View>
        </View>

        <Text style={[styles.sectionTitle, { color: colors.text }]}>Profile & preferences</Text>
        <View style={[styles.menuCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          {visibleMenuItems.map((item, index) => (
            <Pressable
              key={item.key}
              onPress={() => handleMenuPress(item.key)}
              style={[styles.menuItem, { borderBottomColor: colors.divider }, index === visibleMenuItems.length - 1 && styles.menuItemLast]}
              accessibilityRole="button"
            >
              <View style={[styles.menuIcon, { backgroundColor: colors.primarySoft }]}><Text style={[styles.menuIconText, { color: colors.primary }]}>{item.icon}</Text></View>
              <View style={styles.menuCopy}><Text style={[styles.menuTitle, { color: colors.text }]}>{item.title}</Text><Text style={[styles.menuSubtitle, { color: colors.textMuted }]}>{item.subtitle}</Text></View>
              {item.key === 'appearance' ? <Switch style={{ transform: [{ translateX: -4 }, { translateY: 20 }] }} value={isDark} onValueChange={setDarkMode} trackColor={{ false: '#D1D5DB', true: '#A7DDBA' }} thumbColor={isDark ? colors.primary : '#F9FAFB'} accessibilityLabel="Dark mode" /> : <Text style={[styles.chevron, { color: colors.textMuted }]}>›</Text>}
            </Pressable>
          ))}
        </View>

        <Pressable onPress={confirmSignOut} style={[styles.signOutButton, { backgroundColor: isDark ? '#3A211A' : '#FFF7F4', borderColor: isDark ? '#A94E32' : '#F2B8A7' }]} accessibilityRole="button">
          <Text style={[styles.signOutIcon, { color: colors.danger }]}>↪</Text>
          <Text style={[styles.signOutText, { color: colors.danger }]}>Sign out</Text>
        </Pressable>
        <Text style={[styles.version, { color: colors.textMuted }]}>ShareBite · Your community, shared</Text>
      </ScrollView>

      <Modal visible={addressModalVisible} transparent animationType="slide" onRequestClose={() => { resetAddressForm(); setAddressModalVisible(false); }}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'position' : undefined}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 4 : 0}
          style={styles.modalBackdrop}
        >
          <ScrollView
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.modalScrollContent}
          >
            <View style={[styles.modalCard, { backgroundColor: colors.surface }]}>
              <View style={styles.modalHeader}>
                <View>
                  <Text style={[styles.modalTitle, { color: colors.text }]}>Saved addresses</Text>
                  <Text style={[styles.modalSubtitle, { color: colors.textSecondary }]}>Store your common delivery or pickup locations.</Text>
                </View>
                <Pressable onPress={() => { resetAddressForm(); setAddressModalVisible(false); }}>
                  <Text style={[styles.close, { color: colors.textSecondary }]}>×</Text>
                </Pressable>
              </View>

              <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Label</Text>
              <TextInput value={addressName} onChangeText={setAddressName} style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]} placeholder="Home, Office, Community hall" placeholderTextColor={colors.textMuted} />

              <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Address</Text>
              <TextInput value={addressValue} onChangeText={setAddressValue} multiline style={[styles.input, styles.addressTextarea, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]} placeholder="123 Main Street, Springfield" placeholderTextColor={colors.textMuted} />

              <Pressable onPress={saveAddress} style={[styles.saveButton, { marginTop: 18 }]}>
                <Text style={[styles.saveButtonText, { color: colors.surface }]}>{editingAddressIndex !== null ? 'Save address' : 'Add address'}</Text>
              </Pressable>

              {addresses.length > 0 && (
                <View style={styles.addressList}>
                  <Text style={[styles.addressListTitle, { color: colors.textSecondary }]}>Saved list</Text>
                  {addresses.map((address, index) => (
                    <View key={address.id || `${address.label}-${index}`} style={[styles.addressItem, { backgroundColor: colors.surfaceMuted, borderColor: colors.border }]}>
                      <View style={styles.addressMeta}>
                        <Text style={[styles.addressLabel, { color: colors.text }]}>{address.label || 'Saved address'}</Text>
                        <Text style={[styles.addressValue, { color: colors.textSecondary }]}>{address.value}</Text>
                      </View>
                      <View style={styles.addressActions}>
                        <Pressable onPress={() => {
                          setAddressName(address.label || '');
                          setAddressValue(address.value || '');
                          setEditingAddressIndex(index);
                        }} style={styles.addressActionButton}>
                          <Text style={[styles.addressActionText, { color: colors.primary }]}>Edit</Text>
                        </Pressable>
                        <Pressable onPress={() => removeAddress(index)} style={styles.addressActionButton}>
                          <Text style={[styles.addressActionText, { color: colors.danger }]}>Remove</Text>
                        </Pressable>
                      </View>
                    </View>
                  ))}
                </View>
              )}

              {addresses.length === 0 && (
                <Text style={[styles.noAddressesText, { color: colors.textMuted, marginTop: 16 }]}>No saved addresses yet.</Text>
              )}
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>

      <Modal visible={editing} transparent animationType="slide" onRequestClose={() => setEditing(false)}>
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, { backgroundColor: colors.surface }]}>
            <View style={styles.modalHeader}><View><Text style={[styles.modalTitle, { color: colors.text }]}>Edit profile</Text><Text style={[styles.modalSubtitle, { color: colors.textSecondary }]}>Keep your contact details up to date.</Text></View><Pressable onPress={() => setEditing(false)}><Text style={[styles.close, { color: colors.textSecondary }]}>×</Text></Pressable></View>
            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Full name</Text>
            <TextInput value={name} onChangeText={setName} style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]} placeholder="Your full name" placeholderTextColor={colors.textMuted} autoCapitalize="words" />
            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Email</Text>
            <TextInput value={email} style={[styles.input, styles.inputDisabled, { backgroundColor: colors.surfaceMuted, borderColor: colors.border, color: colors.textSecondary }]} editable={false} />
            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Phone number</Text>
            <TextInput value={phone} onChangeText={setPhone} style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]} placeholder="Your phone number" placeholderTextColor={colors.textMuted} keyboardType="phone-pad" />
            <Pressable onPress={saveProfile} disabled={saving} style={[styles.saveButton, saving && styles.disabledButton]}>
              <Text style={[styles.saveButtonText, { color: colors.surface }]}>{saving ? 'Saving...' : 'Save changes'}</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  scroll: { flex: 1 },
  content: { padding: 20, paddingBottom: 132 },
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
  modalScrollContent: { paddingBottom: 24 },
  modalCard: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 22, paddingBottom: 34 },
  modalHeader: { alignItems: 'flex-start', flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  modalTitle: { color: '#111827', fontSize: 21, fontWeight: '800' },
  modalSubtitle: { color: '#6B7280', fontSize: 12, marginTop: 4 },
  close: { color: '#6B7280', fontSize: 28, lineHeight: 26 },
  inputLabel: { color: '#374151', fontSize: 13, fontWeight: '700', marginBottom: 6, marginTop: 12 },
  input: { borderColor: '#D1D5DB', borderRadius: 12, borderWidth: 1.5, color: '#111827', fontSize: 15, paddingHorizontal: 13, paddingVertical: 12 },
  inputDisabled: { backgroundColor: '#F3F4F6', color: '#6B7280' },
  addressTextarea: { minHeight: 84, textAlignVertical: 'top' },
  addressList: { marginTop: 18 },
  addressListTitle: { fontSize: 12, fontWeight: '700', marginBottom: 10, letterSpacing: 0.6 },
  addressItem: { alignItems: 'flex-start', borderColor: '#E5E7EB', borderRadius: 12, borderWidth: 1, flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10, padding: 12 },
  addressMeta: { flex: 1, marginRight: 12 },
  addressLabel: { fontSize: 14, fontWeight: '700' },
  addressValue: { fontSize: 12, marginTop: 4, lineHeight: 18 },
  addressActions: { alignItems: 'flex-end', justifyContent: 'center' },
  addressActionButton: { marginTop: 4 },
  addressActionText: { fontSize: 12, fontWeight: '700' },
  noAddressesText: { fontSize: 13, textAlign: 'center' },
  saveButton: { alignItems: 'center', backgroundColor: GREEN, borderRadius: 14, marginTop: 22, paddingVertical: 15 },
  saveButtonText: { color: '#fff', fontSize: 15, fontWeight: '800' },
  disabledButton: { opacity: 0.6 },
});
