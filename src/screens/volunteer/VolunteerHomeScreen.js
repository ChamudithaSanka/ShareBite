import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
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
  const activeDelivery = active[0];

  useEffect(() => subscribeToVolunteerDeliveries(
    user?.uid,
    (items) => { setDeliveries(items); setLoading(false); },
    () => setLoading(false),
  ), [user?.uid]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View><Text style={styles.greeting}>Ready to help,</Text><Text style={styles.title}>{name}</Text><Text style={styles.role}>Volunteer</Text></View>
        
      </View>
      <View style={styles.statsRow}>
        <View style={styles.stat}><View style={[styles.statIcon, styles.statIconGreen]}><Ionicons name="cube-outline" size={17} color={GREEN} /></View><View><Text style={styles.statNumber}>{loading ? '-' : active.length}</Text><Text style={styles.statLabel}>Active jobs</Text></View></View>
        <View style={styles.stat}><View style={[styles.statIcon, styles.statIconOrange]}><Ionicons name="restaurant-outline" size={17} color="#C96A2D" /></View><View><Text style={styles.statNumber}>{loading ? '-' : completed.length}</Text><Text style={styles.statLabel}>Completed</Text></View></View>
      </View>
      {activeDelivery ? (
        <TouchableOpacity style={styles.activeCard} onPress={() => navigation.navigate('Active')}>
          <View style={styles.activeCardTop}>
            <View style={styles.activeIcon}><Ionicons name="bicycle" size={23} color="#FFFFFF" /></View>
            <View style={styles.activeCopy}>
              <Text style={styles.activeEyebrow}>ACTIVE DELIVERY</Text>
              <Text style={styles.activeTitle}>{activeDelivery.foodName || activeDelivery.title || 'Food delivery'}</Text>
            </View>
            <View style={styles.liveBadge}><View style={styles.liveDot} /><Text style={styles.liveText}>LIVE</Text></View>
          </View>
          <View style={styles.activeRoute}>
            <Ionicons name="bicycle-outline" size={17} color="#B8F0CD" />
            <Text style={styles.activeText}>{(activeDelivery.status || 'assigned').replace('_', ' ')}</Text>
            <Text style={styles.activeHint}>Tap to continue</Text>
          </View>
          <View style={styles.activeAction}>
            <Text style={styles.activeLink}>Continue delivery</Text>
            <View style={styles.activeArrow}><Ionicons name="arrow-forward" size={17} color={GREEN} /></View>
          </View>
        </TouchableOpacity>
      ) : (
        <View style={styles.emptyCard}><Text style={styles.emptyTitle}>Ready for your next delivery?</Text><Text style={styles.emptyText}>Browse available jobs and help a neighbour today.</Text><TouchableOpacity onPress={() => navigation.navigate('Jobs')}><Text style={styles.browseLink}>Browse available jobs  ›</Text></TouchableOpacity></View>
      )}
      <View style={styles.contributionHeader}><Text style={styles.sectionTitle}>Your contribution</Text><Text style={styles.contributionCaption}>COMMUNITY IMPACT</Text></View>
      <View style={styles.contributionCard}>
        <View style={styles.contributionTop}>
          <View style={styles.contributionIcon}><Ionicons name="nutrition-outline" size={22} color={GREEN} /></View>
          <View style={styles.contributionCopy}><Text style={styles.contributionTitle}>Good food, further</Text><Text style={styles.contributionText}>Every delivery helps reduce food waste.</Text></View>
          <Ionicons name="sparkles-outline" size={21} color="#D28A3E" />
        </View>
        <View style={styles.impactDivider} />
        <View style={styles.impactMetric}><Text style={styles.impactNumber}>{completed.length}</Text><View><Text style={styles.impactLabel}>deliveries completed</Text><Text style={styles.impactNote}>Your contribution so far</Text></View></View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { backgroundColor: '#F9FAFB', flex: 1, padding: 20, paddingBottom: 120 },
  header: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', marginBottom: 22, marginTop: 8 },
  emoji: { fontSize: 28 },
  avatar: { alignItems: 'center', backgroundColor: '#E8F5EE', borderRadius: 28, height: 56, justifyContent: 'center', width: 56 },
  greeting: { color: '#6B7280', fontSize: 14, marginBottom: 3 },
  title: { color: '#111827', fontSize: 25, fontWeight: '800' },
  role: { color: GREEN, fontSize: 13, fontWeight: '700', marginTop: 5 },
  statsRow: { backgroundColor: '#FFFFFF', borderColor: '#E5E7EB', borderRadius: 18, borderWidth: 1, flexDirection: 'row', padding: 14 },
  stat: { alignItems: 'center', borderRightColor: '#F0F3F1', borderRightWidth: 1, flex: 1, flexDirection: 'row', justifyContent: 'center' },
  statIcon: { alignItems: 'center', borderRadius: 11, height: 36, justifyContent: 'center', marginRight: 9, width: 36 },
  statIconGreen: { backgroundColor: '#E8F5EE' },
  statIconOrange: { backgroundColor: '#FFF1E7' },
  statNumber: { color: '#13231A', fontSize: 21, fontWeight: '800' },
  statLabel: { color: '#6B7280', fontSize: 11, fontWeight: '600', marginTop: 4 },
  activeCard: { backgroundColor: GREEN, borderRadius: 22, elevation: 5, marginTop: 16, overflow: 'hidden', padding: 19, shadowColor: '#145A38', shadowOffset: { height: 4, width: 0 }, shadowOpacity: 0.2, shadowRadius: 8 },
  activeCardTop: { alignItems: 'center', flexDirection: 'row' },
  activeIcon: { alignItems: 'center', backgroundColor: '#2C8E5B', borderColor: '#5DAF7D', borderRadius: 15, borderWidth: 1, height: 48, justifyContent: 'center', width: 48 },
  activeCopy: { flex: 1, marginLeft: 12 },
  activeEyebrow: { color: '#B8F0CD', fontSize: 10, fontWeight: '800', letterSpacing: 0.9 },
  activeTitle: { color: '#FFFFFF', fontSize: 18, fontWeight: '800', marginTop: 6 },
  liveBadge: { alignItems: 'center', backgroundColor: '#E8F5EE', borderRadius: 10, flexDirection: 'row', paddingHorizontal: 8, paddingVertical: 6 },
  liveDot: { backgroundColor: '#22C55E', borderRadius: 4, height: 7, marginRight: 5, width: 7 },
  liveText: { color: GREEN, fontSize: 9, fontWeight: '800' },
  activeRoute: { alignItems: 'center', borderBottomColor: '#48966A', borderBottomWidth: 1, borderTopColor: '#48966A', borderTopWidth: 1, flexDirection: 'row', marginTop: 17, paddingVertical: 11 },
  activeText: { color: '#D8F7E2', flex: 1, fontSize: 13, fontWeight: '700', marginLeft: 8, textTransform: 'capitalize' },
  activeHint: { color: '#B8F0CD', fontSize: 11, fontWeight: '600' },
  activeAction: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', paddingTop: 15 },
  activeLink: { color: '#FFFFFF', fontSize: 14, fontWeight: '800' },
  activeArrow: { alignItems: 'center', backgroundColor: '#FFFFFF', borderRadius: 17, height: 34, justifyContent: 'center', width: 34 },
  emptyCard: { backgroundColor: '#fff', borderColor: '#E5E7EB', borderRadius: 17, borderWidth: 1, marginTop: 16, padding: 18 },
  emptyTitle: { color: '#1F2937', fontSize: 16, fontWeight: '800' },
  emptyText: { color: '#6B7280', fontSize: 13, lineHeight: 18, marginTop: 5 },
  browseLink: { color: GREEN, fontSize: 13, fontWeight: '800', marginTop: 13 },
  contributionHeader: { alignItems: 'baseline', flexDirection: 'row', justifyContent: 'space-between', marginTop: 24 },
  sectionTitle: { color: '#1F2937', fontSize: 15, fontWeight: '800', marginBottom: 10 },
  contributionCaption: { color: '#9CA3AF', fontSize: 9, fontWeight: '800', letterSpacing: 0.9, marginBottom: 10 },
  contributionCard: { backgroundColor: '#FFFFFF', borderColor: '#D8E9DE', borderRadius: 20, borderWidth: 1, padding: 17 },
  contributionTop: { alignItems: 'center', flexDirection: 'row' },
  contributionIcon: { alignItems: 'center', backgroundColor: '#E8F5EE', borderRadius: 14, height: 45, justifyContent: 'center', width: 45 },
  contributionCopy: { flex: 1, marginLeft: 12 },
  contributionTitle: { color: '#13231A', fontSize: 15, fontWeight: '800' },
  contributionText: { color: '#6B7280', fontSize: 11, marginTop: 4 },
  impactDivider: { backgroundColor: '#E9F0EB', height: 1, marginVertical: 15 },
  impactMetric: { alignItems: 'center', flexDirection: 'row' },
  impactNumber: { color: GREEN, fontSize: 31, fontWeight: '800', marginRight: 11 },
  impactLabel: { color: '#1F2937', fontSize: 13, fontWeight: '800' },
  impactNote: { color: '#9CA3AF', fontSize: 11, marginTop: 3 },
});
