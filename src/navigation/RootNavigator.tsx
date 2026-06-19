// ─────────────────────────────────────────────
//  RootNavigator.tsx — Main app entry navigation
// ─────────────────────────────────────────────

import React from 'react';
import { NavigationContainer, createNavigationContainerRef, StackActions } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { ActivityIndicator, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAuth } from '../auth/AuthContext';
import { useMatchInvitations } from '../hooks/useMatchInvitations';
import { useAppTheme } from '../context/ThemeContext';
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
const Tab   = createBottomTabNavigator();
const navigationRef = createNavigationContainerRef();

// ── Tab Navigator ────────────────────────────────────────────────

function MainTabs() {
  const t = useAppTheme();
  const isCalm = t.mode === 'calm';
  const insets = useSafeAreaInsets();

  // Premium tab bar styling
  const tabBarStyle = isCalm
    ? {
        backgroundColor: 'rgba(255, 253, 252, 0.95)',  // off-white with slight transparency
        borderTopWidth: 0.8,
        borderTopColor: 'rgba(200,155,109,0.25)',
        height: 60 + insets.bottom,
        paddingBottom: Math.max(insets.bottom, 10),
        paddingTop: 8,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        position: 'absolute' as const,
        elevation: 8,
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.08,
        shadowRadius: 16,
      }
    : {
        backgroundColor: t.tabBg,
        borderTopWidth: 0.8,
        borderTopColor: t.tabBorder,
        height: 60 + insets.bottom,
        paddingBottom: Math.max(insets.bottom, 10),
        paddingTop: 8,
        borderTopLeftRadius: 28,
        borderTopRightRadius: 28,
        position: 'absolute' as const,
        elevation: 0,
      };

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: any;
          if      (route.name === 'Home')    iconName = focused ? 'home'            : 'home-outline';
          else if (route.name === 'Play')    iconName = focused ? 'game-controller' : 'game-controller-outline';
          else if (route.name === 'Friends') iconName = focused ? 'people'          : 'people-outline';
          else if (route.name === 'Leaders') iconName = focused ? 'trophy'          : 'trophy-outline';
          else if (route.name === 'Profile') iconName = focused ? 'person'          : 'person-outline';
          return <Ionicons name={iconName} size={24} color={color} />;
        },
        tabBarActiveTintColor:   t.tabActive,
        tabBarInactiveTintColor: t.tabInactive,
        tabBarStyle,
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: isCalm ? '600' : '800',
          marginTop: 2,
          letterSpacing: 0.3,
        },
        tabBarItemStyle: {
          paddingVertical: 4,
        },
      })}
    >
      <Tab.Screen name="Home"    component={HomeScreen} />
      <Tab.Screen name="Play"    component={PlayScreen} />
      <Tab.Screen name="Friends" component={FriendsScreen} />
      <Tab.Screen name="Leaders" component={LeaderboardScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

// ── Root Stack ───────────────────────────────────────────────────

export default function RootNavigator() {
  const { user, loading } = useAuth();
  const t = useAppTheme();

  // Global listener for accepted invitations
  useMatchInvitations((matchId, playerSide) => {
    if (navigationRef.isReady() && user) {
      const currentRoute = navigationRef.getCurrentRoute();
      const params = {
        matchId,
        playerSide,
        myUid: user.uid,
        myName: user.displayName || 'Player',
      };
      if (currentRoute?.name === 'MultiplayerGame') {
        navigationRef.dispatch(StackActions.replace('MultiplayerGame', params));
      } else {
        // @ts-ignore
        navigationRef.navigate('MultiplayerGame', params);
      }
    }
  });

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: t.bg, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator color={t.primary} size="large" />
      </View>
    );
  }

  return (
    <NavigationContainer ref={navigationRef}>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {user ? (
          <>
            <Stack.Screen name="Main"            component={MainTabs} />
            <Stack.Screen name="MultiplayerGame" component={MultiplayerGameScreen} />
            <Stack.Screen name="SinglePlayer"    component={GameScreen} />
            <Stack.Screen name="SetupDifficulty" component={DifficultyStep} />
            <Stack.Screen name="SetupGridSize"   component={GridSizeStep} />
          </>
        ) : (
          <>
            <Stack.Screen name="Login"  component={LoginScreen} />
            <Stack.Screen name="Signup" component={SignupScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
