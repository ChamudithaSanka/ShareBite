import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { markAvailable, markOutOfStock, updateInventoryItem } from '../../services/inventoryService';

// ─── Design tokens ────────────────────────────────────────────────────────────
const C = {
  green:       '#1A7A4A',
  greenLight:  '#E8F5EE',
  greenPale:   '#F0FAF4',
  greenBorder: '#A7F3C6',
  amber:       '#D97706',
  amberLight:  '#FEF3C7',
  amberBorder: '#FDE68A',
  red:         '#B42318',
  redLight:    '#FDECEC',
  redBorder:   '#FECACA',
  gray50:      '#F9FAFB',
  gray100:     '#F3F4F6',
  gray200:     '#E5E7EB',
  gray300:     '#D1D5DB',
  gray400:     '#9CA3AF',
  gray500:     '#6B7280',
  gray600:     '#4B5563',
  gray700:     '#374151',
  gray900:     '#111827',
  white:       '#FFFFFF',
};

// ─── Expiry helper ────────────────────────────────────────────────────────────
function getExpiry(expiry) {
  if (!expiry) return { label: 'No expiry date set', color: C.gray500, bg: C.gray100, border: C.gray200 };
  const diff = Math.ceil((new Date(expiry) - new Date()) / 86_400_000);
  if (diff < 0)   return { label: `Expired ${Math.abs(diff)} day(s) ago`, color: C.red,   bg: C.redLight,   border: C.redBorder };
  if (diff === 0) return { label: 'Expires today — use urgently',         color: C.red,   bg: C.redLight,   border: C.redBorder };
  if (diff <= 3)  return { label: `Expires in ${diff} day(s) — act soon`, color: C.amber, bg: C.amberLight, border: C.amberBorder };
  if (diff <= 7)  return { label: `Expires in ${diff} days`,              color: C.amber, bg: '#FFFBF0',    border: C.amberBorder };
  return           { label: `${diff} days remaining`,                     color: C.green, bg: C.greenPale,  border: C.greenBorder };
}

