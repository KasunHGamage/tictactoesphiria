import React, { useEffect, useState, useContext } from 'react';
import ScreenWrapper from '../components/ScreenWrapper';
import {
  StyleSheet, Text, View,
  ActivityIndicator, RefreshControl, FlatList,
} from 'react-native';
import { collection, query, orderBy, limit, getDocs, getCountFromServer, where } from 'firebase/firestore';
import { db } from '../services/firebase';
import { UserProfile, getUserProfile } from '../services/userService';
import { AuthContext } from '../auth/AuthContext';
import { Spacing } from '../../constants/themes';
import { useAppTheme } from '../context/ThemeContext';


const MEDALS      = ['🥇', '🥈', '🥉'];
const RANK_COLORS_ARCADE = ['#FFD60A', '#C0C0D0', '#CD7F32'];
const RANK_COLORS_CALM   = ['#D4A574', '#8B6F47', '#6B6B6B'];

export default function LeaderboardScreen() {
  const t = useAppTheme();
  const rankColors = t.mode === 'arcade' ? RANK_COLORS_ARCADE : RANK_COLORS_CALM;

  const { user } = useContext(AuthContext);
  const [listData,   setListData]   = useState<any[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchLeaders = async () => {
    try {
      const q    = query(collection(db, 'users'), orderBy('wins', 'desc'), limit(20));
      const snap = await getDocs(q);
      const docs = snap.docs.map(d => d.data() as UserProfile);
      
      let items: any[] = docs.map((d, i) => ({ type: 'player', data: d, rank: i + 1 }));

      if (user?.uid) {
        const index = docs.findIndex(d => d.uid === user.uid);
        if (index === -1) {
          const profile = await getUserProfile(user.uid);
          if (profile) {
            const rankQ = query(collection(db, 'users'), where('wins', '>', profile.wins));
            const rankSnap = await getCountFromServer(rankQ);
            const rank = rankSnap.data().count + 1;
            
            items.push({ type: 'separator', id: 'separator' });
            items.push({ type: 'player', data: profile, rank });
          }
        }
      }
      setListData(items);
    } catch (e) { console.error(e); }
    finally { setLoading(false); setRefreshing(false); }
  };

  useEffect(() => { fetchLeaders(); }, []);
  const onRefresh = () => { setRefreshing(true); fetchLeaders(); };

  const renderItem = ({ item }: { item: any }) => {
    if (item.type === 'separator') {
      return (
        <View style={{ alignItems: 'center', marginVertical: 8 }}>
          <Text style={{ fontSize: 24, fontWeight: '900', color: t.textSecondary, letterSpacing: 5 }}>...</Text>
        </View>
      );
    }

    const { data: profile, rank } = item;
    const isTop3    = rank <= 3;
    const rankColor = isTop3 ? rankColors[rank - 1] : t.textSecondary;
    const winRate   = (profile.wins + profile.losses > 0)
      ? ((profile.wins / (profile.wins + profile.losses)) * 100).toFixed(0)
      : '0';
    const isMe = profile.uid === user?.uid;

    return (
      <View style={[
        s.item,
        { backgroundColor: isMe ? t.primary + '18' : t.card, borderColor: isMe ? t.primary : t.border },
        isTop3 && !isMe && { borderColor: rankColor + '88' },
        isTop3 && !isMe ? t.glow(rankColor, 8) as any : {},
        isMe ? t.glow(t.primary, 8) as any : {},
        isMe && { borderWidth: 2 }
      ]}>
        <View style={s.rankCol}>
          {isTop3
            ? <Text style={s.medal}>{MEDALS[rank - 1]}</Text>
            : <Text style={[s.rankNum, { color: rankColor }]}>{rank}</Text>
          }
        </View>
        <View style={s.infoCol}>
          <Text style={[s.nameText, { color: isMe ? t.primary : t.textPrimary }]} numberOfLines={1}>
            {profile.displayName}
            {isMe && <Text style={{ color: t.primary, fontWeight: '900' }}> (You)</Text>}
          </Text>
          <Text style={[s.idText,   { color: t.textSecondary }]}>ID: {profile.gameId}</Text>
        </View>
        <View style={s.statsCol}>
          <Text style={[s.winsText, { color: isTop3 ? rankColor : t.primary }]}>{profile.wins} W</Text>
          <Text style={[s.rateText, { color: t.textSecondary }]}>{winRate}%</Text>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={[s.center, { backgroundColor: t.bg }]}>
        <ActivityIndicator color={t.primary} size="large" />
      </View>
    );
  }

  return (
    <ScreenWrapper scroll={false} horizontalPadding={0}>
      <View style={s.header}>
        <Text style={[s.eyebrow, { color: t.warning, ...(t.textGlow(t.warning) as any) }]}>
          🏆 GLOBAL RANKINGS
        </Text>
        <Text style={[s.title, { color: t.textPrimary, ...(t.textGlow(t.primary) as any) }]}>
          Leaderboard
        </Text>
        <Text style={[s.subtitle, { color: t.textSecondary }]}>Top players by total wins</Text>
      </View>

      <FlatList
        data={listData}
        renderItem={renderItem}
        keyExtractor={item => item.type === 'separator' ? 'separator' : item.data.uid}
        contentContainerStyle={s.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={t.primary} />
        }
        ListEmptyComponent={
          <Text style={[s.empty, { color: t.textSecondary }]}>No rankings available yet.</Text>
        }
        showsVerticalScrollIndicator={false}
      />
    </ScreenWrapper>
  );
}

const s = StyleSheet.create({
  center:   { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header:   { paddingHorizontal: Spacing.md, marginTop: Spacing.sm, marginBottom: Spacing.lg },
  eyebrow:  { fontSize: 10, fontWeight: '900', letterSpacing: 3, marginBottom: 8 },
  title:    { fontSize: 30, fontWeight: '900', letterSpacing: 0.5, marginBottom: 4 },
  subtitle: { fontSize: 13 },
  list:     { paddingHorizontal: Spacing.md, paddingBottom: 100 },
  item: {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: 16, padding: Spacing.md,
    marginBottom: 10, borderWidth: 1,
  },
  rankCol:  { width: 44, alignItems: 'center' },
  medal:    { fontSize: 22 },
  rankNum:  { fontSize: 18, fontWeight: '900' },
  infoCol:  { flex: 1, marginLeft: 10 },
  nameText: { fontSize: 15, fontWeight: '800' },
  idText:   { fontSize: 11, marginTop: 2, letterSpacing: 0.5 },
  statsCol: { alignItems: 'flex-end' },
  winsText: { fontSize: 15, fontWeight: '900' },
  rateText: { fontSize: 11, marginTop: 2 },
  empty:    { textAlign: 'center', marginTop: 60, fontSize: 15 },
});
