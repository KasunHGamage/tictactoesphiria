import React, { useEffect, useState } from 'react';
import ScreenWrapper from '../components/ScreenWrapper';
import {
  StyleSheet, Text, View, Pressable, ActivityIndicator,
} from 'react-native';
import { Spacing, Typography } from '../../constants/themes';
import { useAppTheme } from '../context/ThemeContext';
import NeonButton from '../components/NeonButton';
import { useAuth } from '../auth/AuthContext';
import { getUserProfile, UserProfile } from '../services/userService';

export default function HomeScreen({ navigation }: any) {
  const { user } = useAuth();
  const t = useAppTheme();
  const isCalm = t.mode === 'calm';
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

  // Premium shadow styling
  const cardShadow = isCalm ? (t.shadowElevation('md') as any) : (t.glow(t.primary, 6) as any);
  const promoShadow = isCalm ? (t.shadowElevation('lg') as any) : (t.glowStrong(t.primary) as any);
  const actionShadow = isCalm ? (t.shadowElevation('sm') as any) : (t.glow(t.primary, 6) as any);

  return (
    <ScreenWrapper>
      {/* Header */}
      <View style={s.header}>
        <Text style={[s.welcomeLabel, { color: t.textSecondary, fontWeight: Typography.semibold as any }]}>
          WELCOME BACK
        </Text>
        <Text style={[
          s.userName,
          { color: t.textPrimary, fontWeight: Typography.bold as any },
          isCalm ? {} : (t.textGlow(t.primary) as any),
        ]}>
          {profile?.displayName} 🎮
        </Text>
      </View>

      <View style={s.content}>
        {/* Stats Card */}
        <View
          style={[
            s.statsCard,
            {
              backgroundColor: t.card,
              borderColor: isCalm ? t.premiumBorder : t.primary + '55',
              borderWidth: isCalm ? 0.8 : 1,
            },
            cardShadow,
          ]}
        >
          <View style={s.statItem}>
            <Text style={[s.statVal, { color: t.primary, fontWeight: Typography.bold as any }]}>
              {profile?.wins}
            </Text>
            <Text style={[s.statLab, { color: t.textSecondary, fontWeight: Typography.semibold as any }]}>
              WINS
            </Text>
          </View>
          <View style={[s.statDivider, { backgroundColor: isCalm ? 'rgba(200,155,109,0.15)' : t.border }]} />
          <View style={s.statItem}>
            <Text style={[s.statVal, { color: t.secondary, fontWeight: Typography.bold as any }]}>
              {winRate}%
            </Text>
            <Text style={[s.statLab, { color: t.textSecondary, fontWeight: Typography.semibold as any }]}>
              WIN RATE
            </Text>
          </View>
          <View style={[s.statDivider, { backgroundColor: isCalm ? 'rgba(200,155,109,0.15)' : t.border }]} />
          <View style={s.statItem}>
            <Text style={[s.statVal, { color: t.warning, fontSize: 15, fontWeight: Typography.bold as any }]}>
              {profile?.gameId}
            </Text>
            <Text style={[s.statLab, { color: t.textSecondary, fontWeight: Typography.semibold as any }]}>
              GAME ID
            </Text>
          </View>
        </View>

        {/* Hero Promo Card */}
        <View
          style={[
            s.promoCard,
            {
              backgroundColor: t.cardAlt,
              borderColor: isCalm ? t.premiumBorder : t.primary,
              borderWidth: isCalm ? 0.8 : 1.5,
            },
            promoShadow,
          ]}
        >
          <View style={[s.promoOverlay, { backgroundColor: t.primary + (isCalm ? '06' : '09') }]} pointerEvents="none" />
          <Text style={[
            s.promoEyebrow,
            { color: t.primary, fontWeight: Typography.semibold as any },
            isCalm ? {} : (t.textGlow(t.primary) as any),
          ]}>
            ⚡ SOCIAL HUB
          </Text>
          <Text style={[
            s.promoTitle,
            { color: t.textPrimary, fontWeight: Typography.bold as any },
            isCalm ? {} : (t.textGlow(t.primary) as any),
          ]}>
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
              {
                backgroundColor: t.card,
                borderColor: isCalm ? t.premiumBorder : t.primary + '55',
                borderWidth: isCalm ? 0.8 : 1,
              },
              actionShadow,
              pressed && s.actionCardPressed,
            ]}
            onPress={() => navigation.navigate('Play')}
          >
            <View style={[
              s.actionIconWrap,
              {
                backgroundColor: t.cardAlt,
                borderColor: isCalm ? t.premiumBorder : t.primary + '88',
                borderWidth: isCalm ? 0.8 : 1,
              },
            ]}>
              <Text style={s.actionIcon}>⚔️</Text>
            </View>
            <Text style={[s.actionText, { color: t.textPrimary, fontWeight: Typography.semibold as any }]}>
              Play Now
            </Text>
            <Text style={[s.actionSub, { color: t.textSecondary }]}>Start a match</Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [
              s.actionCard,
              {
                backgroundColor: t.card,
                borderColor: isCalm ? t.premiumBorder : t.secondary + '55',
                borderWidth: isCalm ? 0.8 : 1,
              },
              actionShadow,
              pressed && s.actionCardPressed,
            ]}
            onPress={() => navigation.navigate('Leaders')}
          >
            <View style={[
              s.actionIconWrap,
              {
                backgroundColor: t.cardAlt,
                borderColor: isCalm ? t.premiumBorder : t.secondary + '88',
                borderWidth: isCalm ? 0.8 : 1,
              },
            ]}>
              <Text style={s.actionIcon}>🏆</Text>
            </View>
            <Text style={[s.actionText, { color: t.textPrimary, fontWeight: Typography.semibold as any }]}>
              Rankings
            </Text>
            <Text style={[s.actionSub, { color: t.textSecondary }]}>Leaderboard</Text>
          </Pressable>
        </View>
      </View>
    </ScreenWrapper>
  );
}

