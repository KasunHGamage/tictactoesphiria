// ─────────────────────────────────────────────
//  App.tsx — Root navigator (state-machine)
// ─────────────────────────────────────────────

import React, { useCallback, useEffect, useState } from 'react';
import { registerRootComponent } from 'expo';

import { AppRoute } from './src/multiplayer/multiplayerTypes';
import { getLocalUser } from './src/multiplayer/userService';
import HomeScreen from './src/screens/HomeScreen';
import GameScreen from './src/screens/GameScreen';       // single-player AI
import LobbyScreen from './src/screens/LobbyScreen';
import MultiplayerGameScreen from './src/screens/MultiplayerGameScreen';
import { Player } from './src/game/gameTypes';

function RootNavigator() {
  const [route, setRoute] = useState<AppRoute>({ name: 'Home' });

  // Cached local user for MultiplayerGameScreen
  const [cachedUid, setCachedUid] = useState('');
  const [cachedName, setCachedName] = useState('');

  // Refresh cached user whenever we enter Lobby (user may have just set their name)
  useEffect(() => {
    if (route.name === 'Lobby' || route.name === 'MultiplayerGame') {
      getLocalUser().then(u => {
        if (u) { setCachedUid(u.uid); setCachedName(u.displayName); }
      });
    }
  }, [route.name]);

  const navigate = useCallback((next: AppRoute) => setRoute(next), []);

  switch (route.name) {
    case 'Home':
      return <HomeScreen navigate={navigate} />;

    case 'SinglePlayer':
      return <GameScreen />;   // existing AI game — unchanged

    case 'Lobby':
      return <LobbyScreen navigate={navigate} />;

    case 'MultiplayerGame':
      return (
        <MultiplayerGameScreen
          matchId={route.matchId}
          playerSide={route.playerSide as Player}
          myUid={cachedUid}
          myName={cachedName}
          navigate={navigate}
        />
      );
  }
}

registerRootComponent(RootNavigator);
