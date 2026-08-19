import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator, Alert, Image, ScrollView, StyleSheet, Text,
  TextInput, TouchableOpacity, View,
} from 'react-native';
import * as Location from 'expo-location';
import { useAuth } from '../../context/AuthContext';
import { getDonationById } from '../../services/donationService';
import { createFoodRequest } from '../../services/requestService';

const C = {
  green: '#1A7A4A',
  greenLight: '#E8F5EE',
  greenPale: '#F0FAF4',
  amber: '#D97706',
  amberLight: '#FEF3C7',
  blue: '#2563EB',
  blueLight: '#EFF6FF',
  gray50: '#F9FAFB',
  gray100: '#F3F4F6',
  gray200: '#E5E7EB',
  gray400: '#9CA3AF',
  gray500: '#6B7280',
  gray700: '#374151',
  gray800: '#1F2937',
  gray900: '#111827',
  white: '#FFFFFF',
  coral: '#E05A2B',
};

const FOOD_EMOJI = {
  'cooked meal': '🍱', produce: '🥦', 'canned goods': '🥫',
  bakery: '🍞', dairy: '🥛', other: '🍽️',
};

function getEmoji(donation) {
  return FOOD_EMOJI[(donation.category || '').toLowerCase()] || '🍽️';
}

function Badge({ label, color = 'green' }) {
  const bg = color === 'green' ? C.greenLight : color === 'amber' ? C.amberLight : C.blueLight;
  const textColor = color === 'green' ? C.green : color === 'amber' ? C.amber : C.blue;
  return (
    <View style={[styles.badge, { backgroundColor: bg }]}>
      <Text style={[styles.badgeText, { color: textColor }]}>{label}</Text>
    </View>
  );
}

function DetailRow({ icon, label, value }) {
  return (
    <View style={styles.detailRow}>
      <View style={styles.detailIcon}>
        <Text style={{ fontSize: 16 }}>{icon}</Text>
      </View>
      <View>
        <Text style={styles.detailLabel}>{label}</Text>
        <Text style={styles.detailValue}>{value}</Text>
      </View>
    </View>
  );
}

