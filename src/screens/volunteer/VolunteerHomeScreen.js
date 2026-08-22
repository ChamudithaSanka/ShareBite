import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { subscribeToVolunteerDeliveries } from '../../services/deliveryService';

const GREEN = '#1A7A4A';
const ACTIVE_STATUSES = ['assigned', 'picked_up', 'in_transit'];

export default function VolunteerHomeScreen({ navigation }) {
  const { user, userProfile } = useAuth();
  const [deliveries, setDeliveries] = useState([]);
  const [loading, setLoading] = useState(true);
  const name = userProfile?.name || 'Volunteer';
  const active = deliveries.filter((delivery) => ACTIVE_STATUSES.includes(delivery.status));
  const completed = deliveries.filter((delivery) => delivery.status === 'delivered');

  useEffect(() => subscribeToVolunteerDeliveries(
    user?.uid,
    (items) => { setDeliveries(items); setLoading(false); },
    () => setLoading(false),
  ), [user?.uid]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View><Text style={styles.greeting}>Ready to help,</Text><Text style={styles.title}>{name}</Text><Text style={styles.role}>Volunteer</Text></View>
        <View style={styles.avatar}><Text style={styles.emoji}>🚴</Text></View>
      </View>
      <View style={styles.statsRow}>
        <View style={styles.stat}><Text style={styles.statNumber}>{loading ? '-' : active.length}</Text><Text style={styles.statLabel}>Active jobs</Text></View>
        <View style={styles.stat}><Text style={styles.statNumber}>{loading ? '-' : completed.length}</Text><Text style={styles.statLabel}>Completed</Text></View>
      </View>
      {active[0] ? (
        <TouchableOpacity style={styles.activeCard} onPress={() => navigation.navigate('Active')}>
          <Text style={styles.activeEyebrow}>ACTIVE DELIVERY</Text>
          <Text style={styles.activeTitle}>{active[0].foodName || active[0].title || 'Food delivery'}</Text>
          <Text style={styles.activeText}>Status: {(active[0].status || 'assigned').replace('_', ' ')}</Text>
          <Text style={styles.activeLink}>Continue delivery  ›</Text>
        </TouchableOpacity>
      ) : (
        <View style={styles.emptyCard}><Text style={styles.emptyTitle}>Ready for your next delivery?</Text><Text style={styles.emptyText}>Browse available jobs and help a neighbour today.</Text><TouchableOpacity onPress={() => navigation.navigate('Jobs')}><Text style={styles.browseLink}>Browse available jobs  ›</Text></TouchableOpacity></View>
      )}
      <Text style={styles.sectionTitle}>Your contribution</Text>
      <View style={styles.infoRow}><Text style={styles.infoIcon}>🌱</Text><View><Text style={styles.infoTitle}>{completed.length} deliveries completed</Text><Text style={styles.infoText}>Every trip helps reduce food waste.</Text></View></View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { backgroundColor: '#F9FAFB', flex: 1, padding: 20 },
  header: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', marginBottom: 22, marginTop: 8 },
  emoji: { fontSize: 28 },
  avatar: { alignItems: 'center', backgroundColor: '#E8F5EE', borderRadius: 28, height: 56, justifyContent: 'center', width: 56 },
  greeting: { color: '#6B7280', fontSize: 14, marginBottom: 3 },
  title: { color: '#111827', fontSize: 25, fontWeight: '800' },
  role: { color: GREEN, fontSize: 13, fontWeight: '700', marginTop: 5 },
  statsRow: { backgroundColor: '#fff', borderColor: '#E5E7EB', borderRadius: 16, borderWidth: 1, flexDirection: 'row', paddingVertical: 16 },
  stat: { alignItems: 'center', borderRightColor: '#F3F4F6', borderRightWidth: 1, flex: 1 },
  statNumber: { color: GREEN, fontSize: 25, fontWeight: '800' },
  statLabel: { color: '#6B7280', fontSize: 11, fontWeight: '600', marginTop: 4 },
  activeCard: { backgroundColor: '#D97706', borderRadius: 17, marginTop: 16, padding: 18 },
  activeEyebrow: { color: '#FEF3C7', fontSize: 10, fontWeight: '800', letterSpacing: 0.9 },
  activeTitle: { color: '#fff', fontSize: 18, fontWeight: '800', marginTop: 7 },
  activeText: { color: '#FEF3C7', fontSize: 13, marginTop: 4 },
  activeLink: { color: '#fff', fontSize: 13, fontWeight: '800', marginTop: 15 },
  emptyCard: { backgroundColor: '#fff', borderColor: '#E5E7EB', borderRadius: 17, borderWidth: 1, marginTop: 16, padding: 18 },
  emptyTitle: { color: '#1F2937', fontSize: 16, fontWeight: '800' },
  emptyText: { color: '#6B7280', fontSize: 13, lineHeight: 18, marginTop: 5 },
  browseLink: { color: GREEN, fontSize: 13, fontWeight: '800', marginTop: 13 },
  sectionTitle: { color: '#374151', fontSize: 13, fontWeight: '800', marginBottom: 10, marginTop: 24 },
  infoRow: { alignItems: 'center', backgroundColor: '#E8F5EE', borderColor: '#C3E8D4', borderRadius: 14, borderWidth: 1, flexDirection: 'row', padding: 14 },
  infoIcon: { fontSize: 25, marginRight: 12 },
  infoTitle: { color: '#1F2937', fontSize: 14, fontWeight: '700' },
  infoText: { color: '#6B7280', fontSize: 12, marginTop: 3 },
});