const s = StyleSheet.create({
  loadingCenter: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header:  { marginTop: Spacing.sm, marginBottom: Spacing.lg },
  content: { gap: Spacing.lg },

  welcomeLabel: { fontSize: 11, fontWeight: '600', letterSpacing: 1.5 },
  userName:     { fontSize: 32, fontWeight: '700', marginTop: 8 },

  // Stats
  statsCard: {
    flexDirection: 'row', borderRadius: 16,
    padding: Spacing.lg, borderWidth: 0.8,
    alignItems: 'center', justifyContent: 'space-around',
  },
  statItem:    { flex: 1, alignItems: 'center' },
  statVal:     { fontSize: 24, fontWeight: '700' },
  statLab:     { fontSize: 9, fontWeight: '600', marginTop: 6, letterSpacing: 0.8 },
  statDivider: { width: 0.8, height: 36 },

  // Promo Hero Card
  promoCard: {
    borderRadius: 16, padding: Spacing.xl,
    borderWidth: 0.8, overflow: 'hidden',
  },
  promoOverlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    borderRadius: 16,
  },
  promoEyebrow: { fontSize: 10, fontWeight: '600', letterSpacing: 1.2, marginBottom: 8 },
  promoTitle:   { fontSize: 24, fontWeight: '700', marginBottom: 12, lineHeight: 32 },
  promoDesc:    { fontSize: 13, lineHeight: 21, marginBottom: 20, fontWeight: '400' },
  promoBtn:     { alignSelf: 'flex-start' },

  // Action Grid
  actionGrid: { flexDirection: 'row', gap: Spacing.lg },
  actionCard: {
    flex: 1, borderRadius: 16,
    padding: Spacing.lg, alignItems: 'center',
    borderWidth: 0.8,
  },
  actionCardPressed: { transform: [{ scale: 0.97 }], opacity: 0.85 },
  actionIconWrap: {
    width: 56, height: 56, borderRadius: 12,
    justifyContent: 'center', alignItems: 'center',
    marginBottom: 12, borderWidth: 0.8,
  },
  actionIcon: { fontSize: 28 },
  actionText: { fontSize: 14, fontWeight: '700', marginBottom: 4 },
  actionSub:  { fontSize: 11, fontWeight: '400' },
});
