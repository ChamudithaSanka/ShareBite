import React, { useEffect, useRef } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import AnimatedTabIcon from '../components/AnimatedTabIcon';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import {
  configureLocalNotifications,
  notifyForRecipientRequestChange,
} from '../services/notificationService';
import { subscribeToRecipientRequests } from '../services/requestService';

import RecipientHomeScreen from '../screens/recipient/RecipientHomeScreen';
import AvailableFoodScreen from '../screens/recipient/AvailableFoodScreen';
import MyRequestsScreen from '../screens/recipient/MyRequestsScreen';
import ProfileScreen from '../screens/shared/ProfileScreen';

// Detail screens pushed on top of tabs (added in Sprint 2 & 3)
import FoodDetailScreen from '../screens/recipient/FoodDetailScreen';
import RequestFoodScreen from '../screens/recipient/RequestFoodScreen';
import RequestDetailScreen from '../screens/recipient/RequestDetailScreen';
import TrackDeliveryScreen from '../screens/recipient/TrackDeliveryScreen';
import RecipientNotificationSettingsScreen from '../screens/recipient/RecipientNotificationSettingsScreen';

const Tab = createBottomTabNavigator();
const HomeStack = createStackNavigator();
const BrowseStack = createStackNavigator();
const RequestsStack = createStackNavigator();
const ProfileStack = createStackNavigator();

const GREEN = '#1A7A4A';

// --- Stack Navigators for drill-down screens ---

function HomeStackNav() {
  return (
    <HomeStack.Navigator screenOptions={{ headerShown: false }}>
      <HomeStack.Screen name="RecipientHome" component={RecipientHomeScreen} />
      <HomeStack.Screen name="FoodDetail" component={FoodDetailScreen} />
      <HomeStack.Screen name="RequestFood" component={RequestFoodScreen} />
    </HomeStack.Navigator>
  );
}

function BrowseStackNav() {
  return (
    <BrowseStack.Navigator screenOptions={{ headerShown: false }}>
      <BrowseStack.Screen name="AvailableFood" component={AvailableFoodScreen} />
      <BrowseStack.Screen name="FoodDetail" component={FoodDetailScreen} />
      <BrowseStack.Screen name="RequestFood" component={RequestFoodScreen} />
    </BrowseStack.Navigator>
  );
}

function RequestsStackNav() {
  return (
    <RequestsStack.Navigator screenOptions={{ headerShown: false }}>
      <RequestsStack.Screen name="MyRequests" component={MyRequestsScreen} />
      <RequestsStack.Screen name="RequestDetail" component={RequestDetailScreen} />
      <RequestsStack.Screen name="TrackDelivery" component={TrackDeliveryScreen} />
    </RequestsStack.Navigator>
  );
}

function ProfileStackNav() {
  return (
    <ProfileStack.Navigator screenOptions={{ headerShown: false }}>
      <ProfileStack.Screen name="ProfileHome" component={ProfileScreen} />
      <ProfileStack.Screen name="RecipientNotifications" component={RecipientNotificationSettingsScreen} />
    </ProfileStack.Navigator>
  );
}

// --- Tab Icon helper (no external icon library needed) ---
const TabIcon = ({ label, focused }) => (
  <AnimatedTabIcon
    focused={focused}
    icon={label === 'Home' ? '🏠' :
      label === 'Browse' ? '🔍' :
      label === 'Requests' ? '📋' : '👤'}
  />
);

// --- Recipient Bottom Tab Navigator ---
export default function RecipientNavigator() {
  const { user, userProfile } = useAuth();
  const { colors, isDark } = useTheme();
  const previousRequestsRef = useRef(null);
  const notificationPreferences = userProfile?.notificationPreferences || {};

  useEffect(() => {
    if (userProfile?.role !== 'recipient' || !user?.uid) {
      previousRequestsRef.current = null;
      return undefined;
    }

    let notificationsReady = false;
    configureLocalNotifications()
      .then((ready) => { notificationsReady = ready; })
      .catch(() => {});

    const unsubscribe = subscribeToRecipientRequests(
      user.uid,
      (requests) => {
        const previousRequests = previousRequestsRef.current;
        previousRequestsRef.current = requests;
        if (!notificationsReady || !previousRequests) return;

        const previousById = new Map(previousRequests.map((request) => [request.id, request]));
        requests.forEach((request) => {
          notifyForRecipientRequestChange(request, previousById.get(request.id), notificationPreferences).catch(() => {});
        });
      },
      () => {},
    );

    return () => {
      unsubscribe();
      previousRequestsRef.current = null;
    };
  }, [
    user?.uid,
    userProfile?.role,
    notificationPreferences.recipientRequestDecisions,
    notificationPreferences.recipientDeliveryAssignments,
    notificationPreferences.recipientDeliveryProgress,
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
      <Tab.Screen name="Home" component={HomeStackNav} />
      <Tab.Screen name="Browse" component={BrowseStackNav} />
      <Tab.Screen name="Requests" component={RequestsStackNav} />
      <Tab.Screen name="Profile" component={ProfileStackNav} />
    </Tab.Navigator>
  );
}
