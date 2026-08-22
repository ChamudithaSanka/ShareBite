import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator, FlatList, StyleSheet, Text, TouchableOpacity, View,
} from 'react-native';
import { subscribeToAvailableDonations } from '../../services/donationService';

const GREEN = '#1A7A4A';

export default function RecipientHomeScreen({ navigation }) {
  const [donations, setDonations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => subscribeToAvailableDonations(
    (availableDonations) => {
      setDonations(availableDonations);
      setLoading(false);
    },
    () => {
      setError('Unable to load available food.');
      setLoading(false);
    },
  ), []);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Welcome to ShareBite</Text>
      <Text style={styles.subtitle}>Available food near you</Text>
      <Text style={styles.count}>{donations.length}</Text>
      <Text style={styles.countLabel}>available donations</Text>
      <TouchableOpacity style={styles.button} onPress={() => navigation.navigate('Browse')}>
        <Text style={styles.buttonText}>Browse all food</Text>
      </TouchableOpacity>
      {loading ? <ActivityIndicator color={GREEN} style={styles.loader} /> : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {!loading && !error && donations.length === 0 ? (
        <Text style={styles.empty}>No donations are available right now.</Text>
      ) : null}
      <FlatList
        data={donations.slice(0, 3)}
        keyExtractor={(item) => item.id}
        style={styles.list}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.card}
            onPress={() => navigation.navigate('FoodDetail', { donation: item })}
          >
            <Text style={styles.cardTitle}>{item.foodName || 'Food donation'}</Text>
            <Text style={styles.cardText}>Quantity: {item.quantity || 'Not specified'}</Text>
            <Text style={styles.cardText}>{item.foodType || 'Available food'} · {item.pickupLocation || 'Location unavailable'}</Text>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    backgroundColor: '#fff',
  },
  title: { fontSize: 24, fontWeight: '800', color: '#111827', textAlign: 'center' },
  subtitle: { marginTop: 8, fontSize: 15, color: '#6B7280', textAlign: 'center' },
  count: { marginTop: 24, fontSize: 42, fontWeight: '800', color: GREEN, textAlign: 'center' },
  countLabel: { color: '#6B7280', textAlign: 'center' },
  button: { marginTop: 20, padding: 14, borderRadius: 12, backgroundColor: GREEN },
  buttonText: { color: '#fff', textAlign: 'center', fontWeight: '700' },
  loader: { marginTop: 24 },
  error: { marginTop: 24, color: '#E05A2B', textAlign: 'center' },
  empty: { marginTop: 24, color: '#6B7280', textAlign: 'center' },
  list: { marginTop: 20 },
  card: { padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 12 },
  cardTitle: { fontSize: 16, fontWeight: '700', color: '#111827' },
  cardText: { marginTop: 5, fontSize: 13, color: '#6B7280' },
});
