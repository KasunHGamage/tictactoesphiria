// ─────────────────────────────────────────────
//  ProfileScreen.tsx — User Stats & Logout
// ─────────────────────────────────────────────

import React, { useEffect, useState } from 'react';
import { 
  StyleSheet, Text, Pressable, View, SafeAreaView, 
  ActivityIndicator, ScrollView, RefreshControl 
} from 'react-native';
import { useAuth } from '../auth/AuthContext';
import { getUserProfile, UserProfile } from '../services/userService';
import { logout } from '../services/authService';

const C = {
  bg: '#0D0D1A', card: '#1C1C3A', border: '#2A2A5A',
  accent: '#7C5CFC', accentGlow: '#9B7DFF', 
  textPrimary: '#F0F0FF', textSecondary: '#8888AA',
  xColor: '#FF6B8A', oColor: '#4FC3F7',
};

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

  useEffect(() => {
    fetchProfile();
  }, [user]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchProfile();
  };

  if (loading) {
    return (
      <View style={[s.safe, s.center]}>
        <ActivityIndicator color={C.accent} size="large" />
      </View>
    );
  }

  const winRate = profile && (profile.wins + profile.losses > 0)
    ? ((profile.wins / (profile.wins + profile.losses)) * 100).toFixed(1)
    : '0.0';

  return (
    <SafeAreaView style={s.safe}>
      <ScrollView 
        contentContainerStyle={s.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.accent} />}
      >
        <View style={s.header}>
          <View style={s.avatarCircle}>
            <Text style={s.avatarText}>{profile?.displayName?.charAt(0).toUpperCase()}</Text>
          </View>
          <Text style={s.name}>{profile?.displayName}</Text>
          <View style={s.gameIdBadge}>
            <Text style={s.gameIdText}>ID: {profile?.gameId}</Text>
          </View>
        </View>

        <View style={s.statsContainer}>
          <View style={s.statBox}>
            <Text style={s.statValue}>{profile?.wins}</Text>
            <Text style={s.statLabel}>WINS</Text>
          </View>
          <View style={s.statBox}>
            <Text style={s.statValue}>{profile?.losses}</Text>
            <Text style={s.statLabel}>LOSSES</Text>
          </View>
          <View style={s.statBox}>
            <Text style={s.statValue}>{winRate}%</Text>
            <Text style={s.statLabel}>WIN RATE</Text>
          </View>
        </View>

        <View style={s.infoSection}>
          <Text style={s.sectionTitle}>ACCOUNT INFO</Text>
          <View style={s.infoRow}>
            <Text style={s.infoLabel}>Email</Text>
            <Text style={s.infoValue}>{profile?.email}</Text>
          </View>
          <View style={s.infoRow}>
            <Text style={s.infoLabel}>Member Since</Text>
            <Text style={s.infoValue}>
              {profile?.createdAt?.toDate ? profile.createdAt.toDate().toLocaleDateString() : '—'}
            </Text>
          </View>
        </View>

        <Pressable style={s.logoutBtn} onPress={logout}>
          <Text style={s.logoutBtnText}>Logout</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  center: { justifyContent: 'center', alignItems: 'center' },
  scroll: { padding: 24, paddingBottom: 40 },
  header: { alignItems: 'center', marginBottom: 32 },
  avatarCircle: { 
    width: 100, height: 100, borderRadius: 50, backgroundColor: C.card, 
    borderWidth: 2, borderColor: C.accent, justifyContent: 'center', alignItems: 'center',
    marginBottom: 16, shadowColor: C.accent, shadowOpacity: 0.2, shadowRadius: 15
  },
  avatarText: { fontSize: 40, fontWeight: '900', color: C.accentGlow },
  name: { fontSize: 24, fontWeight: '800', color: C.textPrimary, marginBottom: 8 },
  gameIdBadge: { backgroundColor: C.border, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 4 },
  gameIdText: { fontSize: 14, color: C.accentGlow, fontWeight: '700', letterSpacing: 1 },
  statsContainer: { 
    flexDirection: 'row', backgroundColor: C.card, borderRadius: 20, 
    padding: 20, marginBottom: 32, borderWidth: 1, borderColor: C.border 
  },
  statBox: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: 24, fontWeight: '900', color: C.textPrimary, marginBottom: 4 },
  statLabel: { fontSize: 10, fontWeight: '800', color: C.textSecondary, letterSpacing: 1 },
  infoSection: { marginBottom: 32 },
  sectionTitle: { fontSize: 12, fontWeight: '800', color: C.textSecondary, letterSpacing: 2, marginBottom: 16 },
  infoRow: { 
    flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 12, 
    borderBottomWidth: 1, borderBottomColor: C.border 
  },
  infoLabel: { fontSize: 14, color: C.textSecondary },
  infoValue: { fontSize: 14, color: C.textPrimary, fontWeight: '600' },
  logoutBtn: { 
    backgroundColor: '#2A1010', borderRadius: 14, padding: 18, alignItems: 'center', 
    borderWidth: 1, borderColor: '#4A1010' 
  },
  logoutBtnText: { color: '#FF6B8A', fontSize: 16, fontWeight: '800' },
});
