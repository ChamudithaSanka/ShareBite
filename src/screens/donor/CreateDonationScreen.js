import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import * as Location from 'expo-location';
import { useAuth } from '../../context/AuthContext';
import { donationService } from '../../services/donationService';

const GREEN = '#1A7A4A';

const categoryOptions = ['Cooked meal', 'Fresh produce', 'Bakery', 'Snacks', 'Groceries', 'Other'];
const conditionOptions = ['Fresh', 'Good', 'Needs quick use', 'Packaged'];
const foodTypeOptions = ['ready-to-eat', 'storable'];
const dateOptions = ['Today', 'Tomorrow', 'This weekend'];

const initialForm = {
  foodName: '',
  quantity: '',
  category: 'Cooked meal',
  condition: 'Fresh',
  expiry: '',
  foodType: 'ready-to-eat',
  pickupDate: 'Today',
  pickupLocation: '',
  pickupAvailability: '',
  pickupLatitude: null,
  pickupLongitude: null,
  notes: '',
};

export default function CreateDonationScreen() {
  const { user } = useAuth();
  const [form, setForm] = useState(initialForm);
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [locating, setLocating] = useState(false);

  const updateField = (field, value) => setForm((prev) => ({ ...prev, [field]: value }));

  const nextStep = () => {
    if (!form.foodName || !form.quantity || !form.category || !form.condition) {
      Alert.alert('Missing info', 'Please complete the food details before continuing.');
      return;
    }
    setStep(2);
  };

  const handleUseCurrentLocation = async () => {
    try {
      setLocating(true);
      const { status } = await Location.requestForegroundPermissionsAsync();

      if (status !== 'granted') {
        Alert.alert('Location permission needed', 'Please allow access to add current pickup location.');
        setLocating(false);
        return;
      }

      const currentLocation = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Low });
      const { latitude, longitude } = currentLocation.coords;
      const reverseGeocode = await Location.reverseGeocodeAsync({ latitude, longitude });

      const place = reverseGeocode[0];
      const locationText = [
        place?.name,
        place?.street,
        place?.city,
        place?.region,
      ].filter(Boolean).join(', ') || `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;

      updateField('pickupLocation', locationText);
      updateField('pickupLatitude', latitude);
      updateField('pickupLongitude', longitude);
      updateField('pickupAvailability', form.pickupAvailability || 'ASAP');
    } catch (error) {
      console.error('Location fetch failed:', error);
      Alert.alert('Location unavailable', 'We could not fetch your current location. Please enter it manually.');
    } finally {
      setLocating(false);
    }
  };

  const handleSubmit = async () => {
    if (!user?.uid) {
      Alert.alert('Not logged in', 'Please log in to create a donation.');
      return;
    }

    if (!form.pickupLocation || !form.pickupAvailability) {
      Alert.alert('Missing pickup info', 'Please fill in the pickup location and availability.');
      return;
    }

    setLoading(true);

    try {
      await donationService.createDonation({
        donorId: user.uid,
        foodName: form.foodName,
        quantity: form.quantity,
        category: form.category,
        condition: form.condition,
        expiry: form.expiry,
        foodType: form.foodType,
        pickupDate: form.pickupDate,
        pickupLocation: form.pickupLocation,
        pickupAvailability: form.pickupAvailability,
        pickupLatitude: form.pickupLatitude,
        pickupLongitude: form.pickupLongitude,
        photoUrl: '',
        notes: form.notes,
        status: 'available',
      });

      Alert.alert('Donation created', 'Your donation has been published successfully.');
      setForm(initialForm);
      setStep(1);
    } catch (error) {
      console.error('Create donation error:', error);
      Alert.alert('Error', 'Could not create the donation. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Create Donation</Text>
      <Text style={styles.stepText}>Step {step} of 2</Text>

      {step === 1 && (
        <View>
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Food name</Text>
            <TextInput style={styles.input} value={form.foodName} onChangeText={(value) => updateField('foodName', value)} />
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Quantity</Text>
            <TextInput style={styles.input} value={form.quantity} onChangeText={(value) => updateField('quantity', value)} placeholder="e.g. 15 meals" />
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Category</Text>
            <View style={styles.optionWrap}>
              {categoryOptions.map((option) => (
                <TouchableOpacity
                  key={option}
                  style={[styles.optionChip, form.category === option && styles.optionChipActive]}
                  onPress={() => updateField('category', option)}
                >
                  <Text style={[styles.optionText, form.category === option && styles.optionTextActive]}>{option}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Condition</Text>
            <View style={styles.optionWrap}>
              {conditionOptions.map((option) => (
                <TouchableOpacity
                  key={option}
                  style={[styles.optionChip, form.condition === option && styles.optionChipActive]}
                  onPress={() => updateField('condition', option)}
                >
                  <Text style={[styles.optionText, form.condition === option && styles.optionTextActive]}>{option}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Food type</Text>
            <View style={styles.segmentedRow}>
              {foodTypeOptions.map((type) => (
                <TouchableOpacity
                  key={type}
                  style={[styles.segmentButton, form.foodType === type && styles.segmentButtonActive]}
                  onPress={() => updateField('foodType', type)}
                >
                  <Text style={[styles.segmentText, form.foodType === type && styles.segmentTextActive]}>
                    {type === 'ready-to-eat' ? 'Ready to eat' : 'Storable'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Best before / expiry</Text>
            <TextInput
              style={styles.input}
              value={form.expiry}
              onChangeText={(value) => updateField('expiry', value)}
              placeholder="YYYY-MM-DD"
              keyboardType="numeric"
            />
          </View>

          <TouchableOpacity style={styles.primaryButton} onPress={nextStep}>
            <Text style={styles.primaryButtonText}>Next</Text>
          </TouchableOpacity>
        </View>
      )}

      {step === 2 && (
        <View>
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Pickup date</Text>
            <View style={styles.optionWrap}>
              {dateOptions.map((option) => (
                <TouchableOpacity
                  key={option}
                  style={[styles.optionChip, form.pickupDate === option && styles.optionChipActive]}
                  onPress={() => updateField('pickupDate', option)}
                >
                  <Text style={[styles.optionText, form.pickupDate === option && styles.optionTextActive]}>{option}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TextInput
              style={[styles.input, styles.marginTop]}
              value={form.pickupDate !== 'Today' && form.pickupDate !== 'Tomorrow' && form.pickupDate !== 'This weekend' ? form.pickupDate : ''}
              onChangeText={(value) => updateField('pickupDate', value || 'Today')}
              placeholder="Or enter custom date (YYYY-MM-DD)"
            />
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Pickup location</Text>
            <TouchableOpacity style={styles.locationButton} onPress={handleUseCurrentLocation} disabled={locating}>
              <Text style={styles.locationButtonText}>{locating ? 'Fetching location...' : 'Use my current location'}</Text>
            </TouchableOpacity>
            <TextInput
              style={[styles.input, styles.marginTop]}
              value={form.pickupLocation}
              onChangeText={(value) => updateField('pickupLocation', value)}
              placeholder="Enter pickup address or venue"
            />
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Pickup availability</Text>
            <TextInput
              style={styles.input}
              value={form.pickupAvailability}
              onChangeText={(value) => updateField('pickupAvailability', value)}
              placeholder="Today, 6:00 PM"
            />
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Notes</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={form.notes}
              onChangeText={(value) => updateField('notes', value)}
              multiline
              numberOfLines={4}
            />
          </View>

          <View style={styles.buttonRow}>
            <TouchableOpacity style={styles.secondaryButton} onPress={() => setStep(1)}>
              <Text style={styles.secondaryButtonText}>Back</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.primaryButton} onPress={handleSubmit} disabled={loading}>
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryButtonText}>Submit</Text>}
            </TouchableOpacity>
          </View>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    padding: 20,
    paddingTop: 28,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 4,
  },
  stepText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#6B7280',
    marginBottom: 18,
    textTransform: 'uppercase',
    letterSpacing: 0.08,
  },
  fieldGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1.2,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 12,
    fontSize: 15,
    color: '#111827',
    backgroundColor: '#fff',
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  segmentedRow: {
    flexDirection: 'row',
    gap: 8,
  },
  segmentButton: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  segmentButtonActive: {
    backgroundColor: '#E8F5EE',
  },
  segmentText: {
    color: '#4B5563',
    fontWeight: '700',
  },
  segmentTextActive: {
    color: GREEN,
  },
  optionWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  optionChip: {
    backgroundColor: '#F3F4F6',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 8,
  },
  optionChipActive: {
    backgroundColor: '#E8F5EE',
  },
  optionText: {
    color: '#374151',
    fontWeight: '600',
    fontSize: 12,
  },
  optionTextActive: {
    color: GREEN,
  },
  locationButton: {
    backgroundColor: '#E8F5EE',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    marginBottom: 8,
  },
  locationButtonText: {
    color: GREEN,
    fontWeight: '700',
  },
  primaryButton: {
    backgroundColor: GREEN,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  secondaryButton: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginRight: 10,
  },
  secondaryButtonText: {
    color: '#374151',
    fontSize: 16,
    fontWeight: '700',
  },
  buttonRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  marginTop: {
    marginTop: 10,
  },
});
