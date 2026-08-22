import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { Text } from 'react-native';

import DonorHomeScreen from '../screens/donor/DonorHomeScreen';
import ManageDonationsScreen from '../screens/donor/ManageDonationsScreen';
import CreateDonationScreen from '../screens/donor/CreateDonationScreen';
import ProfileScreen from '../screens/shared/ProfileScreen';

// Detail screens can be added later in Sprint 2/3
import DonationDetailScreen from '../screens/donor/DonationDetailScreen';

const Tab = createBottomTabNavigator();
const HomeStack = createStackNavigator();
const DonationsStack = createStackNavigator();
const CreateStack = createStackNavigator();

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

const TabIcon = ({ label }) => (
  <Text style={{ fontSize: 20 }}>
    {label === 'Home' ? '🏠' : label === 'Donations' ? '📦' : label === 'Create' ? '➕' : '👤'}
  </Text>
);

export default function DonorNavigator() {
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
        tabBarIcon: () => <TabIcon label={route.name} />,
      })}
    >
      <Tab.Screen name="Home" component={HomeStackNav} />
      <Tab.Screen name="Donations" component={DonationsStackNav} />
      <Tab.Screen name="Create" component={CreateStackNav} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}