export default function FoodDetailScreen({ route, navigation }) {
  const { user, userProfile } = useAuth();
  const [donation, setDonation] = useState(route.params?.donation || null);
  const [quantity, setQuantity] = useState(route.params?.donation?.quantity || '');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [deliveryCoordinates, setDeliveryCoordinates] = useState(null);
  const [locationLoading, setLocationLoading] = useState(false);
  const [loading, setLoading] = useState(!donation);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const donationId = route.params?.donationId;
    if (!donationId || donation) return undefined;
    getDonationById(donationId)
      .then((d) => { setDonation(d); setQuantity(d?.quantity || ''); })
      .catch(() => Alert.alert('Error', 'Unable to load this donation.'))
      .finally(() => setLoading(false));
    return undefined;
  }, [donation, route.params?.donationId]);

  const useCurrentLocation = async () => {
    setLocationLoading(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Allow ShareBite to access your location.');
        return;
      }
      const loc = await Location.getCurrentPositionAsync({});
      const { latitude, longitude } = loc.coords;
      setDeliveryCoordinates({ latitude, longitude });
      const [addr] = await Location.reverseGeocodeAsync({ latitude, longitude });
      setDeliveryAddress(
        addr
          ? [addr.name, addr.street, addr.city, addr.region, addr.postalCode].filter(Boolean).join(', ')
          : `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`,
      );
    } catch {
      Alert.alert('Location unavailable', 'Could not get your current location.');
    } finally {
      setLocationLoading(false);
    }
  };

  useEffect(() => { useCurrentLocation(); }, []);

  const handleRequest = async () => {
    if (!quantity.trim() || !deliveryAddress.trim()) {
      Alert.alert('Missing info', 'Enter a quantity and allow location access.');
      return;
    }
    setSubmitting(true);
    try {
      await createFoodRequest({
        donationId: donation.id,
        recipientId: user.uid,
        recipientName: userProfile?.name || '',
        quantity: quantity.trim(),
        deliveryAddress: deliveryAddress.trim(),
        deliveryCoordinates,
        foodName: donation.foodName,
        donorId: donation.donorId || null,
        donorName: donation.donorName || '',
        pickupLocation: donation.pickupLocation || '',
        pickupCoordinates: donation.pickupCoordinates || null,
        distance: donation.distance || '',
      });
      Alert.alert('Request submitted! 🎉', 'A volunteer will pick this up for you.', [
        { text: 'View my requests', onPress: () => navigation.navigate('Requests') },
      ]);
    } catch {
      Alert.alert('Request failed', 'Unable to submit. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <ActivityIndicator color={C.green} style={{ flex: 1, marginTop: 60 }} />;
  if (!donation) return <Text style={styles.emptyText}>Donation not found.</Text>;

  const isRte = (donation.foodType || '').toLowerCase().includes('ready');

  return (
    <ScrollView style={styles.screen} contentContainerStyle={{ paddingBottom: 40 }}>
      {/* Banner */}
      <View style={styles.banner}>
        {donation.photoUrl
          ? <Image source={{ uri: donation.photoUrl }} style={styles.bannerImage} />
          : <Text style={styles.bannerEmoji}>{getEmoji(donation)}</Text>}
      </View>

      <View style={styles.body}>
        {/* Title + badge */}
        <View style={styles.titleRow}>
          <Text style={styles.foodName}>{donation.foodName || 'Food donation'}</Text>
          <Badge label={isRte ? '🟢 Ready-to-Eat' : '📦 Storable'} color={isRte ? 'green' : 'amber'} />
        </View>
        <Text style={styles.foodQty}>{donation.quantity || '—'} available</Text>

        {/* Detail rows */}
        <View style={styles.detailsCard}>
          <DetailRow icon="🕐" label="Available until" value={donation.pickupAvailability || 'Not specified'} />
          <DetailRow icon="📍" label="Pickup area" value={donation.pickupLocation || 'Not specified'} />
          {donation.distance ? <DetailRow icon="🗺️" label="Distance" value={donation.distance} /> : null}
          <DetailRow icon="✅" label="Condition" value={donation.condition || 'Not specified'} />
        </View>

        {/* Donor note */}
        {donation.notes ? (
          <View style={styles.noteCard}>
            <Text style={styles.noteLabel}>DONOR NOTE</Text>
            <Text style={styles.noteText}>{donation.notes}</Text>
          </View>
        ) : null}

        {/* Request form */}
        <Text style={styles.fieldLabel}>Quantity to request</Text>
        <TextInput
          style={styles.input}
          value={quantity}
          onChangeText={setQuantity}
          placeholder="e.g. 2 portions"
        />

        <Text style={styles.fieldLabel}>Delivery address</Text>
        <View style={styles.inputRow}>
          <TextInput
            style={[styles.input, { flex: 1 }]}
            value={deliveryAddress}
            editable={false}
            placeholder="Use current location"
            placeholderTextColor={C.gray400}
          />
          <TouchableOpacity style={styles.locationBtn} onPress={useCurrentLocation} disabled={locationLoading}>
            {locationLoading
              ? <ActivityIndicator color={C.green} size="small" />
              : <Text style={{ fontSize: 18 }}>📍</Text>}
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={[styles.requestBtn, submitting && { opacity: 0.6 }]}
          onPress={handleRequest}
          disabled={submitting}
        >
          {submitting
            ? <ActivityIndicator color={C.white} />
            : <Text style={styles.requestBtnText}>❤️  Request this food</Text>}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.white },
  banner: {
    height: 200,
    backgroundColor: C.greenPale,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  bannerImage: { width: '100%', height: '100%', resizeMode: 'cover' },
  bannerEmoji: { fontSize: 80 },
  body: { padding: 20 },
  titleRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'flex-start', marginBottom: 4,
  },
  foodName: { fontSize: 22, fontWeight: '800', color: C.gray900, flex: 1, marginRight: 8 },
  foodQty: { fontSize: 14, color: C.gray500, marginBottom: 16 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  badgeText: { fontSize: 11, fontWeight: '700' },
  detailsCard: {
    borderWidth: 1, borderColor: C.gray100,
    borderRadius: 16, marginBottom: 16, overflow: 'hidden',
  },
  detailRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    padding: 12, borderBottomWidth: 1, borderBottomColor: C.gray100,
  },
  detailIcon: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: C.greenLight, alignItems: 'center', justifyContent: 'center',
  },
  detailLabel: {
    fontSize: 11, color: C.gray400, fontWeight: '700',
    textTransform: 'uppercase', letterSpacing: 0.5,
  },
  detailValue: { fontSize: 14, fontWeight: '600', color: C.gray800 },
  noteCard: {
    backgroundColor: C.gray50, borderRadius: 14,
    padding: 14, borderWidth: 1, borderColor: C.gray200, marginBottom: 20,
  },
  noteLabel: { fontSize: 11, fontWeight: '700', color: C.gray500, marginBottom: 4, letterSpacing: 0.5 },
  noteText: { fontSize: 14, color: C.gray700, lineHeight: 20 },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: C.gray700, marginBottom: 6, marginTop: 4 },
  input: {
    borderWidth: 1.5, borderColor: C.gray200, borderRadius: 12,
    padding: 12, fontSize: 15, color: C.gray900, marginBottom: 12,
  },
  inputRow: { flexDirection: 'row', gap: 8, alignItems: 'center', marginBottom: 12 },
  locationBtn: {
    width: 46, height: 46, borderRadius: 12,
    borderWidth: 1.5, borderColor: C.green,
    alignItems: 'center', justifyContent: 'center',
  },
  requestBtn: {
    backgroundColor: C.green, borderRadius: 16,
    paddingVertical: 16, alignItems: 'center', marginTop: 8,
  },
  requestBtnText: { color: C.white, fontSize: 16, fontWeight: '700' },
  emptyText: { flex: 1, textAlign: 'center', color: C.gray500, padding: 40 },
});
