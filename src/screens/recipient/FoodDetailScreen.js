import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TextInput,
  TouchableOpacity, View,
} from 'react-native';
import * as Location from 'expo-location';
import { useAuth } from '../../context/AuthContext';
import { subscribeToDonation } from '../../services/donationService';
import { createFoodRequest } from '../../services/requestService';

const GREEN = '#1A7A4A';

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
    const donationId = route.params?.donationId || route.params?.donation?.id;
    if (!donationId) return undefined;

    return subscribeToDonation(
      donationId,
      (nextDonation) => { setDonation(nextDonation); setLoading(false); },
      () => { setLoading(false); Alert.alert('Error', 'Unable to watch this donation.'); },
    );
  }, [route.params?.donationId, route.params?.donation?.id]);

  const useCurrentLocation = async () => {
    setLocationLoading(true);
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== 'granted') {
        Alert.alert('Location permission needed', 'Allow ShareBite to use your location for delivery.');
        return;
      }

      const location = await Location.getCurrentPositionAsync({});
      const { latitude, longitude } = location.coords;
      setDeliveryCoordinates({ latitude, longitude });
      const addresses = await Location.reverseGeocodeAsync({ latitude, longitude });
      const address = addresses[0];
      const formattedAddress = address
        ? [address.name, address.street, address.city, address.region, address.postalCode]
          .filter(Boolean)
          .join(', ')
        : `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
      setDeliveryAddress(formattedAddress);
    } catch (error) {
      Alert.alert('Location unavailable', 'Could not get your current location.');
    } finally {
      setLocationLoading(false);
    }
  };

  useEffect(() => {
    useCurrentLocation();
  }, []);

  const handleRequest = async () => {
    if (!donation || !quantity.trim() || !deliveryAddress.trim()) {
      Alert.alert('Missing information', 'Enter a quantity and delivery address.');
      return;
    }

    setSubmitting(true);
    try {
      await createFoodRequest({
        donationId: donation.id,
        recipientId: user.uid,
        quantity: quantity.trim(),
        deliveryAddress: deliveryAddress.trim(),
        deliveryCoordinates,
        foodName: donation.foodName,
        donorId: donation.donorId || null,
        donorName: donation.donorName || '',
        pickupLocation: donation.pickupLocation || '',
        pickupCoordinates: donation.pickupCoordinates || {
          latitude: donation.pickupLatitude || null,
          longitude: donation.pickupLongitude || null,
        },
        distance: donation.distance || '',
        recipientName: userProfile?.name || '',
      });
      Alert.alert('Request submitted', 'Your request is now available for a volunteer to accept.', [
        { text: 'View requests', onPress: () => navigation.navigate('Requests') },
      ]);
    } catch (error) {
      Alert.alert('Request failed', 'Unable to submit your request. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <ActivityIndicator color={GREEN} style={styles.loader} />;
  if (!donation) return <Text style={styles.empty}>Donation not found.</Text>;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>{donation.foodName || 'Food donation'}</Text>
      <Text style={styles.subtitle}>{donation.foodType || 'Available food'}</Text>
      <View style={styles.details}>
        <Text style={styles.detail}>Quantity available: {donation.quantity || 'Not specified'}</Text>
        <Text style={styles.detail}>Category: {donation.category || 'Not specified'}</Text>
        <Text style={styles.detail}>Condition: {donation.condition || 'Not specified'}</Text>
        <Text style={styles.detail}>Pickup area: {donation.pickupLocation || 'Not specified'}</Text>
        <Text style={styles.detail}>Distance: {donation.distance || 'Not available'}</Text>
        <Text style={styles.detail}>Available: {donation.pickupAvailability || 'Not specified'}</Text>
      </View>
      <Text style={styles.label}>Requested quantity</Text>
      <TextInput style={styles.input} value={quantity} onChangeText={setQuantity} placeholder="e.g. 2 portions" />
      <Text style={styles.label}>Delivery address from phone location</Text>
      <TextInput
        style={styles.input}
        value={deliveryAddress}
        editable={false}
        placeholder="Use your current location"
      />
      <TouchableOpacity style={styles.locationButton} onPress={useCurrentLocation} disabled={locationLoading}>
        {locationLoading
          ? <ActivityIndicator color={GREEN} />
          : <Text style={styles.locationButtonText}>Use current location</Text>}
      </TouchableOpacity>
      <TouchableOpacity style={styles.button} onPress={handleRequest} disabled={submitting}>
        {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Request this food</Text>}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    paddingBottom: 120,
    backgroundColor: '#fff',
  },
  title: { fontSize: 26, fontWeight: '800', color: '#111827', textAlign: 'center' },
  subtitle: { marginTop: 8, color: '#6B7280', textAlign: 'center' },
  details: { width: '100%', marginTop: 24, padding: 16, borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 12 },
  detail: { marginBottom: 10, color: '#374151', fontSize: 14 },
  label: { alignSelf: 'stretch', marginTop: 16, marginBottom: 6, color: '#374151', fontWeight: '600' },
  input: { alignSelf: 'stretch', padding: 12, borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 12, fontSize: 15 },
  button: { alignSelf: 'stretch', marginTop: 24, padding: 15, borderRadius: 12, backgroundColor: GREEN },
  buttonText: { color: '#fff', textAlign: 'center', fontWeight: '700' },
  locationButton: { alignSelf: 'stretch', marginTop: 10, padding: 12, borderRadius: 12, borderWidth: 1, borderColor: GREEN },
  locationButtonText: { color: GREEN, textAlign: 'center', fontWeight: '700' },
  loader: { flex: 1 },
  empty: { flex: 1, padding: 24, textAlign: 'center', color: '#6B7280' },
});
