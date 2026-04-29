import React, { useEffect, useState } from 'react';
import ScreenWrapper from '../components/ScreenWrapper';
import {
  StyleSheet, Text, View, Pressable, ActivityIndicator
} from 'react-native';
import { Colors, Spacing, glow, glowStrong, textGlow } from '../../constants/theme';
import NeonButton from '../components/NeonButton';
import { useAuth } from '../auth/AuthContext';
import { getUserProfile, UserProfile } from '../services/userService';

export default function HomeScreen({ navigation }: any) {
  const { user } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      getUserProfile(user.uid).then(p => {
        setProfile(p);
        setLoading(false);
      });
    }
  }, [user]);

  if (loading) {
    return (
      <View style={s.loadingCenter}>
        <ActivityIndicator color={Colors.neonPurple} size="large" />
      </View>
    );
  }

  const winRate = profile && (profile.wins + profile.losses > 0)
    ? ((profile.wins / (profile.wins + profile.losses)) * 100).toFixed(0)
    : '0';

  return (
    <ScreenWrapper>
      {/* Header */}
      <View style={s.header}>
        <Text style={s.welcomeLabel}>WELCOME BACK,</Text>
        <Text style={s.userName}>{profile?.displayName} 🎮</Text>
      </View>

      <View style={s.content}>
        {/* Stats Card */}
        <View style={s.statsCard}>
          <View style={s.statItem}>
            <Text style={s.statVal}>{profile?.wins}</Text>
            <Text style={s.statLab}>WINS</Text>
          </View>
          <View style={s.statDivider} />
          <View style={s.statItem}>
            <Text style={[s.statVal, { color: Colors.neonBlue }]}>{winRate}%</Text>
            <Text style={s.statLab}>WIN RATE</Text>
          </View>
          <View style={s.statDivider} />
          <View style={s.statItem}>
            <Text style={[s.statVal, { color: Colors.neonYellow, fontSize: 15 }]}>{profile?.gameId}</Text>
            <Text style={s.statLab}>GAME ID</Text>
          </View>
        </View>

        {/* Hero Promo Card */}
        <View style={s.promoCard}>
          {/* Gradient-like overlay */}
          <View style={s.promoOverlay} pointerEvents="none" />
          <Text style={s.promoEyebrow}>⚡ SOCIAL HUB</Text>
          <Text style={s.promoTitle}>Challenge a Friend</Text>
          <Text style={s.promoDesc}>
            Connect with friends using their Game ID and battle for the top spot!
          </Text>
          <NeonButton
            title="GO TO SOCIAL HUB"
            onPress={() => navigation.navigate('Friends')}
            style={s.promoBtn}
          />
        </View>

        {/* Action Cards */}
        <View style={s.actionGrid}>
          <Pressable
            style={({ pressed }) => [s.actionCard, pressed && s.actionCardPressed]}
            onPress={() => navigation.navigate('Play')}
          >
            <View style={s.actionIconWrap}>
              <Text style={s.actionIcon}>⚔️</Text>
            </View>
            <Text style={s.actionText}>Play Now</Text>
            <Text style={s.actionSub}>Start a match</Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [s.actionCard, s.actionCardBlue, pressed && s.actionCardPressed]}
            onPress={() => navigation.navigate('Leaders')}
          >
            <View style={[s.actionIconWrap, s.actionIconBlue]}>
              <Text style={s.actionIcon}>🏆</Text>
            </View>
            <Text style={s.actionText}>Rankings</Text>
            <Text style={s.actionSub}>Leaderboard</Text>
          </Pressable>
        </View>
      </View>
    </ScreenWrapper>
  );
}

const s = StyleSheet.create({
  loadingCenter: {
    flex: 1, justifyContent: 'center', alignItems: 'center',
    backgroundColor: Colors.bg,
  },
  header: { marginTop: Spacing.sm, marginBottom: Spacing.md },
  content: { gap: Spacing.md },
  welcomeLabel: {
    fontSize: 11, fontWeight: '900', color: Colors.textSecondary,
    letterSpacing: 3,
  },
  userName: {
    fontSize: 30, fontWeight: '900', color: Colors.textPrimary,
    marginTop: 4,
    ...textGlow(Colors.neonPurple),
  },

  // Stats
  statsCard: {
    flexDirection: 'row', backgroundColor: Colors.card, borderRadius: 20,
    padding: Spacing.lg, borderWidth: 1, borderColor: Colors.border,
    alignItems: 'center',
    ...(glow(Colors.neonPurple, 6) as any),
  },
  statItem: { flex: 1, alignItems: 'center' },
  statVal: { fontSize: 22, fontWeight: '900', color: Colors.neonPurple },
  statLab: { fontSize: 9, fontWeight: '900', color: Colors.textSecondary, marginTop: 4, letterSpacing: 1.5 },
  statDivider: { width: 1, height: 32, backgroundColor: Colors.border },

  // Promo Hero Card
  promoCard: {
    backgroundColor: '#1A0B2E',
    borderRadius: 24, padding: Spacing.xl,
    borderWidth: 1.5, borderColor: Colors.neonPurple,
    overflow: 'hidden',
    ...(glowStrong(Colors.neonPurple) as any),
  },
  promoOverlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(157,78,221,0.06)',
    borderRadius: 24,
  },
  promoEyebrow: {
    fontSize: 10, fontWeight: '900', color: Colors.neonPurple,
    letterSpacing: 3, marginBottom: 8,
  },
  promoTitle: {
    fontSize: 24, fontWeight: '900', color: Colors.textPrimary,
    marginBottom: 8, lineHeight: 30,
    ...textGlow(Colors.neonPurple),
  },
  promoDesc: { fontSize: 13, color: Colors.textSecondary, lineHeight: 20, marginBottom: 20 },
  promoBtn: { alignSelf: 'flex-start' },

  // Action Grid
  actionGrid: { flexDirection: 'row', gap: Spacing.md },
  actionCard: {
    flex: 1, backgroundColor: Colors.card, borderRadius: 20,
    padding: Spacing.lg, alignItems: 'center',
    borderWidth: 1, borderColor: Colors.neonPurple + '55',
    ...(glow(Colors.neonPurple, 6) as any),
  },
  actionCardBlue: {
    borderColor: Colors.neonBlue + '55',
    ...(glow(Colors.neonBlue, 6) as any),
  },
  actionCardPressed: { transform: [{ scale: 0.97 }], opacity: 0.85 },
  actionIconWrap: {
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: '#1A0B2E', justifyContent: 'center', alignItems: 'center',
    marginBottom: 12, borderWidth: 1, borderColor: Colors.neonPurple + '88',
  },
  actionIconBlue: { backgroundColor: '#001A20', borderColor: Colors.neonBlue + '88' },
  actionIcon: { fontSize: 26 },
  actionText: { fontSize: 14, fontWeight: '900', color: Colors.textPrimary, marginBottom: 2 },
  actionSub: { fontSize: 10, fontWeight: '700', color: Colors.textSecondary, letterSpacing: 0.5 },
});
