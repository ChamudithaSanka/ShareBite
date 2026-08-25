import React, { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { useAuth } from '../../context/AuthContext';
import { subscribeToAvailableDeliveries, subscribeToVolunteerDeliveries } from '../../services/deliveryService';

const GREEN = '#1A7A4A';
const pickupFor = (delivery) => delivery.pickupLocation || delivery.pickupAddress || 'Pickup unavailable';
const dropoffFor = (delivery) => delivery.deliveryAddress || delivery.dropoffAddress || 'Drop-off unavailable';

export default function AvailableDeliveriesScreen({ navigation }) {
  const { user } = useAuth();
  const [deliveries, setDeliveries] = useState([]);
  const [completed, setCompleted] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedCompleted, setSelectedCompleted] = useState(null);

  useEffect(() => {
    const unsubscribeAvailable = subscribeToAvailableDeliveries(
      (items) => { setDeliveries(items); setLoading(false); },
      () => { setError('Unable to load available deliveries.'); setLoading(false); },
    );
    const unsubscribeVolunteer = subscribeToVolunteerDeliveries(
      user?.uid,
      (items) => setCompleted(items.filter((item) => item.status === 'delivered')),
    );

    return () => {
      unsubscribeAvailable();
      unsubscribeVolunteer();
    };
  }, [user?.uid]);

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
        ListFooterComponent={completed.length > 0 ? (
          <View style={styles.completedSection}>
            <View style={styles.sectionHeader}><View><Text style={styles.sectionTitle}>Completed deliveries</Text><Text style={styles.sectionSubtitle}>Your recent delivery history</Text></View><View style={styles.completedCount}><Text style={styles.completedCountText}>{completed.length}</Text></View></View>
            {completed.map((item) => (
              <TouchableOpacity key={item.id} style={styles.completedCard} onPress={() => setSelectedCompleted(item)} activeOpacity={0.8}>
                <View style={styles.completedIcon}><Ionicons name="checkmark-circle" size={21} color={GREEN} /></View>
                <View style={styles.completedCopy}><Text style={styles.completedTitle}>{item.foodName || item.title || 'Food delivery'}</Text><Text style={styles.completedText}>{item.quantity || 'Quantity not specified'} · Delivered</Text></View>
                <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
              </TouchableOpacity>
            ))}
          </View>
        ) : null}
      />

      <Modal visible={Boolean(selectedCompleted)} transparent animationType="fade" onRequestClose={() => setSelectedCompleted(null)}>
        <View style={styles.modalBackdrop}>
          <BlurView intensity={80} tint="dark" style={[StyleSheet.absoluteFill, styles.modalBlur]} />
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View><Text style={styles.modalEyebrow}>DELIVERY COMPLETE</Text><Text style={styles.modalTitle}>Delivery details</Text></View>
              <TouchableOpacity onPress={() => setSelectedCompleted(null)} style={styles.closeButton} accessibilityLabel="Close delivery details"><Ionicons name="close" size={22} color="#374151" /></TouchableOpacity>
            </View>
            <View style={styles.modalSuccess}><View style={styles.modalSuccessIcon}><Ionicons name="checkmark-circle" size={27} color={GREEN} /></View><View style={styles.modalSuccessCopy}><Text style={styles.modalFood}>{selectedCompleted?.foodName || selectedCompleted?.title || 'Food delivery'}</Text><Text style={styles.modalStatus}>Successfully delivered</Text></View></View>
            <View style={styles.modalDetails}>
              <View style={styles.modalDetailRow}><Ionicons name="cube-outline" size={18} color={GREEN} /><Text style={styles.modalDetailLabel}>Quantity</Text><Text style={styles.modalDetailValue}>{selectedCompleted?.quantity || 'Not specified'}</Text></View>
              <View style={styles.modalDetailRow}><Ionicons name="location-outline" size={18} color={GREEN} /><Text style={styles.modalDetailLabel}>Pickup</Text><Text style={styles.modalDetailValue}>{selectedCompleted?.pickupLocation || selectedCompleted?.pickupAddress || 'Not specified'}</Text></View>
              <View style={styles.modalDetailRow}><Ionicons name="navigate-outline" size={18} color={GREEN} /><Text style={styles.modalDetailLabel}>Drop-off</Text><Text style={styles.modalDetailValue}>{dropoffFor(selectedCompleted || {})}</Text></View>
              <View style={styles.modalDetailRow}><Ionicons name="person-outline" size={18} color={GREEN} /><Text style={styles.modalDetailLabel}>Recipient</Text><Text style={styles.modalDetailValue}>{selectedCompleted?.recipientName || selectedCompleted?.recipient || 'Recipient'}</Text></View>
              <View style={styles.modalDetailRow}><Ionicons name="speedometer-outline" size={18} color={GREEN} /><Text style={styles.modalDetailLabel}>Distance</Text><Text style={styles.modalDetailValue}>{selectedCompleted?.distance || 'Not available'}</Text></View>
            </View>
            
          </View>
        </View>
      </Modal>
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
  list: { paddingTop: 20, paddingBottom: 120 },
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
  completedSection: { marginTop: 20 },
  sectionHeader: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', marginBottom: 11 },
  sectionTitle: { color: '#13231A', fontSize: 18, fontWeight: '800' },
  sectionSubtitle: { color: '#6B7280', fontSize: 11, marginTop: 3 },
  completedCount: { alignItems: 'center', backgroundColor: '#E8F5EE', borderRadius: 18, height: 36, justifyContent: 'center', width: 36 },
  completedCountText: { color: GREEN, fontSize: 14, fontWeight: '800' },
  completedCard: { alignItems: 'center', backgroundColor: '#FFFFFF', borderColor: '#D8E9DE', borderRadius: 15, borderWidth: 1, flexDirection: 'row', marginBottom: 9, padding: 13 },
  completedIcon: { alignItems: 'center', backgroundColor: '#E8F5EE', borderRadius: 18, height: 36, justifyContent: 'center', width: 36 },
  completedCopy: { flex: 1, marginLeft: 11 },
  completedTitle: { color: '#1F2937', fontSize: 14, fontWeight: '800' },
  completedText: { color: '#6B7280', fontSize: 12, marginTop: 4 },
  modalBackdrop: { flex: 1, justifyContent: 'flex-end' },
  modalBlur: { backgroundColor: 'rgba(15, 23, 42, 0.42)' },
  modalCard: { backgroundColor: '#FFFFFF', borderTopLeftRadius: 26, borderTopRightRadius: 26, padding: 22, paddingBottom: 30 },
  modalHeader: { alignItems: 'flex-start', flexDirection: 'row', justifyContent: 'space-between' },
  modalEyebrow: { color: GREEN, fontSize: 10, fontWeight: '800', letterSpacing: 1 },
  modalTitle: { color: '#13231A', fontSize: 24, fontWeight: '800', marginTop: 4 },
  closeButton: { alignItems: 'center', backgroundColor: '#F1F5F2', borderRadius: 20, height: 40, justifyContent: 'center', width: 40 },
  modalSuccess: { alignItems: 'center', backgroundColor: '#EAF6EE', borderRadius: 16, flexDirection: 'row', marginTop: 20, padding: 14 },
  modalSuccessIcon: { alignItems: 'center', backgroundColor: '#FFFFFF', borderRadius: 22, height: 44, justifyContent: 'center', width: 44 },
  modalSuccessCopy: { flex: 1 },
  modalFood: { color: '#13231A', fontSize: 16, fontWeight: '800', marginLeft: 12 },
  modalStatus: { color: GREEN, fontSize: 12, fontWeight: '700', marginLeft: 12, marginTop: 3 },
  modalDetails: { backgroundColor: '#F8FAF9', borderRadius: 16, marginTop: 14, paddingHorizontal: 14 },
  modalDetailRow: { alignItems: 'center', borderBottomColor: '#E6ECE8', borderBottomWidth: 1, flexDirection: 'row', minHeight: 48 },
  modalDetailLabel: { color: '#6B7280', fontSize: 12, marginLeft: 10, width: 70 },
  modalDetailValue: { color: '#1F2937', flex: 1, fontSize: 12, fontWeight: '700', textAlign: 'right' },
  backButton: { alignItems: 'center', backgroundColor: GREEN, borderRadius: 14, flexDirection: 'row', justifyContent: 'center', marginTop: 16, minHeight: 52 },
  backButtonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '800', marginLeft: 9 },
});
