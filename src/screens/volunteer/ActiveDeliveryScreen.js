import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Animated, PanResponder, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { subscribeToVolunteerDeliveries, updateDeliveryStatus } from '../../services/deliveryService';

const GREEN = '#1A7A4A';
const activeStatuses = ['assigned', 'picked_up', 'in_transit', 'at_recipient'];
const locationFor = (delivery) => delivery.deliveryAddress || delivery.dropoffAddress || 'Drop-off unavailable';
const steps = [
  { status: 'assigned', title: 'Navigate to donor', button: 'Arrived at donor', icon: 'navigate-outline', detail: (delivery) => delivery.pickupLocation || delivery.pickupAddress || 'Pickup location unavailable' },
  { status: 'picked_up', title: 'Collect the food', button: 'Food collected', icon: 'cube-outline', detail: (delivery) => delivery.quantity || 'Quantity not specified' },
  { status: 'in_transit', title: 'Navigate to recipient', button: 'Arrived at recipient', icon: 'navigate-outline', detail: locationFor },
  { status: 'at_recipient', title: 'Hand over the food', button: 'Delivery completed', icon: 'checkmark-circle-outline', detail: (delivery) => delivery.recipientName || delivery.recipient || 'Recipient' },
];

export default function ActiveDeliveryScreen() {
  const { user } = useAuth();
  const [deliveries, setDeliveries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const swipeX = useRef(new Animated.Value(0)).current;
  const updatingRef = useRef(false);
  const advanceDeliveryRef = useRef(() => {});
  const trackWidthRef = useRef(0);
  const arrowNudge = useRef(new Animated.Value(0)).current;
  const arrowNudgeLoop = useRef(null);

  useEffect(() => subscribeToVolunteerDeliveries(
    user?.uid,
    (items) => { setDeliveries(items); setLoading(false); },
    () => setLoading(false),
  ), [user?.uid]);

  const active = deliveries.filter((delivery) => activeStatuses.includes(delivery.status));
  const currentDelivery = active[0];
  const currentStep = currentDelivery
    ? steps.findIndex((step) => step.status === currentDelivery.status)
    : -1;

  const advanceDelivery = async () => {
    if (!currentDelivery) return;

    const nextStatus = currentStep === steps.length - 1 ? 'delivered' : steps[currentStep + 1].status;
    setUpdating(true);
    updatingRef.current = true;
    try {
      await updateDeliveryStatus(currentDelivery.id, nextStatus);
    } catch (error) {
      Alert.alert('Update failed', 'We could not update this delivery. Please try again.');
    } finally {
      setUpdating(false);
      updatingRef.current = false;
      swipeX.setValue(0);
    }
  };

  advanceDeliveryRef.current = advanceDelivery;

  useEffect(() => {
    swipeX.setValue(0);
  }, [currentDelivery?.id, currentDelivery?.status, swipeX]);

  const resetSwipe = () => {
    swipeX.stopAnimation();
    Animated.spring(swipeX, { bounciness: 8, speed: 20, toValue: 0, useNativeDriver: true }).start();
    startArrowNudge();
  };

  const startArrowNudge = () => {
    arrowNudgeLoop.current?.stop();
    arrowNudge.setValue(0);
    arrowNudgeLoop.current = Animated.loop(Animated.sequence([
      Animated.delay(500),
      Animated.timing(arrowNudge, { duration: 450, toValue: 7, useNativeDriver: true }),
      Animated.timing(arrowNudge, { duration: 450, toValue: 0, useNativeDriver: true }),
    ]));
    arrowNudgeLoop.current.start();
  };

  useEffect(() => {
    startArrowNudge();
    return () => arrowNudgeLoop.current?.stop();
  }, [currentDelivery?.id, currentDelivery?.status, arrowNudge]);

  const panResponder = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => !updatingRef.current,
    onMoveShouldSetPanResponder: (_, gestureState) => (
      !updatingRef.current
      && Math.abs(gestureState.dx) > 8
      && Math.abs(gestureState.dx) > Math.abs(gestureState.dy)
    ),
    onPanResponderGrant: () => {
      arrowNudgeLoop.current?.stop();
      arrowNudge.setValue(0);
      swipeX.stopAnimation();
      swipeX.setValue(0);
    },
    onPanResponderMove: (_, gestureState) => {
      const maxSwipe = Math.max(0, trackWidthRef.current - 60);
      swipeX.setValue(Math.max(0, Math.min(gestureState.dx, maxSwipe)));
    },
    onPanResponderRelease: (_, gestureState) => {
      const maxSwipe = Math.max(0, trackWidthRef.current - 60);
      const completed = maxSwipe > 0 && gestureState.dx >= maxSwipe * 0.75;
      if (completed && !updatingRef.current) {
        Animated.timing(swipeX, { duration: 120, toValue: maxSwipe, useNativeDriver: true }).start(() => {
          advanceDeliveryRef.current();
        });
      } else {
        resetSwipe();
      }
    },
    onPanResponderTerminate: resetSwipe,
    onPanResponderTerminationRequest: () => false,
  })).current;

  return (
    <>
      <View style={[styles.container, styles.content]}>
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.eyebrow}>YOUR ROUTE</Text>
          <Text style={styles.title}>Active delivery</Text>
        </View>
        
      </View>
      <Text style={styles.subtitle}>Jobs assigned to you and your completed work.</Text>
      {loading ? <ActivityIndicator color={GREEN} style={styles.loader} /> : null}
      {!loading && !currentDelivery ? (
        <View style={styles.emptyCard}>
          <View style={styles.emptyIcon}><Ionicons name="checkmark-done-outline" size={30} color={GREEN} /></View>
          <Text style={styles.emptyTitle}>You are all caught up</Text>
          <Text style={styles.emptyText}>Accept a job from Available Jobs to start your next delivery.</Text>
        </View>
      ) : null}
      {currentDelivery ? (
        <View style={styles.activeCard}>
          <View style={styles.cardHeader}>
            <View style={styles.packageIcon}><Ionicons name="cube-outline" size={24} color={GREEN} /></View>
            <View style={styles.cardHeaderCopy}>
              <Text style={styles.cardEyebrow}>CURRENT DELIVERY</Text>
              <Text style={styles.cardTitle}>{currentDelivery.foodName || currentDelivery.title || 'Food delivery'}</Text>
            </View>
            <View style={styles.liveBadge}><View style={styles.liveDot} /><Text style={styles.liveText}>LIVE</Text></View>
          </View>
          <View style={styles.progressSection}>
            <View style={styles.progressRow}>{steps.map((step, index) => <View key={step.status} style={[styles.progressTrack, index <= currentStep && styles.progressTrackActive]} />)}</View>
            <View style={styles.stepLabels}>{steps.map((step, index) => <Text key={step.status} style={[styles.stepLabel, index === currentStep && styles.stepLabelActive]}>{step.title.replace('Navigate to ', '').replace('Collect the food', 'Collect').replace('Hand over the food', 'Handover')}</Text>)}</View>
          </View>
          <View style={styles.map}>
            <View style={styles.mapCircle}><Ionicons name={steps[currentStep].icon} size={32} color={GREEN} /></View>
            <Text style={styles.mapTitle}>{steps[currentStep].title}</Text>
            <Text style={styles.mapText}>{steps[currentStep].detail(currentDelivery)}</Text>
          </View>
          <View style={styles.detailsCard}>
            <Text style={styles.detailsHeading}>Delivery details</Text>
            <View style={styles.detailRow}><Ionicons name="restaurant-outline" size={18} color="#6B7280" /><Text style={styles.detailLabel}>Food</Text><Text style={styles.detailValue}>{currentDelivery.foodName || currentDelivery.title || 'Food delivery'}</Text></View>
            <View style={styles.detailRow}><Ionicons name="scale-outline" size={18} color="#6B7280" /><Text style={styles.detailLabel}>Quantity</Text><Text style={styles.detailValue}>{currentDelivery.quantity || 'Not specified'}</Text></View>
            <View style={styles.detailRow}><Ionicons name="person-outline" size={18} color="#6B7280" /><Text style={styles.detailLabel}>Recipient</Text><Text style={styles.detailValue}>{currentDelivery.recipientName || currentDelivery.recipient || 'Recipient'}</Text></View>
          </View>
          <View
            style={[styles.advanceButton, updating && styles.advanceButtonDisabled]}
            onLayout={(event) => { trackWidthRef.current = event.nativeEvent.layout.width; }}
            {...panResponder.panHandlers}
            accessible
            accessibilityLabel={`Swipe right to ${steps[currentStep].button}`}
          >
            {updating ? (
              <Text pointerEvents="none" style={styles.advanceText}>Updating...</Text>
            ) : (
              <Animated.Text
                pointerEvents="none"
                style={[styles.advanceText, { opacity: swipeX.interpolate({ inputRange: [0, 80], outputRange: [1, 0], extrapolate: 'clamp' }) }]}
              >
                {`Slide to ${steps[currentStep].button}`}
              </Animated.Text>
            )}
            <Animated.View
              pointerEvents="none"
              style={[styles.swipeHandle, {
                transform: [
                  { translateX: swipeX },
                  { scale: swipeX.interpolate({ inputRange: [0, 80], outputRange: [1, 1.06], extrapolate: 'clamp' }) },
                ],
              }]}
            >
              <Animated.View style={{ transform: [{ translateX: arrowNudge }] }}>
                <Ionicons name="arrow-forward" size={20} color={GREEN} />
              </Animated.View>
            </Animated.View>
          </View>
        </View>
      ) : null}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: { backgroundColor: '#F5F7F6', flex: 1 },
  content: { padding: 20, paddingBottom: 132 },
  headerRow: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  headerIcon: { alignItems: 'center', backgroundColor: '#E2F3E8', borderRadius: 22, height: 44, justifyContent: 'center', width: 44 },
  eyebrow: { color: GREEN, fontSize: 11, fontWeight: '800', letterSpacing: 1.1 },
  title: { color: '#13231A', fontSize: 28, fontWeight: '800', marginTop: 4 },
  subtitle: { color: '#6B7280', fontSize: 14, lineHeight: 20, marginTop: 6 },
  loader: { marginTop: 32 },
  emptyCard: { alignItems: 'center', backgroundColor: '#FFFFFF', borderColor: '#D8E9DE', borderRadius: 20, borderWidth: 1, marginTop: 20, padding: 28 },
  emptyIcon: { alignItems: 'center', backgroundColor: '#E8F5EE', borderRadius: 28, height: 56, justifyContent: 'center', width: 56 },
  emptyTitle: { color: '#13231A', fontSize: 18, fontWeight: '800', marginTop: 14 },
  emptyText: { color: '#6B7280', fontSize: 13, lineHeight: 19, marginTop: 6, textAlign: 'center' },
  activeCard: { backgroundColor: '#FFFFFF', marginHorizontal: -20, marginTop: 20, minHeight: 620, padding: 20 },
  cardHeader: { alignItems: 'center', flexDirection: 'row' },
  packageIcon: { alignItems: 'center', backgroundColor: '#E8F5EE', borderRadius: 14, height: 46, justifyContent: 'center', width: 46 },
  cardHeaderCopy: { flex: 1, marginLeft: 11 },
  cardEyebrow: { color: '#6B7280', fontSize: 10, fontWeight: '800', letterSpacing: 0.8 },
  cardTitle: { color: '#13231A', fontSize: 17, fontWeight: '800', marginTop: 3 },
  liveBadge: { alignItems: 'center', backgroundColor: '#E8F5EE', borderRadius: 10, flexDirection: 'row', paddingHorizontal: 8, paddingVertical: 6 },
  liveDot: { backgroundColor: '#22C55E', borderRadius: 4, height: 7, marginRight: 5, width: 7 },
  liveText: { color: GREEN, fontSize: 9, fontWeight: '800' },
  progressSection: { marginTop: 20 },
  progressRow: { flexDirection: 'row', gap: 5 },
  progressTrack: { backgroundColor: '#E5E7EB', borderRadius: 3, flex: 1, height: 5 },
  progressTrackActive: { backgroundColor: GREEN },
  stepLabels: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 7 },
  stepLabel: { color: '#9CA3AF', fontSize: 9, maxWidth: 70, textAlign: 'center' },
  stepLabelActive: { color: GREEN, fontWeight: '800' },
  map: { alignItems: 'center', backgroundColor: '#EAF6EE', borderRadius: 16, marginTop: 18, paddingHorizontal: 16, paddingVertical: 24 },
  mapCircle: { alignItems: 'center', backgroundColor: '#FFFFFF', borderRadius: 29, elevation: 2, height: 58, justifyContent: 'center', shadowColor: '#1A7A4A', shadowOpacity: 0.12, shadowRadius: 6, width: 58 },
  mapTitle: { color: '#13231A', fontSize: 15, fontWeight: '800', marginTop: 12 },
  mapText: { color: '#6B7280', fontSize: 12, marginTop: 4, textAlign: 'center' },
  detailsCard: { backgroundColor: '#F8FAF9', borderRadius: 15, marginTop: 14, padding: 14 },
  detailsHeading: { color: '#374151', fontSize: 12, fontWeight: '800', marginBottom: 5 },
  detailRow: { alignItems: 'center', borderTopColor: '#E6ECE8', borderTopWidth: 1, flexDirection: 'row', minHeight: 42 },
  detailLabel: { color: '#6B7280', fontSize: 12, marginLeft: 9, width: 66 },
  detailValue: { color: '#1F2937', flex: 1, fontSize: 12, fontWeight: '700', textAlign: 'right' },
  advanceButton: { alignItems: 'center', backgroundColor: GREEN, borderColor: GREEN, borderRadius: 16, borderWidth: 1, justifyContent: 'center', marginTop: 14, minHeight: 60, overflow: 'hidden', paddingHorizontal: 64 },
  advanceButtonDisabled: { opacity: 0.72 },
  advanceText: { color: '#FFFFFF', fontSize: 13, fontWeight: '800', textAlign: 'center' },
  swipeHandle: { alignItems: 'center', backgroundColor: '#FFFFFF', borderRadius: 13, elevation: 3, height: 52, justifyContent: 'center', left: 4, position: 'absolute', shadowColor: '#0D482A', shadowOpacity: 0.28, shadowRadius: 5, top: 4, width: 56 },
});
