// MultiplayerGameScreen.tsx — Live board synced to Firestore
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated, Platform, Pressable, SafeAreaView, StatusBar,
  StyleSheet, Text, useWindowDimensions, View, Alert,
} from 'react-native';
import { Board, Player } from '../game/gameTypes';
import { checkWinner, canPlace } from '../game/gameEngine';
import { useMatch } from '../hooks/useMatch';
import { recordMatchResult } from '../services/userService';

const C = {
  bg: '#0D0D1A', surface: '#14142B', card: '#1C1C3A', border: '#2A2A5A',
  accent: '#7C5CFC', accentGlow: '#9B7DFF', accentDim: '#3D2E7C',
  xColor: '#FF6B8A', xGlow: '#FF4D73', oColor: '#4FC3F7', oGlow: '#29B6F6',
  textPrimary: '#F0F0FF', textSecondary: '#8888AA',
  selected: '#FFD700', selectedBg: '#3A3000', winCell: '#2A2600',
};

const WIN_LINES = [
  [0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6],
];

function getWinCells(board: Board, winner: Player | null): Set<number> {
  if (!winner) return new Set();
  for (const [a, b, c] of WIN_LINES)
    if (board[a] === winner && board[b] === winner && board[c] === winner)
      return new Set([a, b, c]);
  return new Set();
}

interface CellProps {
  index: number; value: Player | null; isSelected: boolean;
  isWinCell: boolean; fontSize: number; disabled: boolean;
  onPress: (i: number) => void;
}
function Cell({ index, value, isSelected, isWinCell, fontSize, disabled, onPress }: CellProps) {
  const scale = useRef(new Animated.Value(1)).current;
  const handle = () => {
    if (disabled) return;
    Animated.sequence([
      Animated.timing(scale, { toValue: 0.84, duration: 70, useNativeDriver: true }),
      Animated.timing(scale, { toValue: 1, duration: 110, useNativeDriver: true }),
    ]).start();
    onPress(index);
  };
  const border = isWinCell ? C.selected : isSelected ? C.selected : C.border;
  const bg = isSelected ? C.selectedBg : isWinCell ? C.winCell : C.card;
  return (
    <Pressable onPress={handle} accessibilityLabel={`cell-${index}`} style={ms.cellPress}>
      <Animated.View style={[ms.cellInner, { borderColor: border, backgroundColor: bg }, { transform: [{ scale }] }]}>
        {value === 'X' && <Text style={{ fontSize, fontWeight: '900', color: C.xColor, textShadowColor: C.xGlow, textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 12 }}>✕</Text>}
        {value === 'O' && <Text style={{ fontSize, fontWeight: '900', color: C.oColor, textShadowColor: C.oGlow, textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 12 }}>○</Text>}
      </Animated.View>
    </Pressable>
  );
}


