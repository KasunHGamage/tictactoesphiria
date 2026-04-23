// ─────────────────────────────────────────────
//  LeaderboardScreen.tsx — Global Rankings
// ─────────────────────────────────────────────

import React, { useEffect, useState } from 'react';
import { 
  StyleSheet, Text, View, SafeAreaView, FlatList, 
  ActivityIndicator, RefreshControl, Image 
} from 'react-native';
import { collection, query, orderBy, limit, getDocs } from 'firebase/firestore';
import { db } from '../multiplayer/firebase';
import { UserProfile } from '../services/userService';

const C = {
  bg: '#0D0D1A', card: '#1C1C3A', border: '#2A2A5A',
  accent: '#7C5CFC', accentGlow: '#9B7DFF', 
  textPrimary: '#F0F0FF', textSecondary: '#8888AA',
  gold: '#FFD700', silver: '#C0C0C0', bronze: '#CD7F32',
};

export default function LeaderboardScreen() {
  const [leaders, setLeaders] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchLeaders = async () => {
    try {
      const q = query(collection(db, 'users'), orderBy('wins', 'desc'), limit(50));
      const snap = await getDocs(q);
      const data = snap.docs.map(d => d.data() as UserProfile);
      setLeaders(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchLeaders();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchLeaders();
  };

  const renderItem = ({ item, index }: { item: UserProfile, index: number }) => {
    const rank = index + 1;
    const rankColor = rank === 1 ? C.gold : rank === 2 ? C.silver : rank === 3 ? C.bronze : C.textSecondary;
    
    const winRate = (item.wins + item.losses > 0)
      ? ((item.wins / (item.wins + item.losses)) * 100).toFixed(0)
      : '0';

    return (
      <View style={s.item}>
        <View style={s.rankContainer}>
          <Text style={[s.rankText, { color: rankColor }]}>{rank}</Text>
        </View>
        <View style={s.infoContainer}>
          <Text style={s.nameText}>{item.displayName}</Text>
          <Text style={s.idText}>ID: {item.gameId}</Text>
        </View>
        <View style={s.statsContainer}>
          <Text style={s.winsText}>{item.wins} Wins</Text>
          <Text style={s.rateText}>{winRate}% Rate</Text>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={[s.safe, s.center]}>
        <ActivityIndicator color={C.accent} size="large" />
      </View>
    );
  }

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.header}>
        <Text style={s.title}>Leaderboard</Text>
        <Text style={s.subtitle}>Global top players by total wins</Text>
      </View>
      
      <FlatList
        data={leaders}
        renderItem={renderItem}
        keyExtractor={item => item.uid}
        contentContainerStyle={s.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.accent} />}
        ListEmptyComponent={<Text style={s.empty}>No rankings available yet.</Text>}
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  center: { justifyContent: 'center', alignItems: 'center' },
  header: { padding: 24, paddingBottom: 16 },
  title: { fontSize: 28, fontWeight: '900', color: C.accentGlow, letterSpacing: 1 },
  subtitle: { fontSize: 14, color: C.textSecondary, marginTop: 4 },
  list: { paddingHorizontal: 24, paddingBottom: 40 },
  item: { 
    flexDirection: 'row', alignItems: 'center', backgroundColor: C.card, 
    borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: C.border 
  },
  rankContainer: { width: 40, alignItems: 'center' },
  rankText: { fontSize: 20, fontWeight: '900' },
  infoContainer: { flex: 1, marginLeft: 12 },
  nameText: { fontSize: 16, fontWeight: '700', color: C.textPrimary },
  idText: { fontSize: 12, color: C.textSecondary, marginTop: 2 },
  statsContainer: { alignItems: 'flex-end' },
  winsText: { fontSize: 16, fontWeight: '800', color: C.accentGlow },
  rateText: { fontSize: 12, color: C.textSecondary, marginTop: 2 },
  empty: { textAlign: 'center', color: C.textSecondary, marginTop: 40, fontSize: 16 },
});
