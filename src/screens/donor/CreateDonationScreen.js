import React, { useState } from 'react';
import {
  Image,
  Platform,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { useAuth } from '../../context/AuthContext';
import { donationService } from '../../services/donationService';

const GREEN = '#1A7A4A';

const categoryOptions = ['Cooked meal', 'Fresh produce', 'Bakery', 'Snacks', 'Groceries', 'Other'];
const conditionOptions = ['Fresh', 'Good', 'Needs quick use', 'Packaged'];
const foodTypeOptions = ['ready-to-eat', 'storable'];
const dateOptions = ['Today', 'Tomorrow', 'This weekend'];

const formatDate = (value) => value.toISOString().split('T')[0];
const formatTime = (value) => value.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

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
  photoUri: '',
  notes: '',
};

export default function CreateDonationScreen() {
  const { user } = useAuth();
  const [form, setForm] = useState(initialForm);
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [locating, setLocating] = useState(false);
  const [showExpiryPicker, setShowExpiryPicker] = useState(false);
  const [showPickupDatePicker, setShowPickupDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  const updateField = (field, value) => setForm((prev) => ({ ...prev, [field]: value }));

  const nextStep = () => {
    if (!form.foodName || !form.quantity || !form.category || !form.condition) {
      Alert.alert('Missing info', 'Please complete the food details before continuing.');
      return;
    }
    setStep(2);
  };

  const pickPhoto = async (source) => {
    try {
      const permission = source === 'camera'
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permission.granted) {
        Alert.alert('Permission needed', `Please allow ${source === 'camera' ? 'camera' : 'photo library'} access to add a food photo.`);
        return;
      }

      const result = source === 'camera'
        ? await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [4, 3], quality: 0.8 })
        : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [4, 3], quality: 0.8 });

      if (!result.canceled && result.assets?.[0]?.uri) {
        updateField('photoUri', result.assets[0].uri);
      }
    } catch (error) {
      console.error('Photo selection failed:', error);
      Alert.alert('Photo unavailable', 'We could not add that photo. Please try again.');
    }
  };

  const choosePhoto = () => Alert.alert('Add food photo', 'Choose a photo source', [
    { text: 'Camera', onPress: () => pickPhoto('camera') },
    { text: 'Photo library', onPress: () => pickPhoto('library') },
    { text: 'Cancel', style: 'cancel' },
  ]);

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
        photoUrl: await donationService.uploadDonationPhoto(form.photoUri, user.uid),
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
            <TouchableOpacity style={styles.inputButton} onPress={() => setShowExpiryPicker(true)}>
              <Text style={form.expiry ? styles.inputButtonText : styles.placeholderText}>{form.expiry || 'Select expiry date'}</Text>
            </TouchableOpacity>
            {showExpiryPicker && (
              <DateTimePicker
                value={form.expiry ? new Date(form.expiry) : new Date()}
                mode="date"
                minimumDate={new Date()}
                onChange={(event, value) => {
                  setShowExpiryPicker(Platform.OS === 'ios');
                  if (value) updateField('expiry', formatDate(value));
                }}
              />
            )}
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
            <TouchableOpacity style={[styles.inputButton, styles.marginTop]} onPress={() => setShowPickupDatePicker(true)}>
              <Text style={styles.inputButtonText}>{form.pickupDate === 'Today' || form.pickupDate === 'Tomorrow' || form.pickupDate === 'This weekend' ? 'Select a custom date' : form.pickupDate}</Text>
            </TouchableOpacity>
            {showPickupDatePicker && (
              <DateTimePicker
                value={form.pickupDate && !dateOptions.includes(form.pickupDate) ? new Date(form.pickupDate) : new Date()}
                mode="date"
                minimumDate={new Date()}
                onChange={(event, value) => {
                  setShowPickupDatePicker(Platform.OS === 'ios');
                  if (value) updateField('pickupDate', formatDate(value));
                }}
              />
            )}
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
            <TouchableOpacity style={styles.inputButton} onPress={() => setShowTimePicker(true)}>
              <Text style={form.pickupAvailability ? styles.inputButtonText : styles.placeholderText}>{form.pickupAvailability || 'Select pickup time'}</Text>
            </TouchableOpacity>
            {showTimePicker && (
              <DateTimePicker
                value={new Date()}
                mode="time"
                onChange={(event, value) => {
                  setShowTimePicker(Platform.OS === 'ios');
                  if (value) updateField('pickupAvailability', formatTime(value));
                }}
              />
            )}
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Photo (optional)</Text>
            <TouchableOpacity style={styles.photoPicker} onPress={choosePhoto}>
              {form.photoUri ? (
                <Image source={{ uri: form.photoUri }} style={styles.photoPreview} />
              ) : (
                <Text style={styles.locationButtonText}>Add food photo</Text>
              )}
            </TouchableOpacity>
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
  inputButton: {
    borderWidth: 1.2,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 12,
    minHeight: 46,
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  inputButtonText: {
    fontSize: 15,
    color: '#111827',
  },
  placeholderText: {
    fontSize: 15,
    color: '#9CA3AF',
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
  photoPicker: {
    height: 150,
    borderRadius: 14,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: '#D1D5DB',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  photoPreview: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
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
