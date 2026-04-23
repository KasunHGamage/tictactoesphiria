import React, { useCallback, useEffect, useRef, useState, useContext } from 'react';
import {
  Platform, Pressable, SafeAreaView, StatusBar,
  StyleSheet, Text, useWindowDimensions, View, Alert, ScrollView
} from 'react-native';
import Animated, { 
  useSharedValue, useAnimatedStyle, withTiming, withSequence, 
  withDelay, withRepeat, Easing, useDerivedValue 
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import ConfettiCannon from 'react-native-confetti-cannon';
import { Ionicons } from '@expo/vector-icons';

import { GamePhase, GameState, Player, Board } from '../game/gameTypes';
import {
  canPlace, checkWinner, createBoard, getPlayerPieces,
  isDraw, movePiece, placePiece, getWinningLine, getGameConfig
} from '../game/gameEngine';
import { getAIMove, AIDifficulty } from '../game/aiEngine';
import { AuthContext } from '../auth/AuthContext';
import { recordMatchResult, getUserProfile } from '../services/userService';

// ── Colors ────────────────────────────────────────────────────────

const C = {
  bg: '#0D0D1A', surface: '#14142B', card: '#1C1C3A', border: '#2A2A5A',
  accent: '#7C5CFC', accentGlow: '#9B7DFF', accentDim: '#3D2E7C',
  xColor: '#FF6B8A', xGlow: '#FF4D73', oColor: '#4FC3F7', oGlow: '#29B6F6',
  textPrimary: '#F0F0FF', textSecondary: '#8888AA',
  selected: '#FFD700', selectedBg: '#3A3000', winCell: '#FFD700',
  gold: '#FFD700',
};

// ── Bot Definitions ───────────────────────────────────────────────

const BOTS = [
  { name: 'Nova 🤖', level: 1, difficulty: 'random' as AIDifficulty },
  { name: 'Titan ⚡', level: 4, difficulty: 'medium' as AIDifficulty },
  { name: 'Phantom 🧠', level: 7, difficulty: 'hard' as AIDifficulty },
];

function getBotForLevel(level: number) {
  if (level >= 7) return BOTS[2];
  if (level >= 4) return BOTS[1];
  return BOTS[0];
}

// ── Components ────────────────────────────────────────────────────

function StrikeLine({ winLine, layouts, boardSize }: { winLine: number[] | null, layouts: Record<number, any>, boardSize: number }) {
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
    if (!line || !layouts[line[0]] || !layouts[line[line.length - 1]]) return { opacity: 0 };

    const start = layouts[line[0]];
    const end = layouts[line[line.length - 1]];

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
      top: startY - 3,
      left: startX,
      width: length,
      height: 6,
      backgroundColor: C.gold,
      borderRadius: 4,
      zIndex: 20,
      opacity: 1,
      transform: [
        { rotate: `${angle}rad` },
        { scaleX: progress.value }
      ],
      transformOrigin: 'left',
    };
  });

  return <Animated.View style={animatedStyle} />;
}

function Cell({ index, value, isSelected, isWinCell, boardSize, fontSize, disabled, onPress, onLayout }: any) {
  const scale = useSharedValue(1);
  const pulse = useSharedValue(1);

  const handleLayout = (e: any) => {
    const { x, y, width, height } = e.nativeEvent.layout;
    onLayout(index, { x, y, w: width, h: height });
  };

  useEffect(() => {
    if (isWinCell) {
      pulse.value = withRepeat(withSequence(withTiming(1.12, { duration: 600 }), withTiming(1, { duration: 600 })), -1, true);
    } else {
      pulse.value = 1;
    }
  }, [isWinCell]);

  const animatedCellInner = useAnimatedStyle(() => ({
    transform: [{ scale: isWinCell ? pulse.value : scale.value }],
    borderColor: isWinCell ? C.gold : isSelected ? C.gold : C.border,
    backgroundColor: isSelected ? C.selectedBg : isWinCell ? '#2A2600' : C.card,
  }));

  const handle = () => {
    if (disabled) return;
    scale.value = withSequence(withTiming(0.84, { duration: 70 }), withTiming(1, { duration: 110 }));
    onPress(index);
  };

  const color = value === 'X' ? C.xColor : C.oColor;
  return (
    <Pressable onLayout={handleLayout} onPress={handle} style={{ flexBasis: `${100/boardSize}%`, aspectRatio: 1 }}>
      <Animated.View style={[styles.cellInner, animatedCellInner]}>
        {value && <Text style={{ fontSize, fontWeight: '900', color }}>{value === 'X' ? '✕' : '○'}</Text>}
      </Animated.View>
    </Pressable>
  );
}

// ── Main Screen ───────────────────────────────────────────────────

