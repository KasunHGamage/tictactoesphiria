import React, { useEffect, useState } from 'react';
import ScreenWrapper from '../components/ScreenWrapper';
import {
  StyleSheet, Text, View, FlatList,
  ActivityIndicator, RefreshControl
} from 'react-native';
import { collection, query, orderBy, limit, getDocs } from 'firebase/firestore';
import { db } from '../services/firebase';
import { UserProfile } from '../services/userService';
import { Colors, Spacing, glow, textGlow } from '../../constants/theme';

const MEDALS = ['🥇', '🥈', '🥉'];
const RANK_COLORS = [Colors.neonYellow, '#C0C0D0', '#CD7F32'];

export default function LeaderboardScreen() {
  const [leaders, setLeaders] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchLeaders = async () => {
    try {
      const q = query(collection(db, 'users'), orderBy('wins', 'desc'), limit(50));
      const snap = await getDocs(q);
      setLeaders(snap.docs.map(d => d.data() as UserProfile));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { fetchLeaders(); }, []);
  const onRefresh = () => { setRefreshing(true); fetchLeaders(); };

  const renderItem = ({ item, index }: { item: UserProfile; index: number }) => {
    const rank = index + 1;
    const isTop3 = rank <= 3;
    const rankColor = isTop3 ? RANK_COLORS[rank - 1] : Colors.textSecondary;
    const winRate = (item.wins + item.losses > 0)
      ? ((item.wins / (item.wins + item.losses)) * 100).toFixed(0)
      : '0';

    return (
      <View style={[
        s.item,
        isTop3 && {
          borderColor: rankColor + '88',
          ...(glow(rankColor, isTop3 ? 8 : 0) as any),
        },
      ]}>
        {/* Rank */}
        <View style={s.rankCol}>
          {isTop3
            ? <Text style={s.medal}>{MEDALS[rank - 1]}</Text>
            : <Text style={[s.rankNum, { color: rankColor }]}>{rank}</Text>
          }
        </View>

        {/* Info */}
        <View style={s.infoCol}>
          <Text style={s.nameText} numberOfLines={1}>{item.displayName}</Text>
          <Text style={s.idText}>ID: {item.gameId}</Text>
        </View>

        {/* Stats */}
        <View style={s.statsCol}>
          <Text style={[s.winsText, isTop3 && { color: rankColor }]}>
            {item.wins} W
          </Text>
          <Text style={s.rateText}>{winRate}%</Text>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={s.center}>
        <ActivityIndicator color={Colors.neonPurple} size="large" />
      </View>
    );
  }

  return (
    <ScreenWrapper scroll={false} horizontalPadding={0}>
      <View style={s.header}>
        <Text style={s.eyebrow}>🏆 GLOBAL RANKINGS</Text>
        <Text style={s.title}>Leaderboard</Text>
        <Text style={s.subtitle}>Top players by total wins</Text>
      </View>

      <FlatList
        data={leaders}
        renderItem={renderItem}
        keyExtractor={item => item.uid}
        contentContainerStyle={s.list}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={Colors.neonPurple}
          />
        }
        ListEmptyComponent={
          <Text style={s.empty}>No rankings available yet.</Text>
        }
        showsVerticalScrollIndicator={false}
      />
    </ScreenWrapper>
  );
}

const s = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.bg },
  header: { paddingHorizontal: Spacing.md, marginTop: Spacing.sm, marginBottom: Spacing.lg },
  eyebrow: {
    fontSize: 10, fontWeight: '900', color: Colors.neonYellow,
    letterSpacing: 3, marginBottom: 8,
    ...textGlow(Colors.neonYellow),
  },
  title: {
    fontSize: 30, fontWeight: '900', color: Colors.textPrimary,
    letterSpacing: 0.5, marginBottom: 4,
    ...textGlow(Colors.neonPurple),
  },
  subtitle: { fontSize: 13, color: Colors.textSecondary },

  list: { paddingHorizontal: Spacing.md, paddingBottom: 100 },

  item: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.card, borderRadius: 16,
    padding: Spacing.md, marginBottom: 10,
    borderWidth: 1, borderColor: Colors.border,
  },

  rankCol: { width: 44, alignItems: 'center' },
  medal: { fontSize: 22 },
  rankNum: { fontSize: 18, fontWeight: '900' },

  infoCol: { flex: 1, marginLeft: 10 },
  nameText: { fontSize: 15, fontWeight: '800', color: Colors.textPrimary },
  idText: { fontSize: 11, color: Colors.textSecondary, marginTop: 2, letterSpacing: 0.5 },

  statsCol: { alignItems: 'flex-end' },
  winsText: { fontSize: 15, fontWeight: '900', color: Colors.neonPurple },
  rateText: { fontSize: 11, color: Colors.textSecondary, marginTop: 2 },

  empty: { textAlign: 'center', color: Colors.textSecondary, marginTop: 60, fontSize: 15 },
});
