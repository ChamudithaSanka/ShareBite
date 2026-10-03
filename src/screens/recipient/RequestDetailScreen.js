import React, { useEffect, useState } from 'react';
import { Image, StyleSheet } from 'react-native';
import {
  ThemedActivityIndicator as ActivityIndicator,
  ThemedSafeAreaView as SafeAreaView,
  ThemedScrollView as ScrollView,
  ThemedText as Text,
  ThemedTouchableOpacity as TouchableOpacity,
  ThemedView as View,
} from '../../components/ThemedPrimitives';
import { useAuth } from '../../context/AuthContext';
import { useTabBarContentPadding } from '../../hooks';
import { subscribeToRecipientRequest } from '../../services/requestService';

const C = {
  green: '#1A7A4A', greenLight: '#E8F5EE', amber: '#D97706', amberLight: '#FEF3C7',
  blue: '#2563EB', blueLight: '#EFF6FF', red: '#B42318', redLight: '#FDECEC',
  gray100: '#F3F4F6', gray200: '#E5E7EB', gray500: '#6B7280', gray700: '#374151',
  gray900: '#111827', white: '#FFFFFF',
};

const STATUS = {
  pending: { label: 'Awaiting approval', color: C.amber, background: C.amberLight },
  approved: { label: 'Approved', color: C.green, background: C.greenLight },
  assigned: { label: 'Volunteer assigned', color: C.blue, background: C.blueLight },
  picked_up: { label: 'Picked up', color: C.blue, background: C.blueLight },
  in_transit: { label: 'On the way', color: C.blue, background: C.blueLight },
  at_recipient: { label: 'Arrived', color: C.green, background: C.greenLight },
  delivered: { label: 'Delivered', color: C.green, background: C.greenLight },
  completed: { label: 'Completed', color: C.green, background: C.greenLight },
  declined: { label: 'Declined', color: C.red, background: C.redLight },
  cancelled: { label: 'Cancelled', color: C.red, background: C.redLight },
};

const formatDate = (timestamp) => {
  const date = timestamp?.toDate ? timestamp.toDate() : timestamp ? new Date(timestamp) : null;
  return date && !Number.isNaN(date.getTime())
    ? date.toLocaleString(undefined, { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })
    : 'Not available';
};

export default function RequestDetailScreen({ route, navigation }) {
  const { user } = useAuth();
  const tabBarContentPadding = useTabBarContentPadding();
  const requestId = route.params?.requestId || route.params?.request?.id;
  const [request, setRequest] = useState(route.params?.request || null);
  const [loading, setLoading] = useState(!route.params?.request);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!requestId || !user?.uid) {
      setLoading(false);
      return undefined;
    }

    return subscribeToRecipientRequest(
      requestId,
      user.uid,
      (value) => { setRequest(value); setLoading(false); },
      () => { setError('Unable to load this request.'); setLoading(false); },
    );
  }, [requestId, user?.uid]);

  if (loading) {
    return <SafeAreaView style={styles.centered}><ActivityIndicator color={C.green} /></SafeAreaView>;
  }
  if (error || !request) {
    return (
      <SafeAreaView style={styles.centered}>
        <Text style={styles.missingTitle}>{error || 'Request not found.'}</Text>
        <TouchableOpacity onPress={() => navigation.goBack()}><Text style={styles.backLink}>Go back</Text></TouchableOpacity>
      </SafeAreaView>
    );
  }

  const status = STATUS[request.status] || STATUS.pending;

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: tabBarContentPadding }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backLink}>‹  My requests</Text>
        </TouchableOpacity>

        <View style={styles.heading}>
          {request.photoUrl ? <Image source={{ uri: request.photoUrl }} style={styles.image} /> : null}
          <Text style={styles.eyebrow}>REQUEST DETAILS</Text>
          <Text style={styles.title}>{request.foodName || 'Food request'}</Text>
          <View style={[styles.statusBadge, { backgroundColor: status.background }]}>
            <Text style={[styles.statusText, { color: status.color }]}>{status.label}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Your request</Text>
          <DetailRow label="Quantity" value={request.quantity || 'Not specified'} />
          <DetailRow label="Requested" value={formatDate(request.createdAt)} />
          <DetailRow label="Pickup area" value={request.pickupLocation || 'Not specified'} />
          <DetailRow label="Delivery address" value={request.deliveryAddress || 'Not specified'} />
          <DetailRow label="Preferred time" value={request.preferredTime || 'Not specified'} />
          <DetailRow label="Volunteer" value={request.volunteerName || 'Not assigned yet'} last />
        </View>

        {request.notes ? (
          <View style={styles.noteSection}>
            <Text style={styles.sectionTitle}>Your note</Text>
            <Text style={styles.note}>{request.notes}</Text>
          </View>
        ) : null}

        <TouchableOpacity
          style={styles.trackButton}
          onPress={() => navigation.navigate('TrackDelivery', { requestId, request })}
        >
          <Text style={styles.trackButtonText}>View request progress  →</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

function DetailRow({ label, value, last }) {
  return (
    <View style={[styles.detailRow, last && styles.detailRowLast]}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.white },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: C.white, padding: 24 },
  content: { padding: 20, paddingBottom: 40 },
  backButton: { alignSelf: 'flex-start', marginBottom: 22 },
  backLink: { color: C.green, fontSize: 15, fontWeight: '700' },
  heading: { marginBottom: 22 },
  image: { width: '100%', height: 180, borderRadius: 14, marginBottom: 18 },
  eyebrow: { color: C.green, fontSize: 11, fontWeight: '800', marginBottom: 5 },
  title: { color: C.gray900, fontSize: 25, fontWeight: '800', marginBottom: 12 },
  statusBadge: { alignSelf: 'flex-start', borderRadius: 16, paddingHorizontal: 12, paddingVertical: 6 },
  statusText: { fontSize: 12, fontWeight: '800' },
  section: { backgroundColor: '#F9FAFB', borderColor: C.gray200, borderWidth: 1, borderRadius: 12, padding: 16 },
  sectionTitle: { color: C.gray900, fontSize: 16, fontWeight: '800', marginBottom: 8 },
  detailRow: { borderBottomColor: C.gray200, borderBottomWidth: 1, paddingVertical: 11 },
  detailRowLast: { borderBottomWidth: 0 },
  detailLabel: { color: C.gray500, fontSize: 11, fontWeight: '700', marginBottom: 3 },
  detailValue: { color: C.gray900, fontSize: 14, lineHeight: 20 },
  noteSection: { backgroundColor: '#F9FAFB', borderColor: C.gray200, borderWidth: 1, borderRadius: 12, marginTop: 14, padding: 16 },
  note: { color: C.gray700, fontSize: 14, lineHeight: 20 },
  trackButton: { alignItems: 'center', backgroundColor: C.green, borderRadius: 12, marginTop: 18, padding: 15 },
  trackButtonText: { color: C.white, fontSize: 15, fontWeight: '800' },
  missingTitle: { color: C.gray700, fontSize: 16, marginBottom: 12, textAlign: 'center' },
});
