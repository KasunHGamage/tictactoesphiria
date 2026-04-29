import React, { useEffect, useState } from 'react';
import ScreenWrapper from '../components/ScreenWrapper';
import {
  StyleSheet, Text, Pressable, View,
  ActivityIndicator, RefreshControl
} from 'react-native';
import { useAuth } from '../auth/AuthContext';
import { getUserProfile, UserProfile } from '../services/userService';
import { logout } from '../services/authService';
import { Colors, Spacing, glow, glowStrong, textGlow } from '../../constants/theme';

export default function ProfileScreen() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchProfile = async () => {
    if (!user) return;
    try {
      const p = await getUserProfile(user.uid);
      setProfile(p);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { fetchProfile(); }, [user]);
  const onRefresh = () => { setRefreshing(true); fetchProfile(); };

  if (loading) {
    return (
      <View style={s.center}>
        <ActivityIndicator color={Colors.neonPurple} size="large" />
      </View>
    );
  }

  const winRate = profile && (profile.wins + profile.losses > 0)
    ? ((profile.wins / (profile.wins + profile.losses)) * 100).toFixed(1)
    : '0.0';

  const initial = profile?.displayName?.charAt(0).toUpperCase() ?? '?';

  return (
    <ScreenWrapper>
      {/* Avatar Section */}
      <View style={s.avatarSection}>
        <View style={s.avatarRing}>
          <View style={s.avatarCircle}>
            <Text style={s.avatarText}>{initial}</Text>
          </View>
        </View>
        <Text style={s.name}>{profile?.displayName}</Text>
        <View style={s.gameIdBadge}>
          <Text style={s.gameIdText}>ID: {profile?.gameId}</Text>
        </View>
      </View>

      {/* Stats */}
      <View style={s.statsRow}>
        <View style={s.statBox}>
          <Text style={[s.statVal, { color: Colors.neonGreen }]}>{profile?.wins}</Text>
          <Text style={s.statLab}>WINS</Text>
        </View>
        <View style={s.statDivider} />
        <View style={s.statBox}>
          <Text style={[s.statVal, { color: Colors.lose }]}>{profile?.losses}</Text>
          <Text style={s.statLab}>LOSSES</Text>
        </View>
        <View style={s.statDivider} />
        <View style={s.statBox}>
          <Text style={[s.statVal, { color: Colors.neonBlue }]}>{winRate}%</Text>
          <Text style={s.statLab}>WIN RATE</Text>
        </View>
      </View>

      {/* Account Info */}
      <View style={s.infoCard}>
        <Text style={s.sectionTitle}>ACCOUNT INFO</Text>
        <View style={s.infoRow}>
          <Text style={s.infoLabel}>Email</Text>
          <Text style={s.infoValue} numberOfLines={1}>{profile?.email}</Text>
        </View>
        <View style={[s.infoRow, { borderBottomWidth: 0 }]}>
          <Text style={s.infoLabel}>Member Since</Text>
          <Text style={s.infoValue}>
            {profile?.createdAt?.toDate
              ? profile.createdAt.toDate().toLocaleDateString()
              : '—'}
          </Text>
        </View>
      </View>

      {/* Logout */}
      <Pressable
        style={({ pressed }) => [s.logoutBtn, pressed && { opacity: 0.75, transform: [{ scale: 0.98 }] }]}
        onPress={logout}
      >
        <Text style={s.logoutText}>⏻  LOGOUT</Text>
      </Pressable>
    </ScreenWrapper>
  );
}

const s = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.bg },

  // Avatar
  avatarSection: { alignItems: 'center', marginTop: Spacing.md, marginBottom: Spacing.lg },
  avatarRing: {
    width: 112, height: 112, borderRadius: 56,
    borderWidth: 2, borderColor: Colors.neonPurple,
    justifyContent: 'center', alignItems: 'center',
    marginBottom: 16,
    ...(glowStrong(Colors.neonPurple) as any),
  },
  avatarCircle: {
    width: 96, height: 96, borderRadius: 48,
    backgroundColor: '#1A0B2E',
    justifyContent: 'center', alignItems: 'center',
  },
  avatarText: {
    fontSize: 40, fontWeight: '900', color: Colors.neonPurple,
    ...textGlow(Colors.neonPurple),
  },
  name: {
    fontSize: 24, fontWeight: '900', color: Colors.textPrimary,
    marginBottom: 8,
    ...textGlow(Colors.neonPurple),
  },
  gameIdBadge: {
    backgroundColor: Colors.card, borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 5,
    borderWidth: 1, borderColor: Colors.neonPurple + '55',
  },
  gameIdText: {
    fontSize: 13, color: Colors.neonPurple, fontWeight: '800', letterSpacing: 1.5,
    ...textGlow(Colors.neonPurple),
  },

  // Stats
  statsRow: {
    flexDirection: 'row', backgroundColor: Colors.card,
    borderRadius: 20, padding: Spacing.lg,
    borderWidth: 1, borderColor: Colors.border,
    alignItems: 'center', marginBottom: Spacing.md,
    ...(glow(Colors.neonPurple, 6) as any),
  },
  statBox: { flex: 1, alignItems: 'center' },
  statVal: { fontSize: 22, fontWeight: '900', marginBottom: 4 },
  statLab: { fontSize: 9, fontWeight: '900', color: Colors.textSecondary, letterSpacing: 1.5 },
  statDivider: { width: 1, height: 36, backgroundColor: Colors.border },

  // Info card
  infoCard: {
    backgroundColor: Colors.card, borderRadius: 20,
    padding: Spacing.lg, borderWidth: 1, borderColor: Colors.border,
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    fontSize: 10, fontWeight: '900', color: Colors.textSecondary,
    letterSpacing: 3, marginBottom: Spacing.md,
  },
  infoRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  infoLabel: { fontSize: 13, color: Colors.textSecondary },
  infoValue: { fontSize: 13, color: Colors.textPrimary, fontWeight: '700', maxWidth: '60%', textAlign: 'right' },

  // Logout
  logoutBtn: {
    backgroundColor: '#150008',
    borderRadius: 14, padding: Spacing.lg,
    alignItems: 'center', borderWidth: 1.5,
    borderColor: Colors.neonPink + '88',
    ...(glow(Colors.lose, 6) as any),
    marginBottom: Spacing.xl,
  },
  logoutText: { color: Colors.neonPink, fontSize: 14, fontWeight: '900', letterSpacing: 2 },
});
