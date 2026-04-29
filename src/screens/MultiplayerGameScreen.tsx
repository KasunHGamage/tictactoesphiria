import React, { useCallback, useEffect, useRef, useState } from 'react';
import ScreenWrapper from '../components/ScreenWrapper';
import {
  Animated as RNAnimated, Platform, Pressable, StatusBar,
  StyleSheet, Text, useWindowDimensions, View, Alert, ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import Animated, { 
  useSharedValue, useAnimatedStyle, withTiming, withSequence, 
  withDelay, withRepeat, Easing, interpolate, runOnJS, useDerivedValue 
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import NeonConfetti from '../components/NeonConfetti';
import { Colors, Spacing, glow } from '../../constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { Board, Player } from '../game/gameTypes';
import { checkWinner, canPlace, getWinningLine, getPlayerPieces } from '../game/gameEngine';
import { useMatch } from '../hooks/useMatch';
import { recordMatchResult } from '../services/userService';
import { startNextRound, claimTimeoutWin } from '../services/matchService';

// Use global theme tokens from constants/theme



interface CellProps {
  index: number; value: Player | null; isSelected: boolean;
  isWinCell: boolean; isOtherDimmed: boolean; fontSize: number; disabled: boolean;
  boardSize: number;
  onPress: (i: number) => void;
  onLayout: (index: number, layout: { x: number, y: number, w: number, h: number }) => void;
}
function Cell({ index, value, isSelected, isWinCell, isOtherDimmed, size, fontSize, disabled, boardSize, onPress, onLayout }: any) {
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
    borderColor: isWinCell ? Colors.neonYellow : isSelected ? Colors.neonYellow : Colors.border,
    backgroundColor: isSelected ? 'rgba(255,214,10,0.08)' : isWinCell ? 'rgba(255,214,10,0.15)' : Colors.card,
  }));

  const handle = () => {
    if (disabled) return;
    scale.value = withSequence(
      withTiming(0.84, { duration: 70 }),
      withTiming(1, { duration: 110 })
    );
    onPress(index);
  };

  const color = value === 'X' ? Colors.neonPink : Colors.neonBlue;
  const glow = value === 'X' ? Colors.neonPink : Colors.neonBlue;

  return (
    <Pressable 
      onLayout={handleLayout} 
      onPress={handle} 
      accessibilityLabel={`cell-${index}`} 
      style={{ width: size, height: size }}
    >
      <Animated.View style={[ms.cellInner, animatedCellInner]}>
        {value && (
          <Text style={{ 
            fontSize, fontWeight: '900', color, 
            textShadowColor: isWinCell ? Colors.neonYellow : glow, 
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
      backgroundColor: Colors.neonYellow,
      borderRadius: 4,
      shadowColor: Colors.neonYellow,
      shadowOpacity: 0.85,
      shadowRadius: 12,
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

  return <Animated.View pointerEvents="none" style={animatedStyle} />;
}


export default function MultiplayerGameScreen({ route, navigation }: any) {
  const { matchId, playerSide, myUid, myName } = route.params;
  const { width: W } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const BOARD_WIDTH = W - 32;

  const { match, optimisticBoard, myTurn, error, applyMove, resign } = useMatch(matchId, myUid, playerSide);
  
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [resultRecorded, setResultRecorded] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [tileLayouts, setTileLayouts] = useState<Record<number, any>>({});
  const [xpGained, setXpGained] = useState<number | null>(null);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  
  // Reanimated values for board focus
  const boardScale = useSharedValue(1);
  const resultScale = useSharedValue(0.8);
  const resultOpacity = useSharedValue(0);
  const turnPulse = useSharedValue(1);

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

  // Turn pulse animation loop
  useEffect(() => {
    turnPulse.value = withRepeat(
      withSequence(
        withTiming(1.05, { duration: 600, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 600, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );
  }, []);

  // Handle Round Reset
  useEffect(() => {
    if (match?.status === 'playing' && resultRecorded) {
      resetLocalState();
    }
  }, [match?.status, resultRecorded, resetLocalState]);

  const gridSize = match?.gridSize || 3;
  const BOARD_BORDER = 2; // borderWidth on the board View
  const cellSize = Math.floor((BOARD_WIDTH - BOARD_BORDER * 2) / gridSize);
  const board: Board = optimisticBoard ?? match?.board ?? Array(gridSize * gridSize).fill(null);
  const winLength = match?.winLength || 3;
  const maxPieces = match?.maxPieces || 3;
  const boardFontSize = Math.floor(cellSize * 0.44);

  // Timeout logic
  useEffect(() => {
    if (!match || match.status !== 'playing' || !match.turnStartedAt || !match.turnDuration) {
      setTimeLeft(null);
      return;
    }

    const startedMs = match.turnStartedAt.toMillis ? match.turnStartedAt.toMillis() : (match.turnStartedAt.seconds * 1000) || Date.now();
    
    const interval = setInterval(() => {
      const now = Date.now();
      const diff = Math.floor((now - startedMs) / 1000);
      const remaining = Math.max(0, match.turnDuration - diff);
      setTimeLeft(remaining);

      if (remaining === 0) {
        clearInterval(interval);
        // If it's NOT our turn, we claim the win.
        if (match.currentPlayer !== playerSide) {
          claimTimeoutWin(matchId, playerSide);
        }
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [match?.turnStartedAt, match?.status, match?.currentPlayer, playerSide, matchId]);

  console.log(`[DEBUG] MultiplayerGameScreen: gridSize=${gridSize}, cellSize=${cellSize}, BOARD_WIDTH=${BOARD_WIDTH}`);

  const phase = match ? (canPlace(board, playerSide, maxPieces) ? 'placement' : 'movement') : 'placement';
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
    if (match?.status === 'finished' || match?.status === 'abandoned') {
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
    if (!match || !myTurn || match.status !== 'playing') return;
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
    : status === 'abandoned' ? (isWinner ? 'Opponent left — You win!' : 'You left the match')
    : myTurn
      ? phase === 'placement' ? `Place Piece (${getPlayerPieces(board, playerSide).length}/${maxPieces})`
        : selectedIdx === null ? 'Select Piece'
        : 'Move to Target'
    : `${opponentName}'s turn…`;

  const animatedBoardStyle = useAnimatedStyle(() => ({
    transform: [{ scale: boardScale.value }]
  }));

  const animatedResultStyle = useAnimatedStyle(() => ({
    opacity: resultOpacity.value,
    transform: [{ scale: resultScale.value }]
  }));

  const animatedMyCardStyle = useAnimatedStyle(() => ({
    transform: [{ scale: myTurn && status === 'playing' ? turnPulse.value : 1 }]
  }));

  const animatedOppCardStyle = useAnimatedStyle(() => ({
    transform: [{ scale: !myTurn && status === 'playing' ? turnPulse.value : 1 }]
  }));

  return (
    <ScreenWrapper scroll={true} horizontalPadding={0}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.bg} />

      {/* Session Header */}
      <View style={ms.header}>
        <Pressable onPress={handleResign} style={ms.backBtn}>
          <Ionicons name="close" size={24} color={Colors.neonPink} />
        </Pressable>
        <View style={ms.roundBadge}>
          <Text style={ms.roundTxt}>ROUND {match?.roundNumber || 1}</Text>
        </View>
        <Text style={ms.matchCode}>{matchId}</Text>
      </View>

      <View style={ms.content}>
        {/* Player HUD */}
        <View style={ms.players}>
          <Animated.View style={[ms.playerCard, myTurn && status === 'playing' && ms.activeCard, animatedMyCardStyle]}>
            <Text style={[ms.symbol, { color: playerSide === 'X' ? Colors.neonPink : Colors.neonBlue }]}>{playerSide}</Text>
            <Text style={ms.score}>{myScore}</Text>
            {myStreak > 0 && <Text style={ms.streak}>🔥 {myStreak}</Text>}
            <Text style={ms.name} numberOfLines={1}>{myName}</Text>
          </Animated.View>
          
          <View style={ms.vsContainer}>
            <Text style={ms.vsTxt}>VS</Text>
          </View>

          <Animated.View style={[ms.playerCard, !myTurn && status === 'playing' && ms.activeCard, animatedOppCardStyle]}>
            <Text style={[ms.symbol, { color: opponentSide === 'X' ? Colors.neonPink : Colors.neonBlue }]}>{opponentSide}</Text>
            <Text style={ms.score}>{oppScore}</Text>
            <Text style={ms.name} numberOfLines={1}>{opponentName}</Text>
          </Animated.View>
        </View>

        {/* Dynamic Instruction Card */}
        {status === 'playing' && (
          <View style={ms.instructionCard}>
            <View style={ms.instrRow}>
              <Text style={ms.instrEmoji}>🎯</Text>
              <Text style={ms.instrLabel}>{gridSize}x{gridSize} • {winLength} in a row</Text>
            </View>
            <View style={ms.instrRow}>
              <Text style={ms.instrEmoji}>📦</Text>
              <Text style={ms.instrLabel}>Pieces: {getPlayerPieces(board, playerSide).length} / {maxPieces}</Text>
            </View>
            <View style={ms.instrHintBox}>
              <Text style={ms.instrHintTxt}>
                {phase === 'placement' 
                  ? `👉 Place ${maxPieces - getPlayerPieces(board, playerSide).length} more piece${maxPieces - getPlayerPieces(board, playerSide).length > 1 ? 's' : ''}`
                  : '👉 Select a piece to move'}
              </Text>
            </View>
            {timeLeft !== null && (
              <View style={[ms.instrRow, { marginTop: 8 }]}>
                <Text style={ms.instrEmoji}>⏱</Text>
                <Text style={[ms.instrLabel, timeLeft <= 10 && ms.urgentTimeTxt]}>
                  Time left: {timeLeft}s
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Main Board */}
        <Animated.View pointerEvents="auto" style={[ms.boardContainer, animatedBoardStyle, { alignSelf: 'center' }]}>
          <View 
            key={`board-${gridSize}`}
            style={[ms.board, { width: BOARD_WIDTH, height: BOARD_WIDTH }]}
          >
            {board.map((cell, idx) => (
              <Cell 
                key={idx} 
                index={idx} 
                value={cell}
                isSelected={selectedIdx === idx} 
                isWinCell={winSet.has(idx)}
                isOtherDimmed={!!winner}
                size={cellSize}
                fontSize={boardFontSize} 
                disabled={!myTurn || status !== 'playing'}
                boardSize={gridSize}
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
            <Text style={ms.ruleTxt}>{gridSize}x{gridSize} • {winLength} in a row</Text>
          </View>
          <Text style={[ms.statusMain, { color: myTurn ? Colors.neonPurple : Colors.textSecondary }]}> 
            {statusLabel}
          </Text>
          <Text style={ms.phaseMain}>{phase === 'placement' ? 'PLACEMENT' : 'MOVEMENT'}</Text>
        </View>

        {/* Result Overlay */}
        {(status === 'finished' || status === 'abandoned') && (
          <View style={ms.footer}>
            <View style={ms.resultWrapper}>
              <Animated.View style={[ms.resultBanner, animatedResultStyle]}>
                <Text style={[
                  ms.resultTitle, 
                  { color: isWinner ? Colors.neonYellow : isLoser ? Colors.neonPink : Colors.textPrimary }
                ]}>
                  {status === 'abandoned' && isWinner ? 'OPPONENT LEFT' : isWinner ? 'VICTORY!' : isLoser ? 'DEFEAT' : 'DRAW'}
                </Text>
                {xpGained && (
                  <View style={ms.xpBadge}>
                    <Text style={ms.xpTxt}>+{xpGained} XP</Text>
                  </View>
                )}
                <Text style={ms.nextRoundTxt}>Preparing next round...</Text>
              </Animated.View>
            </View>
          </View>
        )}
      </View>

      <View pointerEvents="none" style={ms.confettiOverlay}>
        <NeonConfetti show={showConfetti} onComplete={() => setShowConfetti(false)} />
      </View>
    </ScreenWrapper>
  );
}

const ms = StyleSheet.create({
  confettiOverlay: { ...StyleSheet.absoluteFillObject, zIndex: 999, elevation: 999 },

  header: {
    flexDirection: 'row', alignItems: 'center', width: '100%',
    paddingHorizontal: 16, marginTop: 10, marginBottom: 20, gap: 10,
  },
  backBtn: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.card,
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, borderColor: Colors.neonPink + '66',
  },
  roundBadge: {
    backgroundColor: Colors.neonPurple + '22', paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: 12, borderWidth: 1, borderColor: Colors.neonPurple,
    ...glow(Colors.neonPurple, 6),
  },
  roundTxt: { color: Colors.neonPurple, fontWeight: '900', fontSize: 13, letterSpacing: 1.5 },
  matchCode: {
    flex: 1, textAlign: 'right', color: Colors.textSecondary,
    fontWeight: '700', fontSize: 11, letterSpacing: 1,
  },

  content: { marginTop: 20, gap: 20, paddingHorizontal: 16 },
  players: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 15, width: '100%',
  },
  playerCard: {
    flex: 1, backgroundColor: Colors.card, borderRadius: 20, padding: 15,
    alignItems: 'center', borderWidth: 1, borderColor: Colors.border,
  },
  activeCard: {
    borderColor: Colors.neonYellow, borderWidth: 2,
    shadowColor: Colors.neonYellow, shadowOpacity: 0.75, shadowRadius: 20, elevation: 12,
  },
  symbol: { fontSize: 28, fontWeight: '900', marginBottom: 5 },
  score: { fontSize: 26, fontWeight: '900', color: Colors.textPrimary },
  streak: { fontSize: 11, color: Colors.neonYellow, fontWeight: '900', marginTop: 3 },
  name: { fontSize: 11, color: Colors.textSecondary, marginTop: 5, fontWeight: '700', letterSpacing: 0.5 },
  vsContainer: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: '#160B28',
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, borderColor: Colors.neonPurple + '66',
    ...glow(Colors.neonPurple, 5),
  },
  vsTxt: { color: Colors.neonPurple, fontWeight: '900', fontSize: 12 },

  boardContainer: {
    shadowColor: Colors.neonPurple, shadowOpacity: 0.35, shadowRadius: 28, elevation: 16,
  },
  board: {
    flex: 0, flexDirection: 'row', flexWrap: 'wrap', backgroundColor: Colors.card,
    borderRadius: 20, overflow: 'hidden',
    borderWidth: 2, borderColor: Colors.neonPurple + '55',
  },
  cellPress: {},
  cellInner: {
    width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center',
    borderWidth: 0.5, borderColor: Colors.border,
  },

  hudInfo: { alignItems: 'center', marginTop: 10 },
  ruleTag: {
    backgroundColor: Colors.card, paddingHorizontal: 14, paddingVertical: 6,
    borderRadius: 10, marginBottom: 12,
    borderWidth: 1, borderColor: Colors.border,
  },
  ruleTxt: { color: Colors.textSecondary, fontSize: 11, fontWeight: '800', letterSpacing: 1 },
  statusMain: { fontSize: 20, fontWeight: '900', letterSpacing: 1, marginBottom: 5 },
  phaseMain: {
    fontSize: 10, color: Colors.neonPurple, fontWeight: '900', letterSpacing: 3,
    textShadowColor: Colors.neonPurple, textShadowRadius: 8,
  },

  footer: { marginTop: 20, marginBottom: 40 },
  resultWrapper: { width: '100%' },
  resultBanner: {
    backgroundColor: '#130820', borderRadius: 24, padding: 28,
    alignItems: 'center', borderWidth: 2, borderColor: Colors.neonPurple,
    ...glow(Colors.neonPurple, 22),
  },
  resultTitle: { fontSize: 34, fontWeight: '900', marginBottom: 14, letterSpacing: 2 },
  xpBadge: {
    backgroundColor: 'rgba(255,214,10,0.12)', borderColor: Colors.neonYellow,
    borderWidth: 1, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 14, marginBottom: 14,
    ...glow(Colors.neonYellow, 6),
  },
  xpTxt: { color: Colors.neonYellow, fontWeight: '900', fontSize: 18 },
  nextRoundTxt: { color: Colors.textSecondary, fontSize: 13, fontWeight: '600' },

  instructionCard: {
    width: '100%', backgroundColor: Colors.card, borderRadius: 20, padding: 15,
    borderWidth: 1, borderColor: Colors.border,
    ...glow(Colors.neonPurple, 4),
  },
  instrRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 5, gap: 10 },
  instrEmoji: { fontSize: 17 },
  instrLabel: { color: Colors.textPrimary, fontSize: 13, fontWeight: '700' },
  instrHintBox: { marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: Colors.border },
  instrHintTxt: { color: Colors.neonPurple, fontSize: 13, fontWeight: '900' },
  urgentTimeTxt: {
    color: Colors.neonPink,
    fontWeight: '800',
    textShadowColor: Colors.neonPink,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
});
