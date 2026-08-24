import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator, FlatList, Image, StyleSheet, Text,
  TextInput, TouchableOpacity, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import { subscribeToAvailableDonations } from '../../services/donationService';

const C = {
  green: '#1A7A4A',
  greenLight: '#E8F5EE',
  greenPale: '#F0FAF4',
  amber: '#D97706',
  amberLight: '#FEF3C7',
  gray100: '#F3F4F6',
  gray200: '#E5E7EB',
  gray400: '#9CA3AF',
  gray500: '#6B7280',
  gray600: '#4B5563',
  gray700: '#374151',
  gray900: '#111827',
  white: '#FFFFFF',
};

const FILTERS = ['All', 'Ready-to-Eat', 'Storable'];

const FOOD_EMOJI = {
  'cooked meal': '🍱', produce: '🥦', 'canned goods': '🥫',
  bakery: '🍞', dairy: '🥛', other: '🍽️',
};

function getEmoji(donation) {
  return FOOD_EMOJI[(donation.category || '').toLowerCase()] || '🍽️';
}

function Badge({ label, color = 'green' }) {
  const bg = color === 'green' ? C.greenLight : C.amberLight;
  const textColor = color === 'green' ? C.green : C.amber;
  return (
    <View style={[styles.badge, { backgroundColor: bg }]}>
      <Text style={[styles.badgeText, { color: textColor }]}>{label}</Text>
    </View>
  );
}

function FoodCard({ item, distance, onPress }) {
  const isRte = (item.foodType || '').toLowerCase().includes('ready');
  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.8}>
      <View style={styles.cardBanner}>
        {item.photoUrl
          ? <Image source={{ uri: item.photoUrl }} style={styles.cardImage} />
          : <Text style={styles.cardEmoji}>{getEmoji(item)}</Text>}
        <View style={{ position: 'absolute', top: 10, left: 10 }}>
          <Badge label={isRte ? '🟢 Ready-to-Eat' : '📦 Storable'} color={isRte ? 'green' : 'amber'} />
        </View>
        {distance ? (
          <View style={styles.distancePill}>
            <Text style={styles.distancePillText}>📍 {distance}</Text>
          </View>
        ) : null}
      </View>
      <View style={styles.cardBody}>
        <Text style={styles.cardTitle}>{item.foodName || 'Food donation'}</Text>
        <View style={styles.cardRow}>
          <Text style={styles.cardQty}>Qty: <Text style={{ color: C.gray700, fontWeight: '600' }}>{item.quantity || '—'}</Text></Text>
          {item.pickupAvailability ? (
            <Text style={styles.cardUntil}>Until {item.pickupAvailability}</Text>
          ) : null}
        </View>
      </View>
    </TouchableOpacity>
  );
}

function calcDistance(userLocation, donation) {
  const coords = donation.pickupCoordinates || donation.coordinates;
  if (!userLocation || !coords?.latitude || !coords?.longitude) return donation.distance || null;
  const toRad = (v) => (v * Math.PI) / 180;
  const dLat = toRad(coords.latitude - userLocation.latitude);
  const dLon = toRad(coords.longitude - userLocation.longitude);
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos(toRad(userLocation.latitude)) * Math.cos(toRad(coords.latitude)) * Math.sin(dLon / 2) ** 2;
  return `${(6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))).toFixed(1)} km`;
}

