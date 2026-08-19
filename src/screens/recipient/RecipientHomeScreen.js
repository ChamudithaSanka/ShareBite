import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator, FlatList, ScrollView, StyleSheet,
  Text, TouchableOpacity, View,
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { subscribeToAvailableDonations } from '../../services/donationService';

const C = {
  green: '#1A7A4A',
  greenLight: '#E8F5EE',
  greenPale: '#F0FAF4',
  greenMid: '#2E9D61',
  amber: '#D97706',
  amberLight: '#FEF3C7',
  gray50: '#F9FAFB',
  gray100: '#F3F4F6',
  gray200: '#E5E7EB',
  gray400: '#9CA3AF',
  gray500: '#6B7280',
  gray700: '#374151',
  gray900: '#111827',
  white: '#FFFFFF',
};

const FOOD_EMOJI = {
  'cooked meal': '🍱', produce: '🥦', 'canned goods': '🥫',
  bakery: '🍞', dairy: '🥛', other: '🍽️',
};

function getEmoji(donation) {
  return FOOD_EMOJI[(donation.category || '').toLowerCase()] || '🍽️';
}

function Badge({ label, color = 'green' }) {
  const bg = color === 'green' ? C.greenLight : color === 'amber' ? C.amberLight : C.gray100;
  const text = color === 'green' ? C.green : color === 'amber' ? C.amber : C.gray500;
  return (
    <View style={[styles.badge, { backgroundColor: bg }]}>
      <Text style={[styles.badgeText, { color: text }]}>{label}</Text>
    </View>
  );
}

function FoodCard({ item, onPress }) {
  const isRte = (item.foodType || '').toLowerCase().includes('ready');
  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.8}>
      <View style={styles.cardBanner}>
        <Text style={styles.cardEmoji}>{getEmoji(item)}</Text>
        <View style={styles.cardBadgeTop}>
          <Badge label={isRte ? '🟢 Ready-to-Eat' : '📦 Storable'} color={isRte ? 'green' : 'amber'} />
        </View>
        {item.distance ? (
          <View style={styles.distancePill}>
            <Text style={styles.distancePillText}>📍 {item.distance}</Text>
          </View>
        ) : null}
      </View>
      <View style={styles.cardBody}>
        <Text style={styles.cardTitle}>{item.foodName || 'Food donation'}</Text>
        <View style={styles.cardRow}>
          <Text style={styles.cardQty}>Qty: <Text style={styles.cardQtyVal}>{item.quantity || '—'}</Text></Text>
          {item.pickupAvailability ? (
            <Text style={styles.cardUntil}>Until {item.pickupAvailability}</Text>
          ) : null}
        </View>
      </View>
    </TouchableOpacity>
  );
}

export default function RecipientHomeScreen({ navigation }) {
  const { userProfile } = useAuth();
  const [donations, setDonations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => subscribeToAvailableDonations(
    (data) => { setDonations(data); setLoading(false); },
    () => { setError('Unable to load available food.'); setLoading(false); },
  ), []);

  const rte = donations.filter((d) => (d.foodType || '').toLowerCase().includes('ready'));
  const storable = donations.filter((d) => (d.foodType || '').toLowerCase().includes('storable'));

  const firstName = (userProfile?.name || 'there').split(' ')[0];

  return (
    <ScrollView style={styles.screen} contentContainerStyle={{ paddingBottom: 32 }}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerGreeting}>Hi there,</Text>
          <Text style={styles.headerName}>{firstName} 👋</Text>
        </View>
        <View style={styles.avatar}>
          <Text style={{ fontSize: 22 }}>🍽️</Text>
        </View>
      </View>

      {/* Banner */}
      <TouchableOpacity
        style={styles.banner}
        onPress={() => navigation.navigate('Browse')}
        activeOpacity={0.85}
      >
        <Text style={styles.bannerLabel}>Available near you</Text>
        <Text style={styles.bannerCount}>{donations.length} donations</Text>
        <Text style={styles.bannerSub}>Tap to browse all food →</Text>
      </TouchableOpacity>

      {loading && <ActivityIndicator color={C.green} style={{ marginTop: 24 }} />}
      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      {/* Ready-to-Eat */}
      {rte.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Near you now</Text>
          {rte.slice(0, 3).map((item) => (
            <FoodCard
              key={item.id}
              item={item}
              onPress={() => navigation.navigate('FoodDetail', { donation: item })}
            />
          ))}
        </View>
      )}

      {/* Storable */}
      {storable.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>From storage</Text>
          {storable.slice(0, 3).map((item) => (
            <FoodCard
              key={item.id}
              item={item}
              onPress={() => navigation.navigate('FoodDetail', { donation: item })}
            />
          ))}
        </View>
      )}

      {!loading && !error && donations.length === 0 && (
        <Text style={styles.emptyText}>No donations available right now.</Text>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.white },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
    padding: 20, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: C.gray100,
    backgroundColor: C.white,
  },
  headerGreeting: { fontSize: 13, color: C.gray500, marginBottom: 2 },
  headerName: { fontSize: 22, fontWeight: '800', color: C.gray900, letterSpacing: -0.3 },
  avatar: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: C.amberLight, alignItems: 'center', justifyContent: 'center',
  },
  banner: {
    margin: 20, borderRadius: 18, padding: 20,
    backgroundColor: C.green,
  },
  bannerLabel: { fontSize: 12, fontWeight: '700', color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 4 },
  bannerCount: { fontSize: 28, fontWeight: '800', color: C.white },
  bannerSub: { fontSize: 13, color: 'rgba(255,255,255,0.8)', marginTop: 4 },
  section: { paddingHorizontal: 20 },
  sectionLabel: {
    fontSize: 12, fontWeight: '700', color: C.gray400,
    letterSpacing: 1, textTransform: 'uppercase', marginBottom: 10, marginTop: 4,
  },
  card: {
    backgroundColor: C.white, borderRadius: 16,
    borderWidth: 1, borderColor: C.gray200, overflow: 'hidden', marginBottom: 12,
  },
  cardBanner: {
    height: 120, backgroundColor: C.greenPale,
    alignItems: 'center', justifyContent: 'center',
  },
  cardEmoji: { fontSize: 48 },
  cardBadgeTop: { position: 'absolute', top: 10, left: 10 },
  distancePill: {
    position: 'absolute', top: 10, right: 10,
    backgroundColor: 'rgba(0,0,0,0.45)', borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3,
  },
  distancePillText: { fontSize: 11, color: C.white, fontWeight: '600' },
  cardBody: { padding: 14 },
  cardTitle: { fontSize: 15, fontWeight: '700', color: C.gray900, marginBottom: 4 },
  cardRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardQty: { fontSize: 13, color: C.gray500 },
  cardQtyVal: { color: C.gray700, fontWeight: '600' },
  cardUntil: { fontSize: 12, color: '#E05A2B', fontWeight: '600' },
  badge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 20 },
  badgeText: { fontSize: 11, fontWeight: '700' },
  errorText: { color: '#E05A2B', textAlign: 'center', marginTop: 24, fontSize: 13 },
  emptyText: { color: C.gray500, textAlign: 'center', marginTop: 40, fontSize: 14 },
});
