import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator, FlatList, StyleSheet, Text, TextInput,
  TouchableOpacity, View,
} from 'react-native';
import * as Location from 'expo-location';
import { subscribeToAvailableDonations } from '../../services/donationService';

const GREEN = '#1A7A4A';
const FILTERS = ['All', 'Ready-to-Eat', 'Storable'];

export default function AvailableFoodScreen({ navigation }) {
  const [donations, setDonations] = useState([]);
  const [filter, setFilter] = useState('All');
  const [search, setSearch] = useState('');
  const [userLocation, setUserLocation] = useState(null);
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

  useEffect(() => {
    const loadLocation = async () => {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== 'granted') return;

      const location = await Location.getCurrentPositionAsync({});
      setUserLocation(location.coords);
    };

    loadLocation().catch(() => undefined);
  }, []);

  const getDistance = (donation) => {
    const coordinates = donation.pickupCoordinates || donation.coordinates;
    if (!userLocation || !coordinates?.latitude || !coordinates?.longitude) {
      return donation.distance || 'Not available';
    }

    const latitudeDifference = (coordinates.latitude - userLocation.latitude) * (Math.PI / 180);
    const longitudeDifference = (coordinates.longitude - userLocation.longitude) * (Math.PI / 180);
    const latitudeOne = userLocation.latitude * (Math.PI / 180);
    const latitudeTwo = coordinates.latitude * (Math.PI / 180);
    const haversine = Math.sin(latitudeDifference / 2) ** 2
      + Math.cos(latitudeOne) * Math.cos(latitudeTwo) * Math.sin(longitudeDifference / 2) ** 2;
    const distanceInKilometers = 6371 * 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));

    return `${distanceInKilometers.toFixed(1)} km`;
  };

  const visibleDonations = donations.filter((donation) => {
    const matchesFilter = filter === 'All' || donation.foodType === filter.toLowerCase();
    return matchesFilter && (donation.foodName || '').toLowerCase().includes(search.toLowerCase());
  });

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Available Food</Text>
      <TextInput style={styles.search} placeholder="Search food" value={search} onChangeText={setSearch} />
      <View style={styles.filters}>
        {FILTERS.map((option) => (
          <TouchableOpacity
            key={option}
            style={[styles.filter, filter === option && styles.activeFilter]}
            onPress={() => setFilter(option)}
          >
            <Text style={[styles.filterText, filter === option && styles.activeFilterText]}>{option}</Text>
          </TouchableOpacity>
        ))}
      </View>
      {loading ? <ActivityIndicator color={GREEN} style={styles.loader} /> : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <FlatList
        data={visibleDonations}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={!loading ? <Text style={styles.empty}>No matching donations found.</Text> : null}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.card} onPress={() => navigation.navigate('FoodDetail', { donation: item })}>
            <Text style={styles.cardTitle}>{item.foodName || 'Food donation'}</Text>
            <Text style={styles.cardText}>Quantity: {item.quantity || 'Not specified'}</Text>
            <Text style={styles.cardText}>Type: {item.foodType || 'Not specified'}</Text>
            <Text style={styles.cardText}>Pickup: {item.pickupLocation || 'Location unavailable'}</Text>
            <Text style={styles.distance}>Distance: {getDistance(item)}</Text>
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
  search: { marginTop: 20, padding: 12, borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 12, fontSize: 15 },
  filters: { flexDirection: 'row', gap: 8, marginTop: 16 },
  filter: { paddingVertical: 9, paddingHorizontal: 12, borderRadius: 10, backgroundColor: '#F3F4F6' },
  activeFilter: { backgroundColor: GREEN },
  filterText: { color: '#4B5563', fontWeight: '600', fontSize: 12 },
  activeFilterText: { color: '#fff' },
  loader: { marginTop: 28 },
  error: { marginTop: 24, color: '#E05A2B', textAlign: 'center' },
  empty: { marginTop: 28, color: '#6B7280', textAlign: 'center' },
  list: { paddingTop: 20, paddingBottom: 24 },
  card: { padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 12 },
  cardTitle: { fontSize: 17, fontWeight: '700', color: '#111827' },
  cardText: { marginTop: 6, fontSize: 13, color: '#6B7280' },
  distance: { marginTop: 8, fontSize: 13, fontWeight: '700', color: GREEN },
});
