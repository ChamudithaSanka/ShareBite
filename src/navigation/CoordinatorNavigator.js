import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import AnimatedTabIcon from '../components/AnimatedTabIcon';

// Screens
import CoordinatorHomeScreen from '../screens/coordinator/CoordinatorHomeScreen';
import ReviewDonationsScreen from '../screens/coordinator/ReviewDonationsScreen';
import DonationReviewDetailScreen from '../screens/coordinator/DonationReviewDetailScreen';
import InventoryScreen from '../screens/coordinator/InventoryScreen';
import InventoryDetailScreen from '../screens/coordinator/InventoryDetailScreen';
import RequestApprovalScreen from '../screens/coordinator/RequestApprovalScreen';
import RequestDetailScreen from '../screens/coordinator/RequestDetailScreen';
import ProfileScreen from '../screens/shared/ProfileScreen';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

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

// ─── Root tab navigator ─────────────────────────────────────────────────────
export default function CoordinatorNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        animation: 'fade',
        popToTopOnBlur: true,
        tabBarActiveTintColor: 'blue',
        tabBarInactiveTintColor: 'black',
        tabBarStyle: {
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 16,
          marginHorizontal: 16,
          height: 68,
          borderTopWidth: 0,
          borderRadius: 50,
          paddingBottom: 8,
          paddingTop: 8,
          backgroundColor: '#ffffff',
          shadowColor: '#000000',
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.12,
          shadowRadius: 12,
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
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}
