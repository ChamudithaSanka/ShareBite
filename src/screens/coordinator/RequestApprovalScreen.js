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
import { subscribeToPendingRequests } from '../../services/coordinatorService';

// ─── Design tokens ────────────────────────────────────────────────────────────
const C = {
  blue:       '#2563EB',
  blueLight:  '#EFF6FF',
  blueBorder: '#BFDBFE',
  bluePale:   '#F0F7FF',
  gray50:     '#F9FAFB',
  gray100:    '#F3F4F6',
  gray200:    '#E5E7EB',
  gray400:    '#9CA3AF',
  gray500:    '#6B7280',
  gray600:    '#4B5563',
  gray700:    '#374151',
  gray900:    '#111827',
  white:      '#FFFFFF',
  red:        '#E05A2B',
};

// ─── Format Firestore timestamp ───────────────────────────────────────────────
function fmtDate(ts) {
  if (!ts?.toDate) return 'Recently requested';
  return ts.toDate().toLocaleDateString('en-US', {
    month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

// ─── Request card ────────────────────────────────────────────────────────────
function RequestCard({ item, onPress }) {
  return (
    <TouchableOpacity style={s.card} onPress={onPress} activeOpacity={0.8}>
      {/* Colour left bar */}
      <View style={s.cardBar} />

      <View style={s.cardBody}>
        {/* Header row */}
        <View style={s.cardHeader}>
          <View style={s.cardIconWrap}>
            <Text style={{ fontSize: 22 }}>📋</Text>
          </View>
          <View style={s.cardMeta}>
            <Text style={s.cardTitle} numberOfLines={1}>
              {item.foodName || 'Food Request'}
            </Text>
            <Text style={s.cardSub}>
              Requested by {item.recipientName || 'Recipient'}
            </Text>
          </View>
          <View style={s.pendingBadge}>
            <Text style={s.pendingText}>Pending</Text>
          </View>
        </View>

        {/* Info pills */}
        <View style={s.pillRow}>
          <View style={s.pill}>
            <Text style={s.pillText}>📦 {item.quantity || 'Qty —'}</Text>
          </View>
        </View>

        {/* Footer */}
        <View style={s.cardFooter}>
          <Text style={s.cardDate}>🕒 {fmtDate(item.createdAt)}</Text>
          <Text style={s.reviewCta}>Review →</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

// ─── Empty state ──────────────────────────────────────────────────────────────
function EmptyState() {
  return (
    <View style={s.empty}>
      <View style={s.emptyIconWrap}>
        <Text style={{ fontSize: 44 }}>✅</Text>
      </View>
      <Text style={s.emptyTitle}>All caught up!</Text>
      <Text style={s.emptySub}>
        No recipient requests are pending approval right now.
      </Text>
    </View>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────
export default function RequestApprovalScreen() {
  const navigation = useNavigation();
  const [requests, setRequests] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState('');

  useEffect(() => {
    const unsub = subscribeToPendingRequests(
      (data) => { setRequests(data); setLoading(false); },
      ()     => { setError('Unable to load requests.'); setLoading(false); },
    );
    return unsub;
  }, []);

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={C.white} />

      {/* ── Page header ── */}
      <View style={s.pageHeader}>
        <View>
          <Text style={s.pageTitle}>Pending Requests</Text>
          <Text style={s.pageSub}>
            {loading ? 'Loading…' : `${requests.length} request${requests.length !== 1 ? 's' : ''} awaiting approval`}
          </Text>
        </View>
        {/* Live indicator */}
        {!loading && requests.length > 0 && (
          <View style={s.liveBadge}>
            <View style={s.liveDot} />
            <Text style={s.liveText}>Live</Text>
          </View>
        )}
      </View>

      {/* ── List ── */}
      {loading ? (
        <ActivityIndicator color={C.blue} style={{ marginTop: 40 }} size="large" />
      ) : error ? (
        <View style={s.errorWrap}>
          <Text style={s.errorText}>⚠ {error}</Text>
        </View>
      ) : (
        <FlatList
          data={requests}
          keyExtractor={(item) => item.id}
          contentContainerStyle={s.list}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={<EmptyState />}
          renderItem={({ item }) => (
            <RequestCard
              item={item}
              onPress={() => navigation.navigate('RequestDetail', { request: item })}
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
  pageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: C.gray100,
  },
  pageTitle: { fontSize: 22, fontWeight: '800', color: C.gray900, letterSpacing: -0.3 },
  pageSub:   { fontSize: 13, color: C.gray500, marginTop: 3 },
  liveBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: C.blueLight, borderRadius: 20,
    paddingHorizontal: 10, paddingVertical: 5,
    borderWidth: 1, borderColor: C.blueBorder,
  },
  liveDot: {
    width: 7, height: 7, borderRadius: 4,
    backgroundColor: C.blue,
  },
  liveText: { fontSize: 11, fontWeight: '700', color: C.blue },

  // List
  list: { padding: 20, paddingBottom: 40 },

  // Card
  card: {
    flexDirection: 'row',
    backgroundColor: C.bluePale,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: C.blueBorder,
    marginBottom: 14,
    overflow: 'hidden',
    ...Platform.select({
      ios:     { shadowColor: '#000', shadowOpacity: 0.07, shadowRadius: 10, shadowOffset: { width: 0, height: 3 } },
      android: { elevation: 2 },
    }),
  },
  cardBar:  { width: 4, backgroundColor: C.blue },
  cardBody: { flex: 1, padding: 14 },

  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  cardIconWrap: {
    width: 44, height: 44, borderRadius: 12,
    backgroundColor: C.blueLight,
    alignItems: 'center', justifyContent: 'center',
  },
  cardMeta: { flex: 1 },
  cardTitle: { fontSize: 15, fontWeight: '700', color: C.gray900 },
  cardSub:   { fontSize: 12, color: C.gray500, marginTop: 2 },

  pendingBadge: {
    backgroundColor: C.blueLight,
    borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4,
    borderWidth: 1, borderColor: C.blueBorder,
  },
  pendingText: { fontSize: 11, fontWeight: '700', color: C.blue },

  pillRow:   { flexDirection: 'row', gap: 6, flexWrap: 'wrap', marginBottom: 10 },
  pill: {
    backgroundColor: C.white,
    borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5,
    borderWidth: 1, borderColor: C.blueBorder,
  },
  pillText: { fontSize: 12, color: C.gray600, fontWeight: '500' },

  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: C.blueBorder,
    paddingTop: 10,
  },
  cardDate:  { fontSize: 12, color: C.gray400 },
  reviewCta: { fontSize: 13, fontWeight: '700', color: C.blue },

  // Empty
  empty: { alignItems: 'center', paddingTop: 60, paddingHorizontal: 32 },
  emptyIconWrap: {
    width: 88, height: 88, borderRadius: 44,
    backgroundColor: C.blueLight,
    alignItems: 'center', justifyContent: 'center', marginBottom: 20,
  },
  emptyTitle: { fontSize: 20, fontWeight: '800', color: C.gray900, marginBottom: 8 },
  emptySub:   { fontSize: 14, color: C.gray500, textAlign: 'center', lineHeight: 20 },

  // Error
  errorWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  errorText: { fontSize: 15, color: C.red, textAlign: 'center' },
});
