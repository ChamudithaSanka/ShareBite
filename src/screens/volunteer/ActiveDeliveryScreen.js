import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Animated, Linking, PanResponder, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useTabBarContentPadding } from '../../hooks';
import { subscribeToVolunteerDeliveries, updateDeliveryStatus } from '../../services/deliveryService';

const GREEN = '#1A7A4A';
const activeStatuses = ['assigned', 'picked_up', 'in_transit', 'at_recipient'];
const locationFor = (delivery) => delivery.deliveryAddress || delivery.dropoffAddress || 'Drop-off unavailable';
const coordinatesFor = (delivery, coordinateFields, latitudeFields, longitudeFields) => {
  const coordinates = coordinateFields.map((field) => delivery[field]).find(Boolean);
  const latitude = Number(coordinates?.latitude ?? latitudeFields.map((field) => delivery[field]).find((value) => value !== undefined && value !== null));
  const longitude = Number(coordinates?.longitude ?? longitudeFields.map((field) => delivery[field]).find((value) => value !== undefined && value !== null));

  return Number.isFinite(latitude) && Number.isFinite(longitude) ? { latitude, longitude } : null;
};
const pickupCoordinatesFor = (delivery) => coordinatesFor(
  delivery,
  ['pickupCoordinates', 'coordinates'],
  ['pickupLatitude'],
  ['pickupLongitude'],
);
const recipientCoordinatesFor = (delivery) => coordinatesFor(
  delivery,
  ['deliveryCoordinates', 'dropoffCoordinates', 'recipientCoordinates'],
  ['deliveryLatitude', 'dropoffLatitude', 'recipientLatitude'],
  ['deliveryLongitude', 'dropoffLongitude', 'recipientLongitude'],
);
const steps = [
  { status: 'assigned', title: 'Navigate to donor', button: 'Arrived at donor', icon: 'navigate-outline', detail: (delivery) => delivery.pickupLocation || delivery.pickupAddress || 'Pickup location unavailable' },
  { status: 'picked_up', title: 'Collect the food', button: 'Food collected', icon: 'cube-outline', detail: (delivery) => delivery.quantity || 'Quantity not specified' },
  { status: 'in_transit', title: 'Navigate to recipient', button: 'Arrived at recipient', icon: 'navigate-outline', detail: locationFor },
  { status: 'at_recipient', title: 'Hand over the food', button: 'Delivery completed', icon: 'checkmark-circle-outline', detail: (delivery) => delivery.recipientName || delivery.recipient || 'Recipient' },
];

