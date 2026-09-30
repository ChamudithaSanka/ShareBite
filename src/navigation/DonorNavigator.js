import React, { useEffect, useRef } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import AnimatedTabIcon from '../components/AnimatedTabIcon';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { subscribeToDonorDeliveries } from '../services/deliveryService';
import { subscribeToDonorDonations } from '../services/donationService';
import {
  configureLocalNotifications,
  notifyForDonorDeliveryChange,
  notifyForDonorDonationChange,
} from '../services/notificationService';

import DonorHomeScreen from '../screens/donor/DonorHomeScreen';
import ManageDonationsScreen from '../screens/donor/ManageDonationsScreen';
import CreateDonationScreen from '../screens/donor/CreateDonationScreen';
import DonorNotificationSettingsScreen from '../screens/donor/DonorNotificationSettingsScreen';
import ProfileScreen from '../screens/shared/ProfileScreen';

// Detail screens can be added later in Sprint 2/3
import DonationDetailScreen from '../screens/donor/DonationDetailScreen';

const Tab = createBottomTabNavigator();
const HomeStack = createStackNavigator();
const DonationsStack = createStackNavigator();
const CreateStack = createStackNavigator();
const ProfileStack = createStackNavigator();

const GREEN = '#1A7A4A';

function HomeStackNav() {
  return (
    <HomeStack.Navigator screenOptions={{ headerShown: false }}>
      <HomeStack.Screen name="DonorHome" component={DonorHomeScreen} />
      <HomeStack.Screen name="DonationDetail" component={DonationDetailScreen} />
    </HomeStack.Navigator>
  );
}

function DonationsStackNav() {
  return (
    <DonationsStack.Navigator screenOptions={{ headerShown: false }}>
      <DonationsStack.Screen name="ManageDonations" component={ManageDonationsScreen} />
      <DonationsStack.Screen name="DonationDetail" component={DonationDetailScreen} />
    </DonationsStack.Navigator>
  );
}

function CreateStackNav() {
  return (
    <CreateStack.Navigator screenOptions={{ headerShown: false }}>
      <CreateStack.Screen name="CreateDonation" component={CreateDonationScreen} />
    </CreateStack.Navigator>
  );
}

function ProfileStackNav() {
  return (
    <ProfileStack.Navigator screenOptions={{ headerShown: false }}>
      <ProfileStack.Screen name="ProfileHome" component={ProfileScreen} />
      <ProfileStack.Screen name="DonorNotifications" component={DonorNotificationSettingsScreen} />
    </ProfileStack.Navigator>
  );
}

const TabIcon = ({ label, focused }) => (
  <AnimatedTabIcon
    focused={focused}
    icon={label === 'Home' ? '🏠' : label === 'Donations' ? '📦' : label === 'Create' ? '➕' : '👤'}
  />
);

export default function DonorNavigator() {
  const { user, userProfile } = useAuth();
  const { colors, isDark } = useTheme();
  const previousDonationsRef = useRef(null);
  const previousDeliveriesRef = useRef(null);
  const notificationsReadyRef = useRef(false);
  const preferences = userProfile?.notificationPreferences || {};

  useEffect(() => {
    if (userProfile?.role !== 'donor' || !user?.uid) {
      notificationsReadyRef.current = false;
      return undefined;
    }

    let active = true;
    configureLocalNotifications()
      .then((ready) => {
        if (active) notificationsReadyRef.current = ready;
      })
      .catch(() => {});

    return () => {
      active = false;
      notificationsReadyRef.current = false;
    };
  }, [user?.uid, userProfile?.role]);

  useEffect(() => {
    if (userProfile?.role !== 'donor' || !user?.uid) return undefined;

    const unsubscribeDonations = subscribeToDonorDonations(
      user.uid,
      (donations) => {
        const previousDonations = previousDonationsRef.current;
        previousDonationsRef.current = donations;
        if (!notificationsReadyRef.current || !previousDonations) return;

        const previousById = new Map(previousDonations.map((donation) => [donation.id, donation]));
        donations.forEach((donation) => {
          notifyForDonorDonationChange(donation, previousById.get(donation.id), preferences).catch(() => {});
        });
      },
      () => {},
    );

    const unsubscribeDeliveries = subscribeToDonorDeliveries(
      user.uid,
      (deliveries) => {
        const previousDeliveries = previousDeliveriesRef.current;
        previousDeliveriesRef.current = deliveries;
        if (!notificationsReadyRef.current || !previousDeliveries) return;

        const previousById = new Map(previousDeliveries.map((delivery) => [delivery.id, delivery]));
        deliveries.forEach((delivery) => {
          notifyForDonorDeliveryChange(delivery, previousById.get(delivery.id), preferences).catch(() => {});
        });
      },
      () => {},
    );

    return () => {
      unsubscribeDonations();
      unsubscribeDeliveries();
      previousDonationsRef.current = null;
      previousDeliveriesRef.current = null;
    };
  }, [user?.uid, userProfile?.role, preferences.donationReviewUpdates, preferences.newRequests, preferences.deliveryStatusUpdates]);

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
        tabBarIcon: ({ focused }) => <TabIcon label={route.name} focused={focused} />,
      })}
    >
      <Tab.Screen name="Home" component={HomeStackNav} />
      <Tab.Screen name="Donations" component={DonationsStackNav} />
      <Tab.Screen name="Create" component={CreateStackNav} />
      <Tab.Screen name="Profile" component={ProfileStackNav} />
    </Tab.Navigator>
  );
}
