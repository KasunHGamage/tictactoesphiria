import React, { useEffect, useState } from 'react';
import ScreenWrapper from '../components/ScreenWrapper';
import {
  StyleSheet, Text, View, Pressable, ActivityIndicator,
} from 'react-native';
import { Spacing, Typography } from '../../constants/themes';
import { useAppTheme } from '../context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../auth/AuthContext';
import { listenToFriends } from '../services/friendsService';
import { getUserProfile } from '../services/userService';
import AdBanner from '../components/AdBanner';

export default function PlayScreen({ navigation }: any) {
  const { user } = useAuth();
  const t = useAppTheme();
  const isCalm = t.mode === 'calm';
  const [onlineCount, setOnlineCount] = useState(0);

  useEffect(() => {
    if (!user) return;
    const unsub = listenToFriends(user.uid, async (uids) => {
      const profiles = await Promise.all(uids.map(uid => getUserProfile(uid)));
      // Check if friend is actually online based on lastSeen timestamp (within 30s)
      const onlineFriends = profiles.filter(p => p && Date.now() - (p.lastSeen ?? 0) < 30_000);
      setOnlineCount(onlineFriends.length);
    });
    return unsub;
  }, [user]);

  return (
    <ScreenWrapper>
      <View style={s.header}>
        <Text style={[s.eyebrow, { color: t.primary, fontWeight: Typography.semibold as any }]}>
          ⚔️  CHOOSE MODE
        </Text>
        <Text style={[s.title, { color: t.textPrimary, fontWeight: Typography.bold as any }]}>
          Battle Arena
        </Text>
        <Text style={[s.subtitle, { color: t.textSecondary }]}>Pick your challenge and enter the grid</Text>
      </View>

      <View style={s.content}>
        {/* Practice vs AI */}
        <Pressable
          style={({ pressed }) => [
            s.card,
            {
              backgroundColor: t.card,
              borderColor: isCalm ? t.premiumBorder : t.border,
              borderWidth: isCalm ? 0.8 : 1,
            },
            isCalm ? (t.shadowElevation('sm') as any) : (t.glow(t.secondary, 6) as any),
            pressed && s.cardPressed,
          ]}
          onPress={() => navigation.navigate('SetupDifficulty')}
        >
          <View style={[
            s.iconCircle,
            {
              backgroundColor: t.cardAlt,
              borderColor: t.secondary + (isCalm ? '44' : '66'),
              borderWidth: isCalm ? 0.8 : 0,
            },
          ]}>
            <Ionicons name="desktop-outline" size={28} color={t.secondary} />
          </View>
          <View style={s.cardInfo}>
            <Text style={[s.cardTitle, { color: t.textPrimary, fontWeight: Typography.semibold as any }]}>Practice vs AI</Text>
            <Text style={[s.cardDesc, { color: t.textSecondary }]}>Sharpen your skills against our smart engine.</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={t.textSecondary} />
        </Pressable>

        {/* Play with Friend — hero */}
        <Pressable
          style={({ pressed }) => [
            s.card,
            s.heroCard,
            {
              backgroundColor: t.cardAlt,
              borderColor: isCalm ? t.premiumBorder : t.primary,
              borderWidth: isCalm ? 0.8 : 1.5,
            },
            isCalm ? (t.shadowElevation('md') as any) : (t.glowStrong(t.primary) as any),
            pressed && s.cardPressed,
          ]}
          onPress={() => navigation.navigate('SetupGridSize', { mode: 'friend' })}
        >
          <View style={[s.heroOverlay, { backgroundColor: t.primary + (isCalm ? '06' : '08') }]} pointerEvents="none" />
          <View style={[
            s.iconCircle,
            { backgroundColor: t.primary, borderColor: t.primary },
            isCalm ? {} : (t.glow(t.primary, 10) as any),
          ]}>
            <Ionicons name="people" size={28} color="#FFF" />
          </View>
          <View style={s.cardInfo}>
            <View style={s.titleRow}>
              <Text style={[s.cardTitle, { color: t.textPrimary, fontWeight: Typography.semibold as any }]}>
                Play with Friend
              </Text>
              {onlineCount > 0 && (
                <View style={[s.onlineBadge, { backgroundColor: t.success + '1A', borderColor: t.success + '33' }]}>
                  <View style={[s.onlineDot, { backgroundColor: t.success }]} />
                  <Text style={[s.onlineText, { color: t.success }]}>{onlineCount} Online</Text>
                </View>
              )}
            </View>
            <Text style={[s.cardDesc, { color: t.primary + 'CC' }]}>Challenge your friends in real-time matches</Text>
            <Text style={[s.hintText, { color: t.primary }]}>Invite and play instantly →</Text>
          </View>
        </Pressable>

        {/* Global Lobby — coming soon */}
        <Pressable style={[s.card, s.comingSoonCard, { backgroundColor: t.card, borderColor: isCalm ? t.premiumBorder : t.border, borderWidth: isCalm ? 0.8 : 1 }]} onPress={() => {}}>
          <View style={[s.iconCircle, { backgroundColor: t.bg, borderColor: t.warning + (isCalm ? '44' : '66'), borderWidth: isCalm ? 0.8 : 0 }]}>
            <Ionicons name="globe-outline" size={28} color={t.warning} />
          </View>
          <View style={s.cardInfo}>
            <View style={s.titleRow}>
              <Text style={[s.cardTitle, { color: t.textPrimary, fontWeight: Typography.semibold as any }]}>Global Lobby</Text>
              <View style={[s.soonBadge, { backgroundColor: t.warning + '22', borderColor: t.warning + '44' }]}>
                <Text style={[s.soonText, { color: t.warning, fontWeight: Typography.semibold as any }]}>SOON</Text>
              </View>
            </View>
            <Text style={[s.cardDesc, { color: t.textSecondary }]}>Match with random players worldwide.</Text>
          </View>
        </Pressable>

        {/* Tip Box */}
        <View style={[s.tipBox, { backgroundColor: t.card, borderColor: t.border }, t.glow(t.primary, 4) as any]}>
          <Text style={[s.tipTitle, { color: t.primary }]}>💡 PRO TIP</Text>
          <Text style={[s.tipText, { color: t.textSecondary }]}>
            Higher win rates move you up the global leaderboard. Keep practicing!
          </Text>
        </View>
      </View>
      <AdBanner />
    </ScreenWrapper>
  );
}

