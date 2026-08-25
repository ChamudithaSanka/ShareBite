import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import AnimatedTabIcon from '../components/AnimatedTabIcon';

import CoordinatorHomeScreen from '../screens/coordinator/CoordinatorHomeScreen';
import ReviewDonationsScreen from '../screens/coordinator/ReviewDonationsScreen';
import InventoryScreen from '../screens/coordinator/InventoryScreen';
import RequestApprovalScreen from '../screens/coordinator/RequestApprovalScreen';
import ProfileScreen from '../screens/shared/ProfileScreen';

const Tab = createBottomTabNavigator();

const GREEN = '#1A7A4A';

const TabIcon = ({ label, focused }) => (
  <AnimatedTabIcon
    focused={focused}
    icon={label === 'Home' ? '🏠' :
      label === 'Donations' ? '📦' :
      label === 'Inventory' ? '📊' :
      label === 'Requests' ? '📋' : '👤'}
  />
);

export default function CoordinatorNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        animation: 'fade',
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
      <Tab.Screen name="Donations" component={ReviewDonationsScreen} />
      <Tab.Screen name="Inventory" component={InventoryScreen} />
      <Tab.Screen name="Requests" component={RequestApprovalScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}
