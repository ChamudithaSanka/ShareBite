import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Platform,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { subscribeToInventory } from '../../services/inventoryService';

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
  gray400:     '#9CA3AF',
  gray500:     '#6B7280',
  gray600:     '#4B5563',
  gray700:     '#374151',
  gray900:     '#111827',
  white:       '#FFFFFF',
};

// ─── Expiry helpers ───────────────────────────────────────────────────────────
function getExpiry(expiry) {
  if (!expiry) return { label: 'No expiry', color: C.gray500, bg: C.gray100, border: C.gray200 };
  const diff = Math.ceil((new Date(expiry) - new Date()) / 86_400_000);
  if (diff < 0)   return { label: 'Expired',            color: C.red,   bg: C.redLight,   border: C.redBorder };
  if (diff === 0) return { label: 'Expires today',      color: C.red,   bg: C.redLight,   border: C.redBorder };
  if (diff <= 3)  return { label: `${diff}d left`,      color: C.amber, bg: C.amberLight, border: C.amberBorder };
  if (diff <= 7)  return { label: `${diff}d left`,      color: C.amber, bg: '#FFFBF0',    border: C.amberBorder };
  return           { label: `${diff}d left`,            color: C.green, bg: C.greenPale,  border: C.greenBorder };
}

// ─── Filter tabs ──────────────────────────────────────────────────────────────
const FILTERS = [
  { key: 'all',          label: 'All Items' },
  { key: 'available',    label: 'In Stock' },
  { key: 'out_of_stock', label: 'Out of Stock' },
];

