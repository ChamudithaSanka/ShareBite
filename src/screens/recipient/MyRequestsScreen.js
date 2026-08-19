import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator, FlatList, StyleSheet, Text,
  TouchableOpacity, View,
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { subscribeToRecipientRequests } from '../../services/requestService';

const C = {
  green: '#1A7A4A',
  greenLight: '#E8F5EE',
  amber: '#D97706',
  amberLight: '#FEF3C7',
  blue: '#2563EB',
  blueLight: '#EFF6FF',
  coral: '#E05A2B',
  gray100: '#F3F4F6',
  gray200: '#E5E7EB',
  gray400: '#9CA3AF',
  gray500: '#6B7280',
  gray700: '#374151',
  gray900: '#111827',
  white: '#FFFFFF',
};

const STATUS_CONFIG = {
  pending:   { color: 'amber',  label: 'Pending' },
  completed: { color: 'green',  label: 'Completed' },
  approved:  { color: 'blue',   label: 'Approved' },
  on_the_way:{ color: 'blue',   label: 'On the Way' },
};

function Badge({ status }) {
  const cfg = STATUS_CONFIG[status] || { color: 'gray', label: status };
  const bg = cfg.color === 'green' ? C.greenLight
    : cfg.color === 'amber' ? C.amberLight
    : cfg.color === 'blue' ? C.blueLight : C.gray100;
  const textColor = cfg.color === 'green' ? C.green
    : cfg.color === 'amber' ? C.amber
    : cfg.color === 'blue' ? C.blue : C.gray500;
  return (
    <View style={[styles.badge, { backgroundColor: bg }]}>
      <Text style={[styles.badgeText, { color: textColor }]}>{cfg.label}</Text>
    </View>
  );
}

export default function MyRequestsScreen({ navigation }) {
  const { user } = useAuth();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => subscribeToRecipientRequests(
    user?.uid,
    (data) => { setRequests(data); setLoading(false); },
    () => { setError('Unable to load your requests.'); setLoading(false); },
  ), [user?.uid]);

  return (
    <View style={styles.screen}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Requests</Text>
      </View>

      {loading && <ActivityIndicator color={C.green} style={{ marginTop: 28 }} />}
      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      <FlatList
        data={requests}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={!loading ? (
          <Text style={styles.emptyText}>You haven't submitted any requests yet.</Text>
        ) : null}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.card}
            onPress={() => navigation.navigate('RequestDetail', { request: item })}
            activeOpacity={0.8}
          >
            <View style={styles.cardInner}>
              {/* Emoji icon */}
              <View style={styles.cardIcon}>
                <Text style={{ fontSize: 22 }}>🍱</Text>
              </View>

              {/* Info */}
              <View style={{ flex: 1 }}>
                <View style={styles.cardTopRow}>
                  <Text style={styles.cardTitle} numberOfLines={1}>
                    {item.foodName || `Request ${item.id.slice(0, 6)}`}
                  </Text>
                  <Badge status={(item.status || 'pending').toLowerCase().replace(/ /g, '_')} />
                </View>
                <Text style={styles.cardSub}>
                  {item.quantity || '—'}
                  {item.deliveryAddress ? `  ·  ${item.deliveryAddress.split(',')[0]}` : ''}
                </Text>
              </View>
            </View>

            {/* Volunteer chip if assigned */}
            {item.volunteerName ? (
              <View style={styles.volunteerChip}>
                <Text style={{ fontSize: 14 }}>🚴</Text>
                <Text style={styles.volunteerText}>{item.volunteerName} is on the way</Text>
              </View>
            ) : null}
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.white },
  header: {
    padding: 20, paddingBottom: 14,
    borderBottomWidth: 1, borderBottomColor: C.gray100,
    backgroundColor: C.white,
  },
  headerTitle: { fontSize: 20, fontWeight: '700', color: C.gray900 },
  list: { padding: 20, paddingBottom: 24 },
  card: {
    backgroundColor: C.white, borderRadius: 16,
    borderWidth: 1, borderColor: C.gray200, marginBottom: 12, overflow: 'hidden',
  },
  cardInner: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
  cardIcon: {
    width: 48, height: 48, borderRadius: 12,
    backgroundColor: C.greenLight, alignItems: 'center', justifyContent: 'center',
  },
  cardTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 2 },
  cardTitle: { fontSize: 14, fontWeight: '700', color: C.gray900, flex: 1, marginRight: 6 },
  cardSub: { fontSize: 12, color: C.gray500, marginTop: 2 },
  badge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 20 },
  badgeText: { fontSize: 11, fontWeight: '700' },
  volunteerChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    margin: 10, marginTop: 0, padding: 8, backgroundColor: C.blueLight, borderRadius: 10,
  },
  volunteerText: { fontSize: 12, fontWeight: '600', color: C.blue },
  errorText: { color: C.coral, textAlign: 'center', marginTop: 24, fontSize: 13 },
  emptyText: { color: C.gray500, textAlign: 'center', marginTop: 40, fontSize: 14 },
});
