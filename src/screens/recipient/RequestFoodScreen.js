import React, { useEffect, useState } from 'react';
import { Alert, Image, StyleSheet } from 'react-native';
import {
  ThemedActivityIndicator as ActivityIndicator,
  ThemedSafeAreaView as SafeAreaView,
  ThemedScrollView as ScrollView,
  ThemedText as Text,
  ThemedTextInput as TextInput,
  ThemedTouchableOpacity as TouchableOpacity,
  ThemedView as View,
} from '../../components/ThemedPrimitives';
import * as Location from 'expo-location';
import { useAuth } from '../../context/AuthContext';
import { useTabBarContentPadding } from '../../hooks';
import { donationService } from '../../services/donationService';
import { createFoodRequest } from '../../services/requestService';
import { formatFoodQuantity, resolveDonationQuantity } from '../../utils/quantity';

const C = {
  green: '#1A7A4A', greenLight: '#E8F5EE', greenPale: '#F0FAF4', gray100: '#F3F4F6',
  gray200: '#E5E7EB', gray400: '#9CA3AF', gray500: '#6B7280', gray700: '#374151',
  gray800: '#1F2937', gray900: '#111827', white: '#FFFFFF',
};

const FOOD_EMOJI = {
  'cooked meal': '🍱', produce: '🥦', 'canned goods': '🥫', bakery: '🍞', dairy: '🥛', other: '🍽️',
};
const quantityStepForUnit = (unit) => ['kg', 'litre'].includes(unit) ? 0.5 : 1;

