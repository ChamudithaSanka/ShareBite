import React, { useState } from 'react';
import {
  Alert,
  Platform,
  StyleSheet,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import {
  ThemedActivityIndicator as ActivityIndicator,
  ThemedSafeAreaView as SafeAreaView,
  ThemedScrollView as ScrollView,
  ThemedStatusBar as StatusBar,
  ThemedText as Text,
  ThemedTouchableOpacity as TouchableOpacity,
  ThemedView as View,
} from '../../components/ThemedPrimitives';
import { useTabBarContentPadding } from '../../hooks';
import { acceptDonation, declineDonation } from '../../services/coordinatorService';

// ─── Design tokens ────────────────────────────────────────────────────────────
const C = {
  green:      '#1A7A4A',
  greenLight: '#E8F5EE',
  greenBg:    '#F0FAF4',
  greenBorder:'#A7F3C6',
  amber:      '#D97706',
  amberLight: '#FEF3C7',
  amberBorder:'#FDE68A',
  blue:       '#2563EB',
  blueLight:  '#EFF6FF',
  blueBorder: '#BFDBFE',
  red:        '#B42318',
  redLight:   '#FDECEC',
  redBorder:  '#FECACA',
  gray50:     '#F9FAFB',
  gray100:    '#F3F4F6',
  gray200:    '#E5E7EB',
  gray400:    '#9CA3AF',
  gray500:    '#6B7280',
  gray600:    '#4B5563',
  gray700:    '#374151',
  gray900:    '#111827',
  white:      '#FFFFFF',
};

function fmtDate(ts) {
  if (!ts?.toDate) return 'Unknown date';
  return ts.toDate().toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

// ─── Info row ─────────────────────────────────────────────────────────────────
function InfoRow({ label, value, last }) {
  return (
    <View style={[s.infoRow, last && { borderBottomWidth: 0 }]}>
      <Text style={s.infoLabel}>{label}</Text>
      <Text style={s.infoValue} numberOfLines={3}>{value || '—'}</Text>
    </View>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────
export default function DonationReviewDetailScreen() {
  const navigation  = useNavigation();
  const route       = useRoute();
  const tabBarContentPadding = useTabBarContentPadding();
  const donation    = route.params?.donation;

  const [submitting, setSubmitting] = useState(false);
  const [decision,   setDecision]   = useState(null); // 'accepted' | 'declined'

  // ── Handlers ──────────────────────────────────────────────────────────────
  const confirm = (title, message, onConfirm, destructive = false) =>
    Alert.alert(title, message, [
      { text: 'Cancel', style: 'cancel' },
      { text: title, style: destructive ? 'destructive' : 'default', onPress: onConfirm },
    ]);

  const handleAccept = () =>
    confirm(
      'Accept Donation',
      `Accept "${donation?.foodName}"? It will become available for delivery.`,
      async () => {
        setSubmitting(true);
        try {
          await acceptDonation(donation.id);
          setDecision('accepted');
        } catch (error) {
          const message = error.code === 'donation-review-unavailable'
            ? 'This donation has already been reviewed. Return to the queue and refresh.'
            : error.code === 'quantity-unstructured'
              ? 'Ask the donor to enter a supported amount and unit before accepting this donation.'
              : 'Could not accept this donation. Please refresh and try again.';
          Alert.alert('Unable to accept donation', message);
        }
        finally { setSubmitting(false); }
      },
    );

  const handleDecline = () =>
    confirm(
      'Decline Donation',
      `Decline "${donation?.foodName}"? The donor will see this status.`,
      async () => {
        setSubmitting(true);
        try {
          await declineDonation(donation.id);
          setDecision('declined');
        } catch (error) {
          Alert.alert(
            'Unable to decline donation',
            error.code === 'donation-review-unavailable'
              ? 'This donation has already been reviewed. Return to the queue and refresh.'
              : 'Could not decline this donation. Please refresh and try again.',
          );
        }
        finally { setSubmitting(false); }
      },
      true,
    );

  // ── Not found ─────────────────────────────────────────────────────────────
  if (!donation) {
    return (
      <SafeAreaView style={s.safe}>
        <View style={s.centered}>
          <Text style={{ fontSize: 40, marginBottom: 12 }}>🔍</Text>
          <Text style={s.notFoundText}>Donation not found.</Text>
          <TouchableOpacity style={s.backPill} onPress={() => navigation.goBack()}>
            <Text style={s.backPillText}>Go back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ── Decision confirmed ────────────────────────────────────────────────────
  if (decision) {
    const accepted = decision === 'accepted';
    return (
      <SafeAreaView style={s.safe}>
        <StatusBar barStyle="dark-content" backgroundColor={C.white} />
        <View style={s.centered}>
          <View style={[s.resultIconWrap, { backgroundColor: accepted ? C.greenLight : C.redLight }]}>
            <Text style={{ fontSize: 44 }}>{accepted ? '✅' : '❌'}</Text>
          </View>
          <Text style={s.resultTitle}>
            {accepted ? 'Donation Accepted!' : 'Donation Declined'}
          </Text>
          <Text style={s.resultSub}>
            {accepted
              ? 'The donation is now available. A volunteer can pick it up for delivery.'
              : 'The donation has been marked as declined.'}
          </Text>
          <TouchableOpacity
            style={[s.resultBtn, { backgroundColor: accepted ? C.green : C.gray100 }]}
            onPress={() => navigation.goBack()}
          >
            <Text style={[s.resultBtnText, { color: accepted ? C.white : C.gray700 }]}>
              Back to Donations
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ── Main detail view ──────────────────────────────────────────────────────
  const infoRows = [
    { label: 'Quantity',           value: donation.quantity },
    { label: 'Category',           value: donation.category },
    { label: 'Condition',          value: donation.condition },
    { label: 'Food type',          value: donation.foodType },
    { label: 'Expiry date',        value: donation.expiry },
    { label: 'Pickup location',    value: donation.pickupLocation },
    { label: 'Pickup availability',value: donation.pickupAvailability },
    { label: 'Notes',              value: donation.notes || 'None' },
    { label: 'Submitted',          value: fmtDate(donation.createdAt) },
  ];

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={C.white} />
      <ScrollView
        style={s.scroll}
        contentContainerStyle={[s.content, { paddingBottom: tabBarContentPadding }]}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Back button ── */}
        <TouchableOpacity style={s.backRow} onPress={() => navigation.goBack()}>
          <Text style={s.backArrow}>‹</Text>
          <Text style={s.backText}>Pending Donations</Text>
        </TouchableOpacity>

        {/* ── Hero section ── */}
        <View style={s.hero}>
          <View style={s.heroIcon}>
            <Text style={{ fontSize: 56 }}>📦</Text>
          </View>
          <View style={s.heroMeta}>
            <Text style={s.heroTitle} numberOfLines={2}>
              {donation.foodName || 'Unnamed donation'}
            </Text>
            <View style={s.badgeRow}>
              <View style={[s.badge, { backgroundColor: C.amberLight, borderColor: C.amberBorder }]}>
                <Text style={[s.badgeText, { color: C.amber }]}>⏳ Pending Review</Text>
              </View>
              <View style={[s.badge, { backgroundColor: C.blueLight, borderColor: C.blueBorder }]}>
                <Text style={[s.badgeText, { color: C.blue }]}>📦 Storable</Text>
              </View>
            </View>
          </View>
        </View>

        {/* ── Info table ── */}
        <Text style={s.sectionLabel}>DONATION DETAILS</Text>
        <View style={s.infoCard}>
          {infoRows.map((row, i) => (
            <InfoRow
              key={row.label}
              label={row.label}
              value={row.value}
              last={i === infoRows.length - 1}
            />
          ))}
        </View>

        {/* ── Decision ── */}
        <Text style={s.sectionLabel}>YOUR DECISION</Text>
        <View style={s.decisionHint}>
          <Text style={s.decisionHintText}>
            ℹ Accepting will make this donation available for volunteer pickup. Declining removes it from the queue.
          </Text>
        </View>

        {submitting ? (
          <ActivityIndicator color={C.green} style={{ marginVertical: 20 }} size="large" />
        ) : (
          <View style={s.btnRow}>
            <TouchableOpacity style={[s.btn, s.acceptBtn]} onPress={handleAccept} activeOpacity={0.8}>
              <Text style={s.acceptIcon}>✅</Text>
              <View>
                <Text style={s.acceptLabel}>Accept</Text>
                <Text style={s.acceptSub}>Make available</Text>
              </View>
            </TouchableOpacity>
            <TouchableOpacity style={[s.btn, s.declineBtn]} onPress={handleDecline} activeOpacity={0.8}>
              <Text style={s.declineIcon}>❌</Text>
              <View>
                <Text style={s.declineLabel}>Decline</Text>
                <Text style={s.declineSub}>Remove from queue</Text>
              </View>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  safe:    { flex: 1, backgroundColor: C.white },
  scroll:  { flex: 1 },
  content: { padding: 20, paddingTop: 8, paddingBottom: 48 },
  centered:{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },

  // Back
  backRow:  { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 20, marginTop: 4 },
  backArrow:{ fontSize: 22, color: C.gray600, fontWeight: '400' },
  backText: { fontSize: 15, color: C.gray600, fontWeight: '600' },

  // Hero
  hero: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 14,
    backgroundColor: C.gray50, borderRadius: 18,
    padding: 16, marginBottom: 24,
    borderWidth: 1, borderColor: C.gray200,
  },
  heroIcon: {
    width: 76, height: 76, borderRadius: 16,
    backgroundColor: C.amberLight,
    alignItems: 'center', justifyContent: 'center',
  },
  heroMeta:  { flex: 1 },
  heroTitle: { fontSize: 18, fontWeight: '800', color: C.gray900, marginBottom: 10, lineHeight: 24 },
  badgeRow:  { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  badge:     { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, borderWidth: 1 },
  badgeText: { fontSize: 11, fontWeight: '700' },

  // Section label
  sectionLabel: {
    fontSize: 11, fontWeight: '700', color: C.gray400,
    letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 10,
  },

  // Info card
  infoCard: {
    backgroundColor: C.gray50, borderRadius: 16,
    borderWidth: 1, borderColor: C.gray200,
    paddingHorizontal: 16, marginBottom: 24,
    ...Platform.select({
      ios:     { shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 8, shadowOffset: { width: 0, height: 2 } },
      android: { elevation: 1 },
    }),
  },
  infoRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: C.gray200,
  },
  infoLabel: { fontSize: 13, fontWeight: '600', color: C.gray500, width: 140 },
  infoValue: { fontSize: 13, color: C.gray900, flex: 1, textAlign: 'right', fontWeight: '500' },

  // Decision hint
  decisionHint: {
    backgroundColor: C.blueLight, borderRadius: 12,
    padding: 14, marginBottom: 16,
    borderWidth: 1, borderColor: C.blueBorder,
  },
  decisionHintText: { fontSize: 13, color: C.blue, lineHeight: 19 },

  // Buttons
  btnRow: { flexDirection: 'row', gap: 12 },
  btn: {
    flex: 1, flexDirection: 'row', alignItems: 'center',
    gap: 10, padding: 16, borderRadius: 16,
    borderWidth: 1,
    ...Platform.select({
      ios:     { shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 8, shadowOffset: { width: 0, height: 3 } },
      android: { elevation: 3 },
    }),
  },
  acceptBtn:   { backgroundColor: C.green,    borderColor: C.green },
  declineBtn:  { backgroundColor: C.redLight,  borderColor: C.redBorder },
  acceptIcon:  { fontSize: 22 },
  acceptLabel: { fontSize: 15, fontWeight: '800', color: C.white },
  acceptSub:   { fontSize: 11, color: 'rgba(255,255,255,0.75)', marginTop: 2 },
  declineIcon: { fontSize: 22 },
  declineLabel:{ fontSize: 15, fontWeight: '800', color: C.red },
  declineSub:  { fontSize: 11, color: '#F87171', marginTop: 2 },

  // Not found / result
  notFoundText:{ fontSize: 16, color: C.gray500, textAlign: 'center', marginBottom: 20 },
  backPill: {
    backgroundColor: C.gray100, borderRadius: 20,
    paddingHorizontal: 20, paddingVertical: 10,
  },
  backPillText: { fontSize: 14, fontWeight: '600', color: C.gray700 },
  resultIconWrap: {
    width: 100, height: 100, borderRadius: 50,
    alignItems: 'center', justifyContent: 'center', marginBottom: 20,
  },
  resultTitle: { fontSize: 24, fontWeight: '800', color: C.gray900, marginBottom: 10, textAlign: 'center' },
  resultSub:   { fontSize: 14, color: C.gray500, textAlign: 'center', lineHeight: 22, marginBottom: 28 },
  resultBtn:   { paddingVertical: 15, paddingHorizontal: 32, borderRadius: 14 },
  resultBtnText:{ fontSize: 15, fontWeight: '700' },
});
