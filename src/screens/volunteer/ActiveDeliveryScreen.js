import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { subscribeToVolunteerDeliveries, updateDeliveryStatus } from '../../services/deliveryService';

const GREEN = '#1A7A4A';
const activeStatuses = ['assigned', 'picked_up', 'in_transit', 'at_recipient'];
const locationFor = (delivery) => delivery.deliveryAddress || delivery.dropoffAddress || 'Drop-off unavailable';
const steps = [
  { status: 'assigned', title: 'Navigate to donor', button: 'Arrived at donor', icon: '⌖', detail: (delivery) => delivery.pickupLocation || delivery.pickupAddress || 'Pickup location unavailable' },
  { status: 'picked_up', title: 'Collect the food', button: 'Food collected', icon: '▣', detail: (delivery) => delivery.quantity || 'Quantity not specified' },
  { status: 'in_transit', title: 'Navigate to recipient', button: 'Arrived at recipient', icon: '⌖', detail: locationFor },
  { status: 'at_recipient', title: 'Hand over the food', button: 'Delivery completed', icon: '✓', detail: (delivery) => delivery.recipientName || delivery.recipient || 'Recipient' },
];

export default function ActiveDeliveryScreen() {
  const { user } = useAuth();
  const [deliveries, setDeliveries] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => subscribeToVolunteerDeliveries(
    user?.uid,
    (items) => { setDeliveries(items); setLoading(false); },
    () => setLoading(false),
  ), [user?.uid]);

  const active = deliveries.filter((delivery) => activeStatuses.includes(delivery.status));
  const completed = deliveries.filter((delivery) => delivery.status === 'delivered');
  const currentDelivery = active[0];
  const currentStep = currentDelivery
    ? steps.findIndex((step) => step.status === currentDelivery.status)
    : -1;

  const advanceDelivery = async () => {
    if (!currentDelivery) return;

    const nextStatus = currentStep === steps.length - 1 ? 'delivered' : steps[currentStep + 1].status;
    try {
      await updateDeliveryStatus(currentDelivery.id, nextStatus);
    } catch (error) {
      Alert.alert('Update failed', 'We could not update this delivery. Please try again.');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.eyebrow}>YOUR ROUTE</Text>
      <Text style={styles.title}>Active deliveries</Text>
      <Text style={styles.subtitle}>Jobs assigned to you and your completed work.</Text>
      {loading ? <ActivityIndicator color={GREEN} style={styles.loader} /> : null}
      {!loading && !currentDelivery ? <View style={styles.emptyCard}><Text style={styles.emptyEmoji}>🛵</Text><Text style={styles.emptyTitle}>No active delivery</Text><Text style={styles.emptyText}>Accept a job from Available Jobs to see it here.</Text></View> : null}
      {currentDelivery ? (
        <View style={styles.activeDelivery}>
          <View style={styles.progressRow}>{steps.map((step, index) => <View key={step.status} style={[styles.progressTrack, index <= currentStep && styles.progressTrackActive]} />)}</View>
          <View style={styles.stepLabels}>{steps.map((step, index) => <Text key={step.status} style={[styles.stepLabel, index === currentStep && styles.stepLabelActive]}>{step.title.replace('Navigate to ', '').replace('Collect the food', 'Collect').replace('Hand over the food', 'Handover')}</Text>)}</View>
          <View style={styles.map}><Text style={styles.mapIcon}>{steps[currentStep].icon}</Text><Text style={styles.mapText}>Map / navigation view</Text></View>
          <View style={styles.currentStep}><Text style={styles.stepEyebrow}>CURRENT STEP</Text><Text style={styles.currentTitle}>{steps[currentStep].title}</Text><Text style={styles.currentDetail}>{steps[currentStep].detail(currentDelivery)}</Text></View>
          <View style={styles.summary}><View><Text style={styles.summaryLabel}>Food</Text><Text style={styles.summaryValue}>{currentDelivery.foodName || currentDelivery.title || 'Food delivery'} · {currentDelivery.quantity || 'N/A'}</Text></View><View><Text style={styles.summaryLabel}>Donor</Text><Text style={styles.summaryValue}>{currentDelivery.donorName || currentDelivery.donor || 'Donor'}</Text></View><View><Text style={styles.summaryLabel}>Recipient</Text><Text style={styles.summaryValue}>{currentDelivery.recipientName || currentDelivery.recipient || 'Recipient'}</Text></View></View>
          <TouchableOpacity style={styles.advanceButton} onPress={advanceDelivery}><Text style={styles.advanceText}>→ {steps[currentStep].button}</Text></TouchableOpacity>
        </View>
      ) : null}
      <FlatList
        data={[]}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.cardTop}><Text style={styles.cardTitle}>{item.foodName || item.title || 'Food delivery'}</Text><Text style={styles.badge}>{(item.status || 'assigned').replace('_', ' ').toUpperCase()}</Text></View>
            <Text style={styles.cardText}>{item.quantity || 'Quantity not specified'}</Text>
            <Text style={styles.cardText}>Deliver to: {locationFor(item)}</Text>
            <Text style={styles.distance}>{item.distance || 'Distance unavailable'}</Text>
          </View>
        )}
        ListFooterComponent={completed.length > 0 ? <View><Text style={styles.sectionTitle}>Completed</Text>{completed.map((item) => <View key={item.id} style={styles.completedCard}><Text style={styles.completedTitle}>{item.foodName || item.title || 'Food delivery'}</Text><Text style={styles.completedText}>Delivered · {item.quantity || 'Quantity not specified'}</Text></View>)}</View> : null}
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
  list: { paddingTop: 20, paddingBottom: 24 },
  emptyCard: { alignItems: 'center', backgroundColor: '#fff', borderColor: '#E5E7EB', borderRadius: 16, borderWidth: 1, marginTop: 20, padding: 24 },
  emptyEmoji: { fontSize: 40 },
  emptyTitle: { color: '#1F2937', fontSize: 16, fontWeight: '800', marginTop: 10 },
  emptyText: { color: '#6B7280', fontSize: 13, marginTop: 5, textAlign: 'center' },
  activeDelivery: { marginTop: 20 },
  progressRow: { flexDirection: 'row', gap: 5 },
  progressTrack: { backgroundColor: '#E5E7EB', borderRadius: 3, flex: 1, height: 4 },
  progressTrackActive: { backgroundColor: GREEN },
  stepLabels: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 },
  stepLabel: { color: '#9CA3AF', fontSize: 9, maxWidth: 75, textAlign: 'center' },
  stepLabelActive: { color: GREEN, fontWeight: '800' },
  map: { alignItems: 'center', backgroundColor: '#E8F5EE', height: 164, justifyContent: 'center', marginHorizontal: -20, marginTop: 12 },
  mapIcon: { backgroundColor: '#fff', borderRadius: 24, color: GREEN, fontSize: 28, padding: 10 },
  mapText: { color: '#6B7280', fontSize: 12, marginTop: 8 },
  currentStep: { backgroundColor: '#fff', borderColor: '#E5E7EB', borderRadius: 16, borderWidth: 1, marginTop: 16, padding: 16 },
  stepEyebrow: { color: '#9CA3AF', fontSize: 10, fontWeight: '800', letterSpacing: 0.8 },
  currentTitle: { color: '#111827', fontSize: 19, fontWeight: '800', marginTop: 7 },
  currentDetail: { color: '#6B7280', fontSize: 13, marginTop: 4 },
  summary: { marginTop: 13 },
  summaryLabel: { color: '#6B7280', fontSize: 12, paddingVertical: 8, position: 'absolute' },
  summaryValue: { borderBottomColor: '#E5E7EB', borderBottomWidth: 1, color: '#1F2937', fontSize: 12, fontWeight: '700', paddingBottom: 8, paddingLeft: 68, paddingTop: 8, textAlign: 'right' },
  advanceButton: { alignItems: 'center', backgroundColor: GREEN, borderRadius: 12, marginTop: 18, paddingVertical: 14 },
  advanceText: { color: '#fff', fontSize: 14, fontWeight: '800' },
  card: { backgroundColor: '#fff', borderColor: '#BFDBFE', borderRadius: 16, borderWidth: 1, marginBottom: 12, padding: 16 },
  cardTop: { alignItems: 'flex-start', flexDirection: 'row', justifyContent: 'space-between' },
  cardTitle: { color: '#111827', flex: 1, fontSize: 16, fontWeight: '800' },
  badge: { backgroundColor: '#EFF6FF', borderRadius: 10, color: '#2563EB', fontSize: 9, fontWeight: '800', marginLeft: 8, overflow: 'hidden', paddingHorizontal: 8, paddingVertical: 5 },
  cardText: { color: '#6B7280', fontSize: 13, marginTop: 8 },
  distance: { color: GREEN, fontSize: 12, fontWeight: '700', marginTop: 10 },
  sectionTitle: { color: '#374151', fontSize: 13, fontWeight: '800', marginBottom: 10, marginTop: 8 },
  completedCard: { backgroundColor: '#fff', borderColor: '#E5E7EB', borderRadius: 14, borderWidth: 1, marginBottom: 10, padding: 14 },
  completedTitle: { color: '#1F2937', fontSize: 14, fontWeight: '700' },
  completedText: { color: '#6B7280', fontSize: 12, marginTop: 4 },
});
