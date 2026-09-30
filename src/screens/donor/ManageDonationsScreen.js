import React, { useCallback, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, ActivityIndicator, TouchableOpacity, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { donationService } from '../../services/donationService';

export default function ManageDonationsScreen() {
  const navigation = useNavigation();
  const { user } = useAuth();
  const { colors } = useTheme();
  const [donations, setDonations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);

  useFocusEffect(
    useCallback(() => {
      let isActive = true;

      const loadDonations = async () => {
        if (!user?.uid) {
          if (isActive) setLoading(false);
          return;
        }

        if (isActive) setLoading(true);
        if (isActive) setError('');

        try {
          const data = await donationService.getDonationsByDonor(user.uid);
          if (isActive) setDonations(data);
        } catch (error) {
          console.error('Failed to load donor donations:', error);
          if (isActive) setError('Unable to load your donations.');
        } finally {
          if (isActive) setLoading(false);
        }
      };

      loadDonations();

      return () => {
        isActive = false;
      };
    }, [user, reloadKey])
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <Text style={[styles.title, { color: colors.text }]}>My Donations</Text>

      {loading ? (
        <ActivityIndicator size="small" color={colors.primary} />
      ) : error ? (
        <View style={[styles.emptyCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>{error}</Text>
          <TouchableOpacity onPress={() => setReloadKey((key) => key + 1)} style={[styles.retryButton, { backgroundColor: colors.primary }]}>
            <Text style={[styles.retryText, { color: colors.surface }]}>Try again</Text>
          </TouchableOpacity>
        </View>
      ) : donations.length === 0 ? (
        <View style={[styles.emptyCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No donations yet.</Text>
        </View>
      ) : (
        donations.map((item) => (
          <TouchableOpacity
            key={item.id}
            style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}
            onPress={() => navigation.navigate('DonationDetail', { donation: item })}
          >
            {item.photoUrl ? <Image source={{ uri: item.photoUrl }} style={styles.itemImage} /> : <View style={styles.itemImagePlaceholder}><Text style={styles.placeholderEmoji}>🍱</Text></View>}
            <View style={styles.row}>
              <Text style={[styles.foodName, { color: colors.text }]}>{item.foodName}</Text>
              <Text style={[styles.status, { color: colors.primary }]}>{item.status}</Text>
            </View>
            <Text style={[styles.meta, { color: colors.textSecondary }]}>{item.quantity} • {item.category}</Text>
            <Text style={[styles.meta, { color: colors.textSecondary }]}>{item.foodType} • {item.condition}</Text>
            <Text style={[styles.meta, { color: colors.textSecondary }]}>Pickup: {item.pickupLocation}</Text>
          </TouchableOpacity>
        ))
      )}
    </ScrollView>
    </SafeAreaView>
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
    paddingBottom: 120,
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
  itemImage: {
    width: '100%',
    height: 130,
    borderRadius: 12,
    marginBottom: 12,
  },
  itemImagePlaceholder: {
    width: '100%',
    height: 90,
    borderRadius: 12,
    marginBottom: 12,
    backgroundColor: '#E8F5EE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderEmoji: {
    fontSize: 38,
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
  retryButton: {
    alignItems: 'center',
    borderRadius: 12,
    marginTop: 14,
    paddingVertical: 11,
  },
  retryText: {
    fontSize: 13,
    fontWeight: '800',
  },
});
