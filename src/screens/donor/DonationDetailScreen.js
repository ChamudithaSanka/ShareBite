import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Image } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { donationService } from '../../services/donationService';

export default function DonationDetailScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const donationFromParams = route.params?.donation;
  const [donation, setDonation] = useState(donationFromParams || null);

  useEffect(() => {
    const loadDonation = async () => {
      if (!donationFromParams?.id && route.params?.donationId) {
        const data = await donationService.getDonationById(route.params.donationId);
        setDonation(data);
      }
    };

    loadDonation();
  }, [donationFromParams, route.params]);

  const handleStatusUpdate = async (newStatus) => {
    if (!donation?.id) return;

    try {
      await donationService.updateDonationStatus(donation.id, newStatus);
      setDonation((prev) => ({ ...prev, status: newStatus }));
      Alert.alert('Updated', `Donation status changed to ${newStatus}.`);
    } catch (error) {
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
            console.error('Delete donation failed:', error);
            Alert.alert('Error', 'Could not delete donation.');
          }
        },
      },
    ]);
  };

  if (!donation) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Donation not found</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.eyebrow}>Donation details</Text>
      <Text style={styles.title}>{donation.foodName || 'Food donation'}</Text>

      {donation.photoUrl ? <Image source={{ uri: donation.photoUrl }} style={styles.heroImage} /> : <View style={styles.heroPlaceholder}><Text style={styles.heroEmoji}>🍱</Text></View>}

      <View style={styles.tracker}>
        {['Posted', 'Matched', 'Picked up', 'Delivered'].map((label, index) => (
          <View key={label} style={styles.trackerStep}>
            <View style={[styles.trackerDot, index <= (donation.status === 'picked_up' ? 2 : donation.status === 'reserved' ? 1 : 0) && styles.trackerDotActive]}><Text style={styles.trackerDotText}>{index < 1 ? '✓' : index + 1}</Text></View>
            <Text style={styles.trackerLabel}>{label}</Text>
          </View>
        ))}
      </View>

      <View style={styles.card}>
        <View style={styles.row}>
          <Text style={styles.label}>Status</Text>
          <Text style={styles.status}>{donation.status}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Quantity</Text>
          <Text style={styles.value}>{donation.quantity}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Category</Text>
          <Text style={styles.value}>{donation.category}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Condition</Text>
          <Text style={styles.value}>{donation.condition}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Pickup date</Text>
          <Text style={styles.value}>{donation.pickupDate || 'Not set'}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Pickup time</Text>
          <Text style={styles.value}>{donation.pickupAvailability || 'Not set'}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Location</Text>
          <Text style={styles.value}>{donation.pickupLocation || 'Not set'}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Notes</Text>
          <Text style={styles.value}>{donation.notes || 'No notes'}</Text>
        </View>
      </View>

      <Text style={styles.sectionTitle}>Update status</Text>
      <View style={styles.buttonWrap}>
        {['available', 'pending_review', 'reserved', 'picked_up'].map((status) => (
          <TouchableOpacity
            key={status}
            style={[styles.statusButton, donation.status === status && styles.statusButtonActive]}
            onPress={() => handleStatusUpdate(status)}
          >
            <Text style={[styles.statusButtonText, donation.status === status && styles.statusButtonTextActive]}>{status.replace('_', ' ')}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity style={styles.deleteButton} onPress={handleDelete}>
        <Text style={styles.deleteButtonText}>Delete donation</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    padding: 20,
    paddingTop: 30,
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
