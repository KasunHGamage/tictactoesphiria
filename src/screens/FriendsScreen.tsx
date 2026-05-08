import React, { useEffect, useState } from 'react';
import ScreenWrapper from '../components/ScreenWrapper'; // Re-save to fix undefined import
import {
  StyleSheet, Text, View, ActivityIndicator,
  TextInput, Pressable, Alert, SectionList,
  Platform, Share, TouchableOpacity,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { Spacing } from '../../constants/themes';
import { useAppTheme } from '../context/ThemeContext';
import { useAuth } from '../auth/AuthContext';
import { getUserByGameId, getUserProfile, UserProfile } from '../services/userService';
import {
  sendFriendRequest, acceptFriendRequest, rejectFriendRequest, removeFriend,
  listenToRequests, watchSentRequests, listenToFriends,
} from '../services/friendsService';
import { MatchInvite } from '../services/matchTypes';
import { useMatchInvitations } from '../hooks/useMatchInvitations';
import { listenToSentPendingInvites } from '../services/matchInviteService';
import { onSnapshot, doc } from 'firebase/firestore';
import { db } from '../services/firebase';

export default function FriendsScreen({ route }: any) {
  const { user }    = useAuth();
  const t           = useAppTheme();
  const pendingMatchId: string | undefined = route?.params?.pendingMatchId;

  const [searchId,       setSearchId]       = useState('');
  const [searching,      setSearching]      = useState(false);
  const [friendUids,     setFriendUids]     = useState<string[]>([]);
  const [friendsMap,     setFriendsMap]     = useState<Record<string, UserProfile>>({});
  const [friendRequests, setFriendRequests] = useState<any[]>([]);
  const [sentRequests,   setSentRequests]   = useState<any[]>([]);
  const [loading,        setLoading]        = useState(true);
  const [myProfile,      setMyProfile]      = useState<UserProfile | null>(null);
  const [showSearch,     setShowSearch]     = useState(false);
  const [invitingUid,    setInvitingUid]    = useState<string | null>(null);
  const [pendingInvitesTo, setPendingInvitesTo] = useState<Record<string, boolean>>({});

  const { incoming: matchInvites, inviteFriend, accept, reject } = useMatchInvitations(() => {});

  useEffect(() => {
    if (!user) return;
    getUserProfile(user.uid).then(setMyProfile);
    const unsubReqs    = listenToRequests(user.uid, setFriendRequests);
    const unsubSent    = watchSentRequests(user.uid, setSentRequests);
    const unsubFriends = listenToFriends(user.uid, (uids) => {
      setFriendUids(uids);
      setLoading(false);
    });
    return () => { unsubReqs(); unsubSent(); unsubFriends(); };
  }, [user]);

  // ── Track sent pending invites for UI state ──────────────────────────────
  useEffect(() => {
    if (!user) return;
    const unsub = listenToSentPendingInvites(user.uid, (invites) => {
      const map: Record<string, boolean> = {};
      invites.forEach(inv => {
        map[inv.to] = true;
      });
      setPendingInvitesTo(map);
    });
    return unsub;
  }, [user]);

  useEffect(() => {
    const unsubs = friendUids.map(uid =>
      onSnapshot(doc(db, 'users', uid), (snap) => {
        if (snap.exists()) {
          setFriendsMap(prev => ({ ...prev, [uid]: snap.data() as UserProfile }));
        }
      })
    );
    return () => unsubs.forEach(unsub => unsub());
  }, [friendUids]);

  const friends = Object.values(friendsMap).filter(Boolean);

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
          { text: 'Send', onPress: () => sendFriendRequest(user!.uid, user!.displayName!, target.uid, target.displayName) },
        ]);
      }
    } finally { setSearching(false); setSearchId(''); }
  };

  // ── Status helpers ───────────────────────────────────────────────
  const isOnline = (lastSeen?: number) => {
    if (!lastSeen) return false;
    return Date.now() - lastSeen < 15000;
  };

  const formatLastSeen = (lastSeen?: number) => {
    if (!lastSeen) return 'OFFLINE';
    const diff = Date.now() - lastSeen;
    if (diff < 15000) return 'ONLINE';
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `LAST SEEN ${mins}M AGO`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `LAST SEEN ${hours}H AGO`;
    const days = Math.floor(hours / 24);
    return `LAST SEEN ${days}D AGO`;
  };

  // ── Render helpers ───────────────────────────────────────────────
  const handleRemoveFriend = (friendId: string, friendName: string) => {
    Alert.alert(
      'Remove Friend',
      `Are you sure you want to remove ${friendName} from your friends list?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Remove', style: 'destructive', onPress: () => removeFriend(user!.uid, friendId) },
      ]
    );
  };

  const handleInvite = async (friend: UserProfile) => {
    if (invitingUid) return;
    if (pendingInvitesTo[friend.uid]) {
      Alert.alert('⏳ Invite Pending', `An invite to ${friend.displayName} is already pending.`);
      return;
    }
    setInvitingUid(friend.uid);
    try {
      await inviteFriend(friend.uid);
      Alert.alert('⚔️ Invite Sent!', `Match invitation sent to ${friend.displayName}.`);
    } catch (e: any) {
      if (e?.message === 'INVITE_PENDING') {
        Alert.alert('⏳ Invite Pending', `An invite to ${friend.displayName} is already pending.`);
      } else {
        Alert.alert('Error', 'Could not send invite. Try again.');
      }
    } finally {
      setInvitingUid(null);
    }
  };

  const renderFriend = ({ item }: { item: UserProfile }) => {
    const online = isOnline(item.lastSeen);
    const statusText = formatLastSeen(item.lastSeen);
    const sColor = online ? t.success : t.textSecondary;
    const isInviting = invitingUid === item.uid;

    const isPending = pendingInvitesTo[item.uid];
    const btnDisabled = !online || isInviting || isPending;
    const btnStyle = isPending
      ? { backgroundColor: t.warning + '22', borderColor: t.warning + '88' }
      : { backgroundColor: t.accent + '22', borderColor: t.accent + '88' };

    return (
      <Pressable 
        style={({ pressed }) => [
          s.item, 
          { backgroundColor: t.card, borderColor: t.border },
          pressed && { opacity: 0.7 }
        ]}
        onLongPress={() => handleRemoveFriend(item.uid, item.displayName)}
        delayLongPress={500}
      >
        <View style={[s.statusDot, { backgroundColor: sColor }]} />
        <View style={s.info}>
          <Text style={[s.nameText, { color: t.textPrimary }]}>{item.displayName}</Text>
          <Text style={[s.statusText, { color: sColor }]}>{statusText}</Text>
        </View>
        <View style={s.actions}>
          {online && (
            <Pressable
              style={[
                s.challengeBtn,
                btnStyle,
                !isPending && (t.glow(t.accent, 4) as any),
                (isInviting || isPending) && { opacity: isPending ? 0.9 : 0.4 },
              ]}
              onPress={() => handleInvite(item)}
              disabled={btnDisabled}
            >
              {isInviting ? (
                <ActivityIndicator size="small" color={t.accent} />
              ) : isPending ? (
                <>
                  <Text style={{ fontSize: 12 }}>⏳</Text>
                  <Text style={[s.challengeBtnText, { color: t.warning }]}>WAITING</Text>
                </>
              ) : (
                <>
                  <Text style={{ fontSize: 12 }}>⚔️</Text>
                  <Text style={[s.challengeBtnText, { color: t.accent }]}>CHALLENGE</Text>
                </>
              )}
            </Pressable>
          )}
        </View>
      </Pressable>
    );
  };

  const renderSentRequest = ({ item }: { item: any }) => (
    <View style={[
      s.item, s.requestItem,
      { backgroundColor: t.card, borderColor: t.border },
    ]}>
      <View style={s.info}>
        <Text style={[s.nameText, { color: t.textPrimary }]}>{item.toName || 'Unknown User'}</Text>
        <Text style={[s.statusText, { color: t.textSecondary }]}>REQUEST SENT</Text>
      </View>
      <View style={s.actions}>
        <Pressable
          style={[s.actionBtn, { backgroundColor: t.lose + '22', borderColor: t.lose + '66' }]}
          onPress={() => rejectFriendRequest(item.id)}
        >
          <Text style={[s.actionBtnText, { color: t.textPrimary }]}>✕</Text>
        </Pressable>
      </View>
    </View>
  );

  const renderFriendRequest = ({ item }: { item: any }) => (
    <View style={[
      s.item, s.requestItem,
      { backgroundColor: t.card, borderColor: t.warning + '55' },
      t.glow(t.warning, 5) as any,
    ]}>
      <View style={s.info}>
        <Text style={[s.nameText, { color: t.textPrimary }]}>{item.fromName}</Text>
        <Text style={[s.statusText, { color: t.warning }]}>FRIEND REQUEST</Text>
      </View>
      <View style={s.actions}>
        <Pressable
          style={[s.actionBtn, { backgroundColor: t.success + '22', borderColor: t.success + '66' }, t.glow(t.success, 4) as any]}
          onPress={() => acceptFriendRequest(item.id, item.from, user!.uid)}
        >
          <Text style={[s.actionBtnText, { color: t.textPrimary }]}>✓</Text>
        </Pressable>
        <Pressable
          style={[s.actionBtn, { backgroundColor: t.lose + '22', borderColor: t.lose + '66' }]}
          onPress={() => rejectFriendRequest(item.id)}
        >
          <Text style={[s.actionBtnText, { color: t.textPrimary }]}>✕</Text>
        </Pressable>
      </View>
    </View>
  );

  const renderMatchInvite = ({ item }: { item: MatchInvite }) => (
    <View style={[
      s.item,
      { backgroundColor: t.card, borderColor: t.accent + '88', borderWidth: 1.5 },
      t.glow(t.accent, 8) as any,
    ]}>
      <View style={s.info}>
        <Text style={[s.nameText, { color: t.textPrimary }]}>{item.fromName}</Text>
        <Text style={[s.statusText, { color: t.accent }]}>⚔️ MATCH INVITATION</Text>
      </View>
      <View style={s.actions}>
        <Pressable
          style={[s.actionBtn, { backgroundColor: t.success + '22', borderColor: t.success + '66' }]}
          onPress={() => accept(item)}
        >
          <Text style={[s.actionBtnText, { color: t.textPrimary }]}>⚔️</Text>
        </Pressable>
        <Pressable
          style={[s.actionBtn, { backgroundColor: t.lose + '22', borderColor: t.lose + '66' }]}
          onPress={() => reject(item.id)}
        >
          <Text style={[s.actionBtnText, { color: t.textPrimary }]}>✕</Text>
        </Pressable>
      </View>
    </View>
  );

  const copyAndShareId = async () => {
    if (myProfile?.gameId) {
      await Clipboard.setStringAsync(myProfile.gameId);
      try {
        await Share.share({
          message: `🎮 Add me on Moving Tic-Tac-Toe!\nMy Game ID: ${myProfile.gameId}\n\nSearch my ID in the Friends screen to send a request!`,
          title: 'My Moving Tic-Tac-Toe Game ID',
        });
      } catch (e) {
        // user cancelled – ignore
      }
    }
  };

  const sections = [
    ...(matchInvites.length > 0 ? [{ title: 'MATCH INVITES', data: matchInvites, type: 'match' }] : []),
    ...(friendRequests.length > 0 ? [{ title: 'INCOMING REQUESTS', data: friendRequests, type: 'friendReq' }] : []),
    ...(sentRequests.length > 0 ? [{ title: 'SENT REQUESTS', data: sentRequests, type: 'sentReq' }] : []),
    { title: 'FRIENDS', data: friends, type: 'friend' },
  ];

  if (loading) {
    return (
      <View style={[s.center, { backgroundColor: t.bg }]}>
        <ActivityIndicator color={t.primary} size="large" />
      </View>
    );
  }

  return (
    <ScreenWrapper scroll={false} horizontalPadding={0}>
      <SectionList
        sections={sections as any}
        keyExtractor={(item, index) => (item as any).id || (item as any).uid || index.toString()}
        ListHeaderComponent={
          <View style={s.header}>
            <Text style={[s.eyebrow, { color: t.primary, ...(t.textGlow(t.primary) as any) }]}>
              👥 SOCIAL HUB
            </Text>
            <View style={s.titleRow}>
              <Text style={[s.title, { color: t.textPrimary, ...(t.textGlow(t.primary) as any) }]}>
                Friends
              </Text>
              {myProfile && (
                <View style={[s.idBadge, { backgroundColor: t.card, borderColor: t.border }]}>
                  <Text style={{ color: t.textSecondary, fontSize: 10, fontWeight: '800' }}>
                    ID: <Text style={{ color: t.primary }}>{myProfile.gameId}</Text>
                  </Text>
                  <View style={s.idActions}>
                    <TouchableOpacity onPress={copyAndShareId} style={[s.idIconBtn, { borderColor: t.primary + '55' }]} activeOpacity={0.7}>
                      <Text style={s.idIconText}>📋</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </View>

            <Pressable
              style={({ pressed }) => [
                s.addFriendBtn,
                { backgroundColor: showSearch ? t.card : t.primary, borderColor: showSearch ? t.primary : 'transparent' },
                !showSearch && t.glow(t.primary, 10) as any,
                pressed && { opacity: 0.8 },
              ]}
              onPress={() => setShowSearch(!showSearch)}
            >
              <Text style={[s.addFriendText, { color: showSearch ? t.primary : '#FFF' }]}>
                {showSearch ? '✕ CLOSE SEARCH' : '⊕ ADD FRIEND'}
              </Text>
            </Pressable>

            {showSearch && (
              <View style={[s.searchContainer, { backgroundColor: t.card, borderColor: t.primary + '44' }]}>
                <TextInput
                  style={[s.searchInput, { color: t.textPrimary }]}
                  placeholder="Enter 6-digit Game ID"
                  placeholderTextColor={t.textSecondary}
                  value={searchId}
                  onChangeText={v => setSearchId(v.toUpperCase())}
                  maxLength={6}
                  autoFocus
                />
                <Pressable
                  style={[s.searchSubmit, { backgroundColor: t.primary }, searchId.length !== 6 && { opacity: 0.5 }]}
                  onPress={handleSearch}
                  disabled={searching || searchId.length !== 6}
                >
                  {searching ? <ActivityIndicator color="#FFF" size="small" /> : <Text style={s.searchSubmitText}>SEARCH</Text>}
                </Pressable>
              </View>
            )}
          </View>
        }
        renderItem={({ item, section }) => {
          if (section.type === 'match')     return renderMatchInvite({ item: item as MatchInvite });
          if (section.type === 'friendReq') return renderFriendRequest({ item });
          if (section.type === 'sentReq')   return renderSentRequest({ item });
          return renderFriend({ item: item as UserProfile });
        }}
        renderSectionHeader={({ section: { title, data } }) => (
          <View style={s.sectionHeader}>
            <Text style={[s.sectionTitle, { color: t.textSecondary }]}>{title}</Text>
            <View style={[s.sectionBadge, { backgroundColor: t.border }]}>
              <Text style={[s.sectionBadgeText, { color: t.textSecondary }]}>{data.length}</Text>
            </View>
          </View>
        )}
        contentContainerStyle={s.list}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          !loading && sections.every(sec => sec.data.length === 0) ? (
            <View style={{ marginTop: 100, alignItems: 'center' }}>
              <Text style={{ color: t.textSecondary, fontSize: 16, fontWeight: '700', opacity: 0.4 }}>
                NO SOCIAL ACTIVITY YET
              </Text>
            </View>
          ) : null
        }
      />
    </ScreenWrapper>
  );
}

const s = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { paddingHorizontal: Spacing.md, marginTop: Spacing.sm, marginBottom: Spacing.md },
  eyebrow: { fontSize: 10, fontWeight: '900', letterSpacing: 3, marginBottom: 6 },
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.md },
  title:   { fontSize: 32, fontWeight: '900' },
  idBadge: {
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, borderWidth: 1,
    flexDirection: 'row', alignItems: 'center', gap: 8,
  },
  idActions:  { flexDirection: 'row', gap: 4 },
  idIconBtn:  { padding: 4, borderRadius: 6, borderWidth: 1 },
  idIconText: { fontSize: 13 },

  addFriendBtn: { 
    borderRadius: 14, paddingVertical: 14, alignItems: 'center', 
    marginBottom: Spacing.sm, borderWidth: 1.5 
  },
  addFriendText: { fontSize: 13, fontWeight: '900', letterSpacing: 1.5 },

  searchContainer: { 
    borderRadius: 16, padding: Spacing.sm, flexDirection: 'row', gap: 10,
    borderWidth: 1, marginBottom: Spacing.md 
  },
  searchInput: {
    flex: 1, paddingHorizontal: Spacing.md, fontSize: 16, letterSpacing: 3, fontWeight: '700'
  },
  searchSubmit: { borderRadius: 10, paddingHorizontal: 15, justifyContent: 'center' },
  searchSubmitText: { color: '#FFF', fontWeight: '900', fontSize: 11 },

  list:         { paddingHorizontal: Spacing.md, paddingBottom: 100 },
  
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: Spacing.lg, marginBottom: Spacing.sm },
  sectionTitle:  { fontSize: 10, fontWeight: '900', letterSpacing: 2 },
  sectionBadge:  { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2 },
  sectionBadgeText: { fontSize: 10, fontWeight: '900' },

  item: {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: 16, padding: Spacing.md,
    marginBottom: 8, borderWidth: 1,
  },
  requestItem: {},
  statusDot: { width: 10, height: 10, borderRadius: 5, marginRight: 12 },
  info:      { flex: 1 },
  nameText:  { fontSize: 16, fontWeight: '800' },
  statusText: { fontSize: 10, fontWeight: '900', marginTop: 3, letterSpacing: 1 },

  actions:       { flexDirection: 'row', gap: Spacing.sm },
  actionBtn:     { width: 38, height: 38, borderRadius: 19, justifyContent: 'center', alignItems: 'center', borderWidth: 1 },
  actionBtnText: { fontSize: 16, fontWeight: '900' },
  challengeBtn:  { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, borderWidth: 1, flexDirection: 'row', alignItems: 'center', gap: 6 },
  challengeBtnText: { fontSize: 11, fontWeight: '900', letterSpacing: 1 },
  cooldownText:  { fontSize: 11, fontWeight: '900', letterSpacing: 0.5 },
});
