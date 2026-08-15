import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { Text } from 'react-native';

// Screens
import CoordinatorHomeScreen      from '../screens/coordinator/CoordinatorHomeScreen';
import ReviewDonationsScreen      from '../screens/coordinator/ReviewDonationsScreen';
import DonationReviewDetailScreen from '../screens/coordinator/DonationReviewDetailScreen';
import InventoryScreen            from '../screens/coordinator/InventoryScreen';
import InventoryDetailScreen      from '../screens/coordinator/InventoryDetailScreen';
import RequestApprovalScreen      from '../screens/coordinator/RequestApprovalScreen';
import RequestDetailScreen        from '../screens/coordinator/RequestDetailScreen';
import ProfileScreen              from '../screens/shared/ProfileScreen';

const Tab   = createBottomTabNavigator();
const Stack = createStackNavigator();
const GREEN = '#1A7A4A';

const ICONS = {
  Home:      '🏠',
  Donations: '📦',
  Inventory: '📊',
  Requests:  '📋',
  Profile:   '👤',
};

const TabIcon = ({ label }) => (
  <Text style={{ fontSize: 20 }}>{ICONS[label] ?? '•'}</Text>
);

// ─── Donations tab stack ────────────────────────────────────────────────────
function DonationsStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="ReviewDonationsList"  component={ReviewDonationsScreen} />
      <Stack.Screen name="DonationReviewDetail" component={DonationReviewDetailScreen} />
    </Stack.Navigator>
  );
}

// ─── Inventory tab stack ────────────────────────────────────────────────────
function InventoryStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="InventoryList"   component={InventoryScreen} />
      <Stack.Screen name="InventoryDetail" component={InventoryDetailScreen} />
    </Stack.Navigator>
  );
}

// ─── Requests tab stack ─────────────────────────────────────────────────────
function RequestsStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="RequestApprovalList" component={RequestApprovalScreen} />
      <Stack.Screen name="RequestDetail"       component={RequestDetailScreen} />
    </Stack.Navigator>
  );
}

// ─── Root tab navigator ─────────────────────────────────────────────────────
export default function CoordinatorNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor:   GREEN,
        tabBarInactiveTintColor: '#9CA3AF',
        tabBarStyle: {
          borderTopColor: '#F3F4F6',
          paddingBottom: 6,
          paddingTop: 4,
          height: 60,
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
      <Tab.Screen name="Home"      component={CoordinatorHomeScreen} />
      <Tab.Screen name="Donations" component={DonationsStack} />
      <Tab.Screen name="Inventory" component={InventoryStack} />
      <Tab.Screen name="Requests"  component={RequestsStack} />
      <Tab.Screen name="Profile"   component={ProfileScreen} />
    </Tab.Navigator>
  );
}