export default function GameScreen({ navigation }: any) {
  const { user } = useContext(AuthContext);
  const { width: W } = useWindowDimensions();
  const BOARD_WIDTH = W * 0.9;

  const [roundNumber, setRoundNumber] = useState(1);
  const [winStreak, setWinStreak] = useState(0);
  const [xp, setXp] = useState(0);
  const [level, setLevel] = useState(1);
  
  const [state, setState] = useState<GameState>(() => ({
    board: createBoard(3),
    boardSize: 3,
    winLength: 3,
    pieceLimit: 3,
    currentPlayer: 'X',
    phase: 'placement',
    status: 'playing',
    winner: null,
    winningLine: null,
    selectedIndex: null,
  }));

  const [tileLayouts, setTileLayouts] = useState<Record<number, any>>({});
  const [showConfetti, setShowConfetti] = useState(false);
  const [xpGained, setXpGained] = useState<number | null>(null);
  const [isProcessingRound, setIsProcessingRound] = useState(false);

  const boardScale = useSharedValue(1);
  const resultScale = useSharedValue(0.8);
  const resultOpacity = useSharedValue(0);

  // Sync user profile
  useEffect(() => {
    if (user?.uid) {
      getUserProfile(user.uid).then(profile => {
        if (profile) {
          setXp(profile.xp || 0);
          setLevel(profile.level || 1);
        }
      });
    }
  }, [user?.uid]);

  const bot = getBotForLevel(level);

  // AI Turn Logic
  useEffect(() => {
    if (state.status === 'playing' && state.currentPlayer === 'O') {
      const timer = setTimeout(() => {
        const move = getAIMove(state.board, state.boardSize, state.winLength, state.pieceLimit, bot.difficulty);
        let nextBoard: Board | null;
        if (move.fromIndex !== undefined) {
          nextBoard = movePiece(state.board, move.fromIndex, move.toIndex, 'O');
        } else {
          nextBoard = placePiece(state.board, move.toIndex, 'O');
        }

        if (nextBoard) {
          const winningLine = getWinningLine(nextBoard, state.boardSize, state.winLength);
          const winner = winningLine ? 'O' : null;
          const draw = !winner && isDraw(nextBoard, state.boardSize, state.winLength);

          setState(prev => ({
            ...prev,
            board: nextBoard!,
            currentPlayer: 'X',
            phase: canPlace(nextBoard!, 'X', state.pieceLimit) ? 'placement' : 'movement',
            status: winner ? 'won' : draw ? 'draw' : 'playing',
            winner: winner ?? null,
            winningLine: winningLine ?? null,
            selectedIndex: null,
          }));
        }
      }, 600 + Math.random() * 400);
      return () => clearTimeout(timer);
    }
  }, [state.status, state.currentPlayer, state.board, state.boardSize, state.winLength, state.pieceLimit, bot.difficulty]);

  // Round End Lifecycle
  useEffect(() => {
    if (state.status !== 'playing' && !isProcessingRound) {
      setIsProcessingRound(true);
      const isWinner = state.winner === 'X';
      const isLoser = state.winner === 'O';

      if (isWinner) {
        setShowConfetti(true);
        setWinStreak(prev => prev + 1);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else {
        setWinStreak(0);
        if (isLoser) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }

      const xpG = (isWinner ? 50 : state.status === 'draw' ? 30 : 20) + (isWinner ? winStreak * 10 : 0);
      setXpGained(xpG);

      if (user?.uid) {
        recordMatchResult(user.uid, isWinner, isWinner ? winStreak + 1 : 0).then(() => {
          getUserProfile(user.uid).then(p => {
            if (p) {
              setXp(p.xp);
              setLevel(p.level);
            }
          });
        });
      }

      resultOpacity.value = withTiming(1, { duration: 400 });
      resultScale.value = withTiming(1, { duration: 500, easing: Easing.out(Easing.back(1.5)) });

      // Auto start next round
      setTimeout(() => {
        startNextRound();
      }, 3000);
    }
  }, [state.status, state.winner]);

  const startNextRound = () => {
    const nextR = roundNumber + 1;
    const config = getGameConfig(nextR);

    setRoundNumber(nextR);
    setState({
      board: createBoard(config.boardSize),
      boardSize: config.boardSize,
      winLength: config.winLength,
      pieceLimit: config.pieceLimit,
      currentPlayer: 'X',
      phase: 'placement',
      status: 'playing',
      winner: null,
      winningLine: null,
      selectedIndex: null,
    });
    setTileLayouts({});
    setShowConfetti(false);
    setXpGained(null);
    setIsProcessingRound(false);
    resultOpacity.value = 0;
    resultScale.value = 0.8;
  };

  const handleCellPress = async (index: number) => {
    if (state.status !== 'playing' || state.currentPlayer !== 'X') return;
    const { board, phase, selectedIndex, boardSize, winLength, pieceLimit } = state;

    if (phase === 'placement') {
      if (board[index] !== null) return;
      const nextBoard = placePiece(board, index, 'X');
      if (!nextBoard) return;
      const winningLine = getWinningLine(nextBoard, boardSize, winLength);
      const winner = winningLine ? 'X' : null;
      setState(prev => ({
        ...prev,
        board: nextBoard,
        currentPlayer: 'O',
        phase: canPlace(nextBoard, 'O', pieceLimit) ? 'placement' : 'movement',
        status: winner ? 'won' : isDraw(nextBoard, boardSize, winLength) ? 'draw' : 'playing',
        winner,
        winningLine,
      }));
    } else {
      if (selectedIndex === null) {
        if (board[index] !== 'X') return;
        setState(prev => ({ ...prev, selectedIndex: index }));
      } else {
        if (selectedIndex === index) { setState(prev => ({ ...prev, selectedIndex: null })); return; }
        if (board[index] === 'X') { setState(prev => ({ ...prev, selectedIndex: index })); return; }
        if (board[index] !== null) return;
        const nextBoard = movePiece(board, selectedIndex, index, 'X');
        if (!nextBoard) return;
        const winningLine = getWinningLine(nextBoard, boardSize, winLength);
        const winner = winningLine ? 'X' : null;
        setState(prev => ({
          ...prev,
          board: nextBoard,
          currentPlayer: 'O',
          phase: canPlace(nextBoard, 'O', pieceLimit) ? 'placement' : 'movement',
          status: winner ? 'won' : isDraw(nextBoard, boardSize, winLength) ? 'draw' : 'playing',
          winner,
          winningLine,
          selectedIndex: null,
        }));
      }
    }
  };

  const cellSize = BOARD_WIDTH / state.boardSize;
  const boardFontSize = Math.floor(cellSize * 0.44);

  const animatedResultStyle = useAnimatedStyle(() => ({
    opacity: resultOpacity.value,
    transform: [{ scale: resultScale.value }]
  }));

  return (
    <View style={styles.root}>
      <SafeAreaView style={styles.safe}>
        <StatusBar barStyle="light-content" backgroundColor={C.bg} />
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          
          {/* Header */}
          <View style={styles.header}>
            <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
              <Ionicons name="close" size={24} color={C.xColor} />
            </Pressable>
            <View style={styles.roundBadge}><Text style={styles.roundTxt}>ROUND {roundNumber}</Text></View>
            <View style={styles.levelBadge}><Text style={styles.levelTxt}>LV {level}</Text></View>
          </View>

          {/* Player HUD */}
          <View style={styles.players}>
            <View style={[styles.playerCard, state.currentPlayer === 'X' && state.status === 'playing' && styles.activeCard]}>
              <Text style={[styles.symbol, { color: C.xColor }]}>X</Text>
              <Text style={styles.name}>You</Text>
              {winStreak > 0 && <Text style={styles.streak}>🔥 {winStreak}</Text>}
            </View>
            <View style={styles.vsContainer}><Text style={styles.vsTxt}>VS</Text></View>
            <View style={[styles.playerCard, state.currentPlayer === 'O' && state.status === 'playing' && styles.activeCard]}>
              <Text style={[styles.symbol, { color: C.oColor }]}>O</Text>
              <Text style={styles.name}>{bot.name}</Text>
              <Text style={styles.botLevel}>Bot Lv.{bot.level}</Text>
            </View>
          </View>

          {/* Instruction Card */}
          {state.status === 'playing' && (
            <View style={styles.instructionCard}>
              <View style={styles.instrRow}>
                <Text style={styles.instrEmoji}>🎯</Text>
                <Text style={styles.instrLabel}>Goal: {state.winLength} in a row</Text>
              </View>
              <View style={styles.instrRow}>
                <Text style={styles.instrEmoji}>📦</Text>
                <Text style={styles.instrLabel}>Pieces: {getPlayerPieces(state.board, 'X').length} / {state.pieceLimit}</Text>
              </View>
              <View style={styles.instrHintBox}>
                <Text style={styles.instrHintTxt}>
                  {state.phase === 'placement' ? `👉 Place ${state.pieceLimit - getPlayerPieces(state.board, 'X').length} more` : '👉 Move a piece'}
                </Text>
              </View>
            </View>
          )}

          {/* Board */}
          <View style={[styles.boardContainer, { width: BOARD_WIDTH, height: BOARD_WIDTH }]}>
            <View style={styles.board}>
              {state.board.map((cell, idx) => (
                <Cell 
                  key={idx} index={idx} value={cell} boardSize={state.boardSize}
                  isSelected={state.selectedIndex === idx} isWinCell={state.winningLine?.includes(idx)}
                  fontSize={boardFontSize} disabled={state.currentPlayer !== 'X' || state.status !== 'playing'}
                  onPress={handleCellPress} onLayout={(i: number, l: any) => setTileLayouts(p => ({ ...p, [i]: l }))}
                />
              ))}
              <StrikeLine winLine={state.winningLine || null} layouts={tileLayouts} boardSize={state.boardSize} />
            </View>
          </View>

          {/* Result Overlay */}
          {state.status !== 'playing' && (
            <View style={styles.resultWrapper}>
              <Animated.View style={[styles.resultBanner, animatedResultStyle]}>
                <Text style={[styles.resultTitle, { color: state.winner === 'X' ? C.gold : state.winner === 'O' ? C.xColor : C.textPrimary }]}>
                  {state.winner === 'X' ? 'VICTORY!' : state.winner === 'O' ? 'DEFEAT' : 'DRAW'}
                </Text>
                {xpGained && <View style={styles.xpBadge}><Text style={styles.xpTxt}>+{xpGained} XP</Text></View>}
                <Text style={styles.nextRoundTxt}>Next round starting...</Text>
              </Animated.View>
            </View>
          )}

        </ScrollView>
      </SafeAreaView>
      <View pointerEvents="none" style={styles.confettiOverlay}>
        {showConfetti && <ConfettiCannon count={200} origin={{ x: W / 2, y: -20 }} fallSpeed={3000} />}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  safe: { flex: 1 },
  scroll: { paddingBottom: 60, alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', width: '100%', paddingHorizontal: 20, marginTop: 10, marginBottom: 15 },
  backBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: C.card, justifyContent: 'center', alignItems: 'center' },
  roundBadge: { backgroundColor: C.accent, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10, marginHorizontal: 10 },
  roundTxt: { color: '#FFF', fontWeight: '900', fontSize: 12 },
  levelBadge: { backgroundColor: C.card, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10, borderWidth: 1, borderColor: C.border },
  levelTxt: { color: C.gold, fontWeight: '900', fontSize: 12 },
  
  players: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 15, width: '100%', paddingHorizontal: 20, marginBottom: 20 },
  playerCard: { flex: 1, backgroundColor: C.card, borderRadius: 20, padding: 15, alignItems: 'center', borderWidth: 1, borderColor: C.border },
  activeCard: { borderColor: C.accent, shadowColor: C.accent, shadowOpacity: 0.3, shadowRadius: 10, elevation: 5 },
  symbol: { fontSize: 24, fontWeight: '900', marginBottom: 2 },
  name: { fontSize: 13, color: C.textPrimary, fontWeight: '700' },
  botLevel: { fontSize: 10, color: C.textSecondary, marginTop: 2 },
  streak: { fontSize: 11, color: C.gold, fontWeight: '800', marginTop: 2 },
  vsContainer: { width: 36, height: 36, borderRadius: 18, backgroundColor: C.surface, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: C.border },
  vsTxt: { color: C.accentGlow, fontWeight: '900', fontSize: 11 },

  instructionCard: { width: '90%', backgroundColor: C.card, borderRadius: 20, padding: 15, marginBottom: 20, borderWidth: 1, borderColor: C.border },
  instrRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  instrEmoji: { fontSize: 16, marginRight: 8 },
  instrLabel: { color: C.textPrimary, fontSize: 13, fontWeight: '700' },
  instrHintBox: { marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: C.border },
  instrHintTxt: { color: C.accentGlow, fontSize: 13, fontWeight: '800' },

  boardContainer: { shadowColor: '#000', shadowOpacity: 0.5, shadowRadius: 20, elevation: 15 },
  board: { flex: 1, flexDirection: 'row', flexWrap: 'wrap', backgroundColor: C.surface, borderRadius: 20, overflow: 'hidden', borderWidth: 2, borderColor: C.border },
  cellInner: { flex: 1, alignItems: 'center', justifyContent: 'center', borderWidth: 0.5, borderColor: C.border },

  resultWrapper: { width: '100%', paddingHorizontal: 20, marginTop: 20 },
  resultBanner: { backgroundColor: C.card, borderRadius: 24, padding: 25, alignItems: 'center', borderWidth: 2, borderColor: C.accentDim },
  resultTitle: { fontSize: 28, fontWeight: '900', marginBottom: 10 },
  xpBadge: { backgroundColor: '#FFD70022', borderColor: C.gold, borderWidth: 1, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 12, marginBottom: 12 },
  xpTxt: { color: C.gold, fontWeight: '900', fontSize: 16 },
  nextRoundTxt: { color: C.textSecondary, fontSize: 12, fontWeight: '600' },
  confettiOverlay: { ...StyleSheet.absoluteFillObject, zIndex: 999 },
});
