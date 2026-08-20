import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View,
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { acceptDelivery, getDeliveryById } from '../../services/deliveryService';

const GREEN = '#1A7A4A';
const pickupFor = (delivery) => delivery.pickupLocation || delivery.pickupAddress || 'Pickup location unavailable';
const dropoffFor = (delivery) => delivery.deliveryAddress || delivery.dropoffAddress || 'Drop-off location unavailable';

export default function DeliveryDetailScreen({ route, navigation }) {
  const { user } = useAuth();
  const [delivery, setDelivery] = useState(route.params?.delivery || null);
  const [loading, setLoading] = useState(!delivery);
  const [accepting, setAccepting] = useState(false);

  useEffect(() => {
    const deliveryId = route.params?.deliveryId;
    if (!deliveryId || delivery) return undefined;

    getDeliveryById(deliveryId)
      .then(setDelivery)
      .catch(() => Alert.alert('Error', 'Unable to load this delivery.'))
      .finally(() => setLoading(false));

    return undefined;
  }, [delivery, route.params?.deliveryId]);

  const handleAccept = async () => {
    if (!delivery?.id || !user?.uid) return;

    setAccepting(true);
    try {
      await acceptDelivery(delivery.id, user.uid);
      Alert.alert('Delivery accepted', 'This job is now assigned to you.', [
        { text: 'View active delivery', onPress: () => navigation.getParent()?.navigate('Active') },
      ]);
    } catch (error) {
      Alert.alert(
        error.code === 'active-delivery' ? 'Active delivery already assigned' : 'Unable to accept',
        error.code === 'active-delivery'
          ? 'Complete your current delivery before accepting another job.'
          : 'This delivery may already be assigned. Please refresh and try again.',
      );
    } finally {
      setAccepting(false);
    }
  };

  if (loading) return <ActivityIndicator color={GREEN} style={styles.loader} />;
  if (!delivery) return <Text style={styles.empty}>Delivery not found.</Text>;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.eyebrow}>DELIVERY JOB</Text>
      <Text style={styles.title}>{delivery.foodName || delivery.title || 'Food delivery'}</Text>
      <Text style={styles.subtitle}>{delivery.quantity || 'Quantity not specified'} · {delivery.distance || 'Distance unavailable'}</Text>
      <View style={styles.hero}><Text style={styles.heroEmoji}>📦</Text><Text style={styles.heroText}>Ready to help food reach its destination</Text></View>
      <View style={styles.routeCard}>
        <View style={styles.routeRow}><Text style={styles.routeIcon}>●</Text><View style={styles.routeCopy}><Text style={styles.label}>PICKUP FROM</Text><Text style={styles.value}>{pickupFor(delivery)}</Text><Text style={styles.subValue}>{delivery.donorName || delivery.donor || 'Donor'}</Text></View></View>
        <View style={styles.routeLine} />
        <View style={styles.routeRow}><Text style={styles.routeIcon}>●</Text><View style={styles.routeCopy}><Text style={styles.label}>DELIVER TO</Text><Text style={styles.value}>{dropoffFor(delivery)}</Text><Text style={styles.subValue}>{delivery.recipientName || delivery.recipient || 'Recipient'}</Text></View></View>
      </View>
      <View style={styles.details}>
        <Text style={styles.detailLabel}>Distance</Text><Text style={styles.detailValue}>{delivery.distance || 'Not available'}</Text>
        <Text style={styles.detailLabel}>Deliver by</Text><Text style={styles.detailValue}>{delivery.pickupAvailability || delivery.deadline || 'As soon as possible'}</Text>
        <Text style={styles.detailLabel}>Status</Text><Text style={styles.detailValue}>{delivery.status || 'pending'}</Text>
      </View>
      <TouchableOpacity style={[styles.button, accepting && styles.disabled]} onPress={handleAccept} disabled={accepting}>
        {accepting ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Accept delivery</Text>}
      </TouchableOpacity>
      <TouchableOpacity style={styles.skip} onPress={() => navigation.goBack()}><Text style={styles.skipText}>Back to available jobs</Text></TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { backgroundColor: '#fff', padding: 24, paddingBottom: 34 },
  eyebrow: { color: GREEN, fontSize: 11, fontWeight: '800', letterSpacing: 1.1, marginTop: 4 },
  title: { color: '#111827', fontSize: 28, fontWeight: '800', marginTop: 6 },
  subtitle: { color: '#6B7280', fontSize: 14, marginTop: 5 },
  hero: { alignItems: 'center', backgroundColor: '#E8F5EE', borderRadius: 18, marginTop: 20, padding: 24 },
  heroEmoji: { fontSize: 54 },
  heroText: { color: GREEN, fontSize: 13, fontWeight: '700', marginTop: 9, textAlign: 'center' },
  routeCard: { borderColor: '#E5E7EB', borderRadius: 16, borderWidth: 1, marginTop: 16, padding: 16 },
  routeRow: { alignItems: 'flex-start', flexDirection: 'row' },
  routeIcon: { color: GREEN, fontSize: 19, marginRight: 12 },
  routeCopy: { flex: 1 },
  label: { color: '#9CA3AF', fontSize: 10, fontWeight: '800', letterSpacing: 0.8 },
  value: { color: '#1F2937', fontSize: 15, fontWeight: '700', marginTop: 4 },
  subValue: { color: '#6B7280', fontSize: 12, marginTop: 3 },
  routeLine: { backgroundColor: '#D1D5DB', height: 23, marginLeft: 8, width: 1 },
  details: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 18 },
  detailLabel: { color: '#6B7280', fontSize: 13, paddingVertical: 9, width: '50%' },
  detailValue: { color: '#1F2937', fontSize: 13, fontWeight: '700', paddingVertical: 9, textAlign: 'right', width: '50%' },
  button: { alignItems: 'center', backgroundColor: GREEN, borderRadius: 14, marginTop: 18, paddingVertical: 15 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '800' },
  disabled: { opacity: 0.6 },
  skip: { alignItems: 'center', paddingVertical: 16 },
  skipText: { color: '#6B7280', fontSize: 13, fontWeight: '600' },
  loader: { flex: 1 },
  empty: { color: '#6B7280', flex: 1, padding: 24, textAlign: 'center' },
});
