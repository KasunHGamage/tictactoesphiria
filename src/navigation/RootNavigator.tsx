// ─────────────────────────────────────────────
//  RootNavigator.tsx — Main app entry navigation
// ─────────────────────────────────────────────

import React from 'react';
import { NavigationContainer, createNavigationContainerRef, StackActions } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { ActivityIndicator, View, Platform } from 'react-native';

import { useAuth } from '../auth/AuthContext';
import { useMatchInvitations } from '../hooks/useMatchInvitations';
import LoginScreen from '../screens/LoginScreen';
import SignupScreen from '../screens/SignupScreen';
import HomeScreen from '../screens/HomeScreen';
import PlayScreen from '../screens/PlayScreen';
import FriendsScreen from '../screens/FriendsScreen';
import LeaderboardScreen from '../screens/LeaderboardScreen';
import ProfileScreen from '../screens/ProfileScreen';
import MultiplayerGameScreen from '../screens/MultiplayerGameScreen';
import GameScreen from '../screens/GameScreen';
import DifficultyStep from '../screens/setup/DifficultyStep';
import GridSizeStep from '../screens/setup/GridSizeStep';

import { Ionicons } from '@expo/vector-icons';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();
const navigationRef = createNavigationContainerRef();

// ── Tab Navigator ────────────────────────────────────────────────

function MainTabs() {
  const isIOS = Platform.OS === 'ios';

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: any;

          if (route.name === 'Home') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'Play') {
            iconName = focused ? 'game-controller' : 'game-controller-outline';
          } else if (route.name === 'Friends') {
            iconName = focused ? 'people' : 'people-outline';
          } else if (route.name === 'Leaders') {
            iconName = focused ? 'trophy' : 'trophy-outline';
          } else if (route.name === 'Profile') {
            iconName = focused ? 'person' : 'person-outline';
          }

          return <Ionicons name={iconName} size={24} color={color} />;
        },
        tabBarActiveTintColor: '#9D4EDD',
        tabBarInactiveTintColor: '#3A3A5C',
        tabBarStyle: {
          backgroundColor: '#0A0A14',
          borderTopWidth: 1,
          borderTopColor: '#2B2B44',
          height: 70,
          paddingBottom: 12,
          paddingTop: 10,
          borderTopLeftRadius: 28,
          borderTopRightRadius: 28,
          position: 'absolute',
          elevation: 0,
          shadowColor: '#9D4EDD',
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 0.25,
          shadowRadius: 18,
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '800',
          marginTop: 2,
          letterSpacing: 0.5,
        },
      })}
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

  // Global listener for accepted invitations
  useMatchInvitations((matchId, playerSide) => {
    if (navigationRef.isReady() && user) {
      const currentRoute = navigationRef.getCurrentRoute();
      const params = {
        matchId,
        playerSide,
        myUid: user.uid,
        myName: user.displayName || 'Player'
      };

      if (currentRoute?.name === 'MultiplayerGame') {
        // If already in a game, REPLACE the stack to ensure fresh state
        navigationRef.dispatch(StackActions.replace('MultiplayerGame', params));
      } else {
        // @ts-ignore
        navigationRef.navigate('MultiplayerGame', params);
      }
    }
  });

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: '#07070D', justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator color="#9D4EDD" size="large" />
      </View>
    );
  }

  return (
    <NavigationContainer ref={navigationRef}>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {user ? (
          <>
            <Stack.Screen name="Main" component={MainTabs} />
            <Stack.Screen name="MultiplayerGame" component={MultiplayerGameScreen} />
            <Stack.Screen name="SinglePlayer" component={GameScreen} />
            <Stack.Screen name="SetupDifficulty" component={DifficultyStep} />
            <Stack.Screen name="SetupGridSize" component={GridSizeStep} />
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
