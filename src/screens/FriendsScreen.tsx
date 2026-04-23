// ─────────────────────────────────────────────
//  FriendsScreen.tsx — Social Hub
// ─────────────────────────────────────────────

import React, { useEffect, useState } from 'react';
import { 
  StyleSheet, Text, View, SafeAreaView, FlatList, 
  ActivityIndicator, RefreshControl, TextInput, Pressable, Alert, SectionList 
} from 'react-native';
import { useAuth } from '../auth/AuthContext';
import { getUserByGameId, getUserProfile, UserProfile } from '../services/userService';
import { 
  sendFriendRequest, acceptFriendRequest, rejectFriendRequest, 
  listenToRequests, listenToFriends, FriendRequest 
} from '../services/friendsService';

const C = {
  bg: '#0D0D1A', card: '#1C1C3A', border: '#2A2A5A',
  accent: '#7C5CFC', accentGlow: '#9B7DFF', 
  textPrimary: '#F0F0FF', textSecondary: '#8888AA',
  success: '#4ADE80', danger: '#FF6B8A',
};

export default function FriendsScreen() {
  const { user } = useAuth();
  const [searchId, setSearchId] = useState('');
  const [searching, setSearching] = useState(false);
  
  const [friends, setFriends] = useState<UserProfile[]>([]);
  const [requests, setRequests] = useState<FriendRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    // Listen to friend requests
    const unsubReqs = listenToRequests(user.uid, (reqs) => {
      setRequests(reqs);
    });

    // Listen to friend list
    const unsubFriends = listenToFriends(user.uid, async (uids) => {
      const profiles = await Promise.all(uids.map(uid => getUserProfile(uid)));
      setFriends(profiles.filter(p => p !== null) as UserProfile[]);
      setLoading(false);
    });

    return () => {
      unsubReqs();
      unsubFriends();
    };
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
        Alert.alert(
          'Add Friend', 
          `Send friend request to ${target.displayName}?`,
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Send', onPress: () => sendFriendRequest(user!.uid, user!.displayName!, target.uid) }
          ]
        );
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSearching(false);
      setSearchId('');
    }
  };

  const renderFriend = ({ item }: { item: UserProfile }) => (
    <View style={s.item}>
      <View style={[s.statusDot, { backgroundColor: item.status === 'online' ? C.success : item.status === 'in-match' ? C.accentGlow : C.textSecondary }]} />
      <View style={s.info}>
        <Text style={s.nameText}>{item.displayName}</Text>
        <Text style={s.statusText}>{item.status.toUpperCase()}</Text>
      </View>
      <Pressable style={s.inviteBtn} onPress={() => Alert.alert('Coming Soon', 'Match invitations will be added in the next step.')}>
        <Text style={s.inviteBtnText}>Invite</Text>
      </Pressable>
    </View>
  );

  const renderRequest = ({ item }: { item: FriendRequest }) => (
    <View style={s.item}>
      <View style={s.info}>
        <Text style={s.nameText}>{item.fromName}</Text>
        <Text style={s.statusText}>FRIEND REQUEST</Text>
      </View>
      <View style={s.actions}>
        <Pressable style={[s.actionBtn, s.acceptBtn]} onPress={() => acceptFriendRequest(item.id, item.from, user!.uid)}>
          <Text style={s.actionBtnText}>✓</Text>
        </Pressable>
        <Pressable style={[s.actionBtn, s.rejectBtn]} onPress={() => rejectFriendRequest(item.id)}>
          <Text style={s.actionBtnText}>✕</Text>
        </Pressable>
      </View>
    </View>
  );

  const sections = [
    ...(requests.length > 0 ? [{ title: 'PENDING REQUESTS', data: requests, type: 'request' }] : []),
    { title: 'FRIENDS', data: friends, type: 'friend' },
  ];

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
        <Text style={s.title}>Social Hub</Text>
        <View style={s.searchContainer}>
          <TextInput 
            style={s.searchInput}
            placeholder="Search by Game ID (6 chars)"
            placeholderTextColor={C.textSecondary}
            value={searchId}
            onChangeText={t => setSearchId(t.toUpperCase())}
            maxLength={6}
          />
          <Pressable style={s.searchBtn} onPress={handleSearch} disabled={searching || searchId.length !== 6}>
            {searching ? <ActivityIndicator color="#fff" size="small" /> : <Text style={s.searchBtnText}>Add</Text>}
          </Pressable>
        </View>
      </View>

      <SectionList
        sections={sections as any}
        keyExtractor={(item, index) => (item as any).id || (item as any).uid || index.toString()}
        renderItem={({ item, section }) => 
          (section as any).type === 'request' ? renderRequest({ item: item as FriendRequest }) : renderFriend({ item: item as UserProfile })
        }
        renderSectionHeader={({ section: { title, data } }) => (
          <View style={s.sectionHeader}>
            <Text style={s.sectionTitle}>{title} ({data.length})</Text>
          </View>
        )}
        contentContainerStyle={s.list}
        ListEmptyComponent={
          !requests.length && !friends.length ? (
            <Text style={s.empty}>Your friends list is empty. Add someone by their Game ID!</Text>
          ) : null
        }
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  center: { justifyContent: 'center', alignItems: 'center' },
  header: { padding: 24, paddingBottom: 16 },
  title: { fontSize: 28, fontWeight: '900', color: C.accentGlow, letterSpacing: 1, marginBottom: 20 },
  searchContainer: { flexDirection: 'row', gap: 10 },
  searchInput: { 
    flex: 1, backgroundColor: C.card, borderRadius: 12, borderWidth: 1, borderColor: C.border, 
    paddingHorizontal: 16, paddingVertical: 12, color: C.textPrimary, fontSize: 14, letterSpacing: 2
  },
  searchBtn: { backgroundColor: C.accent, borderRadius: 12, paddingHorizontal: 20, justifyContent: 'center' },
  searchBtnText: { color: '#fff', fontWeight: '800' },
  list: { paddingHorizontal: 24, paddingBottom: 40 },
  sectionHeader: { marginTop: 24, marginBottom: 12 },
  sectionTitle: { fontSize: 12, fontWeight: '800', color: C.textSecondary, letterSpacing: 2 },
  item: { 
    flexDirection: 'row', alignItems: 'center', backgroundColor: C.card, 
    borderRadius: 16, padding: 16, marginBottom: 8, borderWidth: 1, borderColor: C.border 
  },
  statusDot: { width: 10, height: 10, borderRadius: 5, marginRight: 12 },
  info: { flex: 1 },
  nameText: { fontSize: 16, fontWeight: '700', color: C.textPrimary },
  statusText: { fontSize: 10, fontWeight: '800', color: C.textSecondary, marginTop: 2, letterSpacing: 1 },
  inviteBtn: { backgroundColor: C.border, borderRadius: 8, paddingHorizontal: 16, paddingVertical: 8 },
  inviteBtnText: { color: C.accentGlow, fontSize: 12, fontWeight: '800' },
  actions: { flexDirection: 'row', gap: 8 },
  actionBtn: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  acceptBtn: { backgroundColor: C.success },
  rejectBtn: { backgroundColor: C.danger },
  actionBtnText: { color: '#fff', fontSize: 18, fontWeight: '900' },
  empty: { textAlign: 'center', color: C.textSecondary, marginTop: 40, fontSize: 14, lineHeight: 22 },
});
