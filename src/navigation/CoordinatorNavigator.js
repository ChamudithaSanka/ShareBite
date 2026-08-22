import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { Text } from 'react-native';

import CoordinatorHomeScreen from '../screens/coordinator/CoordinatorHomeScreen';
import ReviewDonationsScreen from '../screens/coordinator/ReviewDonationsScreen';
import InventoryScreen from '../screens/coordinator/InventoryScreen';
import RequestApprovalScreen from '../screens/coordinator/RequestApprovalScreen';
import ProfileScreen from '../screens/shared/ProfileScreen';

const Tab = createBottomTabNavigator();

const GREEN = '#1A7A4A';

const TabIcon = ({ label, focused }) => (
  <Text style={{ fontSize: 20 }}>
    {label === 'Home' ? '🏠' :
     label === 'Donations' ? '📦' :
     label === 'Inventory' ? '📊' :
     label === 'Requests' ? '📋' : '👤'}
  </Text>
);

export default function CoordinatorNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: GREEN,
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
      <Tab.Screen name="Home" component={CoordinatorHomeScreen} />
      <Tab.Screen name="Donations" component={ReviewDonationsScreen} />
      <Tab.Screen name="Inventory" component={InventoryScreen} />
      <Tab.Screen name="Requests" component={RequestApprovalScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}
