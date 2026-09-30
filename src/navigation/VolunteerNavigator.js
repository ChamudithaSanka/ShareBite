import React, { useEffect, useRef, useState } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import AnimatedTabIcon from '../components/AnimatedTabIcon';
import { subscribeToAvailableDeliveries, subscribeToVolunteerDeliveries } from '../services/deliveryService';
import { configureLocalNotifications, notifyForDeliveryChange } from '../services/notificationService';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

import VolunteerHomeScreen from '../screens/volunteer/VolunteerHomeScreen';
import AvailableDeliveriesScreen from '../screens/volunteer/AvailableDeliveriesScreen';
import ActiveDeliveryScreen from '../screens/volunteer/ActiveDeliveryScreen';
import DeliveryDetailScreen from '../screens/volunteer/DeliveryDetailScreen';
import VolunteerNotificationSettingsScreen from '../screens/volunteer/VolunteerNotificationSettingsScreen';
import ProfileScreen from '../screens/shared/ProfileScreen';

const Tab = createBottomTabNavigator();
const JobsStack = createStackNavigator();
const ProfileStack = createStackNavigator();
const GREEN = '#1A7A4A';

function JobsStackNav() {
  return (
    <JobsStack.Navigator screenOptions={{ headerShown: false }}>
      <JobsStack.Screen name="AvailableDeliveries" component={AvailableDeliveriesScreen} />
      <JobsStack.Screen name="DeliveryDetail" component={DeliveryDetailScreen} />
    </JobsStack.Navigator>
  );
}

function ProfileStackNav() {
  return (
    <ProfileStack.Navigator screenOptions={{ headerShown: false }}>
      <ProfileStack.Screen name="ProfileHome" component={ProfileScreen} />
      <ProfileStack.Screen name="VolunteerNotifications" component={VolunteerNotificationSettingsScreen} />
    </ProfileStack.Navigator>
  );
}

const TabIcon = ({ routeName, focused }) => (
  <AnimatedTabIcon
    focused={focused}
    icon={routeName === 'Home' ? '🏠' :
      routeName === 'Jobs' ? '🚚' :
      routeName === 'Active' ? '📍' : '👤'}
  />
);

export default function VolunteerNavigator() {
  const { user, userProfile } = useAuth();
  const { colors, isDark } = useTheme();
  const [availableDeliveryCount, setAvailableDeliveryCount] = useState(0);
  const previousDeliveriesRef = useRef(null);
  const notificationPreferences = userProfile?.notificationPreferences || {};
  const deliveryAssignments = notificationPreferences.deliveryAssignments !== false;
  const deliveryStatusUpdates = notificationPreferences.deliveryStatusUpdates !== false;

  useEffect(() => subscribeToAvailableDeliveries(
    (deliveries) => setAvailableDeliveryCount(deliveries.length),
    () => setAvailableDeliveryCount(0),
  ), []);

  useEffect(() => {
    if (userProfile?.role !== 'volunteer' || !user?.uid) {
      previousDeliveriesRef.current = null;
      return undefined;
    }

    let notificationsReady = false;
    configureLocalNotifications()
      .then((ready) => { notificationsReady = ready; })
      .catch(() => {});

    const unsubscribe = subscribeToVolunteerDeliveries(
      user.uid,
      (deliveries) => {
        const previousDeliveries = previousDeliveriesRef.current;
        previousDeliveriesRef.current = deliveries;

        if (!notificationsReady || !previousDeliveries) return;

        const previousById = new Map(previousDeliveries.map((delivery) => [delivery.id, delivery]));
        deliveries.forEach((delivery) => {
          notifyForDeliveryChange(delivery, previousById.get(delivery.id), {
            deliveryAssignments,
            deliveryStatusUpdates,
          }).catch(() => {});
        });
      },
      () => {},
    );

    return () => {
      unsubscribe();
      previousDeliveriesRef.current = null;
    };
  }, [user?.uid, userProfile?.role, deliveryAssignments, deliveryStatusUpdates]);

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        animation: 'fade',
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarBadge: route.name === 'Jobs' && availableDeliveryCount > 0
          ? availableDeliveryCount
          : undefined,
        tabBarBadgeStyle: {
          backgroundColor: '#E05A2B',
          color: '#FFFFFF',
          fontSize: 11,
          fontWeight: '800',
        },
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
        tabBarIcon: ({ focused }) => <TabIcon routeName={route.name} focused={focused} />,
      })}
    >
      <Tab.Screen name="Home" component={VolunteerHomeScreen} />
      <Tab.Screen name="Jobs" component={JobsStackNav} />
      <Tab.Screen name="Active" component={ActiveDeliveryScreen} />
      <Tab.Screen name="Profile" component={ProfileStackNav} />
    </Tab.Navigator>
  );
}