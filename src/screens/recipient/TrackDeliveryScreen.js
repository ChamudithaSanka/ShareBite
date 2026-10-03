import React, { useEffect, useState } from 'react';
import { StyleSheet } from 'react-native';
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
  gray200: '#E5E7EB', gray500: '#6B7280', gray700: '#374151', gray900: '#111827', white: '#FFFFFF',
};

const STEPS = [
  { status: 'pending', title: 'Request submitted', detail: 'Waiting for coordinator approval.' },
  { status: 'approved', title: 'Request approved', detail: 'Your food is cleared for delivery.' },
  { status: 'assigned', title: 'Volunteer assigned', detail: 'A volunteer is preparing to collect your food.' },
  { status: 'picked_up', title: 'Food picked up', detail: 'Your food has been collected from the donor.' },
  { status: 'in_transit', title: 'On the way', detail: 'Your delivery is on its way to you.' },
  { status: 'at_recipient', title: 'Arrived', detail: 'The volunteer has reached your delivery address.' },
  { status: 'delivered', title: 'Delivered', detail: 'Your delivery has been completed.' },
];

const TERMINAL_MESSAGES = {
  declined: 'This request was declined by the coordinator.',
  cancelled: 'This request was cancelled.',
};

export default function TrackDeliveryScreen({ route, navigation }) {
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
      () => { setError('Unable to load delivery progress.'); setLoading(false); },
    );
  }, [requestId, user?.uid]);

  if (loading) {
    return <SafeAreaView style={styles.centered}><ActivityIndicator color={C.green} /></SafeAreaView>;
  }
  if (error || !request) {
    return (
      <SafeAreaView style={styles.centered}>
        <Text style={styles.message}>{error || 'Request not found.'}</Text>
        <TouchableOpacity onPress={() => navigation.goBack()}><Text style={styles.backLink}>Go back</Text></TouchableOpacity>
      </SafeAreaView>
    );
  }

  const status = request.status || 'pending';
  const terminalMessage = TERMINAL_MESSAGES[status];
  const currentStep = STEPS.findIndex((step) => step.status === status);
  const progressIndex = status === 'completed' ? STEPS.length - 1 : currentStep;

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: tabBarContentPadding }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backLink}>‹  Request details</Text>
        </TouchableOpacity>
        <Text style={styles.eyebrow}>REQUEST PROGRESS</Text>
        <Text style={styles.title}>{request.foodName || 'Food delivery'}</Text>
        <Text style={styles.subtitle}>{request.quantity || 'Quantity not specified'}</Text>

        {terminalMessage ? (
          <View style={styles.terminalCard}>
            <Text style={styles.terminalTitle}>{status === 'declined' ? 'Request declined' : 'Request cancelled'}</Text>
            <Text style={styles.terminalText}>{terminalMessage}</Text>
          </View>
        ) : (
          <View style={styles.timeline}>
            {STEPS.map((step, index) => {
              const complete = index <= progressIndex;
              const current = index === progressIndex;
              return (
                <View key={step.status} style={styles.timelineRow}>
                  <View style={styles.markerColumn}>
                    <View style={[styles.marker, complete && styles.markerActive, current && styles.markerCurrent]}>
                      {complete ? <Text style={styles.markerCheck}>✓</Text> : null}
                    </View>
                    {index < STEPS.length - 1 ? <View style={[styles.connector, index < progressIndex && styles.connectorActive]} /> : null}
                  </View>
                  <View style={styles.stepCopy}>
                    <Text style={[styles.stepTitle, current && styles.currentTitle]}>{step.title}</Text>
                    <Text style={styles.stepDetail}>{step.detail}</Text>
                  </View>
                </View>
              );
            })}
          </View>
        )}

        <View style={styles.deliveryCard}>
          <Text style={styles.cardTitle}>Delivery details</Text>
          <DetailRow label="Volunteer" value={request.volunteerName || 'Not assigned yet'} />
          <DetailRow label="Pickup area" value={request.pickupLocation || 'Not specified'} />
          <DetailRow label="Delivery address" value={request.deliveryAddress || 'Not specified'} />
        </View>
        <Text style={styles.updateNote}>Progress updates when the coordinator or volunteer changes the request status.</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function DetailRow({ label, value }) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.white },
  centered: { alignItems: 'center', backgroundColor: C.white, flex: 1, justifyContent: 'center', padding: 24 },
  content: { padding: 20, paddingBottom: 40 },
  backButton: { alignSelf: 'flex-start', marginBottom: 22 },
  backLink: { color: C.green, fontSize: 15, fontWeight: '700' },
  eyebrow: { color: C.green, fontSize: 11, fontWeight: '800', marginBottom: 5 },
  title: { color: C.gray900, fontSize: 25, fontWeight: '800' },
  subtitle: { color: C.gray500, fontSize: 14, marginTop: 5 },
  timeline: { backgroundColor: '#F9FAFB', borderColor: C.gray200, borderRadius: 12, borderWidth: 1, marginTop: 20, padding: 16 },
  timelineRow: { flexDirection: 'row', minHeight: 66 },
  markerColumn: { alignItems: 'center', marginRight: 12, width: 24 },
  marker: { alignItems: 'center', backgroundColor: C.white, borderColor: C.gray200, borderRadius: 12, borderWidth: 2, height: 22, justifyContent: 'center', width: 22 },
  markerActive: { backgroundColor: C.green, borderColor: C.green },
  markerCurrent: { borderColor: C.green, borderWidth: 3 },
  markerCheck: { color: C.white, fontSize: 12, fontWeight: '800' },
  connector: { backgroundColor: C.gray200, flex: 1, marginVertical: 3, width: 2 },
  connectorActive: { backgroundColor: C.green },
  stepCopy: { flex: 1, paddingBottom: 13 },
  stepTitle: { color: C.gray700, fontSize: 14, fontWeight: '700' },
  currentTitle: { color: C.green },
  stepDetail: { color: C.gray500, fontSize: 12, lineHeight: 18, marginTop: 3 },
  terminalCard: { backgroundColor: C.redLight, borderRadius: 12, marginTop: 20, padding: 16 },
  terminalTitle: { color: C.red, fontSize: 16, fontWeight: '800' },
  terminalText: { color: C.gray700, fontSize: 13, lineHeight: 19, marginTop: 5 },
  deliveryCard: { backgroundColor: '#F9FAFB', borderColor: C.gray200, borderRadius: 12, borderWidth: 1, marginTop: 16, padding: 16 },
  cardTitle: { color: C.gray900, fontSize: 16, fontWeight: '800', marginBottom: 8 },
  detailRow: { borderTopColor: C.gray200, borderTopWidth: 1, paddingVertical: 10 },
  detailLabel: { color: C.gray500, fontSize: 11, fontWeight: '700', marginBottom: 3 },
  detailValue: { color: C.gray900, fontSize: 13, lineHeight: 19 },
  updateNote: { color: C.gray500, fontSize: 12, lineHeight: 18, marginTop: 14 },
  message: { color: C.gray700, fontSize: 16, marginBottom: 12, textAlign: 'center' },
});
