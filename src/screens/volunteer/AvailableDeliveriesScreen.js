import React, { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { subscribeToAvailableDeliveries } from '../../services/deliveryService';

const GREEN = '#1A7A4A';
const pickupFor = (delivery) => delivery.pickupLocation || delivery.pickupAddress || 'Pickup unavailable';
const dropoffFor = (delivery) => delivery.deliveryAddress || delivery.dropoffAddress || 'Drop-off unavailable';

export default function AvailableDeliveriesScreen({ navigation }) {
  const [deliveries, setDeliveries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => subscribeToAvailableDeliveries(
    (items) => { setDeliveries(items); setLoading(false); },
    () => { setError('Unable to load available deliveries.'); setLoading(false); },
  ), []);

  return (
    <View style={styles.container}>
      <Text style={styles.eyebrow}>VOLUNTEER JOBS</Text>
      <Text style={styles.title}>Available deliveries</Text>
      <Text style={styles.subtitle}>Help move food to someone nearby.</Text>
      {loading ? <ActivityIndicator color={GREEN} style={styles.loader} /> : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <FlatList
        data={deliveries}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={!loading ? <Text style={styles.empty}>No deliveries are waiting right now.</Text> : null}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.card} onPress={() => navigation.navigate('DeliveryDetail', { delivery: item })} activeOpacity={0.8}>
            <View style={styles.cardHeader}>
              <View style={styles.foodIcon}><Text style={styles.foodEmoji}>📦</Text></View>
              <View style={styles.cardCopy}>
                <Text style={styles.cardTitle}>{item.foodName || item.title || 'Food delivery'}</Text>
                <Text style={styles.cardMeta}>{item.quantity || 'Quantity not specified'} · {item.distance || 'Distance unavailable'}</Text>
              </View>
              <Text style={styles.status}>NEW</Text>
            </View>
            <View style={styles.route}>
              <View style={styles.routePoint}><Text style={styles.routeLabel}>PICKUP</Text><Text style={styles.routeText}>{pickupFor(item)}</Text></View>
              <Text style={styles.arrow}>→</Text>
              <View style={styles.routePoint}><Text style={styles.routeLabel}>DROP-OFF</Text><Text style={styles.routeText}>{dropoffFor(item)}</Text></View>
            </View>
            <Text style={styles.details}>View delivery details  ›</Text>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB', padding: 20 },
  eyebrow: { color: GREEN, fontSize: 11, fontWeight: '800', letterSpacing: 1.1, marginTop: 4 },
  title: { color: '#111827', fontSize: 27, fontWeight: '800', marginTop: 5 },
  subtitle: { color: '#6B7280', fontSize: 14, marginTop: 4 },
  loader: { marginTop: 32 },
  error: { color: '#E05A2B', marginTop: 28, textAlign: 'center' },
  list: { paddingTop: 20, paddingBottom: 24 },
  empty: { color: '#6B7280', marginTop: 40, textAlign: 'center' },
  card: { backgroundColor: '#fff', borderColor: '#E5E7EB', borderRadius: 16, borderWidth: 1, marginBottom: 12, padding: 16 },
  cardHeader: { alignItems: 'center', flexDirection: 'row' },
  foodIcon: { alignItems: 'center', backgroundColor: '#E8F5EE', borderRadius: 12, height: 46, justifyContent: 'center', width: 46 },
  foodEmoji: { fontSize: 23 },
  cardCopy: { flex: 1, marginLeft: 11 },
  cardTitle: { color: '#111827', fontSize: 16, fontWeight: '800' },
  cardMeta: { color: '#6B7280', fontSize: 12, marginTop: 3 },
  status: { backgroundColor: '#E8F5EE', borderRadius: 10, color: GREEN, fontSize: 10, fontWeight: '800', overflow: 'hidden', paddingHorizontal: 8, paddingVertical: 5 },
  route: { alignItems: 'center', backgroundColor: '#F9FAFB', borderRadius: 12, flexDirection: 'row', marginTop: 14, padding: 11 },
  routePoint: { flex: 1 },
  routeLabel: { color: '#9CA3AF', fontSize: 9, fontWeight: '800', letterSpacing: 0.7, marginBottom: 3 },
  routeText: { color: '#374151', fontSize: 12, fontWeight: '600' },
  arrow: { color: '#9CA3AF', fontSize: 18, marginHorizontal: 9 },
  details: { color: GREEN, fontSize: 12, fontWeight: '700', marginTop: 13, textAlign: 'right' },
});
