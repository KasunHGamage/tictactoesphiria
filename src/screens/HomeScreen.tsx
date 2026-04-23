// ─────────────────────────────────────────────
//  HomeScreen.tsx — Dashboard & Overview
// ─────────────────────────────────────────────

import React, { useEffect, useState } from 'react';
import { 
  StyleSheet, Text, View, SafeAreaView, ScrollView, 
  Pressable, ActivityIndicator, Image 
} from 'react-native';
import { useAuth } from '../auth/AuthContext';
import { getUserProfile, UserProfile } from '../services/userService';

const C = {
  bg: '#0D0D1A', card: '#1C1C3A', border: '#2A2A5A',
  accent: '#7C5CFC', accentGlow: '#9B7DFF', 
  textPrimary: '#F0F0FF', textSecondary: '#8888AA',
};

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
      <View style={[s.safe, s.center]}>
        <ActivityIndicator color={C.accent} size="large" />
      </View>
    );
  }

  return (
    <SafeAreaView style={s.safe}>
      <ScrollView contentContainerStyle={s.scroll}>
        <View style={s.welcomeSection}>
          <Text style={s.welcomeLabel}>WELCOME BACK,</Text>
          <Text style={s.userName}>{profile?.displayName} 🎮</Text>
        </View>

        <View style={s.quickStats}>
          <View style={s.statItem}>
            <Text style={s.statVal}>{profile?.wins}</Text>
            <Text style={s.statLab}>WINS</Text>
          </View>
          <View style={s.statDivider} />
          <View style={s.statItem}>
            <Text style={s.statVal}>{profile?.gameId}</Text>
            <Text style={s.statLab}>GAME ID</Text>
          </View>
        </View>

        <View style={s.promoCard}>
          <Text style={s.promoTitle}>Challenge a Friend</Text>
          <Text style={s.promoDesc}>
            Connect with friends using their Game ID and battle for the top spot!
          </Text>
          <Pressable style={s.promoBtn} onPress={() => navigation.navigate('Friends')}>
            <Text style={s.promoBtnText}>Go to Social Hub</Text>
          </Pressable>
        </View>

        <View style={s.actionGrid}>
          <Pressable style={s.actionCard} onPress={() => navigation.navigate('Play')}>
            <Text style={s.actionIcon}>⚔️</Text>
            <Text style={s.actionText}>Play Now</Text>
          </Pressable>
          <Pressable style={s.actionCard} onPress={() => navigation.navigate('Leaders')}>
            <Text style={s.actionIcon}>🏆</Text>
            <Text style={s.actionText}>Rankings</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  center: { justifyContent: 'center', alignItems: 'center' },
  scroll: { padding: 24 },
  welcomeSection: { marginBottom: 32 },
  welcomeLabel: { fontSize: 12, fontWeight: '800', color: C.textSecondary, letterSpacing: 2 },
  userName: { fontSize: 32, fontWeight: '900', color: C.textPrimary, marginTop: 4 },
  quickStats: { 
    flexDirection: 'row', backgroundColor: C.card, borderRadius: 20, 
    padding: 24, marginBottom: 32, borderWidth: 1, borderColor: C.border, alignItems: 'center' 
  },
  statItem: { flex: 1, alignItems: 'center' },
  statVal: { fontSize: 20, fontWeight: '900', color: C.accentGlow },
  statLab: { fontSize: 10, fontWeight: '800', color: C.textSecondary, marginTop: 4, letterSpacing: 1 },
  statDivider: { width: 1, height: 30, backgroundColor: C.border },
  promoCard: { 
    backgroundColor: C.accent, borderRadius: 24, padding: 24, marginBottom: 32,
    shadowColor: C.accent, shadowOpacity: 0.4, shadowRadius: 15
  },
  promoTitle: { fontSize: 22, fontWeight: '900', color: '#fff', marginBottom: 8 },
  promoDesc: { fontSize: 14, color: '#F0F0FF', lineHeight: 20, marginBottom: 20, opacity: 0.9 },
  promoBtn: { backgroundColor: '#fff', borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
  promoBtnText: { color: C.accent, fontWeight: '800', fontSize: 14 },
  actionGrid: { flexDirection: 'row', gap: 16 },
  actionCard: { 
    flex: 1, backgroundColor: C.card, borderRadius: 20, padding: 20, 
    alignItems: 'center', borderWidth: 1, borderColor: C.border 
  },
  actionIcon: { fontSize: 32, marginBottom: 12 },
  actionText: { fontSize: 14, fontWeight: '800', color: C.textPrimary },
});
