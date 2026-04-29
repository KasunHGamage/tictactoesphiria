import React, { useEffect, useState } from 'react';
import ScreenWrapper from '../components/ScreenWrapper';
import {
  StyleSheet, Text, View, ActivityIndicator,
  TextInput, Pressable, Alert, SectionList
} from 'react-native';
import { Colors, Spacing, glow, textGlow } from '../../constants/theme';
import { useAuth } from '../auth/AuthContext';
import { getUserByGameId, getUserProfile, UserProfile } from '../services/userService';
import {
  sendFriendRequest, acceptFriendRequest, rejectFriendRequest,
  listenToRequests, listenToFriends
} from '../services/friendsService';
import { useMatchInvitations } from '../hooks/useMatchInvitations';
import { MatchInvite } from '../services/matchTypes';

export default function FriendsScreen() {
  const { user } = useAuth();
  const [searchId, setSearchId] = useState('');
  const [searching, setSearching] = useState(false);
  const [friends, setFriends] = useState<UserProfile[]>([]);
  const [friendRequests, setFriendRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const { incoming: matchInvites, inviteFriend, accept, reject } = useMatchInvitations(() => {});

  useEffect(() => {
    if (!user) return;
    const unsubReqs = listenToRequests(user.uid, setFriendRequests);
    const unsubFriends = listenToFriends(user.uid, async (uids) => {
      const profiles = await Promise.all(uids.map(uid => getUserProfile(uid)));
      setFriends(profiles.filter(p => p !== null) as UserProfile[]);
      setLoading(false);
    });
    return () => { unsubReqs(); unsubFriends(); };
  }, [user]);

  const handleSearch = async () => {
    if (searchId.length !== 6) return;
    setSearching(true);
    try {
      const target = await getUserByGameId(searchId);
      if (!target) {
        Alert.alert('Not Found', 'No user found with this Game ID.');
      } else if (target.uid === user?.uid) {
        Alert.alert('Nice Try', "You can't add yourself!");
      } else {
        Alert.alert('Add Friend', `Send friend request to ${target.displayName}?`, [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Send', onPress: () => sendFriendRequest(user!.uid, user!.displayName!, target.uid) },
        ]);
      }
    } finally {
      setSearching(false);
      setSearchId('');
    }
  };

  // ── Render Helpers ────────────────────────────────────────────────

  const statusColor = (status: string) =>
    status === 'online' ? Colors.neonGreen :
    status === 'in-match' ? Colors.neonBlue :
    Colors.textSecondary;

  const renderFriend = ({ item }: { item: UserProfile }) => (
    <View style={s.item}>
      <View style={[s.statusDot, { backgroundColor: statusColor(item.status) }]} />
      <View style={s.info}>
        <Text style={s.nameText}>{item.displayName}</Text>
        <Text style={[s.statusText, { color: statusColor(item.status) }]}>
          {item.status.toUpperCase()}
        </Text>
      </View>
      <Pressable
        style={({ pressed }) => [s.inviteBtn, pressed && { opacity: 0.75 }]}
        onPress={() =>
          inviteFriend(item.uid).then(() => Alert.alert('Sent', 'Match invitation sent!'))
        }
      >
        <Text style={s.inviteBtnText}>INVITE ⚔️</Text>
      </Pressable>
    </View>
  );

  const renderFriendRequest = ({ item }: { item: any }) => (
    <View style={[s.item, s.requestItem]}>
      <View style={s.info}>
        <Text style={s.nameText}>{item.fromName}</Text>
        <Text style={[s.statusText, { color: Colors.neonYellow }]}>FRIEND REQUEST</Text>
      </View>
      <View style={s.actions}>
        <Pressable
          style={[s.actionBtn, s.acceptBtn]}
          onPress={() => acceptFriendRequest(item.id, item.from, user!.uid)}
        >
          <Text style={s.actionBtnText}>✓</Text>
        </Pressable>
        <Pressable
          style={[s.actionBtn, s.rejectBtn]}
          onPress={() => rejectFriendRequest(item.id)}
        >
          <Text style={s.actionBtnText}>✕</Text>
        </Pressable>
      </View>
    </View>
  );

  const renderMatchInvite = ({ item }: { item: MatchInvite }) => (
    <View style={[s.item, s.matchInviteItem]}>
      <View style={s.info}>
        <Text style={s.nameText}>{item.fromName}</Text>
        <Text style={[s.statusText, { color: Colors.neonPink }]}>⚔️ MATCH INVITATION</Text>
      </View>
      <View style={s.actions}>
        <Pressable style={[s.actionBtn, s.acceptBtn]} onPress={() => accept(item)}>
          <Text style={s.actionBtnText}>⚔️</Text>
        </Pressable>
        <Pressable style={[s.actionBtn, s.rejectBtn]} onPress={() => reject(item.id)}>
          <Text style={s.actionBtnText}>✕</Text>
        </Pressable>
      </View>
    </View>
  );

  const sections = [
    ...(matchInvites.length > 0  ? [{ title: 'MATCH INVITES',    data: matchInvites,    type: 'match' }]     : []),
    ...(friendRequests.length > 0 ? [{ title: 'FRIEND REQUESTS',  data: friendRequests,  type: 'friendReq' }] : []),
    { title: 'FRIENDS', data: friends, type: 'friend' },
  ];

  if (loading) {
    return (
      <View style={s.center}>
        <ActivityIndicator color={Colors.neonPurple} size="large" />
      </View>
    );
  }

  return (
    <ScreenWrapper scroll={false} horizontalPadding={0}>
      {/* Header + Search */}
      <View style={s.header}>
        <Text style={s.eyebrow}>👥 SOCIAL HUB</Text>
        <Text style={s.title}>Friends</Text>
        <View style={s.searchRow}>
          <TextInput
            style={s.searchInput}
            placeholder="Search by Game ID"
            placeholderTextColor={Colors.textSecondary}
            value={searchId}
            onChangeText={t => setSearchId(t.toUpperCase())}
            maxLength={6}
          />
          <Pressable
            style={[s.searchBtn, searchId.length !== 6 && { opacity: 0.45 }]}
            onPress={handleSearch}
            disabled={searching || searchId.length !== 6}
          >
            {searching
              ? <ActivityIndicator color={Colors.textPrimary} size="small" />
              : <Text style={s.searchBtnText}>ADD</Text>
            }
          </Pressable>
        </View>
      </View>

      <SectionList
        sections={sections as any}
        keyExtractor={(item, index) => (item as any).id || (item as any).uid || index.toString()}
        renderItem={({ item, section }) => {
          if (section.type === 'match') return renderMatchInvite({ item: item as MatchInvite });
          if (section.type === 'friendReq') return renderFriendRequest({ item });
          return renderFriend({ item: item as UserProfile });
        }}
        renderSectionHeader={({ section: { title, data } }) => (
          <View style={s.sectionHeader}>
            <Text style={s.sectionTitle}>{title}</Text>
            <View style={s.sectionBadge}>
              <Text style={s.sectionBadgeText}>{data.length}</Text>
            </View>
          </View>
        )}
        contentContainerStyle={s.list}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={null}
      />
    </ScreenWrapper>
  );
}

const s = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.bg },

  header: {
    paddingHorizontal: Spacing.md,
    marginTop: Spacing.sm, marginBottom: Spacing.md,
  },
  eyebrow: {
    fontSize: 10, fontWeight: '900', color: Colors.neonPurple,
    letterSpacing: 3, marginBottom: 6,
    ...textGlow(Colors.neonPurple),
  },
  title: {
    fontSize: 30, fontWeight: '900', color: Colors.textPrimary,
    marginBottom: Spacing.md,
    ...textGlow(Colors.neonPurple),
  },

  // Search
  searchRow: { flexDirection: 'row', gap: Spacing.sm },
  searchInput: {
    flex: 1, backgroundColor: Colors.card, borderRadius: 14,
    borderWidth: 1, borderColor: Colors.border,
    paddingHorizontal: Spacing.md, paddingVertical: 12,
    color: Colors.textPrimary, fontSize: 15, letterSpacing: 2,
  },
  searchBtn: {
    backgroundColor: Colors.neonPurple, borderRadius: 14,
    paddingHorizontal: Spacing.lg, justifyContent: 'center', alignItems: 'center',
    ...(glow(Colors.neonPurple, 8) as any),
  },
  searchBtnText: { color: '#FFF', fontWeight: '900', fontSize: 12, letterSpacing: 1.5 },

  // List
  list: { paddingHorizontal: Spacing.md, paddingBottom: 100 },
  sectionHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    marginTop: Spacing.lg, marginBottom: Spacing.sm,
  },
  sectionTitle: {
    fontSize: 10, fontWeight: '900', color: Colors.textSecondary, letterSpacing: 2,
  },
  sectionBadge: {
    backgroundColor: Colors.border, borderRadius: 8,
    paddingHorizontal: 8, paddingVertical: 2,
  },
  sectionBadgeText: { fontSize: 10, fontWeight: '900', color: Colors.textSecondary },

  // Items
  item: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.card, borderRadius: 16,
    padding: Spacing.md, marginBottom: 8,
    borderWidth: 1, borderColor: Colors.border,
  },
  requestItem: {
    borderColor: Colors.neonYellow + '55',
    ...(glow(Colors.neonYellow, 5) as any),
  },
  matchInviteItem: {
    borderColor: Colors.neonPink + '88', borderWidth: 1.5,
    ...(glow(Colors.neonPink, 8) as any),
  },

  statusDot: { width: 10, height: 10, borderRadius: 5, marginRight: 12 },
  info: { flex: 1 },
  nameText: { fontSize: 15, fontWeight: '800', color: Colors.textPrimary },
  statusText: { fontSize: 9, fontWeight: '900', color: Colors.textSecondary, marginTop: 3, letterSpacing: 1 },

  inviteBtn: {
    backgroundColor: Colors.neonPurple + '22',
    borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8,
    borderWidth: 1, borderColor: Colors.neonPurple + '66',
  },
  inviteBtnText: { color: Colors.neonPurple, fontSize: 11, fontWeight: '900', letterSpacing: 0.5 },

  actions: { flexDirection: 'row', gap: Spacing.sm },
  actionBtn: {
    width: 38, height: 38, borderRadius: 19,
    justifyContent: 'center', alignItems: 'center',
  },
  acceptBtn: {
    backgroundColor: Colors.neonGreen + '22',
    borderWidth: 1, borderColor: Colors.neonGreen + '66',
    ...(glow(Colors.neonGreen, 4) as any),
  },
  rejectBtn: {
    backgroundColor: Colors.lose + '22',
    borderWidth: 1, borderColor: Colors.lose + '66',
  },
  actionBtnText: { color: Colors.textPrimary, fontSize: 16, fontWeight: '900' },
});
