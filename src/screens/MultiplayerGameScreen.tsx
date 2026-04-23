// MultiplayerGameScreen.tsx — Live board synced to Firestore
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated, Platform, Pressable, SafeAreaView, StatusBar,
  StyleSheet, Text, useWindowDimensions, View, Alert, ScrollView,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import ConfettiCannon from 'react-native-confetti-cannon';
import { Ionicons } from '@expo/vector-icons';
import { Board, Player } from '../game/gameTypes';
import { checkWinner, canPlace } from '../game/gameEngine';
import { useMatch } from '../hooks/useMatch';
import { recordMatchResult } from '../services/userService';

const C = {
  bg: '#0D0D1A', surface: '#14142B', card: '#1C1C3A', border: '#2A2A5A',
  accent: '#7C5CFC', accentGlow: '#9B7DFF', accentDim: '#3D2E7C',
  xColor: '#FF6B8A', xGlow: '#FF4D73', oColor: '#4FC3F7', oGlow: '#29B6F6',
  textPrimary: '#F0F0FF', textSecondary: '#8888AA',
  selected: '#FFD700', selectedBg: '#3A3000', winCell: '#FFD700',
  gold: '#FFD700',
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
  const pulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (isWinCell) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulse, { toValue: 1.15, duration: 600, useNativeDriver: true }),
          Animated.timing(pulse, { toValue: 1, duration: 600, useNativeDriver: true }),
        ])
      ).start();
    } else {
      pulse.setValue(1);
    }
  }, [isWinCell]);

  const handle = () => {
    if (disabled) return;
    Animated.sequence([
      Animated.timing(scale, { toValue: 0.84, duration: 70, useNativeDriver: true }),
      Animated.timing(scale, { toValue: 1, duration: 110, useNativeDriver: true }),
    ]).start();
    onPress(index);
  };

  const border = isWinCell ? C.gold : isSelected ? C.gold : C.border;
  const bg = isSelected ? C.selectedBg : isWinCell ? '#2A2600' : C.card;
  const color = value === 'X' ? C.xColor : C.oColor;
  const glow = value === 'X' ? C.xGlow : C.oGlow;

  return (
    <Pressable onPress={handle} accessibilityLabel={`cell-${index}`} style={ms.cellPress}>
      <Animated.View style={[ms.cellInner, { borderColor: border, backgroundColor: bg }, { transform: [{ scale: isWinCell ? pulse : scale }] }]}>
        {value && (
          <Text style={{ 
            fontSize, fontWeight: '900', color, 
            textShadowColor: isWinCell ? C.gold : glow, 
            textShadowOffset: { width: 0, height: 0 }, 
            textShadowRadius: isWinCell ? 20 : 12 
          }}>
            {value === 'X' ? '✕' : '○'}
          </Text>
        )}
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
  const resultAnim = useRef(new Animated.Value(0)).current;

  const board: Board = optimisticBoard ?? match?.board ?? Array(9).fill(null);
  const phase = match ? (canPlace(board, playerSide) ? 'placement' : 'movement') : 'placement';
  const winner = match ? checkWinner(board) : null;
  const winCells = getWinCells(board, winner);
  const opponentSide: Player = playerSide === 'X' ? 'O' : 'X';
  const opponentName = playerSide === 'X' ? match?.playerO?.displayName ?? 'Opponent' : match?.playerX?.displayName ?? 'Opponent';

  const isWinner = winner === playerSide;
  const isLoser = winner && winner !== playerSide;
  const isDraw = winner === null && match?.status === 'finished';

  // Handle match end effects
  useEffect(() => {
    if (match?.status === 'finished') {
      // Trigger result animation
      Animated.spring(resultAnim, { toValue: 1, useNativeDriver: true, tension: 50, friction: 7 }).start();

      if (!resultRecorded) {
        setResultRecorded(true);
        recordMatchResult(myUid, isWinner);

        if (isWinner) {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } else if (isLoser) {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        }
      }
    }
  }, [match?.status, isWinner, isLoser, myUid, resultRecorded]);

  const handleCell = useCallback(async (index: number) => {
    if (!match || !myTurn || match.status !== 'active') return;
    if (phase === 'placement') {
      if (board[index] !== null) return;
      await applyMove({ type: 'place', toIndex: index });
      return;
    }
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

  const status = match?.status;
  const statusLabel = !match ? 'Connecting…'
    : status === 'waiting' ? 'Waiting for opponent…'
    : status === 'finished' ? (isWinner ? 'Victory!' : isLoser ? 'Defeat' : 'Draw')
    : myTurn
      ? phase === 'placement' ? 'Your Turn'
        : selectedIdx === null ? 'Select Piece'
        : 'Move Piece'
    : `${opponentName}'s turn…`;

  return (
    <SafeAreaView style={ms.safe}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />

      {/* Confetti on Win */}
      {isWinner && <ConfettiCannon count={200} origin={{ x: W / 2, y: -20 }} fallSpeed={3000} fadeOut={true} />}

      <ScrollView 
        contentContainerStyle={ms.scroll} 
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={ms.header}>
          <Pressable onPress={() => navigation.goBack()} style={ms.backBtn}>
            <Ionicons name="chevron-back" size={24} color={C.accentGlow} />
          </Pressable>
          <Text style={ms.matchCode}>{matchId}</Text>
          {status === 'active' && (
            <Pressable onPress={handleResign} style={ms.resignBtn}>
              <Text style={ms.resignTxt}>Resign</Text>
            </Pressable>
          )}
        </View>

        {/* Players Section */}
        <View style={ms.players}>
          <View style={[
            ms.playerTag, 
            { borderColor: playerSide === 'X' ? C.xColor : C.oColor },
            isWinner && ms.winnerTag
          ]}>
            {isWinner && <Text style={ms.crown}>👑</Text>}
            <Text style={[ms.playerSymbol, { color: playerSide === 'X' ? C.xColor : C.oColor }]}>{playerSide}</Text>
            <Text style={ms.playerName} numberOfLines={1}>{myName}</Text>
            <Text style={ms.youLabel}>(you)</Text>
          </View>
          <Text style={ms.vsText}>VS</Text>
          <View style={[
            ms.playerTag, 
            { borderColor: opponentSide === 'X' ? C.xColor : C.oColor },
            isLoser && ms.winnerTag
          ]}>
            {isLoser && <Text style={ms.crown}>👑</Text>}
            <Text style={[ms.playerSymbol, { color: opponentSide === 'X' ? C.xColor : C.oColor }]}>{opponentSide}</Text>
            <Text style={ms.playerName} numberOfLines={1}>{opponentName}</Text>
          </View>
        </View>

        {/* Main Board */}
        <View style={[ms.boardContainer, isLoser && ms.dimmed]}>
          <View style={ms.board}>
            {board.map((cell, idx) => (
              <Cell key={idx} index={idx} value={cell}
                isSelected={selectedIdx === idx} isWinCell={winCells.has(idx)}
                fontSize={FONT} disabled={!myTurn || status !== 'active'}
                onPress={handleCell} />
            ))}
          </View>
        </View>

        {/* Turn Indicator — Now directly below board */}
        {status === 'active' && (
          <View style={ms.turnIndicatorContainer}>
            <View style={[ms.activeStatus, myTurn && ms.myTurnGlow]}>
              <Text style={[ms.statusTxt, { color: myTurn ? C.accentGlow : C.textSecondary }]}>
                {statusLabel}
              </Text>
              {error && <Text style={ms.errorTxt}>{error}</Text>}
              <View style={ms.phaseTag}>
                <Text style={ms.phaseTxt}>{phase === 'placement' ? '📍 Placement' : '🔄 Movement'}</Text>
              </View>
            </View>
          </View>
        )}

        {/* Result Overlay */}
        {status === 'finished' && (
          <View style={ms.resultWrapper}>
            <Animated.View style={[
              ms.resultBanner, 
              { 
                opacity: resultAnim,
                transform: [{ scale: resultAnim.interpolate({ inputRange: [0, 1], outputRange: [0.8, 1] }) }]
              }
            ]}>
              <Text style={[
                ms.resultTitle, 
                { color: isWinner ? C.gold : isLoser ? C.xColor : C.textPrimary }
              ]}>
                {isWinner ? 'YOU WIN!' : isLoser ? 'GAME OVER' : 'DRAW'}
              </Text>
              <Text style={ms.resultSub}>
                {isWinner ? 'A legendary victory!' : isLoser ? 'Better luck next time.' : 'Equal match!'}
              </Text>
              
              <Pressable style={ms.playAgainBtn} onPress={() => navigation.goBack()}>
                <Text style={ms.playAgainTxt}>Play Again</Text>
              </Pressable>
            </Animated.View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const ms = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  scroll: { paddingBottom: 100, alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', width: '100%', paddingHorizontal: 20, marginTop: 20, marginBottom: 20 },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: C.card, justifyContent: 'center', alignItems: 'center' },
  matchCode: { flex: 1, textAlign: 'center', color: C.textSecondary, fontWeight: '800', fontSize: 13, letterSpacing: 3 },
  resignBtn: { paddingVertical: 8, paddingHorizontal: 12 },
  resignTxt: { color: C.xColor, fontWeight: '700', fontSize: 13 },
  players: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 24, marginBottom: 30 },
  playerTag: { flex: 1, backgroundColor: C.card, borderRadius: 16, borderWidth: 2, padding: 12, alignItems: 'center', position: 'relative' },
  winnerTag: { borderColor: C.gold, shadowColor: C.gold, shadowOpacity: 0.3, shadowRadius: 10, elevation: 5 },
  crown: { position: 'absolute', top: -15, fontSize: 24 },
  playerSymbol: { fontSize: 24, fontWeight: '900' },
  playerName: { color: C.textPrimary, fontSize: 14, fontWeight: '700', marginTop: 4 },
  youLabel: { color: C.textSecondary, fontSize: 10 },
  vsText: { color: C.accentGlow, fontWeight: '900', fontSize: 14 },
  boardContainer: { width: '90%', aspectRatio: 1, alignSelf: 'center', marginBottom: 24 },
  dimmed: { opacity: 0.5 },
  board: { flex: 1, flexDirection: 'row', flexWrap: 'wrap', borderRadius: 24, overflow: 'hidden', backgroundColor: C.surface, borderWidth: 2, borderColor: C.border },
  cellPress: { width: '33.33%', aspectRatio: 1 },
  cellInner: { flex: 1, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  turnIndicatorContainer: { width: '100%', paddingHorizontal: 24, alignItems: 'center', marginBottom: 40 },
  activeStatus: { width: '100%', backgroundColor: C.card, borderRadius: 20, padding: 20, alignItems: 'center', borderWidth: 1, borderColor: C.border },
  myTurnGlow: { borderColor: C.accent, shadowColor: C.accent, shadowOpacity: 0.2, shadowRadius: 10, elevation: 5 },
  statusTxt: { fontSize: 18, fontWeight: '800', marginBottom: 12 },
  errorTxt: { color: C.xColor, fontSize: 12, marginBottom: 8 },
  phaseTag: { backgroundColor: C.accentDim, borderRadius: 20, paddingVertical: 6, paddingHorizontal: 16 },
  phaseTxt: { color: C.accentGlow, fontWeight: '700', fontSize: 12 },
  resultWrapper: { width: '100%', paddingHorizontal: 24, marginTop: 10, alignItems: 'center' },
  resultBanner: { width: '100%', backgroundColor: C.card, borderRadius: 24, padding: 24, alignItems: 'center', borderWidth: 2, borderColor: C.border },
  resultTitle: { fontSize: 36, fontWeight: '900', letterSpacing: 2, marginBottom: 8 },
  resultSub: { fontSize: 16, color: C.textSecondary, marginBottom: 24 },
  playAgainBtn: { 
    width: '100%', backgroundColor: C.accent, borderRadius: 16, paddingVertical: 18, 
    alignItems: 'center', shadowColor: C.accent, shadowOpacity: 0.4, shadowRadius: 15, elevation: 8 
  },
  playAgainTxt: { color: '#FFF', fontSize: 18, fontWeight: '900', letterSpacing: 1 },
});
