import React, { useEffect, useState } from 'react';
import ScreenWrapper from '../components/ScreenWrapper';
import {
  StyleSheet, Text, View, Pressable, StatusBar, Alert
} from 'react-native';
import { Colors, Spacing, glow, glowStrong, textGlow } from '../../constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../auth/AuthContext';
import { listenToFriends } from '../services/friendsService';
import { getUserProfile } from '../services/userService';

export default function PlayScreen({ navigation }: any) {
  const { user } = useAuth();
  const [onlineCount, setOnlineCount] = useState(0);

  useEffect(() => {
    if (!user) return;
    const unsub = listenToFriends(user.uid, async (uids) => {
      const profiles = await Promise.all(uids.map(uid => getUserProfile(uid)));
      const online = profiles.filter(p => p?.status === 'online').length;
      setOnlineCount(online);
    });
    return unsub;
  }, [user]);

  return (
    <ScreenWrapper>
      <StatusBar barStyle="light-content" />

      {/* Header */}
      <View style={s.header}>
        <Text style={s.eyebrow}>⚔️  CHOOSE MODE</Text>
        <Text style={s.title}>Battle Arena</Text>
        <Text style={s.subtitle}>Pick your challenge and enter the grid</Text>
      </View>

      <View style={s.content}>
        {/* ── Practice vs AI ── */}
        <Pressable
          style={({ pressed }) => [s.card, pressed && s.cardPressed]}
          onPress={() => navigation.navigate('SetupDifficulty')}
        >
          <View style={[s.iconCircle, s.iconCircleAI]}>
            <Ionicons name="desktop-outline" size={28} color={Colors.neonBlue} />
          </View>
          <View style={s.cardInfo}>
            <Text style={s.cardTitle}>Practice vs AI</Text>
            <Text style={s.cardDesc}>Sharpen your skills against our smart engine.</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={Colors.textSecondary} />
        </Pressable>

        {/* ── Play with Friend — HERO CARD ── */}
        <Pressable
          style={({ pressed }) => [s.card, s.heroCard, pressed && s.cardPressed]}
          onPress={() => navigation.navigate('SetupGridSize', { mode: 'friend' })}
        >
          {/* Glow overlay */}
          <View style={s.heroOverlay} pointerEvents="none" />

          <View style={[s.iconCircle, s.iconCircleHero]}>
            <Ionicons name="people" size={28} color="#FFF" />
          </View>

          <View style={s.cardInfo}>
            <View style={s.titleRow}>
              <Text style={[s.cardTitle, s.heroCardTitle]}>Play with Friend</Text>
              {onlineCount > 0 && (
                <View style={s.onlineBadge}>
                  <View style={s.onlineDot} />
                  <Text style={s.onlineText}>{onlineCount} Online</Text>
                </View>
              )}
            </View>
            <Text style={[s.cardDesc, { color: Colors.neonPurple + 'CC' }]}>
              Challenge your friends in real-time matches
            </Text>
            <Text style={s.hintText}>Invite and play instantly →</Text>
          </View>
        </Pressable>

        {/* ── Global Lobby (Coming Soon) ── */}
        <Pressable
          style={[s.card, s.comingSoonCard]}
          onPress={() => Alert.alert('Coming Soon', 'Global matchmaking is under development.')}
        >
          <View style={[s.iconCircle, s.iconCircleGlobal]}>
            <Ionicons name="globe-outline" size={28} color={Colors.neonYellow} />
          </View>
          <View style={s.cardInfo}>
            <View style={s.titleRow}>
              <Text style={s.cardTitle}>Global Lobby</Text>
              <View style={s.soonBadge}>
                <Text style={s.soonText}>SOON</Text>
              </View>
            </View>
            <Text style={s.cardDesc}>Match with random players worldwide.</Text>
          </View>
        </Pressable>

        {/* Tip Box */}
        <View style={s.tipBox}>
          <Text style={s.tipTitle}>💡 PRO TIP</Text>
          <Text style={s.tipText}>
            Higher win rates move you up the global leaderboard. Keep practicing!
          </Text>
        </View>
      </View>
    </ScreenWrapper>
  );
}

const s = StyleSheet.create({
  header: { marginTop: Spacing.sm, marginBottom: Spacing.lg },
  content: { gap: Spacing.sm },

  eyebrow: {
    fontSize: 10, fontWeight: '900', color: Colors.neonPurple,
    letterSpacing: 3, marginBottom: 8,
    ...textGlow(Colors.neonPurple),
  },
  title: {
    fontSize: 32, fontWeight: '900', color: Colors.textPrimary,
    letterSpacing: 0.5, marginBottom: 4,
    ...textGlow(Colors.neonPurple),
  },
  subtitle: { fontSize: 13, color: Colors.textSecondary },

  // Cards
  card: {
    flexDirection: 'row', backgroundColor: Colors.card, borderRadius: 20,
    padding: Spacing.lg, alignItems: 'center',
    borderWidth: 1, borderColor: Colors.border,
    gap: Spacing.md,
  },
  heroCard: {
    backgroundColor: '#160B28',
    borderColor: Colors.neonPurple,
    borderWidth: 1.5,
    overflow: 'hidden',
    ...(glowStrong(Colors.neonPurple) as any),
  },
  heroOverlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(157,78,221,0.05)',
  },
  comingSoonCard: { opacity: 0.55 },
  cardPressed: { transform: [{ scale: 0.98 }], opacity: 0.85 },

  iconCircle: {
    width: 56, height: 56, borderRadius: 28,
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 1,
  },
  iconCircleAI: {
    backgroundColor: '#001A20', borderColor: Colors.neonBlue + '66',
    ...(glow(Colors.neonBlue, 6) as any),
  },
  iconCircleHero: {
    backgroundColor: Colors.neonPurple,
    borderColor: Colors.neonPurple,
    ...(glow(Colors.neonPurple, 10) as any),
  },
  iconCircleGlobal: {
    backgroundColor: '#1A1400', borderColor: Colors.neonYellow + '66',
  },

  cardInfo: { flex: 1 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  cardTitle: { fontSize: 17, fontWeight: '900', color: Colors.textPrimary },
  heroCardTitle: { ...textGlow(Colors.neonPurple) },
  cardDesc: { fontSize: 12, color: Colors.textSecondary, lineHeight: 18 },
  hintText: { fontSize: 11, fontWeight: '800', color: Colors.neonPurple, marginTop: 8 },

  onlineBadge: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(57,255,20,0.1)',
    paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: 8, borderWidth: 1, borderColor: 'rgba(57,255,20,0.2)',
  },
  onlineDot: {
    width: 6, height: 6, borderRadius: 3,
    backgroundColor: Colors.neonGreen, marginRight: 5,
  },
  onlineText: { fontSize: 9, fontWeight: '900', color: Colors.neonGreen },

  soonBadge: {
    backgroundColor: Colors.neonYellow + '22',
    paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: 6, borderWidth: 1, borderColor: Colors.neonYellow + '44',
  },
  soonText: { fontSize: 9, fontWeight: '900', color: Colors.neonYellow, letterSpacing: 1 },

  tipBox: {
    borderRadius: 16, padding: Spacing.lg,
    borderWidth: 1, borderColor: Colors.border,
    backgroundColor: Colors.card,
    marginTop: Spacing.xs,
    ...(glow(Colors.neonPurple, 4) as any),
  },
  tipTitle: {
    fontSize: 11, fontWeight: '900', color: Colors.neonPurple,
    marginBottom: 8, letterSpacing: 1,
  },
  tipText: { color: Colors.textSecondary, fontSize: 13, lineHeight: 20 },
});
