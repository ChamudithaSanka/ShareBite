import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { Text } from 'react-native';

import VolunteerHomeScreen from '../screens/volunteer/VolunteerHomeScreen';
import AvailableDeliveriesScreen from '../screens/volunteer/AvailableDeliveriesScreen';
import ActiveDeliveryScreen from '../screens/volunteer/ActiveDeliveryScreen';
import DeliveryDetailScreen from '../screens/volunteer/DeliveryDetailScreen';
import ProfileScreen from '../screens/shared/ProfileScreen';

const Tab = createBottomTabNavigator();
const JobsStack = createStackNavigator();
const GREEN = '#1A7A4A';

function JobsStackNav() {
  return (
    <JobsStack.Navigator screenOptions={{ headerShown: false }}>
      <JobsStack.Screen name="AvailableDeliveries" component={AvailableDeliveriesScreen} />
      <JobsStack.Screen name="DeliveryDetail" component={DeliveryDetailScreen} />
    </JobsStack.Navigator>
  );
}

const TabIcon = ({ routeName }) => (
  <Text style={{ fontSize: 20 }}>
    {routeName === 'Home' ? '🏠' :
     routeName === 'Jobs' ? '🚚' :
     routeName === 'Active' ? '📍' : '👤'}
  </Text>
);

export default function VolunteerNavigator() {
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
        tabBarIcon: () => <TabIcon routeName={route.name} />,
      })}
    >
      <Tab.Screen name="Home" component={VolunteerHomeScreen} />
      <Tab.Screen name="Jobs" component={JobsStackNav} />
      <Tab.Screen name="Active" component={ActiveDeliveryScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}