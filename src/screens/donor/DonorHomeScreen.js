import React, { useCallback, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, ActivityIndicator, TouchableOpacity, Image } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useAuth } from '../../context/AuthContext';
import { donationService } from '../../services/donationService';

export default function DonorHomeScreen() {
  const navigation = useNavigation();
  const { user, userProfile } = useAuth();
  const [donations, setDonations] = useState([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      let isActive = true;

      const fetchDonations = async () => {
        if (!user?.uid) {
          if (isActive) setLoading(false);
          return;
        }

        if (isActive) setLoading(true);

        try {
          const data = await donationService.getDonationsByDonor(user.uid);
          if (isActive) setDonations(data);
        } catch (error) {
          console.error('Failed to fetch donor donations:', error);
        } finally {
          if (isActive) setLoading(false);
        }
      };

      fetchDonations();

      return () => {
        isActive = false;
      };
    }, [user])
  );

  const activeCount = donations.filter((item) => item.status === 'available' || item.status === 'pending_review').length;
  const totalCount = donations.length;
  const mealsShared = donations.reduce((total, item) => total + (Number.parseInt(item.quantity, 10) || 0), 0);
  const name = userProfile?.name || 'Donor';

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.eyebrow}>Donor</Text>
      <Text style={styles.title}>Welcome, {name}</Text>
      <Text style={styles.role}>Role: {userProfile?.role || 'donor'}</Text>

      <View style={styles.statsRow}>
        <View style={[styles.statCard, styles.greenCard]}>
          <Text style={styles.statValue}>{loading ? '—' : activeCount}</Text>
          <Text style={styles.statLabel}>Active</Text>
        </View>
        <View style={[styles.statCard, styles.amberCard]}>
          <Text style={styles.statValue}>{loading ? '—' : totalCount}</Text>
          <Text style={styles.statLabel}>Total</Text>
        </View>
        <View style={[styles.statCard, styles.blueCard]}>
          <Text style={[styles.statValue, styles.blueValue]}>{loading ? '—' : mealsShared}</Text>
          <Text style={styles.statLabel}>Meals shared</Text>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Recent donations</Text>
        {loading ? (
          <ActivityIndicator size="small" color="#1A7A4A" />
        ) : donations.length === 0 ? (
          <Text style={styles.emptyText}>No donations yet. Create your first one.</Text>
        ) : (
          donations.slice(0, 3).map((item) => (
            <TouchableOpacity
              key={item.id}
              style={styles.listItem}
              onPress={() => navigation.navigate('DonationDetail', { donation: item })}
            >
              {item.photoUrl ? <Image source={{ uri: item.photoUrl }} style={styles.itemImage} /> : <View style={styles.itemImagePlaceholder}><Text style={styles.placeholderEmoji}>🍱</Text></View>}
              <View>
                <Text style={styles.itemName}>{item.foodName}</Text>
                <Text style={styles.itemMeta}>{item.quantity} • {item.foodType}</Text>
              </View>
              <Text style={styles.itemStatus}>{item.status}</Text>
            </TouchableOpacity>
          ))
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    padding: 24,
    paddingTop: 32,
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
    fontSize: 26,
    fontWeight: '800',
    color: '#111827',
    marginTop: 8,
  },
  role: {
    fontSize: 16,
    color: '#4B5563',
    textTransform: 'capitalize',
    marginTop: 4,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
  },
  greenCard: {
    backgroundColor: '#E8F5EE',
    borderColor: '#C3E8D4',
  },
  amberCard: {
    backgroundColor: '#FEF3C7',
    borderColor: '#FDE68A',
  },
  blueCard: {
    backgroundColor: '#EFF6FF',
    borderColor: '#BFDBFE',
  },
  statValue: {
    fontSize: 28,
    fontWeight: '800',
    color: '#1A7A4A',
  },
  statLabel: {
    marginTop: 6,
    fontSize: 11,
    color: '#4B5563',
    textTransform: 'uppercase',
    letterSpacing: 0.05,
    fontWeight: '700',
  },
  blueValue: {
    color: '#2563EB',
  },
  card: {
    backgroundColor: '#F9FAFB',
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 12,
  },
  listItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  itemImage: {
    width: 48,
    height: 48,
    borderRadius: 12,
    marginRight: 12,
  },
  itemImagePlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 12,
    marginRight: 12,
    backgroundColor: '#E8F5EE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderEmoji: {
    fontSize: 22,
  },
  itemName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
  },
  itemMeta: {
    marginTop: 4,
    fontSize: 12,
    color: '#6B7280',
  },
  itemStatus: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1A7A4A',
    textTransform: 'capitalize',
  },
  emptyText: {
    fontSize: 14,
    color: '#6B7280',
  },
});
