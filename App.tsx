// ─────────────────────────────────────────────
//  App.tsx — Root entry point
//  Uses registerRootComponent so React Native's
//  AppRegistry receives the "main" component
//  correctly (required when not using expo-router).
// ─────────────────────────────────────────────

import { registerRootComponent } from 'expo';
import GameScreen from './src/screens/GameScreen';

// registerRootComponent calls AppRegistry.registerComponent('main', ...)
// It also ensures the app is mounted correctly on both iOS and Android.
registerRootComponent(GameScreen);
