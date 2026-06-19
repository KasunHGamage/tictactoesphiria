import React, { useEffect, useState } from 'react';
import ScreenWrapper from '../components/ScreenWrapper';
import {
  StyleSheet, Text, Pressable, View,
  ActivityIndicator, RefreshControl,
} from 'react-native';
import ThemedAlert, { ThemedAlertButton } from '../components/ThemedAlert';
import { useAuth } from '../auth/AuthContext';
import { ensureUserProfile, UserProfile, deleteUserAccount } from '../services/userService';
import { logout } from '../services/authService';
import { Spacing, Typography, ThemeMode } from '../../constants/themes';
import { useAppTheme, useThemeControls } from '../context/ThemeContext';
import { checkFirestoreConnection } from '../services/firebase';
import Constants from 'expo-constants';



export default function ProfileScreen() {
  const { user }  = useAuth();
  const t         = useAppTheme();
  const isCalm = t.mode === 'calm';
  const { themeMode, setTheme } = useThemeControls();

  const [profile,    setProfile]    = useState<UserProfile | null>(null);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error,      setError]      = useState<string | null>(null);

  // Themed alert state
  const [alertVisible,  setAlertVisible]  = useState(false);
  const [alertTitle,    setAlertTitle]    = useState('');
  const [alertMessage,  setAlertMessage]  = useState('');
  const [alertButtons,  setAlertButtons]  = useState<ThemedAlertButton[]>([]);

  const showAlert = (
    title: string,
    message: string,
    buttons: ThemedAlertButton[] = [{ text: 'OK', style: 'default' }],
  ) => {
    setAlertTitle(title);
    setAlertMessage(message);
    setAlertButtons(buttons);
    setAlertVisible(true);
  };

  const fetchProfile = async () => {
    if (!user) return;
    try {
      setError(null);
      await checkFirestoreConnection(user.uid);
      const p = await ensureUserProfile(user.uid, user.email, user.displayName);
      setProfile(p);
    } catch (e: any) {
      console.warn('[Firestore profile]', e);
      setProfile(null);
      setError(e?.message || 'Could not load your Firestore profile.');
    }
    finally { setLoading(false); setRefreshing(false); }
  };

  useEffect(() => { fetchProfile(); }, [user]);
  const onRefresh = () => { setRefreshing(true); fetchProfile(); };

  const handleDeleteAccount = () => {
    showAlert(
      'Delete Account',
      'Are you absolutely sure? This will permanently erase your profile, stats, friends, and active matches. This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: async () => {
            try {
              if (!user?.uid) return;
              setLoading(true);
              await deleteUserAccount(user.uid);
              await logout();
            } catch (e: any) {
              setLoading(false);
              if (e.message === 'REAUTH_REQUIRED') {
                showAlert(
                  'Security Check',
                  'For your security, you must have logged in recently to delete your account. Please log out and log back in, then try again.',
                );
              } else {
                showAlert('Error', e.message || 'Failed to delete account. Please try again.');
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

  if (error || !profile) {
    return (
      <ScreenWrapper refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={t.primary} />
      }>
        <View style={[
          s.infoCard,
          {
            backgroundColor: t.card,
            borderColor: t.lose + '88',
            borderWidth: 1,
            marginTop: Spacing.xl,
          },
        ]}>
          <Text style={[s.sectionTitle, { color: t.lose, fontWeight: Typography.semibold as any }]}>
            FIRESTORE PROFILE ERROR
          </Text>
          <Text style={[s.errorText, { color: t.textPrimary }]}>
            {error || 'No profile document exists for this account.'}
          </Text>
          <Text style={[s.errorHint, { color: t.textSecondary }]}>
            Pull to retry after deploying Firestore rules.
          </Text>
        </View>
      </ScreenWrapper>
    );
  }

  const winRate = profile.wins + profile.losses > 0
    ? ((profile.wins / (profile.wins + profile.losses)) * 100).toFixed(1)
    : '0.0';

  const version = Constants.expoConfig?.version || '1.0.0';
  const versionCode = Constants.expoConfig?.android?.versionCode;
  const versionString = versionCode ? `Version ${version} (${versionCode})` : `Version ${version}`;


  const initial = profile.displayName.charAt(0).toUpperCase();

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
        <View style={[
          s.avatarRing,
          { borderColor: isCalm ? t.premiumBorder : t.border },
          isCalm ? (t.shadowElevation('md') as any) : (t.glowStrong(t.primary) as any),
        ]}>
          <View style={[s.avatarCircle, { backgroundColor: t.avatarBg }]}>
            <Text style={[
              s.avatarText,
              { color: t.primary, fontWeight: Typography.bold as any },
              isCalm ? {} : (t.textGlow(t.primary) as any),
            ]}>
              {initial}
            </Text>
          </View>
        </View>
        <Text style={[
          s.name,
          { color: t.textPrimary, fontWeight: Typography.bold as any },
          isCalm ? {} : (t.textGlow(t.primary) as any),
        ]}>
          {profile.displayName}
        </Text>
        <View style={[
          s.gameIdBadge,
          {
            backgroundColor: t.card,
            borderColor: isCalm ? t.premiumBorder : t.primary + '55',
            borderWidth: isCalm ? 0.8 : 1,
          },
        ]}>
          <Text style={[
            s.gameIdText,
            { color: t.primary, fontWeight: Typography.semibold as any },
            isCalm ? {} : (t.textGlow(t.primary) as any),
          ]}>
            ID: {profile.gameId}
          </Text>
        </View>
      </View>

      {/* Stats */}
      <View style={[
        s.statsRow,
        {
          backgroundColor: t.card,
          borderColor: isCalm ? t.premiumBorder : t.border,
          borderWidth: isCalm ? 0.8 : 1,
        },
        isCalm ? (t.shadowElevation('md') as any) : (t.glow(t.primary, 6) as any),
      ]}>
        <View style={s.statBox}>
          <Text style={[s.statVal, { color: t.success, fontWeight: Typography.bold as any }]}>
            {profile.wins}
          </Text>
          <Text style={[s.statLab, { color: t.textSecondary, fontWeight: Typography.semibold as any }]}>
            WINS
          </Text>
        </View>
        <View style={[s.statDivider, { backgroundColor: isCalm ? 'rgba(200,155,109,0.15)' : t.border }]} />
        <View style={s.statBox}>
          <Text style={[s.statVal, { color: t.lose, fontWeight: Typography.bold as any }]}>
            {profile.losses}
          </Text>
          <Text style={[s.statLab, { color: t.textSecondary, fontWeight: Typography.semibold as any }]}>
            LOSSES
          </Text>
        </View>
        <View style={[s.statDivider, { backgroundColor: isCalm ? 'rgba(200,155,109,0.15)' : t.border }]} />
        <View style={s.statBox}>
          <Text style={[s.statVal, { color: t.secondary, fontWeight: Typography.bold as any }]}>
            {winRate}%
          </Text>
          <Text style={[s.statLab, { color: t.textSecondary, fontWeight: Typography.semibold as any }]}>
            WIN RATE
          </Text>
        </View>
      </View>

      {/* Account Info */}
      <View style={[
        s.infoCard,
        {
          backgroundColor: t.card,
          borderColor: isCalm ? t.premiumBorder : t.border,
          borderWidth: isCalm ? 0.8 : 1,
        },
        isCalm ? (t.shadowElevation('sm') as any) : {},
      ]}>
        <Text style={[s.sectionTitle, { color: t.textSecondary, fontWeight: Typography.semibold as any }]}>
          ACCOUNT INFO
        </Text>
        <View style={[s.infoRow, { borderBottomColor: isCalm ? 'rgba(200,155,109,0.1)' : t.border }]}>
          <Text style={[s.infoLabel, { color: t.textSecondary }]}>Email</Text>
          <Text style={[s.infoValue, { color: t.textPrimary, fontWeight: Typography.medium as any }]} numberOfLines={1}>
            {profile.email}
          </Text>
        </View>
        <View style={[s.infoRow, { borderBottomWidth: 0 }]}>
          <Text style={[s.infoLabel, { color: t.textSecondary }]}>Member Since</Text>
          <Text style={[s.infoValue, { color: t.textPrimary, fontWeight: Typography.medium as any }]}>
            {profile?.createdAt?.toDate
              ? profile.createdAt.toDate().toLocaleDateString()
              : '—'}
          </Text>
        </View>
      </View>

      {/* ── Theme Toggle ──────────────────────────────────── */}
      <View style={[
        s.infoCard,
        {
          backgroundColor: t.card,
          borderColor: isCalm ? t.premiumBorder : t.border,
          borderWidth: isCalm ? 0.8 : 1,
        },
        isCalm ? (t.shadowElevation('sm') as any) : {},
      ]}>
        <Text style={[s.sectionTitle, { color: t.textSecondary, fontWeight: Typography.semibold as any }]}>
          APPEARANCE
        </Text>

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
                    backgroundColor: active ? (isCalm ? t.primary + '18' : 'rgba(168,85,247,0.08)') : t.bg,
                    borderColor:     active ? t.primary : t.border,
                    borderWidth:     active ? 1.2 : 0.8,
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
          {
            backgroundColor: t.mode === 'arcade' ? '#161622' : t.bg,
            borderColor: t.mode === 'arcade' ? 'rgba(248,113,113,0.35)' : t.accent + '88',
          },
          t.glow(t.lose, 6) as any,
          pressed && { opacity: 0.75, transform: [{ scale: 0.98 }] },
        ]}
        onPress={logout}
      >
        <Text style={[s.logoutText, { color: t.mode === 'arcade' ? t.lose : t.accent }]}>⏻  LOGOUT</Text>
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

      <View style={s.versionContainer}>
        <Text style={[s.versionText, { color: t.textSecondary }]}>
          {versionString}
        </Text>
      </View>
      <ThemedAlert
        visible={alertVisible}
        title={alertTitle}
        message={alertMessage}
        buttons={alertButtons}
        onDismiss={() => setAlertVisible(false)}
      />
    </ScreenWrapper>
  );
}

