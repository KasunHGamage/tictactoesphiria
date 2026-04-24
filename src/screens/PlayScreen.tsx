import React, { useEffect, useState } from 'react';
import ScreenWrapper from '../components/ScreenWrapper';
import { 
  StyleSheet, Text, View, Pressable, StatusBar, Alert 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../auth/AuthContext';
import { listenToFriends } from '../services/friendsService';
import { getUserProfile } from '../services/userService';

const C = {
  bg: '#0D0D1A', card: '#1C1C3A', border: '#2A2A5A',
  accent: '#7C5CFC', accentGlow: '#9B7DFF', accentDim: '#3D2E7C',
  textPrimary: '#F0F0FF', textSecondary: '#8888AA',
  success: '#4ADE80',
};

export default function PlayScreen({ navigation }: any) {
  const { user } = useAuth();
  const [onlineCount, setOnlineCount] = useState(0);

  useEffect(() => {
    if (!user) return;

    const unsub = listenToFriends(user.uid, async (uids) => {
      const profiles = await Promise.all(uids.map(uid => getUserProfile(uid)));
      const online = profiles.filter(p => p?.status === 'online').length;
      setOnlineCount(online);
    });

    return unsub;
  }, [user]);

  return (
    <ScreenWrapper>
      <StatusBar barStyle="light-content" />
      <View style={s.header}>
        <Text style={s.title}>Battle Arena</Text>
        <Text style={s.subtitle}>Choose your challenge</Text>
      </View>

      <View style={s.content}>
        <View style={s.cardContainer}>
          {/* Practice vs AI */}
          <Pressable 
            style={({ pressed }) => [s.modeCard, pressed && s.cardPressed]}
            onPress={() => navigation.navigate('GameSetup', { mode: 'ai' })}
          >
            <View style={s.iconCircle}>
              <Ionicons name="desktop-outline" size={32} color={C.textSecondary} />
            </View>
            <View style={s.cardInfo}>
              <Text style={s.cardTitle}>Practice vs AI</Text>
              <Text style={s.cardDesc}>Sharpen your skills against our smart engine.</Text>
            </View>
          </Pressable>

          {/* Play with Friend — PREMIUM CARD */}
          <Pressable 
            style={({ pressed }) => [s.modeCard, s.friendCard, pressed && s.cardPressed]}
            onPress={() => navigation.navigate('GameSetup', { mode: 'friend' })}
          >
            <View style={[s.iconCircle, s.friendIconCircle]}>
              <Ionicons name="people" size={32} color="#FFF" />
            </View>
            <View style={s.cardInfo}>
              <View style={s.titleRow}>
                <Text style={s.cardTitle}>Play with Friend</Text>
                {onlineCount > 0 && (
                  <View style={s.onlineBadge}>
                    <View style={s.onlineDot} />
                    <Text style={s.onlineText}>{onlineCount} Online</Text>
                  </View>
                )}
              </View>
              <Text style={[s.cardDesc, { color: '#D0D0FF' }]}>Challenge your friends in real-time matches</Text>
              <Text style={s.hintText}>Invite and play instantly →</Text>
            </View>
          </Pressable>

          {/* Global Lobby */}
          <Pressable 
            style={({ pressed }) => [s.modeCard, s.multiCard, pressed && s.cardPressed]}
            onPress={() => Alert.alert('Coming Soon', 'Global matchmaking is currently under development.')}
          >
            <View style={s.iconCircle}>
              <Ionicons name="globe-outline" size={32} color={C.textSecondary} />
            </View>
            <View style={s.cardInfo}>
              <Text style={s.cardTitle}>Global Lobby</Text>
              <Text style={s.cardDesc}>Match with random players worldwide (Coming Soon).</Text>
            </View>
          </Pressable>
        </View>

        <View style={s.footer}>
          <View style={s.tipBox}>
            <Text style={s.tipTitle}>💡 PRO TIP</Text>
            <Text style={s.tipText}>
              Higher win rates move you up the global leaderboard. Keep practicing!
            </Text>
          </View>
        </View>
      </View>
    </ScreenWrapper>
  );
}

const s = StyleSheet.create({
  header: { marginTop: 10, marginBottom: 20 },
  content: { marginTop: 20, gap: 20 },
  footer: { marginTop: 20 },
  title: { fontSize: 32, fontWeight: '900', color: C.accentGlow, letterSpacing: 1 },
  subtitle: { fontSize: 16, color: C.textSecondary, marginTop: 4 },
  cardContainer: { gap: 16 },
  modeCard: { 
    flexDirection: 'row', backgroundColor: C.card, borderRadius: 24, 
    padding: 20, alignItems: 'center', borderWidth: 1, borderColor: C.border,
  },
  friendCard: { 
    backgroundColor: '#1E1E45', borderColor: C.accent, 
    shadowColor: C.accent, shadowOpacity: 0.3, shadowRadius: 15, elevation: 10,
    borderWidth: 1.5,
  },
  multiCard: { opacity: 0.6 },
  cardPressed: { opacity: 0.8, transform: [{ scale: 0.98 }] },
  iconCircle: { 
    width: 60, height: 60, borderRadius: 30, backgroundColor: '#0D0D1A', 
    justifyContent: 'center', alignItems: 'center', marginRight: 16,
    borderWidth: 1, borderColor: C.border
  },
  friendIconCircle: { backgroundColor: C.accent, borderColor: C.accentGlow },
  cardInfo: { flex: 1 },
  titleRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4, gap: 8 },
  cardTitle: { fontSize: 18, fontWeight: '800', color: C.textPrimary },
  cardDesc: { fontSize: 13, color: C.textSecondary, lineHeight: 18 },
  hintText: { fontSize: 12, fontWeight: '700', color: C.accentGlow, marginTop: 8 },
  onlineBadge: { 
    flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(74, 222, 128, 0.1)', 
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, borderWidth: 1, borderColor: 'rgba(74, 222, 128, 0.2)' 
  },
  onlineDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: C.success, marginRight: 6 },
  onlineText: { fontSize: 10, fontWeight: '800', color: C.success },
  tipBox: { 
    backgroundColor: C.accentDim, borderRadius: 16, 
    padding: 20, borderWidth: 1, borderColor: C.accent 
  },
  tipTitle: { fontSize: 12, fontWeight: '900', color: C.accentGlow, marginBottom: 8, letterSpacing: 1 },
  tipText: { color: C.textPrimary, fontSize: 14, lineHeight: 22, fontWeight: '500' },
});