export default function RequestFoodScreen({ route, navigation }) {
  const { user, userProfile } = useAuth();
  const tabBarContentPadding = useTabBarContentPadding();
  const savedAddresses = Array.isArray(userProfile?.savedAddresses) ? userProfile.savedAddresses : [];
  const [donation, setDonation] = useState(route.params?.donation || null);
  const [loading, setLoading] = useState(!route.params?.donation);
  const [quantity, setQuantity] = useState('0');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [deliveryCoordinates, setDeliveryCoordinates] = useState(null);
  const [selectedAddressId, setSelectedAddressId] = useState(null);
  const [locationLoading, setLocationLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const donationId = route.params?.donationId || route.params?.donation?.id;
    if (!donationId) {
      setLoading(false);
      return undefined;
    }

    return donationService.subscribeToDonation(
      donationId,
      (value) => {
        setDonation(value);
        setQuantity('0');
        setLoading(false);
      },
      () => { setLoading(false); Alert.alert('Error', 'Unable to load this donation.'); },
    );
  }, [route.params?.donationId, route.params?.donation?.id]);

  const useCurrentLocation = async () => {
    setLocationLoading(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Allow ShareBite to access your location.');
        return;
      }

      const location = await Location.getCurrentPositionAsync({});
      const { latitude, longitude } = location.coords;
      setDeliveryCoordinates({ latitude, longitude });
      const [address] = await Location.reverseGeocodeAsync({ latitude, longitude });
      setSelectedAddressId(null);
      setDeliveryAddress(address
        ? [address.name, address.street, address.city, address.region, address.postalCode].filter(Boolean).join(', ')
        : `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`);
    } catch {
      Alert.alert('Location unavailable', 'Could not get your current location.');
    } finally {
      setLocationLoading(false);
    }
  };

  const handleRequest = async () => {
    const availableQuantity = resolveDonationQuantity(donation);

    if (!deliveryAddress.trim()) {
      Alert.alert('Missing info', 'Choose or enter a delivery address.');
      return;
    }
    if (!availableQuantity) {
      Alert.alert('Quantity unavailable', 'The donor must update this listing to a supported amount and unit before it can be requested.');
      return;
    }
    const requestedAmount = Number(quantity);
    if (!Number.isFinite(requestedAmount) || requestedAmount <= 0) {
      Alert.alert('Choose a quantity', 'Select a quantity greater than zero.');
      return;
    }
    if (requestedAmount > availableQuantity.amount) {
      Alert.alert('Invalid quantity', `Enter an amount greater than zero and no more than ${formatFoodQuantity(availableQuantity.amount, availableQuantity.unit)}.`);
      return;
    }
    if (!user?.uid || !donation?.id) {
      Alert.alert('Unable to submit', 'Your account or this donation is unavailable. Please return and try again.');
      return;
    }

    setSubmitting(true);
    try {
      await createFoodRequest({
        donationId: donation.id,
        recipientId: user.uid,
        recipientName: userProfile?.name || '',
        quantity: formatFoodQuantity(requestedAmount, availableQuantity.unit),
        quantityAmount: requestedAmount,
        quantityUnit: availableQuantity.unit,
        deliveryAddress: deliveryAddress.trim(),
        deliveryCoordinates,
        foodName: donation.foodName,
        photoUrl: donation.photoUrl || '',
        category: donation.category || '',
        foodType: donation.foodType || '',
        donorId: donation.donorId || null,
        donorName: donation.donorName || '',
        pickupLocation: donation.pickupLocation || '',
        pickupCoordinates: donation.pickupCoordinates || (
          donation.pickupLatitude != null && donation.pickupLongitude != null
            ? { latitude: donation.pickupLatitude, longitude: donation.pickupLongitude }
            : null
        ),
        distance: donation.distance || '',
      });
      Alert.alert('Request submitted', 'Your request is waiting for coordinator approval.', [
        { text: 'View my requests', onPress: () => navigation.navigate('Requests') },
      ]);
    } catch (error) {
      const message = error.code === 'donation-unavailable'
        ? 'This donation is no longer available. Please choose another listing.'
        : error.code === 'insufficient-quantity'
          ? 'The remaining quantity changed. Please return to the listing and choose a new amount.'
          : error.code === 'invalid-request-quantity'
            ? 'Enter a valid amount using the unit shown for this donation.'
            : 'Unable to submit. Please try again.';
      Alert.alert('Request failed', message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <SafeAreaView style={styles.centered}><ActivityIndicator color={C.green} /></SafeAreaView>;
  if (!donation) {
    return <SafeAreaView style={styles.centered}><Text style={styles.emptyText}>Donation not found.</Text></SafeAreaView>;
  }

  const availableQuantity = resolveDonationQuantity(donation);

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: tabBarContentPadding }]} keyboardShouldPersistTaps="handled">
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backText}>‹  Food details</Text>
        </TouchableOpacity>
        <Text style={styles.eyebrow}>REQUEST FOOD</Text>
        <Text style={styles.title}>Confirm your request</Text>

        <View style={styles.donationRow}>
          {donation.photoUrl
            ? <Image source={{ uri: donation.photoUrl }} style={styles.donationImage} />
            : <View style={styles.donationImage}><Text style={styles.foodEmoji}>{FOOD_EMOJI[(donation.category || '').toLowerCase()] || '🍽️'}</Text></View>}
          <View style={styles.donationCopy}>
            <Text style={styles.donationName}>{donation.foodName || 'Food donation'}</Text>
            <Text style={styles.donationMeta}>{donation.quantity || 'Quantity not specified'} available</Text>
          </View>
        </View>

        <Text style={styles.label}>Quantity to request</Text>
        {availableQuantity ? (
          <>
            <View style={styles.quantitySelector}>
              <TouchableOpacity
                style={[styles.quantityButton, Number(quantity) <= 0 && styles.quantityButtonDisabled]}
                onPress={() => setQuantity(String(Math.max(0, Number(quantity) - quantityStepForUnit(availableQuantity.unit))))}
                disabled={Number(quantity) <= 0}
                accessibilityRole="button"
                accessibilityLabel="Decrease requested quantity"
              >
                <Text style={styles.quantityButtonText}>−</Text>
              </TouchableOpacity>
              <View style={styles.quantityValueWrap}>
                <Text style={styles.quantityValue}>
                  {Number(quantity) > 0 ? formatFoodQuantity(Number(quantity), availableQuantity.unit) : 'Select quantity'}
                </Text>
                <Text style={styles.quantityUnit}>{availableQuantity.unit} · {formatFoodQuantity(availableQuantity.amount, availableQuantity.unit)} available</Text>
              </View>
              <TouchableOpacity
                style={[styles.quantityButton, Number(quantity) >= availableQuantity.amount && styles.quantityButtonDisabled]}
                onPress={() => {
                  const next = Math.min(availableQuantity.amount, Number(quantity) + quantityStepForUnit(availableQuantity.unit));
                  setQuantity(String(Number(next.toFixed(3))));
                }}
                disabled={Number(quantity) >= availableQuantity.amount}
                accessibilityRole="button"
                accessibilityLabel="Increase requested quantity"
              >
                <Text style={styles.quantityButtonText}>+</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.hint}>
              {['kg', 'litre'].includes(availableQuantity.unit) ? 'Adjusts by 0.5 at a time.' : 'Adjusts by 1 at a time.'}
            </Text>
          </>
        ) : (
          <Text style={styles.hint}>The donor must update this listing’s quantity before a coordinator can approve it.</Text>
        )}

        <Text style={styles.label}>Delivery address</Text>
        {savedAddresses.length > 0 ? (
          <View style={styles.savedAddresses}>
            {savedAddresses.map((address, index) => {
              const addressId = address.id || `${address.label}-${index}`;
              const selected = selectedAddressId === addressId;
              return (
                <TouchableOpacity
                  key={addressId}
                  style={[styles.savedAddress, selected && styles.savedAddressSelected]}
                  onPress={() => {
                    setSelectedAddressId(addressId);
                    setDeliveryAddress(address.value || '');
                    setDeliveryCoordinates(null);
                  }}
                >
                  <Text style={[styles.savedAddressLabel, selected && styles.savedAddressLabelSelected]}>{address.label || 'Saved address'}</Text>
                  <Text style={styles.savedAddressValue}>{address.value}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        ) : null}

        <Text style={styles.addressOptionLabel}>Or enter a one-time address</Text>
        <View style={styles.addressRow}>
          <TextInput
            style={[styles.input, styles.addressInput]}
            value={deliveryAddress}
            onChangeText={(value) => {
              setDeliveryAddress(value);
              setSelectedAddressId(null);
              setDeliveryCoordinates(null);
            }}
            multiline
            placeholder="Enter delivery address"
            placeholderTextColor={C.gray400}
          />
          <TouchableOpacity style={styles.locationButton} onPress={useCurrentLocation} disabled={locationLoading}>
            {locationLoading
              ? <ActivityIndicator color={C.green} size="small" />
              : <Text style={styles.pin}>📍</Text>}
          </TouchableOpacity>
        </View>
        <Text style={styles.hint}>Use the pin to fill this field from your current location.</Text>

        <TouchableOpacity
          style={[styles.submitButton, (submitting || !availableQuantity) && styles.disabled]}
          onPress={handleRequest}
          disabled={submitting || !availableQuantity}
        >
          {submitting ? <ActivityIndicator color={C.white} /> : <Text style={styles.submitText}>Submit request</Text>}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: C.white, flex: 1 },
  centered: { alignItems: 'center', backgroundColor: C.white, flex: 1, justifyContent: 'center', padding: 24 },
  content: { padding: 20, paddingBottom: 40 },
  backButton: { alignSelf: 'flex-start', marginBottom: 22 },
  backText: { color: C.green, fontSize: 15, fontWeight: '700' },
  eyebrow: { color: C.green, fontSize: 11, fontWeight: '800', marginBottom: 5 },
  title: { color: C.gray900, fontSize: 24, fontWeight: '800', marginBottom: 18 },
  donationRow: { alignItems: 'center', backgroundColor: '#F9FAFB', borderColor: C.gray200, borderRadius: 12, borderWidth: 1, flexDirection: 'row', marginBottom: 22, padding: 12 },
  donationImage: { alignItems: 'center', backgroundColor: C.greenPale, borderRadius: 10, height: 64, justifyContent: 'center', width: 64 },
  foodEmoji: { fontSize: 32 },
  donationCopy: { flex: 1, marginLeft: 12 },
  donationName: { color: C.gray900, fontSize: 15, fontWeight: '800' },
  donationMeta: { color: C.gray500, fontSize: 12, marginTop: 4 },
  label: { color: C.gray700, fontSize: 13, fontWeight: '700', marginBottom: 6, marginTop: 8 },
  input: { borderColor: C.gray200, borderRadius: 10, borderWidth: 1, color: C.gray900, fontSize: 15, minHeight: 48, paddingHorizontal: 12 },
  quantitySelector: { alignItems: 'center', backgroundColor: '#F9FAFB', borderColor: C.gray200, borderRadius: 12, borderWidth: 1, flexDirection: 'row', justifyContent: 'space-between', minHeight: 72, padding: 10 },
  quantityButton: { alignItems: 'center', backgroundColor: C.green, borderRadius: 10, height: 44, justifyContent: 'center', width: 48 },
  quantityButtonDisabled: { backgroundColor: C.gray200 },
  quantityButtonText: { color: C.white, fontSize: 24, fontWeight: '700', lineHeight: 28 },
  quantityValueWrap: { alignItems: 'center', flex: 1, paddingHorizontal: 8 },
  quantityValue: { color: C.gray900, fontSize: 17, fontWeight: '800', textAlign: 'center' },
  quantityUnit: { color: C.gray500, fontSize: 11, marginTop: 3, textAlign: 'center' },
  hint: { color: C.gray500, fontSize: 12, lineHeight: 17, marginBottom: 8, marginTop: 6 },
  savedAddresses: { gap: 8, marginBottom: 12 },
  savedAddress: { backgroundColor: '#F9FAFB', borderColor: C.gray200, borderRadius: 10, borderWidth: 1, padding: 12 },
  savedAddressSelected: { backgroundColor: C.greenLight, borderColor: C.green },
  savedAddressLabel: { color: C.gray900, fontSize: 13, fontWeight: '800' },
  savedAddressLabelSelected: { color: C.green },
  savedAddressValue: { color: C.gray500, fontSize: 12, lineHeight: 17, marginTop: 3 },
  addressOptionLabel: { color: C.gray500, fontSize: 12, fontWeight: '700', marginBottom: 6 },
  addressRow: { alignItems: 'center', flexDirection: 'row', gap: 8 },
  addressInput: { flex: 1 },
  locationButton: { alignItems: 'center', borderColor: C.green, borderRadius: 10, borderWidth: 1, height: 48, justifyContent: 'center', width: 48 },
  pin: { fontSize: 18 },
  submitButton: { alignItems: 'center', backgroundColor: C.green, borderRadius: 12, marginTop: 20, padding: 15 },
  submitText: { color: C.white, fontSize: 15, fontWeight: '800' },
  disabled: { opacity: 0.6 },
  emptyText: { color: C.gray700, fontSize: 15 },
});
