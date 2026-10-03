import React, { useEffect, useState } from 'react';
import {
  Platform,
  StyleSheet,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import {
  ThemedActivityIndicator as ActivityIndicator,
  ThemedSafeAreaView as SafeAreaView,
  ThemedScrollView as ScrollView,
  ThemedStatusBar as StatusBar,
  ThemedText as Text,
  ThemedTouchableOpacity as TouchableOpacity,
  ThemedView as View,
} from '../../components/ThemedPrimitives';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useTabBarContentPadding } from '../../hooks';
import RoleGreeting from '../../components/RoleGreeting';
import {
  subscribeToPendingDonations,
  subscribeToPendingRequests,
} from '../../services/coordinatorService';
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
  blue:        '#2563EB',
  blueLight:   '#EFF6FF',
  blueBorder:  '#BFDBFE',
  gray50:      '#F9FAFB',
  gray100:     '#F3F4F6',
  gray200:     '#E5E7EB',
  gray400:     '#9CA3AF',
  gray500:     '#6B7280',
  gray600:     '#4B5563',
  gray700:     '#374151',
  gray900:     '#111827',
  white:       '#FFFFFF',
  red:         '#EF4444',
};

// ─── Subcomponents ────────────────────────────────────────────────────────────
function StatCard({ emoji, value, label, color, borderColor, bg, onPress, loading }) {
  return (
    <TouchableOpacity
      style={[s.statCard, { backgroundColor: bg, borderColor }]}
      onPress={onPress}
      activeOpacity={0.75}
    >
      <Text style={s.statEmoji}>{emoji}</Text>
      <Text style={[s.statValue, { color }]}>
        {loading ? '—' : value}
      </Text>
      <Text style={s.statLabel}>{label}</Text>
    </TouchableOpacity>
  );
}