export default function AvailableFoodScreen({ navigation }) {
  const [donations, setDonations] = useState([]);
  const [filter, setFilter] = useState('All');
  const [search, setSearch] = useState('');
  const [userLocation, setUserLocation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => subscribeToAvailableDonations(
    (data) => { setDonations(data); setLoading(false); },
    () => { setError('Unable to load available food.'); setLoading(false); },
  ), []);

  useEffect(() => {
    Location.requestForegroundPermissionsAsync().then(({ status }) => {
      if (status !== 'granted') return;
      Location.getCurrentPositionAsync({}).then((loc) => setUserLocation(loc.coords)).catch(() => {});
    }).catch(() => {});
  }, []);

  const visible = donations.filter((d) => {
    const matchFilter = filter === 'All'
      || (filter === 'Ready-to-Eat' && (d.foodType || '').toLowerCase().includes('ready'))
      || (filter === 'Storable' && (d.foodType || '').toLowerCase().includes('storable'));
    const matchSearch = (d.foodName || '').toLowerCase().includes(search.toLowerCase());
    return matchFilter && matchSearch;
  });

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Available Food</Text>
        <View style={styles.searchBar}>
          <Text style={{ fontSize: 16, marginRight: 6 }}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Search food…"
            placeholderTextColor={C.gray400}
            value={search}
            onChangeText={setSearch}
          />
        </View>
      </View>

      {/* Filter tabs */}
      <View style={styles.filtersRow}>
        {FILTERS.map((f) => (
          <TouchableOpacity
            key={f}
            style={[styles.filterBtn, filter === f && styles.filterBtnActive]}
            onPress={() => setFilter(f)}
          >
            <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>{f}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading && <ActivityIndicator color={C.green} style={{ marginTop: 28 }} />}
      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      <FlatList
        data={visible}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={!loading ? <Text style={styles.emptyText}>No matching donations found.</Text> : null}
        renderItem={({ item }) => (
          <FoodCard
            item={item}
            distance={calcDistance(userLocation, item)}
            onPress={() => navigation.navigate('FoodDetail', { donation: item })}
          />
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.white },
  header: {
    padding: 20, paddingBottom: 14, backgroundColor: C.white,
    borderBottomWidth: 1, borderBottomColor: C.gray100,
  },
  headerTitle: { fontSize: 20, fontWeight: '700', color: C.gray900, marginBottom: 10 },
  searchBar: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: C.gray100, borderRadius: 12, padding: 10,
  },
  searchInput: { flex: 1, fontSize: 15, color: C.gray900, padding: 0 },
  filtersRow: {
    flexDirection: 'row', gap: 8, padding: 10, paddingHorizontal: 20,
    borderBottomWidth: 1, borderBottomColor: C.gray100,
  },
  filterBtn: {
    paddingVertical: 7, paddingHorizontal: 14, borderRadius: 20, backgroundColor: C.gray100,
  },
  filterBtnActive: { backgroundColor: C.green },
  filterText: { fontSize: 13, fontWeight: '600', color: C.gray600 },
  filterTextActive: { color: C.white },
  list: { padding: 20, paddingBottom: 24 },
  card: {
    backgroundColor: C.white, borderRadius: 16,
    borderWidth: 1, borderColor: C.gray200, overflow: 'hidden', marginBottom: 12,
  },
  cardBanner: {
    height: 120, backgroundColor: C.greenPale,
    alignItems: 'center', justifyContent: 'center',
  },
  cardImage: { width: '100%', height: '100%', resizeMode: 'cover' },
  cardEmoji: { fontSize: 48 },
  distancePill: {
    position: 'absolute', top: 10, right: 10,
    backgroundColor: 'rgba(0,0,0,0.45)', borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3,
  },
  distancePillText: { fontSize: 11, color: C.white, fontWeight: '600' },
  cardBody: { padding: 14 },
  cardTitle: { fontSize: 15, fontWeight: '700', color: C.gray900, marginBottom: 4 },
  cardRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardQty: { fontSize: 13, color: C.gray500 },
  cardUntil: { fontSize: 12, color: '#E05A2B', fontWeight: '600' },
  badge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 20 },
  badgeText: { fontSize: 11, fontWeight: '700' },
  errorText: { color: '#E05A2B', textAlign: 'center', marginTop: 24, fontSize: 13 },
  emptyText: { color: C.gray500, textAlign: 'center', marginTop: 40, fontSize: 14 },
});
