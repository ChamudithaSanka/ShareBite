import React, { useEffect, useState } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import AnimatedTabIcon from '../components/AnimatedTabIcon';
import { subscribeToAvailableDeliveries } from '../services/deliveryService';

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

const TabIcon = ({ routeName, focused }) => (
  <AnimatedTabIcon
    focused={focused}
    icon={routeName === 'Home' ? '🏠' :
      routeName === 'Jobs' ? '🚚' :
      routeName === 'Active' ? '📍' : '👤'}
  />
);

export default function VolunteerNavigator() {
  const [availableDeliveryCount, setAvailableDeliveryCount] = useState(0);

  useEffect(() => subscribeToAvailableDeliveries(
    (deliveries) => setAvailableDeliveryCount(deliveries.length),
    () => setAvailableDeliveryCount(0),
  ), []);

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        animation: 'fade',
        popToTopOnBlur: true,
        tabBarActiveTintColor: 'blue',
        tabBarInactiveTintColor: 'black',
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
        tabBarIcon: ({ focused }) => <TabIcon routeName={route.name} focused={focused} />,
      })}
    >
      <Tab.Screen name="Home" component={VolunteerHomeScreen} />
      <Tab.Screen name="Jobs" component={JobsStackNav} />
      <Tab.Screen name="Active" component={ActiveDeliveryScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}