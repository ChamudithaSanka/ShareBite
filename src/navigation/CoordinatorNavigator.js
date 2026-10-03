import React, { useEffect, useRef } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import AnimatedTabIcon from '../components/AnimatedTabIcon';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { subscribeToPendingDonations, subscribeToPendingRequests } from '../services/coordinatorService';
import {
  configureLocalNotifications,
  notifyCoordinatorForQueueItem,
} from '../services/notificationService';

// Screens
import CoordinatorHomeScreen from '../screens/coordinator/CoordinatorHomeScreen';
import ReviewDonationsScreen from '../screens/coordinator/ReviewDonationsScreen';
import DonationReviewDetailScreen from '../screens/coordinator/DonationReviewDetailScreen';
import InventoryScreen from '../screens/coordinator/InventoryScreen';
import InventoryDetailScreen from '../screens/coordinator/InventoryDetailScreen';
import RequestApprovalScreen from '../screens/coordinator/RequestApprovalScreen';
import RequestDetailScreen from '../screens/coordinator/RequestDetailScreen';
import ProfileScreen from '../screens/shared/ProfileScreen';
import CoordinatorNotificationSettingsScreen from '../screens/coordinator/CoordinatorNotificationSettingsScreen';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();
const ProfileStack = createStackNavigator();

const ICONS = {
  Home: '🏠',
  Donations: '📦',
  Inventory: '📊',
  Requests: '📋',
  Profile: '👤',
};

const TabIcon = ({ label, focused }) => (
  <AnimatedTabIcon
    focused={focused}
    icon={ICONS[label] ?? '•'}
  />
);

// ─── Donations tab stack ────────────────────────────────────────────────────
function DonationsStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="ReviewDonationsList" component={ReviewDonationsScreen} />
      <Stack.Screen name="DonationReviewDetail" component={DonationReviewDetailScreen} />
    </Stack.Navigator>
  );
}

// ─── Inventory tab stack ────────────────────────────────────────────────────
function InventoryStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="InventoryList" component={InventoryScreen} />
      <Stack.Screen name="InventoryDetail" component={InventoryDetailScreen} />
    </Stack.Navigator>
  );
}

// ─── Requests tab stack ─────────────────────────────────────────────────────
function RequestsStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="RequestApprovalList" component={RequestApprovalScreen} />
      <Stack.Screen name="RequestDetail" component={RequestDetailScreen} />
    </Stack.Navigator>
  );
}

function CoordinatorProfileStack() {
  return (
    <ProfileStack.Navigator screenOptions={{ headerShown: false }}>
      <ProfileStack.Screen name="ProfileHome" component={ProfileScreen} />
      <ProfileStack.Screen name="CoordinatorNotifications" component={CoordinatorNotificationSettingsScreen} />
    </ProfileStack.Navigator>
  );
}

// ─── Root tab navigator ─────────────────────────────────────────────────────
export default function CoordinatorNavigator() {
  const { user, userProfile } = useAuth();
  const { colors, isDark } = useTheme();
  const userRole = String(userProfile?.role || userProfile?.Role || '').trim().toLowerCase();
  const notificationPreferences = userProfile?.notificationPreferences || {};
  const notificationsReadyRef = useRef(false);
  const previousDonationsRef = useRef(null);
  const previousRequestsRef = useRef(null);

  useEffect(() => {
    if (userRole !== 'coordinator' || !user?.uid) {
      notificationsReadyRef.current = false;
      previousDonationsRef.current = null;
      previousRequestsRef.current = null;
      return undefined;
    }

    let active = true;
    configureLocalNotifications()
      .then((ready) => { if (active) notificationsReadyRef.current = ready; })
      .catch(() => {});

    return () => {
      active = false;
      notificationsReadyRef.current = false;
      previousDonationsRef.current = null;
      previousRequestsRef.current = null;
    };
  }, [user?.uid, userRole]);

  useEffect(() => {
    if (userRole !== 'coordinator' || !user?.uid) return undefined;

    const unsubscribeDonations = subscribeToPendingDonations(
      (donations) => {
        const previous = previousDonationsRef.current;
        previousDonationsRef.current = donations;
        if (!notificationsReadyRef.current || !previous) return;
        const previousIds = new Set(previous.map((donation) => donation.id));
        donations.forEach((donation) => {
          if (!previousIds.has(donation.id)) {
            notifyCoordinatorForQueueItem('donation', donation, notificationPreferences).catch(() => {});
          }
        });
      },
      () => {},
    );
    const unsubscribeRequests = subscribeToPendingRequests(
      (requests) => {
        const previous = previousRequestsRef.current;
        previousRequestsRef.current = requests;
        if (!notificationsReadyRef.current || !previous) return;
        const previousIds = new Set(previous.map((request) => request.id));
        requests.forEach((request) => {
          if (!previousIds.has(request.id)) {
            notifyCoordinatorForQueueItem('request', request, notificationPreferences).catch(() => {});
          }
        });
      },
      () => {},
    );

    return () => {
      unsubscribeDonations();
      unsubscribeRequests();
      previousDonationsRef.current = null;
      previousRequestsRef.current = null;
    };
  }, [
    user?.uid,
    userRole,
    notificationPreferences.coordinatorPendingDonations,
    notificationPreferences.coordinatorPendingRequests,
  ]);

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        animation: 'fade',
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarStyle: {
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 16,
          marginHorizontal: 16,
          height: 68,
          borderTopWidth: 0,
          borderWidth: isDark ? 2 : 1,
          borderColor: isDark ? '#72D69A' : colors.border,
          borderRadius: 50,
          paddingBottom: 8,
          paddingTop: 8,
          backgroundColor: colors.surface,
          shadowColor: isDark ? '#72D69A' : '#000000',
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: isDark ? 0.28 : 0.12,
          shadowRadius: isDark ? 14 : 12,
          elevation: 8,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
        },
        tabBarIcon: ({ focused }) => (
          <TabIcon label={route.name} focused={focused} />
        ),
      })}
    >
      <Tab.Screen name="Home" component={CoordinatorHomeScreen} />
      <Tab.Screen name="Donations" component={DonationsStack} />
      <Tab.Screen name="Inventory" component={InventoryStack} />
      <Tab.Screen name="Requests" component={RequestsStack} />
      <Tab.Screen name="Profile" component={CoordinatorProfileStack} />
    </Tab.Navigator>
  );
}