function ActionRow({ emoji, bg, title, sub, onPress }) {
  return (
    <TouchableOpacity style={s.actionRow} onPress={onPress} activeOpacity={0.8}>
      <View style={[s.actionIcon, { backgroundColor: bg }]}>
        <Text style={{ fontSize: 20 }}>{emoji}</Text>
      </View>
      <View style={s.actionMeta}>
        <Text style={s.actionTitle}>{title}</Text>
        <Text style={s.actionSub}>{sub}</Text>
      </View>
      <Text style={s.actionArrow}>›</Text>
    </TouchableOpacity>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────
export default function CoordinatorHomeScreen() {
  const navigation = useNavigation();
  const { userProfile } = useAuth();
  const { colors } = useTheme();
  const tabBarContentPadding = useTabBarContentPadding();

  const [counts,  setCounts]  = useState({ pending: 0, inventory: 0, requests: 0 });
  const [loading, setLoading] = useState(true);
  const [countsError, setCountsError] = useState('');

  useEffect(() => {
    let active = true;
    const loadedSources = new Set();
    const setCount = (source, key, value) => {
      if (!active) return;
      loadedSources.add(source);
      setCounts((current) => ({ ...current, [key]: value }));
      if (loadedSources.size === 3) setLoading(false);
    };
    const setSourceError = (source) => {
      if (!active) return;
      loadedSources.add(source);
      setCountsError('Some dashboard counts could not be loaded.');
      if (loadedSources.size === 3) setLoading(false);
    };

    const unsubscribeDonations = subscribeToPendingDonations(
      (items) => setCount('donations', 'pending', items.length),
      () => setSourceError('donations'),
    );
    const unsubscribeInventory = subscribeToInventory(
      (items) => setCount('inventory', 'inventory', items.filter((item) => item.status === 'available').length),
      () => setSourceError('inventory'),
    );
    const unsubscribeRequests = subscribeToPendingRequests(
      (items) => setCount('requests', 'requests', items.length),
      () => setSourceError('requests'),
    );

    return () => {
      active = false;
      unsubscribeDonations();
      unsubscribeInventory();
      unsubscribeRequests();
    };
  }, []);

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={C.white} />
      <ScrollView
        style={s.scroll}
        contentContainerStyle={[s.content, { paddingBottom: tabBarContentPadding }]}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Greeting header ── */}
        <View style={s.greeting}>
          <View>
            <RoleGreeting
              greeting="Good day,"
              name={userProfile?.name}
              fallbackName="Coordinator"
              role="Community Food Coordinator"
              textColor={colors.text}
              secondaryColor={colors.textSecondary}
              accentColor={colors.primary}
            />
          </View>
        </View>

        {/* ── Dashboard banner ── */}
        <View style={s.banner}>
          <Text style={s.bannerTitle}>Dashboard overview</Text>
          <Text style={s.bannerSub}>Tap a card to navigate</Text>
        </View>
        {countsError ? <Text style={s.countsError}>{countsError}</Text> : null}

        {/* ── Stat cards ── */}
        {loading ? (
          <View style={s.loaderRow}>
            <ActivityIndicator size="large" color={C.green} />
          </View>
        ) : (
          <View style={s.statsRow}>
            <StatCard
              emoji="📦" value={counts.pending}   label="Pending"
              color={C.amber}  bg={C.amberLight}  borderColor={C.amberBorder}
              onPress={() => navigation.navigate('Donations')}
              loading={loading}
            />
            <StatCard
              emoji="🏪" value={counts.inventory} label="In Stock"
              color={C.green}  bg={C.greenPale}   borderColor={C.greenBorder}
              onPress={() => navigation.navigate('Inventory')}
              loading={loading}
            />
            <StatCard
              emoji="📋" value={counts.requests}  label="Requests"
              color={C.blue}   bg={C.blueLight}   borderColor={C.blueBorder}
              onPress={() => navigation.navigate('Requests')}
              loading={loading}
            />
          </View>
        )}

        {/* ── Quick actions ── */}
        <Text style={s.sectionLabel}>QUICK ACTIONS</Text>
        <View style={s.actionsCard}>
          <ActionRow
            emoji="📦" bg={C.amberLight}
            title="Review Donations"
            sub="Accept or decline storable donations"
            onPress={() => navigation.navigate('Donations')}
          />
          <View style={s.divider} />
          <ActionRow
            emoji="🏪" bg={C.greenPale}
            title="Manage Inventory"
            sub="View stock levels and expiry dates"
            onPress={() => navigation.navigate('Inventory')}
          />
          <View style={s.divider} />
          <ActionRow
            emoji="📋" bg={C.blueLight}
            title="Approve Requests"
            sub="Review recipient food requests"
            onPress={() => navigation.navigate('Requests')}
          />
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: C.white },
  scroll: { flex: 1 },
  content: { padding: 20, paddingTop: 8, paddingBottom: 48 },

  // Greeting
  greeting: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
    paddingTop: 12,
  },
  greetSub:  { fontSize: 13, color: C.gray500, marginBottom: 2 },
  greetName: { fontSize: 22, fontWeight: '800', color: C.gray900, letterSpacing: -0.3 },
  greetRole: { fontSize: 12, color: C.green, fontWeight: '600', marginTop: 3 },

  // Banner
  banner: {
    backgroundColor: C.green,
    borderRadius: 18,
    padding: 18,
    marginBottom: 20,
  },
  bannerTitle: { fontSize: 15, fontWeight: '700', color: C.white },
  bannerSub:   { fontSize: 13, color: 'rgba(255,255,255,0.75)', marginTop: 3 },
  countsError: { color: C.red, fontSize: 12, marginBottom: 12 },

  // Stats
  loaderRow: { alignItems: 'center', paddingVertical: 24 },
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 24 },
  statCard: {
    flex: 1, borderRadius: 16, padding: 14,
    borderWidth: 1, alignItems: 'center',
    ...Platform.select({
      ios:     { shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, shadowOffset: { width: 0, height: 2 } },
      android: { elevation: 2 },
    }),
  },
  statEmoji: { fontSize: 22, marginBottom: 6 },
  statValue: { fontSize: 28, fontWeight: '800', letterSpacing: -1 },
  statLabel: {
    fontSize: 10, fontWeight: '700', color: C.gray500,
    textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 4, textAlign: 'center',
  },

  // Section label
  sectionLabel: {
    fontSize: 11, fontWeight: '700', color: C.gray400,
    letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 10,
  },

  // Actions card
  actionsCard: {
    backgroundColor: C.gray50,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: C.gray200,
    overflow: 'hidden',
    marginBottom: 28,
    ...Platform.select({
      ios:     { shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, shadowOffset: { width: 0, height: 2 } },
      android: { elevation: 1 },
    }),
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 14,
  },
  actionIcon: {
    width: 42, height: 42, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
  },
  actionMeta: { flex: 1 },
  actionTitle: { fontSize: 15, fontWeight: '700', color: C.gray900 },
  actionSub:   { fontSize: 12, color: C.gray500, marginTop: 2 },
  actionArrow: { fontSize: 22, color: C.gray400 },
  divider: { height: 1, backgroundColor: C.gray200, marginLeft: 72 },

});
