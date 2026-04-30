import React, { useEffect, useState } from 'react';
import ScreenWrapper from '../components/ScreenWrapper';
import {
  StyleSheet, Text, View, Pressable, ActivityIndicator,
} from 'react-native';
import { Spacing } from '../../constants/themes';
import { useAppTheme } from '../context/ThemeContext';
import NeonButton from '../components/NeonButton';
import { useAuth } from '../auth/AuthContext';
import { getUserProfile, UserProfile } from '../services/userService';

export default function HomeScreen({ navigation }: any) {
  const { user } = useAuth();
  const t = useAppTheme();
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
      <View style={[s.loadingCenter, { backgroundColor: t.bg }]}>
        <ActivityIndicator color={t.primary} size="large" />
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
        <Text style={[s.welcomeLabel, { color: t.textSecondary }]}>WELCOME BACK,</Text>
        <Text style={[s.userName, { color: t.textPrimary, ...(t.textGlow(t.primary) as any) }]}>
          {profile?.displayName} 🎮
        </Text>
      </View>

      <View style={s.content}>
        {/* Stats Card */}
        <View style={[s.statsCard, { backgroundColor: t.card, borderColor: t.border }, t.glow(t.primary, 6) as any]}>
          <View style={s.statItem}>
            <Text style={[s.statVal, { color: t.primary }]}>{profile?.wins}</Text>
            <Text style={[s.statLab, { color: t.textSecondary }]}>WINS</Text>
          </View>
          <View style={[s.statDivider, { backgroundColor: t.border }]} />
          <View style={s.statItem}>
            <Text style={[s.statVal, { color: t.secondary }]}>{winRate}%</Text>
            <Text style={[s.statLab, { color: t.textSecondary }]}>WIN RATE</Text>
          </View>
          <View style={[s.statDivider, { backgroundColor: t.border }]} />
          <View style={s.statItem}>
            <Text style={[s.statVal, { color: t.warning, fontSize: 15 }]}>{profile?.gameId}</Text>
            <Text style={[s.statLab, { color: t.textSecondary }]}>GAME ID</Text>
          </View>
        </View>

        {/* Hero Promo Card */}
        <View style={[
          s.promoCard,
          { backgroundColor: t.cardAlt, borderColor: t.primary },
          t.glowStrong(t.primary) as any,
        ]}>
          <View style={[s.promoOverlay, { backgroundColor: t.primary + '09' }]} pointerEvents="none" />
          <Text style={[s.promoEyebrow, { color: t.primary, ...(t.textGlow(t.primary) as any) }]}>
            ⚡ SOCIAL HUB
          </Text>
          <Text style={[s.promoTitle, { color: t.textPrimary, ...(t.textGlow(t.primary) as any) }]}>
            Challenge a Friend
          </Text>
          <Text style={[s.promoDesc, { color: t.textSecondary }]}>
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
            style={({ pressed }) => [
              s.actionCard,
              { backgroundColor: t.card, borderColor: t.primary + '55' },
              t.glow(t.primary, 6) as any,
              pressed && s.actionCardPressed,
            ]}
            onPress={() => navigation.navigate('Play')}
          >
            <View style={[
              s.actionIconWrap,
              { backgroundColor: t.cardAlt, borderColor: t.primary + '88' },
            ]}>
              <Text style={s.actionIcon}>⚔️</Text>
            </View>
            <Text style={[s.actionText, { color: t.textPrimary }]}>Play Now</Text>
            <Text style={[s.actionSub, { color: t.textSecondary }]}>Start a match</Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [
              s.actionCard,
              { backgroundColor: t.card, borderColor: t.secondary + '55' },
              t.glow(t.secondary, 6) as any,
              pressed && s.actionCardPressed,
            ]}
            onPress={() => navigation.navigate('Leaders')}
          >
            <View style={[
              s.actionIconWrap,
              { backgroundColor: t.mode === 'arcade' ? '#001A20' : '#EAF4FF', borderColor: t.secondary + '88' },
            ]}>
              <Text style={s.actionIcon}>🏆</Text>
            </View>
            <Text style={[s.actionText, { color: t.textPrimary }]}>Rankings</Text>
            <Text style={[s.actionSub, { color: t.textSecondary }]}>Leaderboard</Text>
          </Pressable>
        </View>
      </View>
    </ScreenWrapper>
  );
}

const s = StyleSheet.create({
  loadingCenter: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header:  { marginTop: Spacing.sm, marginBottom: Spacing.md },
  content: { gap: Spacing.md },

  welcomeLabel: { fontSize: 11, fontWeight: '900', letterSpacing: 3 },
  userName:     { fontSize: 30, fontWeight: '900', marginTop: 4 },

  // Stats
  statsCard: {
    flexDirection: 'row', borderRadius: 20,
    padding: Spacing.lg, borderWidth: 1,
    alignItems: 'center',
  },
  statItem:    { flex: 1, alignItems: 'center' },
  statVal:     { fontSize: 22, fontWeight: '900' },
  statLab:     { fontSize: 9, fontWeight: '900', marginTop: 4, letterSpacing: 1.5 },
  statDivider: { width: 1, height: 32 },

  // Promo Hero Card
  promoCard: {
    borderRadius: 24, padding: Spacing.xl,
    borderWidth: 1.5, overflow: 'hidden',
  },
  promoOverlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    borderRadius: 24,
  },
  promoEyebrow: { fontSize: 10, fontWeight: '900', letterSpacing: 3, marginBottom: 8 },
  promoTitle:   { fontSize: 24, fontWeight: '900', marginBottom: 8, lineHeight: 30 },
  promoDesc:    { fontSize: 13, lineHeight: 20, marginBottom: 20 },
  promoBtn:     { alignSelf: 'flex-start' },

  // Action Grid
  actionGrid: { flexDirection: 'row', gap: Spacing.md },
  actionCard: {
    flex: 1, borderRadius: 20,
    padding: Spacing.lg, alignItems: 'center',
    borderWidth: 1,
  },
  actionCardPressed: { transform: [{ scale: 0.97 }], opacity: 0.85 },
  actionIconWrap: {
    width: 56, height: 56, borderRadius: 28,
    justifyContent: 'center', alignItems: 'center',
    marginBottom: 12, borderWidth: 1,
  },
  actionIcon: { fontSize: 26 },
  actionText: { fontSize: 14, fontWeight: '900', marginBottom: 2 },
  actionSub:  { fontSize: 10, fontWeight: '700', letterSpacing: 0.5 },
});
