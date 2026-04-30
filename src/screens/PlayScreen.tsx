import React, { useEffect, useState } from 'react';
import ScreenWrapper from '../components/ScreenWrapper';
import {
  StyleSheet, Text, View, Pressable, ActivityIndicator,
} from 'react-native';
import { Spacing } from '../../constants/themes';
import { useAppTheme } from '../context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../auth/AuthContext';
import { listenToFriends } from '../services/friendsService';
import { getUserProfile } from '../services/userService';

export default function PlayScreen({ navigation }: any) {
  const { user } = useAuth();
  const t = useAppTheme();
  const [onlineCount, setOnlineCount] = useState(0);

  useEffect(() => {
    if (!user) return;
    const unsub = listenToFriends(user.uid, async (uids) => {
      const profiles = await Promise.all(uids.map(uid => getUserProfile(uid)));
      setOnlineCount(profiles.filter(p => p?.status === 'online').length);
    });
    return unsub;
  }, [user]);

  return (
    <ScreenWrapper>
      <View style={s.header}>
        <Text style={[s.eyebrow, { color: t.primary, ...(t.textGlow(t.primary) as any) }]}>
          ⚔️  CHOOSE MODE
        </Text>
        <Text style={[s.title, { color: t.textPrimary, ...(t.textGlow(t.primary) as any) }]}>
          Battle Arena
        </Text>
        <Text style={[s.subtitle, { color: t.textSecondary }]}>Pick your challenge and enter the grid</Text>
      </View>

      <View style={s.content}>
        {/* Practice vs AI */}
        <Pressable
          style={({ pressed }) => [
            s.card, { backgroundColor: t.card, borderColor: t.border }, pressed && s.cardPressed,
          ]}
          onPress={() => navigation.navigate('SetupDifficulty')}
        >
          <View style={[s.iconCircle, { backgroundColor: t.mode === 'arcade' ? '#001A20' : '#EAF6FF', borderColor: t.secondary + '66' }, t.glow(t.secondary, 6) as any]}>
            <Ionicons name="desktop-outline" size={28} color={t.secondary} />
          </View>
          <View style={s.cardInfo}>
            <Text style={[s.cardTitle, { color: t.textPrimary }]}>Practice vs AI</Text>
            <Text style={[s.cardDesc, { color: t.textSecondary }]}>Sharpen your skills against our smart engine.</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={t.textSecondary} />
        </Pressable>

        {/* Play with Friend — hero */}
        <Pressable
          style={({ pressed }) => [
            s.card, s.heroCard, { backgroundColor: t.cardAlt, borderColor: t.primary },
            t.glowStrong(t.primary) as any, pressed && s.cardPressed,
          ]}
          onPress={() => navigation.navigate('SetupGridSize', { mode: 'friend' })}
        >
          <View style={[s.heroOverlay, { backgroundColor: t.primary + '08' }]} pointerEvents="none" />
          <View style={[s.iconCircle, { backgroundColor: t.primary, borderColor: t.primary }, t.glow(t.primary, 10) as any]}>
            <Ionicons name="people" size={28} color="#FFF" />
          </View>
          <View style={s.cardInfo}>
            <View style={s.titleRow}>
              <Text style={[s.cardTitle, { color: t.textPrimary, ...(t.textGlow(t.primary) as any) }]}>
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
        <Pressable style={[s.card, s.comingSoonCard, { backgroundColor: t.card, borderColor: t.border }]} onPress={() => {}}>
          <View style={[s.iconCircle, { backgroundColor: t.mode === 'arcade' ? '#1A1400' : '#FFFBEA', borderColor: t.warning + '66' }]}>
            <Ionicons name="globe-outline" size={28} color={t.warning} />
          </View>
          <View style={s.cardInfo}>
            <View style={s.titleRow}>
              <Text style={[s.cardTitle, { color: t.textPrimary }]}>Global Lobby</Text>
              <View style={[s.soonBadge, { backgroundColor: t.warning + '22', borderColor: t.warning + '44' }]}>
                <Text style={[s.soonText, { color: t.warning }]}>SOON</Text>
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
    </ScreenWrapper>
  );
}

const s = StyleSheet.create({
  header:  { marginTop: Spacing.sm, marginBottom: Spacing.lg },
  content: { gap: Spacing.sm },
  eyebrow:  { fontSize: 10, fontWeight: '900', letterSpacing: 3, marginBottom: 8 },
  title:    { fontSize: 32, fontWeight: '900', letterSpacing: 0.5, marginBottom: 4 },
  subtitle: { fontSize: 13 },
  card: {
    flexDirection: 'row', borderRadius: 20,
    padding: Spacing.lg, alignItems: 'center',
    borderWidth: 1, gap: Spacing.md,
  },
  heroCard:       { borderWidth: 1.5, overflow: 'hidden' },
  heroOverlay:    { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  comingSoonCard: { opacity: 0.55 },
  cardPressed:    { transform: [{ scale: 0.98 }], opacity: 0.85 },
  iconCircle: {
    width: 56, height: 56, borderRadius: 28,
    justifyContent: 'center', alignItems: 'center', borderWidth: 1,
  },
  cardInfo:  { flex: 1 },
  titleRow:  { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  cardTitle: { fontSize: 17, fontWeight: '900' },
  cardDesc:  { fontSize: 12, lineHeight: 18 },
  hintText:  { fontSize: 11, fontWeight: '800', marginTop: 8 },
  onlineBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, borderWidth: 1 },
  onlineDot:   { width: 6, height: 6, borderRadius: 3, marginRight: 5 },
  onlineText:  { fontSize: 9, fontWeight: '900' },
  soonBadge:   { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, borderWidth: 1 },
  soonText:    { fontSize: 9, fontWeight: '900', letterSpacing: 1 },
  tipBox:   { borderRadius: 16, padding: Spacing.lg, borderWidth: 1, marginTop: Spacing.xs },
  tipTitle: { fontSize: 11, fontWeight: '900', marginBottom: 8, letterSpacing: 1 },
  tipText:  { fontSize: 13, lineHeight: 20 },
});
