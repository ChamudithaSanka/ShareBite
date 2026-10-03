import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Image, TextInput } from 'react-native';
import { ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute, useNavigation } from '@react-navigation/native';
import { useTheme } from '../../context/ThemeContext';
import { useTabBarContentPadding } from '../../hooks';
import { donationService, subscribeToDonation } from '../../services/donationService';
import { FOOD_QUANTITY_UNITS, formatFoodQuantity, resolveDonationQuantity } from '../../utils/quantity';

export default function DonationDetailScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { colors } = useTheme();
  const tabBarContentPadding = useTabBarContentPadding();
  const donationFromParams = route.params?.donation;
  const [donation, setDonation] = useState(donationFromParams || null);
  const [loading, setLoading] = useState(!donationFromParams);
  const [error, setError] = useState('');
  const [legacyAmount, setLegacyAmount] = useState('');
  const [legacyUnit, setLegacyUnit] = useState('meal');
  const [savingQuantity, setSavingQuantity] = useState(false);
  const donationId = donationFromParams?.id || route.params?.donationId;

  useEffect(() => {
    if (!donationId) {
      setLoading(false);
      return undefined;
    }

    return subscribeToDonation(
      donationId,
      (nextDonation) => {
        setDonation(nextDonation);
        setLoading(false);
      },
      () => {
        setError('Unable to load this donation.');
        setLoading(false);
      },
    );
  }, [donationId]);

  useEffect(() => {
    const parsedQuantity = resolveDonationQuantity(donation);
    setLegacyAmount(parsedQuantity ? String(parsedQuantity.amount) : '');
    setLegacyUnit(parsedQuantity?.unit || 'meal');
  }, [donation?.id, donation?.quantity, donation?.quantityAmount, donation?.quantityUnit]);

  const handleSaveLegacyQuantity = () => {
    const amount = Number(legacyAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      Alert.alert('Invalid quantity', 'Enter an amount greater than zero.');
      return;
    }

    Alert.alert('Update listing quantity?', 'This will replace the current text-only quantity with a structured amount and unit.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Save quantity',
        onPress: async () => {
          setSavingQuantity(true);
          try {
            await donationService.updateDonationQuantity(donation.id, amount, legacyUnit);
            setDonation((current) => ({
              ...current,
              quantityAmount: amount,
              quantityUnit: legacyUnit,
              quantity: formatFoodQuantity(amount, legacyUnit),
            }));
            Alert.alert('Quantity updated', 'This listing can now be checked against recipient requests.');
          } catch (error) {
            Alert.alert('Unable to update quantity', 'Please check your connection and try again.');
          } finally {
            setSavingQuantity(false);
          }
        },
      },
    ]);
  };

  const handleStatusUpdate = async (newStatus) => {
    if (!donation?.id) return;

    try {
      await donationService.updateDonationStatus(donation.id, newStatus);
      setDonation((prev) => ({ ...prev, status: newStatus }));
      Alert.alert('Updated', `Donation status changed to ${newStatus}.`);
    } catch (error) {
      if (error.code === 'donation-has-active-requests') {
        Alert.alert('Listing in use', 'Complete or decline active recipient requests before changing this listing status.');
        return;
      }
      console.error('Status update failed:', error);
      Alert.alert('Error', 'Could not update donation status.');
    }
  };

  const handleDelete = async () => {
    if (!donation?.id) return;

    Alert.alert('Remove donation', 'This will delete the listing. Continue?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await donationService.deleteDonation(donation.id);
            Alert.alert('Deleted', 'Donation removed successfully.');
            navigation.goBack();
          } catch (error) {
            if (error.code === 'donation-has-active-requests') {
              Alert.alert('Listing in use', 'Complete or decline active recipient requests before deleting this donation.');
              return;
            }
            console.error('Delete donation failed:', error);
            Alert.alert('Error', 'Could not delete donation.');
          }
        },
      },
    ]);
  };

  if (loading) {
    return <SafeAreaView style={[styles.centered, { backgroundColor: colors.background }]} edges={['top']}><ActivityIndicator color={colors.primary} /></SafeAreaView>;
  }

  if (!donation || error) {
    return (
      <SafeAreaView style={[styles.centered, { backgroundColor: colors.background }]} edges={['top']}>
        <Text style={[styles.title, { color: colors.text }]}>{error || 'Donation not found'}</Text>
      </SafeAreaView>
    );
  }

  const awaitingStorableReview = donation.status === 'pending_review'
    && (donation.foodType || '').toLowerCase().includes('storable');
  const coordinatorManagedStorable = (donation.foodType || '').toLowerCase().includes('storable');

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
    <ScrollView contentContainerStyle={[styles.content, { paddingBottom: tabBarContentPadding }]} showsVerticalScrollIndicator={false}>
      <Text style={[styles.eyebrow, { color: colors.primary }]}>Donation details</Text>
      <Text style={[styles.title, { color: colors.text }]}>{donation.foodName || 'Food donation'}</Text>

      {donation.photoUrl ? <Image source={{ uri: donation.photoUrl }} style={styles.heroImage} /> : <View style={[styles.heroPlaceholder, { backgroundColor: colors.primarySoft }]}><Text style={styles.heroEmoji}>🍱</Text></View>}

      <View style={styles.tracker}>
        {['Posted', 'Matched', 'Picked up', 'Delivered'].map((label, index) => (
          <View key={label} style={styles.trackerStep}>
            <View style={[styles.trackerDot, index <= (donation.status === 'picked_up' ? 2 : donation.status === 'reserved' ? 1 : 0) && styles.trackerDotActive]}><Text style={styles.trackerDotText}>{index < 1 ? '✓' : index + 1}</Text></View>
            <Text style={[styles.trackerLabel, { color: colors.textSecondary }]}>{label}</Text>
          </View>
        ))}
      </View>

      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={styles.row}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>Status</Text>
          <Text style={[styles.status, { color: colors.primary }]}>{donation.status}</Text>
        </View>
        <View style={styles.row}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>Quantity</Text>
          <Text style={[styles.value, { color: colors.text }]}>{donation.quantity}</Text>
        </View>
        <View style={styles.row}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>Category</Text>
          <Text style={[styles.value, { color: colors.text }]}>{donation.category}</Text>
        </View>
        <View style={styles.row}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>Condition</Text>
          <Text style={[styles.value, { color: colors.text }]}>{donation.condition}</Text>
        </View>
        <View style={styles.row}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>Pickup date</Text>
          <Text style={[styles.value, { color: colors.text }]}>{donation.pickupDate || 'Not set'}</Text>
        </View>
        <View style={styles.row}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>Pickup time</Text>
          <Text style={[styles.value, { color: colors.text }]}>{donation.pickupAvailability || 'Not set'}</Text>
        </View>
        <View style={styles.row}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>Location</Text>
          <Text style={[styles.value, { color: colors.text }]}>{donation.pickupLocation || 'Not set'}</Text>
        </View>
        <View style={styles.row}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>Notes</Text>
          <Text style={[styles.value, { color: colors.text }]}>{donation.notes || 'No notes'}</Text>
        </View>
      </View>

      {['available', 'pending_review'].includes(donation.status) && !resolveDonationQuantity(donation) ? (
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border, marginTop: 14 }]}>
          <Text style={[styles.sectionTitle, { color: colors.text, marginTop: 0 }]}>Quantity needs an update</Text>
          <Text style={[styles.label, { color: colors.textSecondary, marginBottom: 10 }]}>
            {awaitingStorableReview
              ? 'Set a numeric amount and unit so the coordinator can review this donation.'
              : 'Set a numeric amount and unit so recipient requests can be checked safely.'}
          </Text>
          <TextInput
            value={legacyAmount}
            onChangeText={(value) => setLegacyAmount(value.replace(',', '.'))}
            keyboardType="decimal-pad"
            placeholder="Amount"
            placeholderTextColor={colors.textMuted}
            style={{ borderWidth: 1, borderColor: colors.border, borderRadius: 10, color: colors.text, padding: 12, marginBottom: 10 }}
          />
          <View style={styles.buttonWrap}>
            {FOOD_QUANTITY_UNITS.map((unit) => (
              <TouchableOpacity
                key={unit.value}
                style={[styles.statusButton, { backgroundColor: colors.surfaceMuted }, legacyUnit === unit.value && { backgroundColor: colors.primarySoft }]}
                onPress={() => setLegacyUnit(unit.value)}
              >
                <Text style={[styles.statusButtonText, { color: colors.textSecondary }, legacyUnit === unit.value && { color: colors.primary }]}>{unit.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <TouchableOpacity
            disabled={savingQuantity}
            onPress={handleSaveLegacyQuantity}
            style={{ backgroundColor: colors.primary, borderRadius: 10, padding: 13, alignItems: 'center', marginTop: 6, opacity: savingQuantity ? 0.6 : 1 }}
          >
            <Text style={{ color: colors.surface, fontWeight: '700' }}>{savingQuantity ? 'Saving…' : 'Save quantity'}</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {coordinatorManagedStorable ? (
        <Text style={[styles.label, { color: colors.textSecondary, marginTop: 20 }]}>
          {awaitingStorableReview
            ? 'This storable donation is awaiting coordinator review.'
            : 'Storable listing status is managed through coordinator review and inventory.'}
        </Text>
      ) : (
        <>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Update status</Text>
          <View style={styles.buttonWrap}>
            {['available', 'reserved', 'picked_up'].map((status) => (
              <TouchableOpacity
                key={status}
                style={[styles.statusButton, { backgroundColor: colors.surfaceMuted }, donation.status === status && { backgroundColor: colors.primarySoft }]}
                onPress={() => handleStatusUpdate(status)}
              >
                <Text style={[styles.statusButtonText, { color: colors.textSecondary }, donation.status === status && { color: colors.primary }]}>{status.replace('_', ' ')}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </>
      )}

      <TouchableOpacity style={[styles.deleteButton, { backgroundColor: colors.danger === '#FF9A78' ? '#3A211A' : '#FDECEC' }]} onPress={handleDelete}>
        <Text style={[styles.deleteButtonText, { color: colors.danger }]}>Delete donation</Text>
      </TouchableOpacity>
    </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  centered: { alignItems: 'center', flex: 1, justifyContent: 'center', padding: 20 },
  content: {
    padding: 20,
    paddingTop: 30,
    paddingBottom: 120,
  },
  eyebrow: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6B7280',
    textTransform: 'uppercase',
    letterSpacing: 0.08,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#111827',
    marginTop: 6,
    marginBottom: 18,
  },
  heroImage: {
    width: '100%',
    height: 180,
    borderRadius: 18,
    marginBottom: 16,
  },
  heroPlaceholder: {
    width: '100%',
    height: 180,
    borderRadius: 18,
    marginBottom: 16,
    backgroundColor: '#E8F5EE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroEmoji: {
    fontSize: 72,
  },
  tracker: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 18,
  },
  trackerStep: {
    alignItems: 'center',
    flex: 1,
  },
  trackerDot: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  trackerDotActive: {
    backgroundColor: '#1A7A4A',
  },
  trackerDotText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },
  trackerLabel: {
    color: '#6B7280',
    fontSize: 10,
    textAlign: 'center',
  },
  card: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 16,
    padding: 18,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#4B5563',
  },
  value: {
    fontSize: 13,
    color: '#111827',
    textAlign: 'right',
    flex: 1,
    marginLeft: 12,
  },
  status: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1A7A4A',
    textTransform: 'capitalize',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginTop: 22,
    marginBottom: 10,
  },
  buttonWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  statusButton: {
    backgroundColor: '#F3F4F6',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 8,
  },
  statusButtonActive: {
    backgroundColor: '#E8F5EE',
  },
  statusButtonText: {
    color: '#374151',
    fontWeight: '700',
    textTransform: 'capitalize',
  },
  statusButtonTextActive: {
    color: '#1A7A4A',
  },
  deleteButton: {
    backgroundColor: '#FDECEC',
    borderRadius: 12,
    paddingVertical: 14,
    marginTop: 18,
    alignItems: 'center',
  },
  deleteButtonText: {
    color: '#B42318',
    fontWeight: '700',
  },
});
