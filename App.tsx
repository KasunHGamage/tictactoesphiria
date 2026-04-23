// ─────────────────────────────────────────────
//  App.tsx — Root Entry Point
// ─────────────────────────────────────────────

import React from 'react';
import { registerRootComponent } from 'expo';
import { AuthProvider } from './src/auth/AuthContext';
import RootNavigator from './src/navigation/RootNavigator';

function App() {
  return (
    <AuthProvider>
      <RootNavigator />
    </AuthProvider>
  );
}

registerRootComponent(App);
