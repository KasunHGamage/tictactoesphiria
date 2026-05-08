import React, { useEffect, useState } from 'react';
import ScreenWrapper from '../components/ScreenWrapper';
import {
  StyleSheet, Text, Pressable, View,
  ActivityIndicator, RefreshControl, Alert
} from 'react-native';
import { useAuth } from '../auth/AuthContext';
import { getUserProfile, UserProfile, deleteUserAccount } from '../services/userService';
import { logout } from '../services/authService';
import { Spacing, ThemeMode } from '../../constants/themes';
import { useAppTheme, useThemeControls } from '../context/ThemeContext';


export default function ProfileScreen() {
  const { user }  = useAuth();
  const t         = useAppTheme();
  const { themeMode, setTheme } = useThemeControls();

  const [profile,    setProfile]    = useState<UserProfile | null>(null);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchProfile = async () => {
    if (!user) return;
    try {
      const p = await getUserProfile(user.uid);
      setProfile(p);
    } catch (e) { console.error(e); }
    finally { setLoading(false); setRefreshing(false); }
  };

  useEffect(() => { fetchProfile(); }, [user]);
  const onRefresh = () => { setRefreshing(true); fetchProfile(); };

  const handleDeleteAccount = () => {
    Alert.alert(
      'DELETE ACCOUNT',
      'Are you absolutely sure? This will permanently erase your profile, stats, friends, and active matches. This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: async () => {
            try {
              if (!user?.uid) return;
              setLoading(true);
              await deleteUserAccount(user.uid);
              // Account is deleted. onAuthStateChanged will handle the redirect,
              // but we call logout just to be absolutely clean and trigger state updates.
              await logout();
            } catch (e: any) {
              setLoading(false);
              if (e.message === 'REAUTH_REQUIRED') {
                Alert.alert(
                  'Security Check',
                  'For your security, you must have logged in recently to delete your account. Please log out and log back in, then try again.',
                  [{ text: 'OK' }]
                );
              } else {
                Alert.alert('Error', e.message || 'Failed to delete account. Please try again.');
              }
            }
          }
        }
      ]
    );
  };

  if (loading) {
    return (
      <View style={[s.center, { backgroundColor: t.bg }]}>
        <ActivityIndicator color={t.primary} size="large" />
      </View>
    );
  }

  const winRate = profile && (profile.wins + profile.losses > 0)
    ? ((profile.wins / (profile.wins + profile.losses)) * 100).toFixed(1)
    : '0.0';

  const initial = profile?.displayName?.charAt(0).toUpperCase() ?? '?';

  const THEMES: { mode: ThemeMode; label: string; icon: string; desc: string }[] = [
    { mode: 'arcade', label: 'Arcade', icon: '⚡', desc: 'Neon glow, dark energy' },
    { mode: 'calm',   label: 'Calm',   icon: '🌿', desc: 'Linen white, earthy & minimal' },
  ];

  return (
    <ScreenWrapper refreshControl={
      <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={t.primary} />
    }>
      {/* Avatar Section */}
      <View style={s.avatarSection}>
        <View style={[s.avatarRing, { borderColor: t.primary }, t.glowStrong(t.primary) as any]}>
          <View style={[s.avatarCircle, { backgroundColor: t.avatarBg }]}>
            <Text style={[s.avatarText, { color: t.primary, ...(t.textGlow(t.primary) as any) }]}>
              {initial}
            </Text>
          </View>
        </View>
        <Text style={[s.name, { color: t.textPrimary, ...(t.textGlow(t.primary) as any) }]}>
          {profile?.displayName}
        </Text>
        <View style={[s.gameIdBadge, { backgroundColor: t.card, borderColor: t.primary + '55' }]}>
          <Text style={[s.gameIdText, { color: t.primary, ...(t.textGlow(t.primary) as any) }]}>
            ID: {profile?.gameId}
          </Text>
        </View>
      </View>

      {/* Stats */}
      <View style={[s.statsRow, { backgroundColor: t.card, borderColor: t.border }, t.glow(t.primary, 6) as any]}>
        <View style={s.statBox}>
          <Text style={[s.statVal, { color: t.success }]}>{profile?.wins}</Text>
          <Text style={[s.statLab, { color: t.textSecondary }]}>WINS</Text>
        </View>
        <View style={[s.statDivider, { backgroundColor: t.border }]} />
        <View style={s.statBox}>
          <Text style={[s.statVal, { color: t.lose }]}>{profile?.losses}</Text>
          <Text style={[s.statLab, { color: t.textSecondary }]}>LOSSES</Text>
        </View>
        <View style={[s.statDivider, { backgroundColor: t.border }]} />
        <View style={s.statBox}>
          <Text style={[s.statVal, { color: t.secondary }]}>{winRate}%</Text>
          <Text style={[s.statLab, { color: t.textSecondary }]}>WIN RATE</Text>
        </View>
      </View>

      {/* Account Info */}
      <View style={[s.infoCard, { backgroundColor: t.card, borderColor: t.border }]}>
        <Text style={[s.sectionTitle, { color: t.textSecondary }]}>ACCOUNT INFO</Text>
        <View style={[s.infoRow, { borderBottomColor: t.border }]}>
          <Text style={[s.infoLabel, { color: t.textSecondary }]}>Email</Text>
          <Text style={[s.infoValue, { color: t.textPrimary }]} numberOfLines={1}>{profile?.email}</Text>
        </View>
        <View style={[s.infoRow, { borderBottomWidth: 0 }]}>
          <Text style={[s.infoLabel, { color: t.textSecondary }]}>Member Since</Text>
          <Text style={[s.infoValue, { color: t.textPrimary }]}>
            {profile?.createdAt?.toDate
              ? profile.createdAt.toDate().toLocaleDateString()
              : '—'}
          </Text>
        </View>
      </View>

      {/* ── Theme Toggle ──────────────────────────────────── */}
      <View style={[s.infoCard, { backgroundColor: t.card, borderColor: t.border }]}>
        <Text style={[s.sectionTitle, { color: t.textSecondary }]}>APPEARANCE</Text>

        <View style={s.themeGrid}>
          {THEMES.map(({ mode, label, icon, desc }) => {
            const active = themeMode === mode;
            return (
              <Pressable
                key={mode}
                id={`theme-btn-${mode}`}
                style={({ pressed }) => [
                  s.themeCard,
                  {
                    backgroundColor: active ? t.primary + '18' : t.bg,
                    borderColor:     active ? t.primary : t.border,
                    borderWidth:     active ? 2 : 1,
                  },
                  active && (t.glow(t.primary, 8) as any),
                  pressed && { transform: [{ scale: 0.97 }] },
                ]}
                onPress={() => setTheme(mode)}
              >
                <Text style={s.themeIcon}>{icon}</Text>
                <Text style={[s.themeLabel, { color: active ? t.primary : t.textPrimary }]}>
                  {label}
                </Text>
                <Text style={[s.themeDesc, { color: t.textSecondary }]}>{desc}</Text>
                {active && (
                  <View style={[s.activeCheck, { backgroundColor: t.primary }]}>
                    <Text style={s.activeCheckText}>✓</Text>
                  </View>
                )}
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* Logout & Delete */}
      <Pressable
        style={({ pressed }) => [
          s.logoutBtn,
          { backgroundColor: t.mode === 'arcade' ? '#150008' : '#FAF9F6', borderColor: t.accent + '88' },
          t.glow(t.lose, 6) as any,
          pressed && { opacity: 0.75, transform: [{ scale: 0.98 }] },
        ]}
        onPress={logout}
      >
        <Text style={[s.logoutText, { color: t.accent }]}>⏻  LOGOUT</Text>
      </Pressable>

      <Pressable
        style={({ pressed }) => [
          s.deleteBtn,
          pressed && { opacity: 0.75 },
        ]}
        onPress={handleDeleteAccount}
      >
        <Text style={[s.deleteText, { color: t.lose }]}>DELETE ACCOUNT</Text>
      </Pressable>
    </ScreenWrapper>
  );
}

const s = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  // Avatar
  avatarSection: { alignItems: 'center', marginTop: Spacing.md, marginBottom: Spacing.lg },
  avatarRing: {
    width: 112, height: 112, borderRadius: 56,
    borderWidth: 2, justifyContent: 'center', alignItems: 'center', marginBottom: 16,
  },
  avatarCircle: {
    width: 96, height: 96, borderRadius: 48,
    justifyContent: 'center', alignItems: 'center',
  },
  avatarText:   { fontSize: 40, fontWeight: '900' },
  name:         { fontSize: 24, fontWeight: '900', marginBottom: 8 },
  gameIdBadge:  { borderRadius: 10, paddingHorizontal: 14, paddingVertical: 5, borderWidth: 1 },
  gameIdText:   { fontSize: 13, fontWeight: '800', letterSpacing: 1.5 },

  // Stats
  statsRow: {
    flexDirection: 'row', borderRadius: 20, padding: Spacing.lg,
    borderWidth: 1, alignItems: 'center', marginBottom: Spacing.md,
  },
  statBox:     { flex: 1, alignItems: 'center' },
  statVal:     { fontSize: 22, fontWeight: '900', marginBottom: 4 },
  statLab:     { fontSize: 9, fontWeight: '900', letterSpacing: 1.5 },
  statDivider: { width: 1, height: 36 },

  // Info card (shared)
  infoCard: {
    borderRadius: 20, padding: Spacing.lg,
    borderWidth: 1, marginBottom: Spacing.md,
  },
  sectionTitle: { fontSize: 10, fontWeight: '900', letterSpacing: 3, marginBottom: Spacing.md },
  infoRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    paddingVertical: 12, borderBottomWidth: 1,
  },
  infoLabel: { fontSize: 13 },
  infoValue: { fontSize: 13, fontWeight: '700', maxWidth: '60%', textAlign: 'right' },

  // Theme toggle
  themeGrid: { flexDirection: 'row', gap: Spacing.sm },
  themeCard: {
    flex: 1, borderRadius: 16, padding: Spacing.md,
    alignItems: 'center', position: 'relative', overflow: 'hidden',
  },
  themeIcon:  { fontSize: 28, marginBottom: 6 },
  themeLabel: { fontSize: 13, fontWeight: '900', letterSpacing: 0.5, marginBottom: 3 },
  themeDesc:  { fontSize: 10, textAlign: 'center', lineHeight: 14 },
  activeCheck: {
    position: 'absolute', top: 8, right: 8,
    width: 18, height: 18, borderRadius: 9,
    justifyContent: 'center', alignItems: 'center',
  },
  activeCheckText: { color: '#FFF', fontSize: 10, fontWeight: '900' },

  // Logout
  logoutBtn: {
    borderRadius: 14, padding: Spacing.lg,
    alignItems: 'center', borderWidth: 1.5, marginBottom: Spacing.xl,
  },
  logoutText: { fontSize: 14, fontWeight: '900', letterSpacing: 2 },

  // Delete
  deleteBtn: { alignItems: 'center', paddingVertical: Spacing.md, marginBottom: Spacing.xl },
  deleteText: { fontSize: 11, fontWeight: '900', letterSpacing: 1, textDecorationLine: 'underline' },
});