const s = StyleSheet.create({
  header:  { marginTop: Spacing.sm, marginBottom: Spacing.lg },
  content: { gap: Spacing.md },
  eyebrow:  { fontSize: 10, fontWeight: '600', letterSpacing: 1.2, marginBottom: 8 },
  title:    { fontSize: 32, fontWeight: '700', letterSpacing: 0.2, marginBottom: 4 },
  subtitle: { fontSize: 14, fontWeight: '400' },
  card: {
    flexDirection: 'row', borderRadius: 16,
    padding: Spacing.lg, alignItems: 'center',
    borderWidth: 0.8, gap: Spacing.lg,
  },
  heroCard:       { borderWidth: 0.8, overflow: 'hidden' },
  heroOverlay:    { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  comingSoonCard: { opacity: 0.65 },
  cardPressed:    { transform: [{ scale: 0.98 }], opacity: 0.85 },
  iconCircle: {
    width: 56, height: 56, borderRadius: 12,
    justifyContent: 'center', alignItems: 'center', borderWidth: 0.8,
  },
  cardInfo:  { flex: 1 },
  titleRow:  { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  cardTitle: { fontSize: 17, fontWeight: '700' },
  cardDesc:  { fontSize: 13, lineHeight: 20, fontWeight: '400' },
  hintText:  { fontSize: 12, fontWeight: '600', marginTop: 8 },
  onlineBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, borderWidth: 0.8 },
  onlineDot:   { width: 6, height: 6, borderRadius: 3, marginRight: 5 },
  onlineText:  { fontSize: 10, fontWeight: '600' },
  soonBadge:   { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, borderWidth: 0.8 },
  soonText:    { fontSize: 9, fontWeight: '600', letterSpacing: 0.5 },
  tipBox:   { borderRadius: 16, padding: Spacing.lg, borderWidth: 0.8, marginTop: Spacing.md },
  tipTitle: { fontSize: 12, fontWeight: '600', marginBottom: 8, letterSpacing: 0.8 },
  tipText:  { fontSize: 13, lineHeight: 21, fontWeight: '400' },
});
