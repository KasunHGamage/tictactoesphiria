// ─────────────────────────────────────────────
//  RootNavigator.tsx — Main app entry navigation
// ─────────────────────────────────────────────

import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { ActivityIndicator, View } from 'react-native';

import { useAuth } from '../auth/AuthContext';
import LoginScreen from '../screens/LoginScreen';
import SignupScreen from '../screens/SignupScreen';
import HomeScreen from '../screens/HomeScreen';
import PlayScreen from '../screens/PlayScreen';
import FriendsScreen from '../screens/FriendsScreen';
import LeaderboardScreen from '../screens/LeaderboardScreen';
import ProfileScreen from '../screens/ProfileScreen';
import MultiplayerGameScreen from '../screens/MultiplayerGameScreen';
import GameScreen from '../screens/GameScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

// ── Tab Navigator ────────────────────────────────────────────────

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: { backgroundColor: '#0D0D1A', borderTopColor: '#2A2A5A' },
        tabBarActiveTintColor: '#7C5CFC',
        tabBarInactiveTintColor: '#8888AA',
      }}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Play" component={PlayScreen} />
      <Tab.Screen name="Friends" component={FriendsScreen} />
      <Tab.Screen name="Leaders" component={LeaderboardScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

// ── Root Stack ───────────────────────────────────────────────────

export default function RootNavigator() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: '#0D0D1A', justifyContent: 'center' }}>
        <ActivityIndicator color="#7C5CFC" size="large" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {user ? (
          <>
            <Stack.Screen name="Main" component={MainTabs} />
            <Stack.Screen name="MultiplayerGame" component={MultiplayerGameScreen} />
            <Stack.Screen name="SinglePlayer" component={GameScreen} />
          </>
        ) : (
          <>
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="Signup" component={SignupScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