// ─── Info row ─────────────────────────────────────────────────────────────────
function InfoRow({ label, value, last }) {
  return (
    <View style={[s.infoRow, last && { borderBottomWidth: 0 }]}>
      <Text style={s.infoLabel}>{label}</Text>
      <Text style={s.infoValue} numberOfLines={2}>{value || '—'}</Text>
    </View>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────
export default function InventoryDetailScreen() {
  const navigation = useNavigation();
  const route      = useRoute();
  const [item, setItem]       = useState(route.params?.item);
  const [newQty, setNewQty]   = useState(item?.quantity || '');
  const [editMode, setEdit]   = useState(false);
  const [submitting, setSub]  = useState(false);

  if (!item) {
    return (
      <SafeAreaView style={s.safe}>
        <View style={s.centered}>
          <Text style={{ fontSize: 44, marginBottom: 12 }}>🔍</Text>
          <Text style={s.notFoundText}>Item not found.</Text>
          <TouchableOpacity style={s.backPill} onPress={() => navigation.goBack()}>
            <Text style={s.backPillText}>Go back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const expiry      = getExpiry(item.expiry);
  const isAvailable = item.status === 'available';

  const fmtStored = (ts) => {
    if (!ts?.toDate) return '—';
    return ts.toDate().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  // ── Save quantity ──────────────────────────────────────────────────────────
  const handleSaveQty = () => {
    if (!newQty.trim()) { Alert.alert('Invalid', 'Please enter a quantity.'); return; }
    Alert.alert('Update Quantity', `Set quantity to "${newQty.trim()}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Save',
        onPress: async () => {
          setSub(true);
          try {
            await updateInventoryItem(item.id, { quantity: newQty.trim() });
            setItem((p) => ({ ...p, quantity: newQty.trim() }));
            setEdit(false);
            Alert.alert('Updated ✅', 'Quantity has been saved.');
          } catch { Alert.alert('Error', 'Could not update quantity.'); }
          finally   { setSub(false); }
        },
      },
    ]);
  };

  // ── Toggle status ──────────────────────────────────────────────────────────
  const handleToggle = () => {
    const goingOut  = isAvailable;
    const title     = goingOut ? 'Mark as Out of Stock' : 'Mark as Back in Stock';
    const message   = goingOut
      ? 'This will mark the item as out of stock and set quantity to 0.'
      : 'This will mark the item as available again.';

    Alert.alert(title, message, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: title,
        style: goingOut ? 'destructive' : 'default',
        onPress: async () => {
          setSub(true);
          try {
            if (goingOut) {
              await markOutOfStock(item.id);
              setItem((p) => ({ ...p, status: 'out_of_stock', quantity: '0' }));
              setNewQty('0');
            } else {
              await markAvailable(item.id, newQty.trim() || item.quantity);
              setItem((p) => ({ ...p, status: 'available' }));
            }
          } catch { Alert.alert('Error', 'Could not update status.'); }
          finally   { setSub(false); }
        },
      },
    ]);
  };

  const infoRows = [
    { label: 'Food name',  value: item.foodName },
    { label: 'Quantity',   value: item.quantity },
    { label: 'Expiry',     value: item.expiry || 'Not set' },
    { label: 'Location',   value: item.location },
    { label: 'Donation ID',value: item.donationId },
    { label: 'Stored at',  value: fmtStored(item.storedAt) },
  ];

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={C.white} />
      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* ── Back ── */}
        <TouchableOpacity style={s.backRow} onPress={() => navigation.goBack()}>
          <Text style={s.backArrow}>‹</Text>
          <Text style={s.backText}>Inventory</Text>
        </TouchableOpacity>

        {/* ── Hero ── */}
        <View style={[s.hero, { borderColor: isAvailable ? C.greenBorder : C.gray200 }]}>
          <View style={[s.heroIcon, { backgroundColor: isAvailable ? C.greenLight : C.gray100 }]}>
            <Text style={{ fontSize: 48 }}>🏪</Text>
          </View>
          <Text style={s.heroName}>{item.foodName || 'Unknown item'}</Text>
          <View style={s.heroBadges}>
            {/* Status badge */}
            <View style={[s.badge, {
              backgroundColor: isAvailable ? C.greenLight : C.gray100,
              borderColor:     isAvailable ? C.greenBorder : C.gray200,
            }]}>
              <View style={[s.dot, { backgroundColor: isAvailable ? C.green : C.gray400 }]} />
              <Text style={[s.badgeText, { color: isAvailable ? C.green : C.gray500 }]}>
                {isAvailable ? 'In Stock' : 'Out of Stock'}
              </Text>
            </View>
            {/* Expiry badge */}
            <View style={[s.badge, { backgroundColor: expiry.bg, borderColor: expiry.border }]}>
              <Text style={[s.badgeText, { color: expiry.color }]}>⏱ {expiry.label}</Text>
            </View>
          </View>
        </View>

        {/* ── Info table ── */}
        <Text style={s.sectionLabel}>ITEM DETAILS</Text>
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

        {/* ── Adjust quantity ── */}
        <Text style={s.sectionLabel}>ADJUST QUANTITY</Text>
        {editMode ? (
          <View style={s.editCard}>
            <TextInput
              style={s.qtyInput}
              value={newQty}
              onChangeText={setNewQty}
              placeholder="e.g. 15 kg or 20 portions"
              placeholderTextColor={C.gray400}
              autoFocus
            />
            <View style={s.editBtns}>
              {submitting ? (
                <ActivityIndicator color={C.green} />
              ) : (
                <>
                  <TouchableOpacity style={s.saveBtn} onPress={handleSaveQty}>
                    <Text style={s.saveBtnText}>Save changes</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={s.cancelBtn}
                    onPress={() => { setEdit(false); setNewQty(item.quantity || ''); }}
                  >
                    <Text style={s.cancelBtnText}>Cancel</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          </View>
        ) : (
          <TouchableOpacity style={s.qtyDisplay} onPress={() => setEdit(true)} activeOpacity={0.8}>
            <View>
              <Text style={s.qtyValue}>{item.quantity || 'Not set'}</Text>
              <Text style={s.qtyHint}>Tap to update quantity</Text>
            </View>
            <View style={s.editIcon}>
              <Text style={{ fontSize: 16 }}>✏️</Text>
            </View>
          </TouchableOpacity>
        )}

        {/* ── Stock status toggle ── */}
        <Text style={s.sectionLabel}>STOCK STATUS</Text>
        {submitting ? (
          <ActivityIndicator color={C.green} style={{ marginVertical: 16 }} />
        ) : isAvailable ? (
          <TouchableOpacity style={s.outOfStockBtn} onPress={handleToggle} activeOpacity={0.8}>
            <Text style={{ fontSize: 20 }}>⚠</Text>
            <View style={{ flex: 1 }}>
              <Text style={s.outOfStockLabel}>Mark as Out of Stock</Text>
              <Text style={s.outOfStockSub}>Sets quantity to 0</Text>
            </View>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={s.backInStockBtn} onPress={handleToggle} activeOpacity={0.8}>
            <Text style={{ fontSize: 20 }}>✅</Text>
            <View style={{ flex: 1 }}>
              <Text style={s.backInStockLabel}>Mark as Back in Stock</Text>
              <Text style={s.backInStockSub}>Makes item available again</Text>
            </View>
          </TouchableOpacity>
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
  backArrow:{ fontSize: 22, color: C.gray600 },
  backText: { fontSize: 15, color: C.gray600, fontWeight: '600' },

  // Hero
  hero: {
    alignItems: 'center', padding: 24,
    backgroundColor: C.gray50, borderRadius: 20,
    borderWidth: 1, marginBottom: 24,
    ...Platform.select({
      ios:     { shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, shadowOffset: { width: 0, height: 2 } },
      android: { elevation: 1 },
    }),
  },
  heroIcon: {
    width: 88, height: 88, borderRadius: 24,
    alignItems: 'center', justifyContent: 'center', marginBottom: 14,
  },
  heroName: {
    fontSize: 20, fontWeight: '800', color: C.gray900,
    textAlign: 'center', marginBottom: 14, letterSpacing: -0.3,
  },
  heroBadges: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', justifyContent: 'center' },
  badge:    { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1 },
  dot:      { width: 7, height: 7, borderRadius: 4 },
  badgeText:{ fontSize: 12, fontWeight: '700' },

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
  },
  infoRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: C.gray200,
  },
  infoLabel: { fontSize: 13, fontWeight: '600', color: C.gray500, width: 120 },
  infoValue: { fontSize: 13, color: C.gray900, flex: 1, textAlign: 'right', fontWeight: '500' },

  // Qty display
  qtyDisplay: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: C.gray50, borderRadius: 16,
    padding: 18, marginBottom: 24,
    borderWidth: 1, borderColor: C.gray200,
  },
  qtyValue: { fontSize: 22, fontWeight: '800', color: C.gray900 },
  qtyHint:  { fontSize: 12, color: C.gray400, marginTop: 4 },
  editIcon: {
    width: 40, height: 40, borderRadius: 10,
    backgroundColor: C.gray100,
    alignItems: 'center', justifyContent: 'center',
  },

  // Edit card
  editCard: {
    backgroundColor: C.gray50, borderRadius: 16,
    padding: 16, marginBottom: 24,
    borderWidth: 1.5, borderColor: C.green,
  },
  qtyInput: {
    borderWidth: 1, borderColor: C.gray200,
    borderRadius: 12, padding: 14,
    fontSize: 16, color: C.gray900,
    backgroundColor: C.white, marginBottom: 12,
  },
  editBtns: { flexDirection: 'row', gap: 10 },
  saveBtn: {
    flex: 1, backgroundColor: C.green,
    borderRadius: 12, paddingVertical: 13,
    alignItems: 'center',
  },
  saveBtnText:  { color: C.white, fontWeight: '700', fontSize: 15 },
  cancelBtn: {
    paddingHorizontal: 16, paddingVertical: 13,
    borderRadius: 12, backgroundColor: C.gray100,
    alignItems: 'center',
  },
  cancelBtnText: { color: C.gray600, fontWeight: '600', fontSize: 14 },

  // Status toggle buttons
  outOfStockBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: C.redLight, borderRadius: 16,
    padding: 16, marginBottom: 12,
    borderWidth: 1, borderColor: C.redBorder,
  },
  outOfStockLabel: { fontSize: 15, fontWeight: '700', color: C.red },
  outOfStockSub:   { fontSize: 12, color: '#F87171', marginTop: 2 },

  backInStockBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: C.greenPale, borderRadius: 16,
    padding: 16, marginBottom: 12,
    borderWidth: 1, borderColor: C.greenBorder,
  },
  backInStockLabel: { fontSize: 15, fontWeight: '700', color: C.green },
  backInStockSub:   { fontSize: 12, color: C.green, opacity: 0.7, marginTop: 2 },

  // Not found
  notFoundText: { fontSize: 16, color: C.gray500, textAlign: 'center', marginBottom: 20 },
  backPill: {
    backgroundColor: C.gray100, borderRadius: 20,
    paddingHorizontal: 20, paddingVertical: 10,
  },
  backPillText: { fontSize: 14, fontWeight: '600', color: C.gray700 },
});