export default function ActiveDeliveryScreen() {
  const { user } = useAuth();
  const { colors, isDark } = useTheme();
  const tabBarContentPadding = useTabBarContentPadding();
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
  const donorCoordinates = currentDelivery ? pickupCoordinatesFor(currentDelivery) : null;
  const recipientCoordinates = currentDelivery ? recipientCoordinatesFor(currentDelivery) : null;
  const isNavigationStep = currentStep === 0 || currentStep === 2;
  const navigationCoordinates = currentStep === 0 ? donorCoordinates : recipientCoordinates;
  const navigationLabel = currentStep === 0 ? 'donor' : 'recipient';

  const openNavigationMap = async () => {
    if (!currentDelivery) return;

    const destination = navigationCoordinates
      ? `${navigationCoordinates.latitude},${navigationCoordinates.longitude}`
      : currentStep === 0
        ? currentDelivery.pickupLocation || currentDelivery.pickupAddress
        : currentDelivery.deliveryAddress || currentDelivery.dropoffAddress;

    if (!destination) {
      Alert.alert('Location unavailable', `This delivery does not have a ${navigationLabel} location yet.`);
      return;
    }

    try {
      await Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destination)}&travelmode=driving`);
    } catch (error) {
      Alert.alert('Maps unavailable', 'We could not open Google Maps on this device.');
    }
  };

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
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: tabBarContentPadding }]} showsVerticalScrollIndicator={false}>
      <View style={styles.headerRow}>
        <View>
          <Text style={[styles.eyebrow, { color: colors.primary }]}>YOUR ROUTE</Text>
          <Text style={[styles.title, { color: colors.text }]}>Active delivery</Text>
        </View>
      </View>
      <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Jobs assigned to you and your completed work.</Text>
      {loading ? <ActivityIndicator color={colors.primary} style={styles.loader} /> : null}
      {!loading && !currentDelivery ? (
        <View style={[styles.emptyCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={[styles.emptyIcon, { backgroundColor: colors.primarySoft }]}><Ionicons name="checkmark-done-outline" size={30} color={colors.primary} /></View>
          <Text style={[styles.emptyTitle, { color: colors.text }]}>You are all caught up</Text>
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>Accept a job from Available Jobs to start your next delivery.</Text>
        </View>
      ) : null}
      {currentDelivery ? (
        <View style={[styles.activeCard, { backgroundColor: colors.surface }]}>
          <View style={styles.cardHeader}>
            <View style={[styles.packageIcon, { backgroundColor: colors.primarySoft }]}><Ionicons name="cube-outline" size={24} color={colors.primary} /></View>
            <View style={styles.cardHeaderCopy}>
              <Text style={[styles.cardEyebrow, { color: colors.textSecondary }]}>CURRENT DELIVERY</Text>
              <Text style={[styles.cardTitle, { color: colors.text }]}>{currentDelivery.foodName || currentDelivery.title || 'Food delivery'}</Text>
            </View>
            <View style={styles.liveBadge}><View style={styles.liveDot} /><Text style={styles.liveText}>LIVE</Text></View>
          </View>
          <View style={styles.progressSection}>
            <View style={styles.progressRow}>{steps.map((step, index) => <View key={step.status} style={[styles.progressTrack, { backgroundColor: colors.divider }, index <= currentStep && { backgroundColor: colors.primary }]} />)}</View>
            <View style={styles.stepLabels}>{steps.map((step, index) => <Text key={step.status} style={[styles.stepLabel, { color: colors.textMuted }, index === currentStep && { color: colors.primary, fontWeight: '800' }]}>{step.title.replace('Navigate to ', '').replace('Collect the food', 'Collect').replace('Hand over the food', 'Handover')}</Text>)}</View>
          </View>
          <TouchableOpacity
            style={[styles.navigationCard, { backgroundColor: isDark ? colors.surfaceMuted : '#F1F7F3', borderColor: colors.border }]}
            onPress={isNavigationStep ? openNavigationMap : undefined}
            activeOpacity={isNavigationStep ? 0.85 : 1}
            disabled={!isNavigationStep}
            accessible={isNavigationStep}
            accessibilityRole={isNavigationStep ? 'button' : undefined}
            accessibilityLabel={isNavigationStep ? `Open directions to ${navigationLabel}: ${steps[currentStep].detail(currentDelivery)}` : undefined}
          >
            <View style={styles.navigationHeader}>
                <View style={[styles.navigationIcon, { backgroundColor: colors.surface }]}>
                <Ionicons name={steps[currentStep].icon} size={23} color={colors.primary} />
              </View>
              <View style={styles.navigationCopy}>
                <Text style={[styles.navigationEyebrow, { color: colors.primary }]}>
                  {currentStep === 0 ? 'PICKUP LOCATION' : currentStep === 2 ? 'DROP-OFF LOCATION' : 'DELIVERY STEP'}
                </Text>
                <Text style={[styles.navigationTitle, { color: colors.text }]}>{steps[currentStep].title}</Text>
              </View>
              {isNavigationStep ? <Ionicons name="open-outline" size={19} color={colors.primary} /> : null}
            </View>
            <View style={[styles.destinationPanel, { backgroundColor: colors.surface }]}>
              <View style={[styles.destinationPin, { backgroundColor: colors.primarySoft }]}>
                <Ionicons name="location" size={17} color={colors.primary} />
              </View>
              <View style={styles.destinationCopy}>
                <Text style={[styles.destinationLabel, { color: colors.textSecondary }]}>{isNavigationStep ? 'DESTINATION' : 'DETAIL'}</Text>
                <Text style={[styles.destinationText, { color: colors.text }]}>{steps[currentStep].detail(currentDelivery)}</Text>
              </View>
            </View>
            {isNavigationStep ? (
              <View style={styles.navigationAction}>
                <Ionicons name="navigate-outline" size={18} color="#FFFFFF" />
                  <Text style={styles.navigationActionText}>Open in Google Maps</Text>
                <Ionicons name="arrow-forward" size={17} color="#FFFFFF" />
              </View>
            ) : null}
          </TouchableOpacity>
          <View style={[styles.detailsCard, { backgroundColor: colors.surfaceMuted }]}>
            <Text style={[styles.detailsHeading, { color: colors.textSecondary }]}>Delivery details</Text>
            <View style={[styles.detailRow, { borderTopColor: colors.divider }]}><Ionicons name="restaurant-outline" size={18} color={colors.textSecondary} /><Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Food</Text><Text style={[styles.detailValue, { color: colors.text }]}>{currentDelivery.foodName || currentDelivery.title || 'Food delivery'}</Text></View>
            <View style={[styles.detailRow, { borderTopColor: colors.divider }]}><Ionicons name="scale-outline" size={18} color={colors.textSecondary} /><Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Quantity</Text><Text style={[styles.detailValue, { color: colors.text }]}>{currentDelivery.quantity || 'Not specified'}</Text></View>
            <View style={[styles.detailRow, { borderTopColor: colors.divider }]}><Ionicons name="person-outline" size={18} color={colors.textSecondary} /><Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Recipient</Text><Text style={[styles.detailValue, { color: colors.text }]}>{currentDelivery.recipientName || currentDelivery.recipient || 'Recipient'}</Text></View>
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
                <Ionicons name="arrow-forward" size={20} color={isDark ? colors.primary : GREEN} />
              </Animated.View>
            </Animated.View>
          </View>
        </View>
      ) : null}
      </ScrollView>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: { backgroundColor: '#F5F7F6', flex: 1 },
  content: { padding: 20 },
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
  activeCard: { backgroundColor: '#FFFFFF', marginHorizontal: -20, marginTop: 20, padding: 20 },
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
  navigationCard: { backgroundColor: '#F1F7F3', borderColor: '#DCECE2', borderRadius: 18, borderWidth: 1, marginTop: 18, padding: 16 },
  navigationHeader: { alignItems: 'center', flexDirection: 'row' },
  navigationIcon: { alignItems: 'center', backgroundColor: '#FFFFFF', borderRadius: 14, height: 46, justifyContent: 'center', width: 46 },
  navigationCopy: { flex: 1, marginLeft: 12 },
  navigationEyebrow: { color: GREEN, fontSize: 10, fontWeight: '800', letterSpacing: 0.8 },
  navigationTitle: { color: '#13231A', fontSize: 16, fontWeight: '800', marginTop: 4 },
  destinationPanel: { alignItems: 'flex-start', backgroundColor: '#FFFFFF', borderRadius: 13, flexDirection: 'row', marginTop: 15, padding: 13 },
  destinationPin: { alignItems: 'center', backgroundColor: '#E8F5EE', borderRadius: 16, height: 32, justifyContent: 'center', width: 32 },
  destinationCopy: { flex: 1, marginLeft: 10 },
  destinationLabel: { color: '#6B7280', fontSize: 9, fontWeight: '800', letterSpacing: 0.7 },
  destinationText: { color: '#25352B', fontSize: 13, fontWeight: '600', lineHeight: 19, marginTop: 4 },
  navigationAction: { alignItems: 'center', backgroundColor: GREEN, borderRadius: 12, flexDirection: 'row', justifyContent: 'space-between', marginTop: 13, minHeight: 46, paddingHorizontal: 14 },
  navigationActionText: { color: '#FFFFFF', flex: 1, fontSize: 13, fontWeight: '800', marginLeft: 9 },
  detailsCard: { backgroundColor: '#F8FAF9', borderRadius: 15, marginTop: 14, padding: 14 },
  detailsHeading: { color: '#374151', fontSize: 12, fontWeight: '800', marginBottom: 5 },
  detailRow: { alignItems: 'center', borderTopColor: '#E6ECE8', borderTopWidth: 1, flexDirection: 'row', minHeight: 42 },
  detailLabel: { color: '#6B7280', fontSize: 12, marginLeft: 9, width: 66 },
  detailValue: { color: '#1F2937', flex: 1, fontSize: 12, fontWeight: '700', textAlign: 'right' },
  advanceButton: { alignItems: 'center', backgroundColor: GREEN, borderColor: GREEN, borderRadius: 16, borderWidth: 1, justifyContent: 'center', marginTop: 14, minHeight: 60, overflow: 'hidden', paddingHorizontal: 64, transform: [{ translateY: -26 }] },
  advanceButtonDisabled: { opacity: 0.72 },
  advanceText: { color: '#FFFFFF', fontSize: 13, fontWeight: '800', textAlign: 'center' },
  swipeHandle: { alignItems: 'center', backgroundColor: '#FFFFFF', borderRadius: 13, elevation: 3, height: 52, justifyContent: 'center', left: 4, position: 'absolute', shadowColor: '#0D482A', shadowOpacity: 0.28, shadowRadius: 5, top: 4, width: 56 },
});