// ─── Inventory card ───────────────────────────────────────────────────────────
function InventoryCard({ item, onPress }) {
  const expiry      = getExpiry(item.expiry);
  const isAvailable = item.status === 'available';

  return (
    <TouchableOpacity style={s.card} onPress={onPress} activeOpacity={0.8}>
      {/* Left accent bar — green = in stock, red = out of stock */}
      <View style={[s.cardBar, { backgroundColor: isAvailable ? C.green : C.red }]} />

      <View style={s.cardBody}>
        {/* Top row */}
        <View style={s.cardTop}>
          <View style={[s.iconWrap, { backgroundColor: isAvailable ? C.greenLight : C.gray100 }]}>
            <Text style={{ fontSize: 24 }}>🏪</Text>
          </View>
          <View style={s.cardMeta}>
            <Text style={s.cardName} numberOfLines={1}>
              {item.foodName || 'Unknown item'}
            </Text>
            <Text style={s.cardLocation}>📍 {item.location || 'Storage'}</Text>
          </View>
          {/* Status badge */}
          <View style={[s.statusBadge, {
            backgroundColor: isAvailable ? C.greenLight : C.gray100,
            borderColor:     isAvailable ? C.greenBorder : C.gray200,
          }]}>
            <View style={[s.dot, { backgroundColor: isAvailable ? C.green : C.gray400 }]} />
            <Text style={[s.statusText, { color: isAvailable ? C.green : C.gray500 }]}>
              {isAvailable ? 'In Stock' : 'Out'}
            </Text>
          </View>
        </View>

        {/* Bottom row — quantity + expiry */}
        <View style={s.cardBottom}>
          <View style={s.qtyPill}>
            <Text style={s.qtyText}>📦 {item.quantity || '—'}</Text>
          </View>
          <View style={[s.expiryPill, { backgroundColor: expiry.bg, borderColor: expiry.border }]}>
            <Text style={[s.expiryText, { color: expiry.color }]}>⏱ {expiry.label}</Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────
export default function InventoryScreen() {
  const navigation = useNavigation();
  const [items,   setItems]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');
  const [filter,  setFilter]  = useState('all');

  useEffect(() => {
    const unsub = subscribeToInventory(
      (data) => { setItems(data); setLoading(false); },
      ()     => { setError('Unable to load inventory.'); setLoading(false); },
    );
    return unsub;
  }, []);

  const visible = filter === 'all' ? items : items.filter((i) => i.status === filter);

  const inStock    = items.filter((i) => i.status === 'available').length;
  const outOfStock = items.filter((i) => i.status !== 'available').length;

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={C.white} />

      {/* ── Header ── */}
      <View style={s.header}>
        <View style={s.headerTop}>
          <Text style={s.title}>Inventory</Text>
          {!loading && (
            <View style={s.countPill}>
              <Text style={s.countText}>{items.length} items</Text>
            </View>
          )}
        </View>

        {/* Mini stats */}
        {!loading && items.length > 0 && (
          <View style={s.miniStats}>
            <View style={[s.miniStat, { backgroundColor: C.greenPale }]}>
              <Text style={[s.miniStatNum, { color: C.green }]}>{inStock}</Text>
              <Text style={s.miniStatLabel}>In Stock</Text>
            </View>
            <View style={[s.miniStat, { backgroundColor: C.redLight }]}>
              <Text style={[s.miniStatNum, { color: C.red }]}>{outOfStock}</Text>
              <Text style={s.miniStatLabel}>Out of Stock</Text>
            </View>
          </View>
        )}

        {/* Filter pills */}
        <View style={s.filterRow}>
          {FILTERS.map((f) => (
            <TouchableOpacity
              key={f.key}
              style={[s.filterPill, filter === f.key && s.filterPillActive]}
              onPress={() => setFilter(f.key)}
            >
              <Text style={[s.filterText, filter === f.key && s.filterTextActive]}>
                {f.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* ── Content ── */}
      {loading ? (
        <ActivityIndicator color={C.green} style={{ marginTop: 48 }} size="large" />
      ) : error ? (
        <View style={s.errorWrap}>
          <Text style={s.errorText}>⚠ {error}</Text>
        </View>
      ) : (
        <FlatList
          data={visible}
          keyExtractor={(item) => item.id}
          contentContainerStyle={s.list}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={(
            <View style={s.empty}>
              <Text style={{ fontSize: 44, marginBottom: 12 }}>📭</Text>
              <Text style={s.emptyTitle}>No items found</Text>
              <Text style={s.emptySub}>
                {filter === 'all'
                  ? 'No food has been added to storage yet.'
                  : 'No items match this filter.'}
              </Text>
            </View>
          )}
          renderItem={({ item }) => (
            <InventoryCard
              item={item}
              onPress={() => navigation.navigate('InventoryDetail', { item })}
            />
          )}
        />
      )}
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.white },

  // Header
  header: {
    paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12,
    borderBottomWidth: 1, borderBottomColor: C.gray100,
  },
  headerTop: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 14,
  },
  title: { fontSize: 22, fontWeight: '800', color: C.gray900, letterSpacing: -0.3 },
  countPill: {
    backgroundColor: C.gray100, borderRadius: 20,
    paddingHorizontal: 12, paddingVertical: 5,
  },
  countText: { fontSize: 13, fontWeight: '700', color: C.gray600 },

  // Mini stats
  miniStats: { flexDirection: 'row', gap: 10, marginBottom: 14 },
  miniStat: {
    flex: 1, borderRadius: 12, padding: 12,
    alignItems: 'center',
  },
  miniStatNum:   { fontSize: 22, fontWeight: '800', letterSpacing: -0.5 },
  miniStatLabel: { fontSize: 11, fontWeight: '600', color: C.gray500, marginTop: 2, textTransform: 'uppercase', letterSpacing: 0.4 },

  // Filters
  filterRow: { flexDirection: 'row', gap: 8 },
  filterPill: {
    paddingVertical: 8, paddingHorizontal: 14,
    borderRadius: 20, backgroundColor: C.gray100,
    borderWidth: 1, borderColor: C.gray200,
  },
  filterPillActive: { backgroundColor: C.green, borderColor: C.green },
  filterText:       { fontSize: 13, fontWeight: '600', color: C.gray600 },
  filterTextActive: { color: C.white },

  // List
  list: { padding: 20, paddingBottom: 48 },

  // Card
  card: {
    flexDirection: 'row',
    backgroundColor: C.gray50,
    borderRadius: 18, borderWidth: 1, borderColor: C.gray200,
    marginBottom: 12, overflow: 'hidden',
    ...Platform.select({
      ios:     { shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 10, shadowOffset: { width: 0, height: 3 } },
      android: { elevation: 2 },
    }),
  },
  cardBar:  { width: 4 },
  cardBody: { flex: 1, padding: 14 },

  cardTop: {
    flexDirection: 'row', alignItems: 'center',
    gap: 10, marginBottom: 10,
  },
  iconWrap: {
    width: 48, height: 48, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
  },
  cardMeta:     { flex: 1 },
  cardName:     { fontSize: 15, fontWeight: '700', color: C.gray900 },
  cardLocation: { fontSize: 12, color: C.gray500, marginTop: 3 },

  statusBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: 20, borderWidth: 1,
  },
  dot:        { width: 7, height: 7, borderRadius: 4 },
  statusText: { fontSize: 11, fontWeight: '700' },

  cardBottom: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  qtyPill: {
    backgroundColor: C.white, borderRadius: 20,
    paddingHorizontal: 10, paddingVertical: 5,
    borderWidth: 1, borderColor: C.gray200,
  },
  qtyText: { fontSize: 12, color: C.gray700, fontWeight: '500' },
  expiryPill: {
    borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5,
    borderWidth: 1,
  },
  expiryText: { fontSize: 12, fontWeight: '600' },

  // Empty / error
  empty:     { alignItems: 'center', paddingTop: 60, paddingHorizontal: 32 },
  emptyTitle:{ fontSize: 20, fontWeight: '800', color: C.gray900, marginBottom: 8 },
  emptySub:  { fontSize: 14, color: C.gray500, textAlign: 'center', lineHeight: 20 },
  errorWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  errorText: { fontSize: 15, color: C.red, textAlign: 'center' },
});
