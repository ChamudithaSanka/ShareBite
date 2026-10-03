import React, { useRef, useState } from 'react';
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
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useTabBarContentPadding } from '../../hooks';
import { donationService } from '../../services/donationService';
import { FOOD_QUANTITY_UNITS, formatFoodQuantity } from '../../utils/quantity';

const GREEN = '#1A7A4A';

const categoryOptions = ['Cooked meal', 'Fresh produce', 'Bakery', 'Snacks', 'Groceries', 'Other'];
const conditionOptions = ['Fresh', 'Good', 'Needs quick use', 'Packaged'];
const foodTypeOptions = ['ready-to-eat', 'storable'];
const dateOptions = ['Today', 'Tomorrow', 'This weekend'];
const quantityStepForUnit = (unit) => ['kg', 'litre'].includes(unit) ? 0.5 : 1;

const formatDate = (value) => value.toISOString().split('T')[0];
const parseDateString = (value) => {
  if (!value || typeof value !== 'string') return new Date();
  const [year, month, day] = value.split('-').map(Number);
  if (!year || !month || !day) return new Date();
  return new Date(year, month - 1, day, 12, 0, 0);
};
const formatTime = (value) => value.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

const initialForm = {
  foodName: '',
  quantityAmount: '',
  quantityUnit: 'meal',
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
  const { colors, isDark } = useTheme();
  const tabBarContentPadding = useTabBarContentPadding();
  const [form, setForm] = useState(initialForm);
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [locating, setLocating] = useState(false);
  const [showExpiryPicker, setShowExpiryPicker] = useState(false);
  const [showPickupDatePicker, setShowPickupDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [showBackToTop, setShowBackToTop] = useState(false);
  const scrollViewRef = useRef(null);

  const updateField = (field, value) => setForm((prev) => ({ ...prev, [field]: value }));

  const adjustQuantity = (direction) => {
    const current = Number(form.quantityAmount) || 0;
    const next = Math.max(0, Number((current + direction * quantityStepForUnit(form.quantityUnit)).toFixed(3)));
    updateField('quantityAmount', next > 0 ? String(next) : '');
  };

  const nextStep = () => {
    const quantityAmount = Number(form.quantityAmount);
    if (!form.foodName || !Number.isFinite(quantityAmount) || quantityAmount <= 0 || !form.category || !form.condition) {
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

  const publishDonation = async () => {
    setLoading(true);

    try {
      await donationService.createDonation({
        donorId: user.uid,
        foodName: form.foodName,
        quantity: formatFoodQuantity(form.quantityAmount, form.quantityUnit),
        quantityAmount: Number(form.quantityAmount),
        quantityUnit: form.quantityUnit,
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
        status: form.foodType === 'storable' ? 'pending_review' : 'available',
      });

      Alert.alert(
        form.foodType === 'storable' ? 'Donation submitted' : 'Donation published',
        form.foodType === 'storable'
          ? 'A coordinator will review your storable donation before it becomes available.'
          : 'Your donation is now available to recipients.',
      );
      setForm(initialForm);
      setStep(1);
    } catch (error) {
      console.error('Create donation error:', error);
      Alert.alert('Error', 'Could not create the donation. Please try again.');
    } finally {
      setLoading(false);
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

    const requiresReview = form.foodType === 'storable';
    Alert.alert(
      requiresReview ? 'Submit donation for review?' : 'Publish donation?',
      requiresReview
        ? 'A coordinator will review this storable donation before it becomes available to recipients.'
        : 'This will make the donation available to recipients.',
      [
      { text: 'Cancel', style: 'cancel' },
      { text: requiresReview ? 'Submit for review' : 'Publish', onPress: publishDonation },
      ],
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <ScrollView
        ref={scrollViewRef}
        style={styles.scrollView}
        contentContainerStyle={[styles.content, { paddingBottom: tabBarContentPadding }]}
        onScroll={({ nativeEvent }) => setShowBackToTop(nativeEvent.contentOffset.y > 280)}
        scrollEventThrottle={16}
      >
      <Text style={[styles.title, { color: colors.text }]}>Create Donation</Text>
      <Text style={[styles.stepText, { color: colors.textSecondary }]}>Step {step} of 2</Text>
      {step === 2 ? (
        <View style={styles.buttonRow}>
          <TouchableOpacity style={styles.secondaryButton} onPress={() => setStep(1)}>
            <Ionicons name="arrow-back" size={16} color={colors.textSecondary} />
            <Text style={[styles.secondaryButtonText, { color: colors.textSecondary }]}>Back to food details</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {step === 1 && (
        <View>
          <View style={styles.fieldGroup}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Food name</Text>
            <TextInput style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]} value={form.foodName} onChangeText={(value) => updateField('foodName', value)} placeholderTextColor={colors.textMuted} />
          </View>

          <View style={styles.fieldGroup}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Quantity</Text>
            <View style={[styles.quantitySelector, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <TouchableOpacity
                style={[styles.quantityButton, { backgroundColor: colors.surfaceMuted }, !(Number(form.quantityAmount) > 0) && styles.quantityButtonDisabled]}
                onPress={() => adjustQuantity(-1)}
                disabled={!(Number(form.quantityAmount) > 0)}
                accessibilityRole="button"
                accessibilityLabel="Decrease donation quantity"
              >
                <Text style={[styles.quantityButtonText, { color: colors.text }]}>−</Text>
              </TouchableOpacity>
              <View style={styles.quantityValueWrap}>
                <Text style={[styles.quantityValue, { color: colors.text }]}>
                  {Number(form.quantityAmount) > 0
                    ? formatFoodQuantity(Number(form.quantityAmount), form.quantityUnit)
                    : 'Select quantity'}
                </Text>
                <Text style={[styles.quantityStepHint, { color: colors.textMuted }]}>
                  {['kg', 'litre'].includes(form.quantityUnit) ? 'Steps of 0.5' : 'Steps of 1'}
                </Text>
              </View>
              <TouchableOpacity
                style={[styles.quantityButton, { backgroundColor: colors.primarySoft }]}
                onPress={() => adjustQuantity(1)}
                accessibilityRole="button"
                accessibilityLabel="Increase donation quantity"
              >
                <Text style={[styles.quantityButtonText, { color: colors.primary }]}>+</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.optionWrap}>
              {FOOD_QUANTITY_UNITS.map((unit) => (
                <TouchableOpacity
                  key={unit.value}
                  style={[styles.optionChip, { backgroundColor: colors.surfaceMuted }, form.quantityUnit === unit.value && { backgroundColor: colors.primarySoft }]}
                  onPress={() => updateField('quantityUnit', unit.value)}
                >
                  <Text style={[styles.optionText, { color: colors.textSecondary }, form.quantityUnit === unit.value && { color: colors.primary }]}>{unit.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.fieldGroup}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Category</Text>
            <View style={styles.optionWrap}>
              {categoryOptions.map((option) => (
                <TouchableOpacity
                  key={option}
                  style={[styles.optionChip, { backgroundColor: colors.surfaceMuted }, form.category === option && { backgroundColor: colors.primarySoft }]}
                  onPress={() => updateField('category', option)}
                >
                  <Text style={[styles.optionText, { color: colors.textSecondary }, form.category === option && { color: colors.primary }]}>{option}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.fieldGroup}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Condition</Text>
            <View style={styles.optionWrap}>
              {conditionOptions.map((option) => (
                <TouchableOpacity
                  key={option}
                  style={[styles.optionChip, { backgroundColor: colors.surfaceMuted }, form.condition === option && { backgroundColor: colors.primarySoft }]}
                  onPress={() => updateField('condition', option)}
                >
                  <Text style={[styles.optionText, { color: colors.textSecondary }, form.condition === option && { color: colors.primary }]}>{option}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.fieldGroup}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Food type</Text>
            <View style={styles.segmentedRow}>
              {foodTypeOptions.map((type) => (
                <TouchableOpacity
                  key={type}
                  style={[styles.segmentButton, { backgroundColor: colors.surfaceMuted }, form.foodType === type && { backgroundColor: colors.primarySoft }]}
                  onPress={() => updateField('foodType', type)}
                >
                  <Text style={[styles.segmentText, { color: colors.textSecondary }, form.foodType === type && { color: colors.primary }] }>
                    {type === 'ready-to-eat' ? 'Ready to eat' : 'Storable'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.fieldGroup}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Best before / expiry</Text>
            <TouchableOpacity
              style={[styles.inputButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
              onPress={() => setShowExpiryPicker(true)}
              activeOpacity={0.85}
            >
              <Text style={[form.expiry ? styles.inputButtonText : styles.placeholderText, { color: form.expiry ? colors.text : colors.textMuted }]}>
                {form.expiry || 'Select expiry date'}
              </Text>
            </TouchableOpacity>
            {showExpiryPicker && (
              <View style={[styles.datePickerContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <DateTimePicker
                  value={form.expiry ? parseDateString(form.expiry) : new Date()}
                  mode="date"
                  minimumDate={new Date()}
                  display={Platform.OS === 'android' ? 'calendar' : 'inline'}
                  accentColor={isDark ? colors.primary : GREEN}
                  themeVariant={isDark ? 'dark' : 'light'}
                  textColor={isDark ? colors.text : '#111827'}
                  onChange={(event, value) => {
                    setShowExpiryPicker(Platform.OS === 'ios');
                    if (value) updateField('expiry', formatDate(value));
                  }}
                />
              </View>
            )}
          </View>

          <TouchableOpacity style={[styles.primaryButton, { backgroundColor: colors.primary }]} onPress={nextStep}>
            <Text style={[styles.primaryButtonText, { color: colors.surface }]}>Next</Text>
          </TouchableOpacity>
        </View>
      )}

      {step === 2 && (
        <View>
          <View style={styles.fieldGroup}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Pickup date</Text>
            <View style={styles.optionWrap}>
              {dateOptions.map((option) => (
                <TouchableOpacity
                  key={option}
                  style={[styles.optionChip, { backgroundColor: colors.surfaceMuted }, form.pickupDate === option && { backgroundColor: colors.primarySoft }]}
                  onPress={() => updateField('pickupDate', option)}
                >
                  <Text style={[styles.optionText, { color: colors.textSecondary }, form.pickupDate === option && { color: colors.primary }]}>{option}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity style={[styles.inputButton, styles.marginTop, { backgroundColor: colors.surface, borderColor: colors.border }]} onPress={() => setShowPickupDatePicker(true)}>
              <Text style={[styles.inputButtonText, { color: colors.text }]}>{form.pickupDate === 'Today' || form.pickupDate === 'Tomorrow' || form.pickupDate === 'This weekend' ? 'Select a custom date' : form.pickupDate}</Text>
            </TouchableOpacity>
            {showPickupDatePicker && (
              <DateTimePicker
                value={form.pickupDate && !dateOptions.includes(form.pickupDate) ? new Date(form.pickupDate) : new Date()}
                mode="date"
                minimumDate={new Date()}
                display={Platform.OS === 'android' ? 'calendar' : 'inline'}
                accentColor={isDark ? colors.primary : GREEN}
                themeVariant={isDark ? 'dark' : 'light'}
                textColor={isDark ? colors.text : '#111827'}
                onChange={(event, value) => {
                  setShowPickupDatePicker(Platform.OS === 'ios');
                  if (value) updateField('pickupDate', formatDate(value));
                }}
              />
            )}
          </View>

          <View style={styles.fieldGroup}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Pickup location</Text>
            <TouchableOpacity style={[styles.locationButton, { backgroundColor: colors.primarySoft }]} onPress={handleUseCurrentLocation} disabled={locating}>
              <Text style={[styles.locationButtonText, { color: colors.primary }]}>{locating ? 'Fetching location...' : 'Use my current location'}</Text>
            </TouchableOpacity>
            <TextInput
              style={[styles.input, styles.marginTop, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
              value={form.pickupLocation}
              onChangeText={(value) => setForm((previous) => ({
                ...previous,
                pickupLocation: value,
                pickupLatitude: null,
                pickupLongitude: null,
              }))}
              placeholder="Enter pickup address or venue"
            />
          </View>

          <View style={styles.fieldGroup}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Pickup availability</Text>
            <TouchableOpacity style={[styles.inputButton, { backgroundColor: colors.surface, borderColor: colors.border }]} onPress={() => setShowTimePicker(true)}>
              <Text style={[form.pickupAvailability ? styles.inputButtonText : styles.placeholderText, { color: form.pickupAvailability ? colors.text : colors.textMuted }]}>{form.pickupAvailability || 'Select pickup time'}</Text>
            </TouchableOpacity>
            {showTimePicker && (
              <DateTimePicker
                value={new Date()}
                mode="time"
                accentColor={isDark ? colors.primary : GREEN}
                themeVariant={isDark ? 'dark' : 'light'}
                textColor={isDark ? colors.text : '#111827'}
                onChange={(event, value) => {
                  setShowTimePicker(Platform.OS === 'ios');
                  if (value) updateField('pickupAvailability', formatTime(value));
                }}
              />
            )}
          </View>

          <View style={styles.fieldGroup}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Photo (optional)</Text>
            <TouchableOpacity style={[styles.photoPicker, { borderColor: colors.border }]} onPress={choosePhoto}>
              {form.photoUri ? (
                <Image source={{ uri: form.photoUri }} style={styles.photoPreview} />
              ) : (
                <Text style={[styles.locationButtonText, { color: colors.primary }]}>Add food photo</Text>
              )}
            </TouchableOpacity>
          </View>

          <View style={styles.fieldGroup}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Notes</Text>
            <TextInput
              style={[styles.input, styles.textArea, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
              value={form.notes}
              onChangeText={(value) => updateField('notes', value)}
              multiline
              numberOfLines={4}
            />
          </View>

          <TouchableOpacity
            style={[styles.submitButton, { backgroundColor: colors.primary, borderColor: colors.primary }, loading && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={loading}
            accessibilityRole="button"
            accessibilityLabel={loading ? 'Publishing donation' : 'Publish donation'}
            accessibilityState={{ disabled: loading }}
          >
            <View style={styles.submitIcon}>
              {loading
                ? <ActivityIndicator color={colors.surface} size="small" />
                : <Ionicons name="cloud-upload-outline" size={19} color={colors.surface} />}
            </View>
            <Text style={[styles.submitButtonText, { color: colors.surface }]}>{loading ? 'Publishing...' : 'Publish donation'}</Text>
            {!loading ? <Ionicons name="arrow-forward" size={17} color={colors.surface} /> : null}
          </TouchableOpacity>
        </View>
      )}
      </ScrollView>
      {showBackToTop ? (
        <TouchableOpacity
          style={styles.backToTopButton}
          onPress={() => scrollViewRef.current?.scrollTo({ y: 0, animated: true })}
          accessibilityRole="button"
          accessibilityLabel="Back to top"
          accessibilityHint="Scrolls to the beginning of the donation form"
        >
          <Ionicons name="arrow-up" size={19} color={colors.primary} />
        </TouchableOpacity>
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 20,
    paddingTop: 28,
    paddingBottom: 120,
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
  quantitySelector: { alignItems: 'center', borderRadius: 12, borderWidth: 1.2, flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12, minHeight: 68, padding: 10 },
  quantityButton: { alignItems: 'center', borderRadius: 10, height: 44, justifyContent: 'center', width: 48 },
  quantityButtonDisabled: { opacity: 0.45 },
  quantityButtonText: { fontSize: 24, fontWeight: '700', lineHeight: 28 },
  quantityValueWrap: { alignItems: 'center', flex: 1, paddingHorizontal: 8 },
  quantityValue: { fontSize: 17, fontWeight: '800', textAlign: 'center' },
  quantityStepHint: { fontSize: 11, marginTop: 3 },
  inputButton: {
    borderWidth: 1.2,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 12,
    minHeight: 46,
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  datePickerContainer: {
    borderWidth: 1.2,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    marginTop: 10,
    overflow: 'hidden',
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
    alignItems: 'center',
    flexDirection: 'row',
    gap: 7,
    paddingVertical: 9,
  },
  secondaryButtonText: {
    color: '#374151',
    fontSize: 13,
    fontWeight: '700',
  },
  buttonRow: {
    alignItems: 'flex-start',
    marginBottom: 12,
    marginTop: -8,
  },
  submitButton: {
    alignItems: 'center',
    backgroundColor: GREEN,
    borderColor: '#14663E',
    borderRadius: 14,
    borderWidth: 1,
    elevation: 3,
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 58,
    paddingHorizontal: 12,
    width: '100%',
    shadowColor: '#124B30',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.18,
    shadowRadius: 5,
  },
  submitButtonDisabled: {
    opacity: 0.72,
  },
  submitIcon: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.16)',
    borderRadius: 18,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  submitButtonText: {
    color: '#FFFFFF',
    flex: 1,
    fontSize: 14,
    fontWeight: '800',
    marginHorizontal: 8,
    textAlign: 'center',
  },
  backToTopButton: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#DCE8E0',
    borderRadius: 22,
    borderWidth: 1,
    elevation: 5,
    height: 44,
    justifyContent: 'center',
    position: 'absolute',
    left: 20,
    top: 52,
    shadowColor: '#13231A',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    width: 44,
  },
  marginTop: {
    marginTop: 10,
  },
});
