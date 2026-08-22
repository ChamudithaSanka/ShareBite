import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { ActivityIndicator, View, Text, StyleSheet } from 'react-native';
import { useAuth } from '../context/AuthContext';

// Auth screens
import SplashScreen from '../screens/auth/SplashScreen';
import OnboardScreen from '../screens/auth/OnboardScreen';
import LoginScreen from '../screens/auth/LoginScreen';
import RegisterScreen from '../screens/auth/RegisterScreen';

// Role navigators
import RecipientNavigator from './RecipientNavigator';
import DonorNavigator from './DonorNavigator';
import VolunteerNavigator from './VolunteerNavigator';

const Stack = createStackNavigator();

// Placeholder for navigators not yet implemented by other members
function ComingSoonScreen({ route }) {
  const role = route?.params?.role || 'This role';
  return (
    <View style={styles.placeholder}>
      <Text style={styles.placeholderEmoji}>🚧</Text>
      <Text style={styles.placeholderTitle}>{role} Navigator</Text>
      <Text style={styles.placeholderSub}>Will be implemented by the {role} team member.</Text>
    </View>
  );
}

function AuthStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Splash" component={SplashScreen} />
      <Stack.Screen name="Onboard" component={OnboardScreen} />
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Register" component={RegisterScreen} />
    </Stack.Navigator>
  );
}

import CoordinatorNavigator from './CoordinatorNavigator';

function RoleNavigator({ role }) {
  switch (role) {
    case 'recipient':
      return <RecipientNavigator />;
    case 'donor':
      return <DonorNavigator />;
    case 'volunteer':
      return <VolunteerNavigator />;
    case 'coordinator':
      return <CoordinatorNavigator />;
    default:
      return <ComingSoonScreen route={{ params: { role: 'Unknown' } }} />;
  }
}

export default function AppNavigator() {
  const { user, userProfile, loading } = useAuth();

  if (loading) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color="#1A7A4A" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      {!user || !userProfile
        ? <AuthStack />
        : <RoleNavigator role={userProfile.role} />}
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  loader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  placeholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 24,
  },
  placeholderEmoji: { fontSize: 48, marginBottom: 16 },
  placeholderTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 8,
  },
  placeholderSub: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
  },
});