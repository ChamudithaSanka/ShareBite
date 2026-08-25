import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import AnimatedTabIcon from '../components/AnimatedTabIcon';

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

const TabIcon = ({ label, focused }) => (
  <AnimatedTabIcon
    focused={focused}
    icon={label === 'Home' ? '🏠' : label === 'Donations' ? '📦' : label === 'Create' ? '➕' : '👤'}
  />
);

export default function DonorNavigator() {
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
        tabBarIcon: ({ focused }) => <TabIcon label={route.name} focused={focused} />,
      })}
    >
      <Tab.Screen name="Home" component={HomeStackNav} />
      <Tab.Screen name="Donations" component={DonationsStackNav} />
      <Tab.Screen name="Create" component={CreateStackNav} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}
