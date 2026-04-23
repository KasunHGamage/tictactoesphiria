// ─────────────────────────────────────────────
//  HomeScreen.tsx — Mode selection
// ─────────────────────────────────────────────

import React from 'react';
import {
  Platform,
  Pressable,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { AppRoute } from '../multiplayer/multiplayerTypes';

const C = {
  bg: '#0D0D1A',
  card: '#1C1C3A',
  border: '#2A2A5A',
  accent: '#7C5CFC',
  accentGlow: '#9B7DFF',
  accentDim: '#3D2E7C',
  xColor: '#FF6B8A',
  oColor: '#4FC3F7',
  textPrimary: '#F0F0FF',
  textSecondary: '#8888AA',
};

interface Props {
  navigate: (route: AppRoute) => void;
}

export default function HomeScreen({ navigate }: Props) {
  return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />

      {/* Title */}
      <View style={s.header}>
        <Text style={s.titleMain}>MOVING</Text>
        <Text style={s.titleSub}>TIC TAC TOE</Text>
        <View style={s.divider} />
        <Text style={s.tagline}>Select your game mode</Text>
      </View>

      {/* Mode cards */}
      <View style={s.cardRow}>
        {/* vs AI */}
        <Pressable
          style={({ pressed }) => [s.modeCard, pressed && s.modeCardPressed]}
          onPress={() => navigate({ name: 'SinglePlayer' })}
          accessibilityLabel="play-vs-ai"
        >
          <Text style={s.modeIcon}>🤖</Text>
          <Text style={s.modeTitle}>vs AI</Text>
          <Text style={s.modeDesc}>Play against the{'\n'}smart AI opponent</Text>
          <View style={[s.modeTag, { backgroundColor: C.accentDim }]}>
            <Text style={[s.modeTagText, { color: C.accentGlow }]}>Single Player</Text>
          </View>
        </Pressable>

        {/* vs Human */}
        <Pressable
          style={({ pressed }) => [s.modeCard, s.modeCardOnline, pressed && s.modeCardPressed]}
          onPress={() => navigate({ name: 'Lobby' })}
          accessibilityLabel="play-vs-human"
        >
          <Text style={s.modeIcon}>👥</Text>
          <Text style={s.modeTitle}>vs Human</Text>
          <Text style={s.modeDesc}>Challenge a friend{'\n'}in real-time</Text>
          <View style={[s.modeTag, { backgroundColor: '#003020' }]}>
            <Text style={[s.modeTagText, { color: '#4ADE80' }]}>Multiplayer</Text>
          </View>
        </Pressable>
      </View>

      <Text style={s.footer}>Moving Tic Tac Toe  •  v1.0</Text>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: C.bg,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight ?? 0 : 0,
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  titleMain: {
    fontSize: 36,
    fontWeight: '900',
    letterSpacing: 10,
    color: C.accentGlow,
  },
  titleSub: {
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 6,
    color: C.textSecondary,
    marginTop: -4,
  },
  divider: {
    width: 60,
    height: 2,
    backgroundColor: C.accentDim,
    borderRadius: 1,
    marginVertical: 16,
  },
  tagline: {
    fontSize: 14,
    color: C.textSecondary,
    fontWeight: '500',
  },
  cardRow: {
    flexDirection: 'row',
    gap: 14,
    width: '100%',
    justifyContent: 'center',
  },
  modeCard: {
    flex: 1,
    backgroundColor: C.card,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: C.border,
    padding: 22,
    alignItems: 'center',
    gap: 8,
  },
  modeCardOnline: {
    borderColor: '#1A4A2A',
    backgroundColor: '#0D1F16',
  },
  modeCardPressed: {
    opacity: 0.75,
    transform: [{ scale: 0.97 }],
  },
  modeIcon: {
    fontSize: 36,
    marginBottom: 4,
  },
  modeTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: C.textPrimary,
    letterSpacing: 1,
  },
  modeDesc: {
    fontSize: 12,
    color: C.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
  },
  modeTag: {
    marginTop: 8,
    borderRadius: 12,
    paddingVertical: 4,
    paddingHorizontal: 12,
  },
  modeTagText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  footer: {
    position: 'absolute',
    bottom: 20,
    fontSize: 11,
    color: C.textSecondary,
    letterSpacing: 0.5,
  },
});