export default function MultiplayerGameScreen({ route, navigation }: any) {
  const { matchId, playerSide, myUid, myName } = route.params;
  const { width: W } = useWindowDimensions();
  const FONT = Math.floor((W * 0.9 / 3) * 0.44);
  const { match, optimisticBoard, myTurn, error, applyMove, resign } = useMatch(matchId, myUid, playerSide);
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [resultRecorded, setResultRecorded] = useState(false);

  const board: Board = optimisticBoard ?? match?.board ?? Array(9).fill(null);
  const phase = match ? (canPlace(board, playerSide) ? 'placement' : 'movement') : 'placement';
  const winner = match ? checkWinner(board) : null;
  const winCells = getWinCells(board, winner);
  const opponentSide: Player = playerSide === 'X' ? 'O' : 'X';
  const opponentName = playerSide === 'X' ? match?.playerO?.displayName ?? '—' : match?.playerX?.displayName ?? '—';

  // Handle match end
  useEffect(() => {
    if (match?.status === 'finished' && !resultRecorded) {
      setResultRecorded(true);
      const win = winner === playerSide;
      recordMatchResult(myUid, win);
    }
  }, [match?.status, winner, playerSide, myUid, resultRecorded]);

  const handleCell = useCallback(async (index: number) => {
    if (!match || !myTurn || match.status !== 'active') return;

    if (phase === 'placement') {
      if (board[index] !== null) return;
      await applyMove({ type: 'place', toIndex: index });
      return;
    }

    // Movement
    if (selectedIdx === null) {
      if (board[index] !== playerSide) return;
      setSelectedIdx(index);
      return;
    }
    if (selectedIdx === index) { setSelectedIdx(null); return; }
    if (board[index] === playerSide) { setSelectedIdx(index); return; }
    if (board[index] !== null) return;

    const from = selectedIdx;
    setSelectedIdx(null);
    await applyMove({ type: 'move', fromIndex: from, toIndex: index });
  }, [match, myTurn, phase, board, selectedIdx, playerSide, applyMove]);

  const handleResign = () => {
    Alert.alert('Resign?', 'You will forfeit the match.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Resign', style: 'destructive', onPress: () => resign().then(() => navigation.goBack()) },
    ]);
  };

  // Status text
  const status = match?.status;
  const statusLabel = !match ? 'Connecting…'
    : status === 'waiting' ? 'Waiting for opponent…'
    : status === 'finished' ? (winner === playerSide ? '🎉 You Win!' : winner === opponentSide ? '😔 You Lost' : '🤝 Draw!')
    : myTurn
      ? phase === 'placement' ? 'Your Turn — Place a piece'
        : selectedIdx === null ? 'Your Turn — Select a piece'
        : 'Your Turn — Tap destination'
    : `${opponentName}'s turn…`;

  const statusColor = !match || status === 'waiting' ? C.textSecondary
    : status === 'finished' ? (winner === playerSide ? '#4ADE80' : winner === opponentSide ? C.xColor : C.selected)
    : myTurn ? (playerSide === 'X' ? C.xColor : C.oColor) : C.textSecondary;

  return (
    <SafeAreaView style={ms.safe}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />

      {/* Header */}
      <View style={ms.header}>
        <Pressable onPress={() => navigation.goBack()} style={ms.backBtn}>
          <Text style={ms.backTxt}>← Lobby</Text>
        </Pressable>
        <Text style={ms.matchCode}>{matchId}</Text>
        {status === 'active' && (
          <Pressable onPress={handleResign} style={ms.resignBtn}>
            <Text style={ms.resignTxt}>Resign</Text>
          </Pressable>
        )}
      </View>

      {/* Player labels */}
      <View style={ms.players}>
        <View style={[ms.playerTag, { borderColor: playerSide === 'X' ? C.xColor : C.oColor }]}>
          <Text style={[ms.playerSymbol, { color: playerSide === 'X' ? C.xColor : C.oColor }]}>{playerSide}</Text>
          <Text style={ms.playerName} numberOfLines={1}>{myName}</Text>
          <Text style={ms.youLabel}>(you)</Text>
        </View>
        <Text style={ms.vsText}>VS</Text>
        <View style={[ms.playerTag, { borderColor: opponentSide === 'X' ? C.xColor : C.oColor }]}>
          <Text style={[ms.playerSymbol, { color: opponentSide === 'X' ? C.xColor : C.oColor }]}>{opponentSide}</Text>
          <Text style={ms.playerName} numberOfLines={1}>{opponentName}</Text>
        </View>
      </View>

      {/* Status */}
      <View style={ms.statusCard}>
        <Text style={[ms.statusTxt, { color: statusColor }]}>{statusLabel}</Text>
        {error && <Text style={ms.errorTxt}>{error}</Text>}
      </View>

      {/* Board */}
      <View style={ms.board}>
        {board.map((cell, idx) => (
          <Cell key={idx} index={idx} value={cell}
            isSelected={selectedIdx === idx} isWinCell={winCells.has(idx)}
            fontSize={FONT} disabled={!myTurn || status !== 'active'}
            onPress={handleCell} />
        ))}
      </View>

      {/* Phase tag */}
      {status === 'active' && (
        <View style={ms.phaseTag}>
          <Text style={ms.phaseTxt}>{phase === 'placement' ? '📍 Placement' : '🔄 Movement'}</Text>
        </View>
      )}

      {/* Play again */}
      {status === 'finished' && (
        <Pressable style={ms.playAgainBtn} onPress={() => navigation.goBack()}>
          <Text style={ms.playAgainTxt}>▶  Play Again</Text>
        </Pressable>
      )}
    </SafeAreaView>
  );
}

const ms = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg, alignItems: 'center', paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight ?? 0) + 4 : 8, paddingBottom: 20 },
  header: { flexDirection: 'row', alignItems: 'center', width: '100%', paddingHorizontal: 16, marginBottom: 12 },
  backBtn: { paddingVertical: 6, paddingRight: 12 },
  backTxt: { color: C.accentGlow, fontWeight: '700', fontSize: 14 },
  matchCode: { flex: 1, textAlign: 'center', color: C.textSecondary, fontWeight: '800', fontSize: 13, letterSpacing: 3 },
  resignBtn: { paddingVertical: 6, paddingLeft: 12 },
  resignTxt: { color: C.xColor, fontWeight: '700', fontSize: 13 },
  players: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 10 },
  playerTag: { flex: 1, backgroundColor: C.card, borderRadius: 12, borderWidth: 1.5, padding: 10, alignItems: 'center' },
  playerSymbol: { fontSize: 20, fontWeight: '900' },
  playerName: { color: C.textPrimary, fontSize: 12, fontWeight: '700', marginTop: 2 },
  youLabel: { color: C.textSecondary, fontSize: 10 },
  vsText: { color: C.accentGlow, fontWeight: '900', fontSize: 13 },
  statusCard: { backgroundColor: C.card, borderRadius: 14, paddingVertical: 10, paddingHorizontal: 20, marginBottom: 10, alignItems: 'center', borderWidth: 1, borderColor: C.border, minWidth: 220 },
  statusTxt: { fontSize: 16, fontWeight: '700' },
  errorTxt: { color: C.xColor, fontSize: 12, marginTop: 3 },
  board: { width: '90%', aspectRatio: 1, alignSelf: 'center', flexDirection: 'row', flexWrap: 'wrap', borderRadius: 16, overflow: 'hidden', backgroundColor: C.surface, borderWidth: 1.5, borderColor: C.border },
  cellPress: { width: '33.33%', aspectRatio: 1 },
  cellInner: { flex: 1, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  phaseTag: { marginTop: 12, backgroundColor: C.accentDim, borderRadius: 18, paddingVertical: 5, paddingHorizontal: 16 },
  phaseTxt: { color: C.accentGlow, fontWeight: '700', fontSize: 12 },
  playAgainBtn: { marginTop: 16, backgroundColor: C.accent, borderRadius: 14, paddingVertical: 13, paddingHorizontal: 46 },
  playAgainTxt: { color: '#FFF', fontSize: 15, fontWeight: '800', letterSpacing: 1 },
});
