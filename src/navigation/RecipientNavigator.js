import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import AnimatedTabIcon from '../components/AnimatedTabIcon';

import RecipientHomeScreen from '../screens/recipient/RecipientHomeScreen';
import AvailableFoodScreen from '../screens/recipient/AvailableFoodScreen';
import MyRequestsScreen from '../screens/recipient/MyRequestsScreen';
import ProfileScreen from '../screens/shared/ProfileScreen';

// Detail screens pushed on top of tabs (added in Sprint 2 & 3)
import FoodDetailScreen from '../screens/recipient/FoodDetailScreen';
import RequestDetailScreen from '../screens/recipient/RequestDetailScreen';
import TrackDeliveryScreen from '../screens/recipient/TrackDeliveryScreen';

const Tab = createBottomTabNavigator();
const HomeStack = createStackNavigator();
const BrowseStack = createStackNavigator();
const RequestsStack = createStackNavigator();

const GREEN = '#1A7A4A';

// --- Stack Navigators for drill-down screens ---

function HomeStackNav() {
  return (
    <HomeStack.Navigator screenOptions={{ headerShown: false }}>
      <HomeStack.Screen name="RecipientHome" component={RecipientHomeScreen} />
      <HomeStack.Screen name="FoodDetail" component={FoodDetailScreen} />
    </HomeStack.Navigator>
  );
}

function BrowseStackNav() {
  return (
    <BrowseStack.Navigator screenOptions={{ headerShown: false }}>
      <BrowseStack.Screen name="AvailableFood" component={AvailableFoodScreen} />
      <BrowseStack.Screen name="FoodDetail" component={FoodDetailScreen} />
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
      <Tab.Screen name="Home" component={HomeStackNav} />
      <Tab.Screen name="Browse" component={BrowseStackNav} />
      <Tab.Screen name="Requests" component={RequestsStackNav} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}