const s = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  // Avatar
  avatarSection: { alignItems: 'center', marginTop: Spacing.md, marginBottom: Spacing.lg },
  avatarRing: {
    width: 112, height: 112, borderRadius: 56,
    borderWidth: 0.8, justifyContent: 'center', alignItems: 'center', marginBottom: 16,
  },
  avatarCircle: {
    width: 96, height: 96, borderRadius: 48,
    justifyContent: 'center', alignItems: 'center',
  },
  avatarText:   { fontSize: 40, fontWeight: '700' },
  name:         { fontSize: 26, fontWeight: '700', marginBottom: 10 },
  gameIdBadge:  { borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 0.8 },
  gameIdText:   { fontSize: 13, fontWeight: '600', letterSpacing: 0.5 },

  // Stats
  statsRow: {
    flexDirection: 'row', borderRadius: 16, padding: Spacing.lg,
    borderWidth: 0.8, alignItems: 'center', marginBottom: Spacing.md,
  },
  statBox:     { flex: 1, alignItems: 'center' },
  statVal:     { fontSize: 22, fontWeight: '700', marginBottom: 6 },
  statLab:     { fontSize: 9, fontWeight: '600', letterSpacing: 0.8 },
  statDivider: { width: 0.8, height: 36 },

  // Info card (shared)
  infoCard: {
    borderRadius: 16, padding: Spacing.lg,
    borderWidth: 0.8, marginBottom: Spacing.lg,
  },
  sectionTitle: { fontSize: 11, fontWeight: '600', letterSpacing: 1, marginBottom: Spacing.lg },
  infoRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    paddingVertical: 14, borderBottomWidth: 0.8,
  },
  infoLabel: { fontSize: 13, fontWeight: '500', color: '#7B7B7B' },
  infoValue: { fontSize: 13, fontWeight: '600', maxWidth: '60%', textAlign: 'right' },
  errorText: { fontSize: 14, lineHeight: 20, marginBottom: Spacing.sm },
  errorHint: { fontSize: 12, lineHeight: 18 },

  // Theme toggle
  themeGrid: { flexDirection: 'row', gap: Spacing.md },
  themeCard: {
    flex: 1, borderRadius: 12, padding: Spacing.md,
    alignItems: 'center', position: 'relative', overflow: 'hidden',
    borderWidth: 0.8,
  },
  themeIcon:  { fontSize: 28, marginBottom: 8 },
  themeLabel: { fontSize: 13, fontWeight: '700', letterSpacing: 0.3, marginBottom: 4 },
  themeDesc:  { fontSize: 11, textAlign: 'center', lineHeight: 15, fontWeight: '400' },
  activeCheck: {
    position: 'absolute', top: 8, right: 8,
    width: 18, height: 18, borderRadius: 9,
    justifyContent: 'center', alignItems: 'center',
  },
  activeCheckText: { color: '#FFF', fontSize: 10, fontWeight: '700' },

  // Logout
  logoutBtn: {
    borderRadius: 12, padding: Spacing.lg,
    alignItems: 'center', borderWidth: 0.8, marginBottom: Spacing.xl,
  },
  logoutText: { fontSize: 14, fontWeight: '700', letterSpacing: 0.5 },

  // Delete
  deleteBtn: { alignItems: 'center', paddingVertical: Spacing.md, marginBottom: Spacing.xl },
  deleteText: { fontSize: 11, fontWeight: '600', letterSpacing: 0.3, textDecorationLine: 'underline' },

  // Version info
  versionContainer: {
    alignItems: 'center',
    paddingVertical: Spacing.md,
    marginBottom: Spacing.xl,
  },
  versionText: {
    fontSize: 12,
    fontWeight: '500',
    opacity: 0.6,
  },
});
