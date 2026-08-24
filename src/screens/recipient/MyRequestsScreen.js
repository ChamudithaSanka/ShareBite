import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../context/AuthContext';
import { subscribeToRecipientRequests } from '../../services/requestService';

const C = {
  green: '#1A7A4A',
  greenLight: '#E8F5EE',
  greenPale: '#F0FAF4',
  greenMid: '#2E9D61',
  amber: '#D97706',
  amberLight: '#FEF3C7',
  blue: '#2563EB',
  blueLight: '#EFF6FF',
  coral: '#E05A2B',
  coralLight: '#FDE8E4',
  gray50: '#F9FAFB',
  gray100: '#F3F4F6',
  gray200: '#E5E7EB',
  gray400: '#9CA3AF',
  gray500: '#6B7280',
  gray700: '#374151',
  gray800: '#1F2937',
  gray900: '#111827',
  white: '#FFFFFF',
};

const STATUS_CONFIG = {
  pending: { label: 'Pending', color: C.amber, bg: C.amberLight, icon: '⏳' },
  assigned: { label: 'Assigned', color: C.blue, bg: C.blueLight, icon: '🚴' },
  picked_up: { label: 'Picked up', color: C.blue, bg: C.blueLight, icon: '📦' },
  in_transit: { label: 'On the way', color: C.blue, bg: C.blueLight, icon: '🚴' },
  at_recipient: { label: 'Arrived', color: C.greenMid, bg: C.greenLight, icon: '📍' },
  delivered: { label: 'Delivered', color: C.green, bg: C.greenLight, icon: '✓' },
  completed: { label: 'Completed', color: C.green, bg: C.greenLight, icon: '✓' },
  cancelled: { label: 'Cancelled', color: C.coral, bg: C.coralLight, icon: '✕' },
};

const FOOD_EMOJI = {
  'cooked meal': '🍱',
  produce: '🥦',
  'canned goods': '🥫',
  bakery: '🍞',
  dairy: '🥛',
  other: '🍽️',
};

const FILTERS = ['All', 'Active', 'Completed'];

function getEmoji(item) {
  return FOOD_EMOJI[(item.category || '').toLowerCase()] || '🍱';
}

function StatusBadge({ status }) {
  const normalized = (status || 'pending').toLowerCase().replace(/\s+/g, '_');
  const cfg = STATUS_CONFIG[normalized] || {
    label: status || 'Pending',
    color: C.gray700,
    bg: C.gray100,
    icon: '•',
  };

  return (
    <View style={[styles.badge, { backgroundColor: cfg.bg }]}>
      <Text style={[styles.badgeText, { color: cfg.color }]}>
        {cfg.icon} {cfg.label}
      </Text>
    </View>
  );
}

function formatDate(timestamp) {
  if (!timestamp) return '';
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  if (isNaN(date.getTime())) return '';
  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  });
}

