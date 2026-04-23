import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated as RNAnimated, Platform, Pressable, SafeAreaView, StatusBar,
  StyleSheet, Text, useWindowDimensions, View, Alert, ScrollView,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import Animated, { 
  useSharedValue, useAnimatedStyle, withTiming, withSequence, 
  withDelay, withRepeat, Easing, interpolate, runOnJS, useDerivedValue 
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import ConfettiCannon from 'react-native-confetti-cannon';
import { Ionicons } from '@expo/vector-icons';
import { Board, Player } from '../game/gameTypes';
import { checkWinner, canPlace, getWinningLine } from '../game/gameEngine';
import { useMatch } from '../hooks/useMatch';
import { recordMatchResult } from '../services/userService';
import { startNextRound } from '../services/matchService';

const C = {
  bg: '#0D0D1A', surface: '#14142B', card: '#1C1C3A', border: '#2A2A5A',
  accent: '#7C5CFC', accentGlow: '#9B7DFF', accentDim: '#3D2E7C',
  xColor: '#FF6B8A', xGlow: '#FF4D73', oColor: '#4FC3F7', oGlow: '#29B6F6',
  textPrimary: '#F0F0FF', textSecondary: '#8888AA',
  selected: '#FFD700', selectedBg: '#3A3000', winCell: '#FFD700',
  gold: '#FFD700',
};



interface CellProps {
  index: number; value: Player | null; isSelected: boolean;
  isWinCell: boolean; isOtherDimmed: boolean; fontSize: number; disabled: boolean;
  boardSize: number;
  onPress: (i: number) => void;
  onLayout: (index: number, layout: { x: number, y: number, w: number, h: number }) => void;
}
function Cell({ index, value, isSelected, isWinCell, isOtherDimmed, fontSize, disabled, boardSize, onPress, onLayout }: CellProps) {
  const scale = useSharedValue(1);
  const pulse = useSharedValue(1);

  const handleLayout = (e: any) => {
    const { x, y, width, height } = e.nativeEvent.layout;
    onLayout(index, { x, y, w: width, h: height });
  };

  useEffect(() => {
    if (isWinCell) {
      pulse.value = withRepeat(
        withSequence(
          withTiming(1.12, { duration: 600 }),
          withTiming(1, { duration: 600 })
        ),
        -1, 
        true 
      );
    } else {
      pulse.value = 1;
    }
  }, [isWinCell]);

  const animatedCellInner = useAnimatedStyle(() => ({
    transform: [{ scale: isWinCell ? pulse.value : scale.value }],
    opacity: isOtherDimmed && !isWinCell ? 0.4 : 1,
    borderColor: isWinCell ? C.gold : isSelected ? C.gold : C.border,
    backgroundColor: isSelected ? C.selectedBg : isWinCell ? '#2A2600' : C.card,
  }));

  const handle = () => {
    if (disabled) return;
    scale.value = withSequence(
      withTiming(0.84, { duration: 70 }),
      withTiming(1, { duration: 110 })
    );
    onPress(index);
  };

  const color = value === 'X' ? C.xColor : C.oColor;
  const glow = value === 'X' ? C.xGlow : C.oGlow;

  return (
    <Pressable 
      onLayout={handleLayout} 
      onPress={handle} 
      accessibilityLabel={`cell-${index}`} 
      style={[ms.cellPress, { flexBasis: `${100 / boardSize}%` }]}
    >
      <Animated.View style={[ms.cellInner, animatedCellInner]}>
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


function StrikeLine({ winLine, layouts }: { winLine: number[] | null, layouts: Record<number, any> }) {
  const progress = useSharedValue(0);
  const winLineValue = useDerivedValue(() => winLine);

  useEffect(() => {
    if (winLine) {
      progress.value = withDelay(200, withTiming(1, { duration: 450, easing: Easing.out(Easing.quad) }));
    } else {
      progress.value = 0;
    }
  }, [winLine]);

  const animatedStyle = useAnimatedStyle(() => {
    const line = winLineValue.value;
    if (!line || !layouts[line[0]] || !layouts[line[2]]) return { opacity: 0 };

    const start = layouts[line[0]];
    const end = layouts[line[2]];

    const startX = start.x + start.w / 2;
    const startY = start.y + start.h / 2;
    const endX = end.x + end.w / 2;
    const endY = end.y + end.h / 2;

    const dx = endX - startX;
    const dy = endY - startY;
    const length = Math.sqrt(dx * dx + dy * dy);
    const angle = Math.atan2(dy, dx);

    return {
      position: 'absolute',
      top: startY - 3, // Center the line height (6/2)
      left: startX,
      width: length,
      height: 6,
      backgroundColor: C.gold,
      borderRadius: 4,
      shadowColor: C.gold,
      shadowOpacity: 0.8,
      shadowRadius: 10,
      elevation: 10,
      zIndex: 20,
      opacity: 1,
      transform: [
        { rotate: `${angle}rad` },
        { scaleX: progress.value }
      ],
      // Reanimated 3 supports transformOrigin as a property
      // If using older Reanimated, you'd need to translate it
      // but transformOrigin is supported in modern versions
      // @ts-ignore
      transformOrigin: 'left',
    };
  });

  return <Animated.View style={animatedStyle} />;
}


export default function MultiplayerGameScreen({ route, navigation }: any) {
  const { matchId, playerSide, myUid, myName } = route.params;
  const { width: W } = useWindowDimensions();
  const BOARD_WIDTH = W * 0.9;
  
  const { match, optimisticBoard, myTurn, error, applyMove, resign } = useMatch(matchId, myUid, playerSide);
  
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [resultRecorded, setResultRecorded] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [tileLayouts, setTileLayouts] = useState<Record<number, any>>({});
  const [xpGained, setXpGained] = useState<number | null>(null);
  
  // Reanimated values for board focus
  const boardScale = useSharedValue(1);
  const resultScale = useSharedValue(0.8);
  const resultOpacity = useSharedValue(0);

  const handleTileLayout = useCallback((index: number, layout: any) => {
    setTileLayouts(prev => ({ ...prev, [index]: layout }));
  }, []);

  const resetLocalState = useCallback(() => {
    setSelectedIdx(null);
    setResultRecorded(false);
    setShowConfetti(false);
    setXpGained(null);
    boardScale.value = 1;
    resultScale.value = 0.8;
    resultOpacity.value = 0;
  }, []);

  // Handle Round Reset
  useEffect(() => {
    if (match?.status === 'active' && resultRecorded) {
      resetLocalState();
    }
  }, [match?.status, resultRecorded, resetLocalState]);

  const board: Board = optimisticBoard ?? match?.board ?? Array(9).fill(null);
  const boardSize = match?.boardSize || 3;
  const winLength = match?.winLength || 3;
  const pieceLimit = match?.pieceLimit || 3;
  
  const cellSize = BOARD_WIDTH / boardSize;
  const boardFontSize = Math.floor(cellSize * 0.44);

  const phase = match ? (canPlace(board, playerSide, pieceLimit) ? 'placement' : 'movement') : 'placement';
  const winner = match?.winner;
  const winningLine = match?.winningLine;
  const winSet = new Set(winningLine || []);
  
  const isWinner = winner === playerSide;
  const isLoser = winner && winner !== playerSide;
  const opponentSide: Player = playerSide === 'X' ? 'O' : 'X';
  const opponentName = playerSide === 'X' ? match?.playerO?.displayName ?? 'Opponent' : match?.playerX?.displayName ?? 'Opponent';

  // Session Stats
  const myScore = match?.scores?.[myUid] || 0;
  const oppUid = playerSide === 'X' ? match?.playerO?.uid : match?.playerX?.uid;
  const oppScore = (oppUid && match?.scores?.[oppUid]) || 0;
  const myStreak = match?.winStreaks?.[myUid] || 0;

  // Cinematic Win Sequence + Auto Next Round
  useEffect(() => {
    if (match?.status === 'finished') {
      if (winner) {
        boardScale.value = withDelay(100, withTiming(1.05, { duration: 400 }));
        setTimeout(() => {
          if (isWinner) setShowConfetti(true);
          resultOpacity.value = withTiming(1, { duration: 400 });
          resultScale.value = withTiming(1, { duration: 500, easing: Easing.out(Easing.back(1.5)) });
        }, 600);
      }

      if (!resultRecorded) {
        setResultRecorded(true);
        const xp = (isWinner ? 50 : 20) + (myStreak * 10);
        setXpGained(xp);
        recordMatchResult(myUid, isWinner, isWinner ? myStreak : 0);
        
        if (isWinner) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        else if (isLoser) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);

        // AUTO START NEXT ROUND
        setTimeout(() => {
          startNextRound(matchId);
        }, 3000);
      }
    }
  }, [match?.status, winner, isWinner, isLoser, myUid, resultRecorded, myStreak, matchId]);

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
  }, [match, myTurn, phase, board, selectedIdx, playerSide, matchId]);

  const handleResign = () => {
    Alert.alert('Exit Match?', 'Session will be saved.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Exit', style: 'destructive', onPress: () => resign().then(() => navigation.goBack()) },
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

  const animatedBoardStyle = useAnimatedStyle(() => ({
    transform: [{ scale: boardScale.value }]
  }));

  const animatedResultStyle = useAnimatedStyle(() => ({
    opacity: resultOpacity.value,
    transform: [{ scale: resultScale.value }]
  }));

  return (
    <View style={ms.root}>
      <SafeAreaView style={ms.safe}>
        <StatusBar barStyle="light-content" backgroundColor={C.bg} />

        <ScrollView 
          contentContainerStyle={ms.scroll} 
          showsVerticalScrollIndicator={false}
        >
          {/* Session Header */}
          <View style={ms.header}>
            <Pressable onPress={handleResign} style={ms.backBtn}>
              <Ionicons name="close" size={24} color={C.xColor} />
            </Pressable>
            <View style={ms.roundBadge}>
              <Text style={ms.roundTxt}>ROUND {match?.roundNumber || 1}</Text>
            </View>
            <Text style={ms.matchCode}>{matchId}</Text>
          </View>

          {/* Player HUD */}
          <View style={ms.players}>
            <View style={[ms.playerCard, myTurn && status === 'active' && ms.activeCard]}>
              <Text style={[ms.symbol, { color: playerSide === 'X' ? C.xColor : C.oColor }]}>{playerSide}</Text>
              <Text style={ms.score}>{myScore}</Text>
              {myStreak > 0 && <Text style={ms.streak}>🔥 {myStreak}</Text>}
              <Text style={ms.name} numberOfLines={1}>{myName}</Text>
            </View>
            
            <View style={ms.vsContainer}>
              <Text style={ms.vsTxt}>VS</Text>
            </View>

            <View style={[ms.playerCard, !myTurn && status === 'active' && ms.activeCard]}>
              <Text style={[ms.symbol, { color: opponentSide === 'X' ? C.xColor : C.oColor }]}>{opponentSide}</Text>
              <Text style={ms.score}>{oppScore}</Text>
              <Text style={ms.name} numberOfLines={1}>{opponentName}</Text>
            </View>
          </View>

          {/* Main Board */}
          <Animated.View style={[ms.boardContainer, animatedBoardStyle]}>
            <View style={[ms.board, { width: BOARD_WIDTH, height: BOARD_WIDTH }]}>
              {board.map((cell, idx) => (
                <Cell 
                  key={idx} 
                  index={idx} 
                  value={cell}
                  isSelected={selectedIdx === idx} 
                  isWinCell={winSet.has(idx)}
                  isOtherDimmed={!!winner}
                  fontSize={boardFontSize} 
                  disabled={!myTurn || status !== 'active'}
                  boardSize={boardSize}
                  onPress={handleCell}
                  onLayout={handleTileLayout}
                />
              ))}
              <StrikeLine winLine={winningLine || null} layouts={tileLayouts} />
            </View>
          </Animated.View>

          {/* HUD Info */}
          <View style={ms.hudInfo}>
            <View style={ms.ruleTag}>
              <Text style={ms.ruleTxt}>{boardSize}x{boardSize} • {winLength} in a row</Text>
            </View>
            <Text style={[ms.statusMain, { color: myTurn ? C.accentGlow : C.textSecondary }]}>
              {statusLabel}
            </Text>
            <Text style={ms.phaseMain}>{phase === 'placement' ? 'PLACEMENT' : 'MOVEMENT'}</Text>
          </View>

          {/* Result Overlay */}
          {status === 'finished' && (
            <View style={ms.resultWrapper}>
              <Animated.View style={[ms.resultBanner, animatedResultStyle]}>
                <Text style={[
                  ms.resultTitle, 
                  { color: isWinner ? C.gold : isLoser ? C.xColor : C.textPrimary }
                ]}>
                  {isWinner ? 'VICTORY!' : isLoser ? 'DEFEAT' : 'DRAW'}
                </Text>
                {xpGained && (
                  <View style={ms.xpBadge}>
                    <Text style={ms.xpTxt}>+{xpGained} XP</Text>
                  </View>
                )}
                <Text style={ms.nextRoundTxt}>Preparing next round...</Text>
              </Animated.View>
            </View>
          )}
        </ScrollView>
      </SafeAreaView>

      <View pointerEvents="none" style={ms.confettiOverlay}>
        {showConfetti && <ConfettiCannon count={200} origin={{ x: W / 2, y: -20 }} fallSpeed={3000} fadeOut={true} />}
      </View>
    </View>
  );
}

const ms = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  safe: { flex: 1 },
  confettiOverlay: { ...StyleSheet.absoluteFillObject, zIndex: 999, elevation: 999 },
  scroll: { paddingBottom: 60, alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', width: '100%', paddingHorizontal: 20, marginTop: 10, marginBottom: 15 },
  backBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: C.card, justifyContent: 'center', alignItems: 'center' },
  roundBadge: { backgroundColor: C.accent, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 12, marginHorizontal: 10 },
  roundTxt: { color: '#FFF', fontWeight: '900', fontSize: 14, letterSpacing: 1 },
  matchCode: { flex: 1, textAlign: 'right', color: C.textSecondary, fontWeight: '700', fontSize: 12 },
  
  players: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 15, width: '100%', paddingHorizontal: 20, marginBottom: 25 },
  playerCard: { flex: 1, backgroundColor: C.card, borderRadius: 20, padding: 15, alignItems: 'center', borderWidth: 1, borderColor: C.border },
  activeCard: { borderColor: C.accent, shadowColor: C.accent, shadowOpacity: 0.3, shadowRadius: 10, elevation: 5 },
  symbol: { fontSize: 28, fontWeight: '900', marginBottom: 5 },
  score: { fontSize: 24, fontWeight: '900', color: C.textPrimary },
  streak: { fontSize: 12, color: C.gold, fontWeight: '800', marginTop: 2 },
  name: { fontSize: 12, color: C.textSecondary, marginTop: 5, fontWeight: '600' },
  vsContainer: { width: 40, height: 40, borderRadius: 20, backgroundColor: C.surface, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: C.border },
  vsTxt: { color: C.accentGlow, fontWeight: '900', fontSize: 12 },

  boardContainer: { shadowColor: '#000', shadowOpacity: 0.5, shadowRadius: 20, elevation: 15 },
  board: { flexDirection: 'row', flexWrap: 'wrap', backgroundColor: C.surface, borderRadius: 20, overflow: 'hidden', borderWidth: 2, borderColor: C.border },
  cellPress: { flexBasis: '20%', aspectRatio: 1 }, // Dynamic flexBasis handled in component
  cellInner: { flex: 1, alignItems: 'center', justifyContent: 'center', borderWidth: 0.5, borderColor: C.border },

  hudInfo: { alignItems: 'center', marginTop: 25 },
  ruleTag: { backgroundColor: C.card, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10, marginBottom: 15 },
  ruleTxt: { color: C.textSecondary, fontSize: 12, fontWeight: '700' },
  statusMain: { fontSize: 22, fontWeight: '900', letterSpacing: 1, marginBottom: 5 },
  phaseMain: { fontSize: 12, color: C.accentGlow, fontWeight: '800', letterSpacing: 2 },

  resultWrapper: { width: '100%', paddingHorizontal: 20, marginTop: 20 },
  resultBanner: { backgroundColor: C.card, borderRadius: 24, padding: 25, alignItems: 'center', borderWidth: 2, borderColor: C.accentDim },
  resultTitle: { fontSize: 32, fontWeight: '900', marginBottom: 15 },
  xpBadge: { backgroundColor: '#FFD70022', borderColor: C.gold, borderWidth: 1, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 15, marginBottom: 15 },
  xpTxt: { color: C.gold, fontWeight: '900', fontSize: 18 },
  nextRoundTxt: { color: C.textSecondary, fontSize: 14, fontWeight: '600' },
});
