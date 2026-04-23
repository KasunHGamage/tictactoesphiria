// LobbyScreen.tsx — Create / join / invite
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator, Alert, KeyboardAvoidingView, Platform,
  Pressable, SafeAreaView, ScrollView, StatusBar,
  StyleSheet, Text, TextInput, View,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { AppRoute, InviteDocument, LocalUser } from '../multiplayer/multiplayerTypes';
import { initUser, getLocalUser } from '../multiplayer/userService';
import { createMatch, joinMatch, listenToMatch } from '../multiplayer/matchService';
import { sendInvite } from '../multiplayer/inviteService';
import { useInvites } from '../hooks/useInvites';

const C = {
  bg: '#0D0D1A', card: '#1C1C3A', border: '#2A2A5A',
  accent: '#7C5CFC', accentGlow: '#9B7DFF', accentDim: '#3D2E7C',
  textPrimary: '#F0F0FF', textSecondary: '#8888AA',
  success: '#4ADE80', xColor: '#FF6B8A',
};

interface Props { navigate: (r: AppRoute) => void; }

function NameGate({ onReady }: { onReady: (u: LocalUser) => void }) {
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    if (!name.trim()) return;
    setBusy(true);
    try { onReady(await initUser(name.trim())); }
    catch { Alert.alert('Error', 'Could not save — check your Firebase config.'); }
    finally { setBusy(false); }
  };
  return (
    <KeyboardAvoidingView style={s.gateBg} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={s.gateCard}>
        <Text style={s.gateTitle}>What's your name?</Text>
        <Text style={s.gateSub}>Shown to your opponent</Text>
        <TextInput style={s.input} placeholder="Display name…" placeholderTextColor={C.textSecondary}
          value={name} onChangeText={setName} maxLength={20} autoFocus returnKeyType="done" onSubmitEditing={submit} />
        <Pressable style={[s.btn, (!name.trim() || busy) && s.btnDisabled]} onPress={submit} disabled={!name.trim() || busy}>
          {busy ? <ActivityIndicator color="#fff" /> : <Text style={s.btnText}>Continue →</Text>}
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

function InviteCard({ inv, onAccept, onDecline }: { inv: InviteDocument; onAccept: () => void; onDecline: () => void }) {
  return (
    <View style={s.inviteCard}>
      <View style={{ flex: 1 }}>
        <Text style={s.inviteName}>{inv.fromName}</Text>
        <Text style={s.inviteLabel}>challenged you!</Text>
      </View>
      <Pressable style={[s.smallBtn, { backgroundColor: C.success }]} onPress={onAccept}>
        <Text style={[s.smallBtnTxt, { color: '#000' }]}>Accept</Text>
      </Pressable>
      <Pressable style={[s.smallBtn, { backgroundColor: '#2A1020' }]} onPress={onDecline}>
        <Text style={[s.smallBtnTxt, { color: C.xColor }]}>Decline</Text>
      </Pressable>
    </View>
  );
}

export default function LobbyScreen({ navigate }: Props) {
  const [user, setUser] = useState<LocalUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [createdId, setCreatedId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [joining, setJoining] = useState(false);
  const [inviteUid, setInviteUid] = useState('');
  const { invites, accept, decline } = useInvites(user?.uid ?? null);

  useEffect(() => {
    getLocalUser().then(u => { setUser(u); setLoading(false); });
  }, []);

  // Auto-navigate when opponent joins our created match
  useEffect(() => {
    if (!createdId || !user) return;
    const unsub = listenToMatch(createdId, (m) => {
      if (m.status === 'active') { unsub(); navigate({ name: 'MultiplayerGame', matchId: createdId, playerSide: 'X' }); }
    });
    return unsub;
  }, [createdId, user]);

  if (loading) return <SafeAreaView style={[s.safe, { justifyContent: 'center' }]}><ActivityIndicator color={C.accentGlow} /></SafeAreaView>;
  if (!user) return <NameGate onReady={setUser} />;

  const handleCreate = async () => {
    setCreating(true);
    try { setCreatedId(await createMatch(user.uid, user.displayName)); }
    catch (e: unknown) { Alert.alert('Error', e instanceof Error ? e.message : 'Failed'); }
    finally { setCreating(false); }
  };

  const handleJoin = async () => {
    const code = joinCode.trim().toUpperCase();
    if (code.length !== 6) { Alert.alert('Invalid', 'Code must be 6 characters'); return; }
    setJoining(true);
    try { await joinMatch(code, user.uid, user.displayName); navigate({ name: 'MultiplayerGame', matchId: code, playerSide: 'O' }); }
    catch (e: unknown) { Alert.alert('Cannot join', e instanceof Error ? e.message : 'Failed'); }
    finally { setJoining(false); }
  };

  const handleSendInvite = async () => {
    if (!inviteUid.trim() || !createdId) { Alert.alert('Create a match first'); return; }
    try { await sendInvite(user.uid, user.displayName, inviteUid.trim(), '—', createdId); Alert.alert('Sent ✓'); setInviteUid(''); }
    catch (e: unknown) { Alert.alert('Error', e instanceof Error ? e.message : 'Failed'); }
  };

  const handleAccept = async (inv: InviteDocument) => {
    try { const matchId = await accept(inv, user.uid, user.displayName); navigate({ name: 'MultiplayerGame', matchId, playerSide: 'O' }); }
    catch (e: unknown) { Alert.alert('Cannot accept', e instanceof Error ? e.message : 'Match unavailable'); }
  };

  return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />
      <Pressable style={s.back} onPress={() => navigate({ name: 'Home' })}><Text style={s.backTxt}>← Home</Text></Pressable>
      <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <Text style={s.title}>Online Lobby</Text>
        <View style={s.idRow}>
          <Text style={s.idLabel}>Your ID: </Text>
          <Text style={s.idVal} numberOfLines={1}>{user.uid.slice(0, 12)}…</Text>
          <Pressable style={s.copyBtn} onPress={() => Clipboard.setStringAsync(user.uid)}><Text style={s.copyTxt}>Copy</Text></Pressable>
        </View>
        <Text style={s.playerName}>👤 {user.displayName}</Text>

        {/* Create */}
        <Text style={s.sectionTitle}>CREATE MATCH</Text>
        {createdId ? (
          <View style={s.codeBox}>
            <Text style={s.codeLabel}>Share this code:</Text>
            <Text style={s.codeValue}>{createdId}</Text>
            <Pressable style={s.copyCodeBtn} onPress={() => Clipboard.setStringAsync(createdId)}>
              <Text style={s.copyCodeTxt}>📋 Copy Code</Text>
            </Pressable>
            <ActivityIndicator color={C.accentGlow} style={{ marginTop: 10 }} />
            <Text style={s.waitTxt}>Waiting for opponent…</Text>
          </View>
        ) : (
          <Pressable style={[s.btn, creating && s.btnDisabled]} onPress={handleCreate} disabled={creating}>
            {creating ? <ActivityIndicator color="#fff" /> : <Text style={s.btnText}>+ Create Match</Text>}
          </Pressable>
        )}

        {/* Join */}
        <Text style={[s.sectionTitle, { marginTop: 24 }]}>JOIN MATCH</Text>
        <TextInput style={s.input} placeholder="6-char code…" placeholderTextColor={C.textSecondary}
          value={joinCode} onChangeText={t => setJoinCode(t.toUpperCase())} maxLength={6} autoCapitalize="characters" />
        <Pressable style={[s.btn, s.btnGreen, (!joinCode.trim() || joining) && s.btnDisabled]} onPress={handleJoin} disabled={!joinCode.trim() || joining}>
          {joining ? <ActivityIndicator color="#000" /> : <Text style={[s.btnText, { color: '#000' }]}>Join →</Text>}
        </Pressable>

        {/* Invite by UID */}
        {createdId && (
          <>
            <Text style={[s.sectionTitle, { marginTop: 24 }]}>INVITE BY USER ID</Text>
            <TextInput style={s.input} placeholder="Friend's User ID…" placeholderTextColor={C.textSecondary}
              value={inviteUid} onChangeText={setInviteUid} />
            <Pressable style={[s.btn, s.btnOutline, !inviteUid.trim() && s.btnDisabled]} onPress={handleSendInvite} disabled={!inviteUid.trim()}>
              <Text style={[s.btnText, { color: C.accentGlow }]}>📨 Send Invite</Text>
            </Pressable>
          </>
        )}

        {/* Invites */}
        {invites.length > 0 && (
          <>
            <Text style={[s.sectionTitle, { marginTop: 24 }]}>INCOMING ({invites.length})</Text>
            {invites.map(inv => (
              <InviteCard key={inv.id} inv={inv} onAccept={() => handleAccept(inv)} onDecline={() => decline(inv.id)} />
            ))}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg, paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight ?? 0 : 0 },
  gateBg: { flex: 1, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center', padding: 24 },
  gateCard: { width: '100%', backgroundColor: C.card, borderRadius: 20, padding: 28, borderWidth: 1, borderColor: C.border, gap: 12 },
  gateTitle: { fontSize: 22, fontWeight: '800', color: C.textPrimary },
  gateSub: { fontSize: 13, color: C.textSecondary },
  scroll: { padding: 20, paddingBottom: 48 },
  back: { paddingHorizontal: 20, paddingVertical: 10 },
  backTxt: { color: C.accentGlow, fontWeight: '700', fontSize: 14 },
  title: { fontSize: 26, fontWeight: '900', color: C.textPrimary, letterSpacing: 2, marginBottom: 6 },
  idRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 },
  idLabel: { color: C.textSecondary, fontSize: 12 },
  idVal: { color: C.textPrimary, fontSize: 12, fontWeight: '600', flex: 1 },
  copyBtn: { backgroundColor: C.accentDim, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  copyTxt: { color: C.accentGlow, fontSize: 11, fontWeight: '700' },
  playerName: { color: C.textSecondary, fontSize: 13, marginBottom: 20 },
  sectionTitle: { fontSize: 12, fontWeight: '800', color: C.textSecondary, letterSpacing: 1.5, marginBottom: 8 },
  input: { backgroundColor: C.card, borderRadius: 12, borderWidth: 1, borderColor: C.border, paddingHorizontal: 16, paddingVertical: 12, color: C.textPrimary, fontSize: 15, letterSpacing: 2, marginBottom: 8 },
  btn: { backgroundColor: C.accent, borderRadius: 14, paddingVertical: 14, alignItems: 'center' },
  btnGreen: { backgroundColor: C.success },
  btnOutline: { backgroundColor: 'transparent', borderWidth: 1.5, borderColor: C.accentGlow },
  btnDisabled: { opacity: 0.4 },
  btnText: { color: '#FFF', fontSize: 15, fontWeight: '800' },
  codeBox: { backgroundColor: C.card, borderRadius: 16, padding: 20, alignItems: 'center', borderWidth: 1, borderColor: C.border, gap: 6 },
  codeLabel: { color: C.textSecondary, fontSize: 12 },
  codeValue: { fontSize: 36, fontWeight: '900', color: C.accentGlow, letterSpacing: 8 },
  copyCodeBtn: { backgroundColor: C.accentDim, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 10 },
  copyCodeTxt: { color: C.accentGlow, fontWeight: '700', fontSize: 13 },
  waitTxt: { color: C.textSecondary, fontSize: 12 },
  inviteCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.card, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: C.border, gap: 10, marginBottom: 8 },
  inviteName: { color: C.textPrimary, fontWeight: '700', fontSize: 15 },
  inviteLabel: { color: C.textSecondary, fontSize: 12 },
  smallBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10 },
  smallBtnTxt: { fontWeight: '700', fontSize: 13 },
});
