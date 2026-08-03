// ─────────────────────────────────────────────
//  App.tsx — Root Entry Point
// ─────────────────────────────────────────────

import React from 'react';
import { Animated } from 'react-native';
import { registerRootComponent } from 'expo';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from './src/auth/AuthContext';
import RootNavigator from './src/navigation/RootNavigator';
import { useFonts, Orbitron_400Regular, Orbitron_700Bold } from '@expo-google-fonts/orbitron';
import { ThemeProvider, useThemeControls } from './src/context/ThemeContext';

const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

if (!isExpoGo) {
  try {
    const mobileAds = require('react-native-google-mobile-ads').default;
    mobileAds()
      .initialize()
      .then((adapterStatuses: any) => {
        // Initialization complete!
      })
      .catch((err: any) => console.log('Mobile Ads init error:', err));
  } catch (e) {
    console.log('Google Mobile Ads native module not available');
  }
}

function AppInner() {
  const [fontsLoaded] = useFonts({ Orbitron_400Regular, Orbitron_700Bold });
  const { fadeAnim } = useThemeControls();

  if (!fontsLoaded) return null;

  return (
    <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
      <AuthProvider>
        <RootNavigator />
      </AuthProvider>
    </Animated.View>
  );
}

function App() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AppInner />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

registerRootComponent(App);
