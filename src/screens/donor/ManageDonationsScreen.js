import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, ActivityIndicator } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { donationService } from '../../services/donationService';

export default function ManageDonationsScreen() {
  const { user } = useAuth();
  const [donations, setDonations] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadDonations = async () => {
      if (!user?.uid) {
        setLoading(false);
        return;
      }

      try {
        const data = await donationService.getDonationsByDonor(user.uid);
        setDonations(data);
      } catch (error) {
        console.error('Failed to load donor donations:', error);
      } finally {
        setLoading(false);
      }
    };

    loadDonations();
  }, [user]);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>My Donations</Text>

      {loading ? (
        <ActivityIndicator size="small" color="#1A7A4A" />
      ) : donations.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyText}>No donations yet.</Text>
        </View>
      ) : (
        donations.map((item) => (
          <View key={item.id} style={styles.card}>
            <View style={styles.row}>
              <Text style={styles.foodName}>{item.foodName}</Text>
              <Text style={styles.status}>{item.status}</Text>
            </View>
            <Text style={styles.meta}>{item.quantity} • {item.category}</Text>
            <Text style={styles.meta}>{item.foodType} • {item.condition}</Text>
            <Text style={styles.meta}>Pickup: {item.pickupLocation}</Text>
          </View>
        ))
      )}
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
    paddingTop: 28,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 16,
  },
  card: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  foodName: {
    fontSize: 17,
    fontWeight: '700',
    color: '#111827',
    flex: 1,
  },
  status: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1A7A4A',
    textTransform: 'capitalize',
    marginLeft: 8,
  },
  meta: {
    fontSize: 13,
    color: '#4B5563',
    marginTop: 6,
  },
  emptyCard: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 16,
    padding: 18,
  },
  emptyText: {
    fontSize: 14,
    color: '#6B7280',
  },
});