export default function MyRequestsScreen({ navigation }) {
  const { user } = useAuth();
  const [requests, setRequests] = useState([]);
  const [filter, setFilter] = useState('All');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    return subscribeToRecipientRequests(
      user?.uid,
      (data) => {
        const sorted = data.sort((a, b) => {
          const aTime = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : 0;
          const bTime = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : 0;
          return bTime - aTime;
        });
        setRequests(sorted);
        setLoading(false);
      },
      () => {
        setError('Unable to load your requests.');
        setLoading(false);
      },
    );
  }, [user?.uid]);

  const filteredRequests = requests.filter((r) => {
    const status = (r.status || 'pending').toLowerCase();
    if (filter === 'Active') {
      return status !== 'completed' && status !== 'delivered' && status !== 'cancelled';
    }
    if (filter === 'Completed') {
      return status === 'completed' || status === 'delivered';
    }
    return true;
  });

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerEyebrow}>YOUR ORDERS</Text>
          <Text style={styles.headerTitle}>My Requests</Text>
        </View>
        <View style={styles.countBadge}>
          <Text style={styles.countBadgeText}>{requests.length}</Text>
        </View>
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterRow}>
        {FILTERS.map((f) => (
          <TouchableOpacity
            key={f}
            style={[styles.filterChip, filter === f && styles.filterChipActive]}
            onPress={() => setFilter(f)}
            activeOpacity={0.7}
          >
            <Text style={[styles.filterChipText, filter === f && styles.filterChipTextActive]}>
              {f}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator color={C.green} size="large" />
          <Text style={styles.loadingText}>Loading your requests...</Text>
        </View>
      )}

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      <FlatList
        data={filteredRequests}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          !loading ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyEmoji}>🍽️</Text>
              <Text style={styles.emptyTitle}>
                {filter === 'All' ? 'No food requests yet' : `No ${filter.toLowerCase()} requests`}
              </Text>
              <Text style={styles.emptySub}>
                When you request surplus food from donors, track the pickup and delivery status here.
              </Text>
              <TouchableOpacity
                style={styles.browseButton}
                onPress={() => navigation.navigate('Browse')}
              >
                <Text style={styles.browseButtonText}>Browse available food</Text>
              </TouchableOpacity>
            </View>
          ) : null
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.card}
            onPress={() => navigation.navigate('RequestDetail', { request: item })}
            activeOpacity={0.85}
          >
            <View style={styles.cardMain}>
              {/* Photo or Emoji Banner */}
              <View style={styles.imageContainer}>
                {item.photoUrl ? (
                  <Image source={{ uri: item.photoUrl }} style={styles.foodImage} />
                ) : (
                  <View style={styles.emojiPlaceholder}>
                    <Text style={styles.emojiText}>{getEmoji(item)}</Text>
                  </View>
                )}
              </View>

              {/* Content Details */}
              <View style={styles.cardDetails}>
                <View style={styles.cardHeaderRow}>
                  <Text style={styles.foodTitle} numberOfLines={1}>
                    {item.foodName || `Food Request #${item.id.slice(0, 5)}`}
                  </Text>
                  <StatusBadge status={item.status} />
                </View>

                {/* Meta details */}
                <View style={styles.metaRow}>
                  <View style={styles.qtyTag}>
                    <Text style={styles.qtyTagText}>{item.quantity || '1 portion'}</Text>
                  </View>
                  {item.createdAt ? (
                    <Text style={styles.dateText}>{formatDate(item.createdAt)}</Text>
                  ) : null}
                </View>

                {/* Delivery address snippet */}
                {item.deliveryAddress ? (
                  <View style={styles.addressRow}>
                    <Text style={styles.addressIcon}>📍</Text>
                    <Text style={styles.addressText} numberOfLines={1}>
                      {item.deliveryAddress}
                    </Text>
                  </View>
                ) : null}
              </View>
            </View>

            {/* Volunteer Assigned Footer */}
            {item.volunteerName ? (
              <View style={styles.volunteerFooter}>
                <View style={styles.volunteerAvatar}>
                  <Text style={{ fontSize: 13 }}>🚴</Text>
                </View>
                <Text style={styles.volunteerInfo} numberOfLines={1}>
                  <Text style={{ fontWeight: '700' }}>{item.volunteerName}</Text> is handling your delivery
                </Text>
                <Text style={styles.trackArrow}>→</Text>
              </View>
            ) : null}
          </TouchableOpacity>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.gray50 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 14,
    backgroundColor: C.white,
    borderBottomWidth: 1,
    borderBottomColor: C.gray100,
  },
  headerEyebrow: {
    fontSize: 11,
    fontWeight: '800',
    color: C.green,
    letterSpacing: 1.2,
    marginBottom: 2,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: C.gray900,
    letterSpacing: -0.5,
  },
  countBadge: {
    backgroundColor: C.greenLight,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 14,
  },
  countBadgeText: {
    color: C.green,
    fontWeight: '800',
    fontSize: 13,
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: C.white,
    borderBottomWidth: 1,
    borderBottomColor: C.gray100,
  },
  filterChip: {
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: C.gray100,
  },
  filterChipActive: {
    backgroundColor: C.green,
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: '700',
    color: C.gray600,
  },
  filterChipTextActive: {
    color: C.white,
  },
  loadingContainer: {
    alignItems: 'center',
    marginTop: 40,
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: C.gray500,
    fontWeight: '500',
  },
  list: {
    padding: 16,
    paddingBottom: 32,
  },
  card: {
    backgroundColor: C.white,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: C.gray200,
    marginBottom: 14,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1.5,
  },
  cardMain: {
    flexDirection: 'row',
    padding: 14,
    gap: 14,
    alignItems: 'center',
  },
  imageContainer: {
    width: 72,
    height: 72,
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: C.greenPale,
  },
  foodImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  emojiPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emojiText: {
    fontSize: 32,
  },
  cardDetails: {
    flex: 1,
    justifyContent: 'center',
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 6,
  },
  foodTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: C.gray900,
    flex: 1,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    alignSelf: 'flex-start',
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  qtyTag: {
    backgroundColor: C.gray100,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  qtyTagText: {
    fontSize: 12,
    fontWeight: '700',
    color: C.gray700,
  },
  dateText: {
    fontSize: 12,
    color: C.gray400,
    fontWeight: '500',
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  addressIcon: {
    fontSize: 12,
  },
  addressText: {
    fontSize: 12,
    color: C.gray500,
    flex: 1,
  },
  volunteerFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: C.blueLight,
    borderTopWidth: 1,
    borderTopColor: '#DBEAFE',
    gap: 8,
  },
  volunteerAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#BFDBFE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  volunteerInfo: {
    flex: 1,
    fontSize: 12,
    color: C.blue,
  },
  trackArrow: {
    fontSize: 14,
    fontWeight: '700',
    color: C.blue,
  },
  emptyCard: {
    alignItems: 'center',
    padding: 32,
    backgroundColor: C.white,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: C.gray200,
    marginTop: 20,
  },
  emptyEmoji: {
    fontSize: 50,
    marginBottom: 14,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: C.gray900,
    marginBottom: 6,
  },
  emptySub: {
    fontSize: 13,
    color: C.gray500,
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: 20,
  },
  browseButton: {
    backgroundColor: C.green,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 22,
  },
  browseButtonText: {
    color: C.white,
    fontWeight: '700',
    fontSize: 14,
  },
  errorText: {
    color: C.coral,
    textAlign: 'center',
    marginTop: 24,
    fontSize: 13,
  },
});
