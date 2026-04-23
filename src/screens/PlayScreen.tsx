// ─────────────────────────────────────────────
//  PlayScreen.tsx — Lobby and Mode Selection
// ─────────────────────────────────────────────

import React from 'react';
import { 
  StyleSheet, Text, View, SafeAreaView, Pressable, ScrollView, Platform, StatusBar 
} from 'react-native';

const C = {
  bg: '#0D0D1A', card: '#1C1C3A', border: '#2A2A5A',
  accent: '#7C5CFC', accentGlow: '#9B7DFF', accentDim: '#3D2E7C',
  textPrimary: '#F0F0FF', textSecondary: '#8888AA',
};

export default function PlayScreen({ navigation }: any) {
  return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle="light-content" />
      <ScrollView contentContainerStyle={s.scroll}>
        <View style={s.header}>
          <Text style={s.title}>Battle Arena</Text>
          <Text style={s.subtitle}>Choose your challenge</Text>
        </View>

        <View style={s.cardContainer}>
          <Pressable 
            style={({ pressed }) => [s.modeCard, pressed && s.cardPressed]}
            onPress={() => navigation.navigate('SinglePlayer')}
          >
            <Text style={s.icon}>🤖</Text>
            <View style={s.cardInfo}>
              <Text style={s.cardTitle}>Practice vs AI</Text>
              <Text style={s.cardDesc}>Sharpen your skills against our smart engine.</Text>
            </View>
          </Pressable>

          <Pressable 
            style={({ pressed }) => [s.modeCard, s.multiCard, pressed && s.cardPressed]}
            onPress={() => Alert.alert('Multiplayer', 'Go to the Social tab to invite friends, or use the Global Lobby coming soon!')}
          >
            <Text style={s.icon}>🌐</Text>
            <View style={s.cardInfo}>
              <Text style={s.cardTitle}>Global Lobby</Text>
              <Text style={s.cardDesc}>Match with random players worldwide (Coming Soon).</Text>
            </View>
          </Pressable>
        </View>

        <View style={s.tipBox}>
          <Text style={s.tipTitle}>💡 PRO TIP</Text>
          <Text style={s.tipText}>
            Go to the **Friends** tab to invite your friends to a real-time match!
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

import { Alert } from 'react-native';

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  scroll: { padding: 24 },
  header: { marginBottom: 32 },
  title: { fontSize: 32, fontWeight: '900', color: C.accentGlow, letterSpacing: 1 },
  subtitle: { fontSize: 16, color: C.textSecondary, marginTop: 4 },
  cardContainer: { gap: 16 },
  modeCard: { 
    flexDirection: 'row', backgroundColor: C.card, borderRadius: 20, 
    padding: 24, alignItems: 'center', borderWidth: 1, borderColor: C.border 
  },
  multiCard: { borderColor: C.accentDim, backgroundColor: '#0F0F25' },
  cardPressed: { opacity: 0.8, transform: [{ scale: 0.98 }] },
  icon: { fontSize: 40, marginRight: 20 },
  cardInfo: { flex: 1 },
  cardTitle: { fontSize: 18, fontWeight: '800', color: C.textPrimary, marginBottom: 4 },
  cardDesc: { fontSize: 13, color: C.textSecondary, lineHeight: 18 },
  tipBox: { 
    marginTop: 40, backgroundColor: C.accentDim, borderRadius: 16, 
    padding: 20, borderWidth: 1, borderColor: C.accent 
  },
  tipTitle: { fontSize: 12, fontWeight: '900', color: C.accentGlow, marginBottom: 8, letterSpacing: 1 },
  tipText: { color: C.textPrimary, fontSize: 14, lineHeight: 22, fontWeight: '500' },
});
