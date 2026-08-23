import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { approveRequest, declineRequest } from '../../services/coordinatorService';

// ─── Design tokens ────────────────────────────────────────────────────────────
const C = {
  blue:       '#2563EB',
  blueLight:  '#EFF6FF',
  blueBg:     '#F0F7FF',
  blueBorder: '#BFDBFE',
  green:      '#1A7A4A',
  greenLight: '#E8F5EE',
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
export default function RequestDetailScreen() {
  const navigation  = useNavigation();
  const route       = useRoute();
  const requestItem = route.params?.request;

  const [submitting, setSubmitting] = useState(false);
  const [decision,   setDecision]   = useState(null); // 'approved' | 'declined'

  // ── Handlers ──────────────────────────────────────────────────────────────
  const confirm = (title, message, onConfirm, destructive = false) =>
    Alert.alert(title, message, [
      { text: 'Cancel', style: 'cancel' },
      { text: title, style: destructive ? 'destructive' : 'default', onPress: onConfirm },
    ]);

  const handleApprove = () =>
    confirm(
      'Approve Request',
      `Approve request from "${requestItem?.recipientName}"? It will become available for delivery.`,
      async () => {
        setSubmitting(true);
        try   { await approveRequest(requestItem.id); setDecision('approved'); }
        catch { Alert.alert('Error', 'Could not approve this request.'); }
        finally { setSubmitting(false); }
      },
    );

  const handleDecline = () =>
    confirm(
      'Decline Request',
      `Decline request from "${requestItem?.recipientName}"? The recipient will be notified.`,
      async () => {
        setSubmitting(true);
        try   { await declineRequest(requestItem.id); setDecision('declined'); }
        catch { Alert.alert('Error', 'Could not decline this request.'); }
        finally { setSubmitting(false); }
      },
      true,
    );

  // ── Not found ─────────────────────────────────────────────────────────────
  if (!requestItem) {
    return (
      <SafeAreaView style={s.safe}>
        <View style={s.centered}>
          <Text style={{ fontSize: 40, marginBottom: 12 }}>🔍</Text>
          <Text style={s.notFoundText}>Request not found.</Text>
          <TouchableOpacity style={s.backPill} onPress={() => navigation.goBack()}>
            <Text style={s.backPillText}>Go back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ── Decision confirmed ────────────────────────────────────────────────────
  if (decision) {
    const approved = decision === 'approved';
    return (
      <SafeAreaView style={s.safe}>
        <StatusBar barStyle="dark-content" backgroundColor={C.white} />
        <View style={s.centered}>
          <View style={[s.resultIconWrap, { backgroundColor: approved ? C.blueLight : C.redLight }]}>
            <Text style={{ fontSize: 44 }}>{approved ? '✅' : '❌'}</Text>
          </View>
          <Text style={s.resultTitle}>
            {approved ? 'Request Approved!' : 'Request Declined'}
          </Text>
          <Text style={s.resultSub}>
            {approved
              ? 'The request is now approved. A volunteer can be assigned for delivery.'
              : 'The request has been marked as declined.'}
          </Text>
          <TouchableOpacity
            style={[s.resultBtn, { backgroundColor: approved ? C.blue : C.gray100 }]}
            onPress={() => navigation.goBack()}
          >
            <Text style={[s.resultBtnText, { color: approved ? C.white : C.gray700 }]}>
              Back to Requests
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ── Main detail view ──────────────────────────────────────────────────────
  const infoRows = [
    { label: 'Recipient Name',     value: requestItem.recipientName },
    { label: 'Food Requested',     value: requestItem.foodName },
    { label: 'Quantity',           value: requestItem.quantity },
    { label: 'Delivery Address',   value: requestItem.deliveryAddress },
    { label: 'Contact',            value: requestItem.contactNumber },
    { label: 'Notes',              value: requestItem.notes || 'None' },
    { label: 'Requested On',       value: fmtDate(requestItem.createdAt) },
  ];

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={C.white} />
      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.content}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Back button ── */}
        <TouchableOpacity style={s.backRow} onPress={() => navigation.goBack()}>
          <Text style={s.backArrow}>‹</Text>
          <Text style={s.backText}>Pending Requests</Text>
        </TouchableOpacity>

        {/* ── Hero section ── */}
        <View style={s.hero}>
          <View style={s.heroIcon}>
            <Text style={{ fontSize: 56 }}>📋</Text>
          </View>
          <View style={s.heroMeta}>
            <Text style={s.heroTitle} numberOfLines={2}>
              {requestItem.foodName || 'Food Request'}
            </Text>
            <View style={s.badgeRow}>
              <View style={[s.badge, { backgroundColor: C.blueLight, borderColor: C.blueBorder }]}>
                <Text style={[s.badgeText, { color: C.blue }]}>⏳ Pending Approval</Text>
              </View>
            </View>
          </View>
        </View>

        {/* ── Info table ── */}
        <Text style={s.sectionLabel}>REQUEST DETAILS</Text>
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
            ℹ Approving will allow volunteers to pick up and deliver this request. Declining will reject the request.
          </Text>
        </View>

        {submitting ? (
          <ActivityIndicator color={C.blue} style={{ marginVertical: 20 }} size="large" />
        ) : (
          <View style={s.btnRow}>
            <TouchableOpacity style={[s.btn, s.acceptBtn]} onPress={handleApprove} activeOpacity={0.8}>
              <Text style={s.acceptIcon}>✅</Text>
              <View>
                <Text style={s.acceptLabel}>Approve</Text>
                <Text style={s.acceptSub}>Allow delivery</Text>
              </View>
            </TouchableOpacity>
            <TouchableOpacity style={[s.btn, s.declineBtn]} onPress={handleDecline} activeOpacity={0.8}>
              <Text style={s.declineIcon}>❌</Text>
              <View>
                <Text style={s.declineLabel}>Decline</Text>
                <Text style={s.declineSub}>Reject request</Text>
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
    backgroundColor: C.blueLight,
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
    backgroundColor: C.gray100, borderRadius: 12,
    padding: 14, marginBottom: 16,
    borderWidth: 1, borderColor: C.gray200,
  },
  decisionHintText: { fontSize: 13, color: C.gray700, lineHeight: 19 },

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
  acceptBtn:   { backgroundColor: C.blue,      borderColor: C.blue },
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
