import React, { useCallback, useEffect, useRef, useState, useContext } from 'react';
import ScreenWrapper from '../components/ScreenWrapper';
import {
  Platform, Pressable, StatusBar,
  StyleSheet, Text, useWindowDimensions, View, Alert, ScrollView
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CommonActions } from '@react-navigation/native';
import Animated, {
  useSharedValue, useAnimatedStyle, withTiming, withSequence, 
  withDelay, withRepeat, Easing, useDerivedValue 
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import NeonConfetti from '../components/NeonConfetti';
import NeonButton from '../components/NeonButton';
import { Colors, Spacing, glow } from '../../constants/theme';
import { Ionicons } from '@expo/vector-icons';

import { GamePhase, GameState, Player, Board, GameConfig, Difficulty } from '../game/gameTypes';
import {
  canPlace, checkWinner, createBoard, getPlayerPieces,
  isDraw, movePiece, placePiece, getWinningLine, DEFAULT_CONFIG
} from '../game/gameEngine';
import { getAIMove } from '../game/aiEngine';
import { AuthContext } from '../auth/AuthContext';
import { recordMatchResult, getUserProfile, getAutoDifficulty } from '../services/userService';

// ── Colors ────────────────────────────────────────────────────────

// Theme tokens used from constants/theme.ts

// ── Components ────────────────────────────────────────────────────

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
      backgroundColor: Colors.neonYellow,
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

  return <Animated.View pointerEvents="none" style={animatedStyle} />;
}

function Cell({ index, value, isSelected, isWinCell, boardSize, size, fontSize, disabled, onPress, onLayout }: any) {
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
    borderColor: isWinCell ? Colors.neonYellow : isSelected ? Colors.neonYellow : Colors.border,
    backgroundColor: isSelected ? 'rgba(255,214,10,0.08)' : isWinCell ? 'rgba(255,214,10,0.15)' : Colors.card,
  }));

  const handle = () => {
    if (disabled) return;
    scale.value = withSequence(withTiming(0.84, { duration: 70 }), withTiming(1, { duration: 110 }));
    onPress(index);
  };

  const color = value === 'X' ? Colors.neonPink : Colors.neonBlue;
  return (
    <Pressable onLayout={handleLayout} onPress={handle} style={{ width: size, height: size }}>
      <Animated.View style={[styles.cellInner, animatedCellInner]}>
        {value && (
          <Text style={{ fontSize, fontWeight: '900', color, textShadowColor: color, textShadowRadius: 10 }}>
            {value === 'X' ? '✕' : '○'}
          </Text>
        )}
      </Animated.View>
    </Pressable>
  );
}

// ── Main Screen ───────────────────────────────────────────────────

export default function GameScreen({ navigation, route }: any) {
  const { user } = useContext(AuthContext);
  const { width: W } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  
  const gridSize = route.params?.config?.gridSize || 3;
  const config: GameConfig = route.params?.config || DEFAULT_CONFIG;
  const BOARD_WIDTH = W - 32;
  const BOARD_BORDER = 2; // borderWidth on the board View
  const cellSize = Math.floor((BOARD_WIDTH - BOARD_BORDER * 2) / gridSize);

  console.log(`[DEBUG] GameScreen: gridSize=${gridSize}, cellSize=${cellSize}, BOARD_WIDTH=${BOARD_WIDTH}`);

  const [roundNumber, setRoundNumber] = useState(1);
  const [winStreak, setWinStreak] = useState(0);
  const [xp, setXp] = useState(0);
  const [level, setLevel] = useState(1);
  
  const [state, setState] = useState<GameState>(() => ({
    board: createBoard(config.gridSize),
    config: config,
    currentPlayer: 'X',
    phase: 'placement',
    status: 'playing',
    winner: null,
    winningLine: null,
    selectedIndex: null,
  }));

  const boardRef = useRef(state.board);
  const isAITurnRunning = useRef(false);

  useEffect(() => {
    boardRef.current = state.board;
  }, [state.board]);

  const [tileLayouts, setTileLayouts] = useState<Record<number, any>>({});
  const [showConfetti, setShowConfetti] = useState(false);
  const [xpGained, setXpGained] = useState<number | null>(null);
  const [isProcessingRound, setIsProcessingRound] = useState(false);
  const [isThinking, setIsThinking] = useState(false);

  const resultScale = useSharedValue(0.8);
  const resultOpacity = useSharedValue(0);

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

  const activeDifficulty = config.difficulty === 'auto' ? getAutoDifficulty(level) : config.difficulty;

  const triggerAI = useCallback(() => {
    if (isAITurnRunning.current || state.status !== 'playing') return;
    isAITurnRunning.current = true;
    setIsThinking(true);

    setTimeout(() => {
      const currentBoard = boardRef.current;
      const move = getAIMove(currentBoard, activeDifficulty, config.gridSize, config.winLength, config.maxPieces);
      
      let nextBoard: Board | null;
      if (move.fromIndex !== undefined) {
        nextBoard = movePiece(currentBoard, move.fromIndex, move.toIndex, 'O');
      } else {
        nextBoard = placePiece(currentBoard, move.toIndex, 'O');
      }

      if (nextBoard) {
        const winningLine = getWinningLine(nextBoard, config.gridSize, config.winLength);
        const winner = winningLine ? 'O' : null;
        const draw = !winner && isDraw(nextBoard, config.gridSize, config.winLength);

        setState(prev => ({
          ...prev,
          board: nextBoard!,
          currentPlayer: 'X',
          phase: canPlace(nextBoard!, 'X', config.maxPieces) ? 'placement' : 'movement',
          status: winner ? 'won' : draw ? 'draw' : 'playing',
          winner: winner ?? null,
          winningLine: winningLine ?? null,
          selectedIndex: null,
        }));
      }

      setIsThinking(false);
      isAITurnRunning.current = false;
    }, 500);
  }, [config, activeDifficulty, state.status]);

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
    }
  }, [state.status, state.winner]);

  const startNextRound = () => {
    const nextR = roundNumber + 1;
    setRoundNumber(nextR);
    setState(prev => ({
      ...prev,
      board: createBoard(config.gridSize),
      currentPlayer: 'X',
      phase: 'placement',
      status: 'playing',
      winner: null,
      winningLine: null,
      selectedIndex: null,
    }));
    setTileLayouts({});
    setShowConfetti(false);
    setXpGained(null);
    setIsProcessingRound(false);
    setIsThinking(false);
    isAITurnRunning.current = false;
    resultOpacity.value = 0;
    resultScale.value = 0.8;
  };

  const handleCellPress = async (index: number) => {
    if (state.status !== 'playing' || state.currentPlayer !== 'X' || isThinking || isAITurnRunning.current) return;
    const { board, phase, selectedIndex } = state;
    const { gridSize, winLength, maxPieces } = config;

    let nextState: Partial<GameState> | null = null;

    if (phase === 'placement') {
      if (board[index] !== null) return;
      const nextBoard = placePiece(board, index, 'X');
      if (!nextBoard) return;
      const winningLine = getWinningLine(nextBoard, gridSize, winLength);
      const winner = winningLine ? 'X' : null;
      
      nextState = {
        board: nextBoard,
        currentPlayer: winner ? 'X' : 'O',
        phase: canPlace(nextBoard, 'O', maxPieces) ? 'placement' : 'movement',
        status: winner ? 'won' : isDraw(nextBoard, gridSize, winLength) ? 'draw' : 'playing',
        winner,
        winningLine,
      };
    } else {
      if (selectedIndex === null) {
        if (board[index] !== 'X') return;
        setState(prev => ({ ...prev, selectedIndex: index }));
        return;
      } else {
        if (selectedIndex === index) { setState(prev => ({ ...prev, selectedIndex: null })); return; }
        if (board[index] === 'X') { setState(prev => ({ ...prev, selectedIndex: index })); return; }
        if (board[index] !== null) return;
        const nextBoard = movePiece(board, selectedIndex, index, 'X');
        if (!nextBoard) return;
        const winningLine = getWinningLine(nextBoard, gridSize, winLength);
        const winner = winningLine ? 'X' : null;
        
        nextState = {
          board: nextBoard,
          currentPlayer: winner ? 'X' : 'O',
          phase: canPlace(nextBoard, 'O', maxPieces) ? 'placement' : 'movement',
          status: winner ? 'won' : isDraw(nextBoard, gridSize, winLength) ? 'draw' : 'playing',
          winner,
          winningLine,
          selectedIndex: null,
        };
      }
    }

    if (nextState) {
      setState(prev => {
        const merged = { ...prev, ...nextState };
        if (merged.status === 'playing' && merged.currentPlayer === 'O') {
          triggerAI();
        }
        return merged;
      });
    }
  };

  const boardFontSize = Math.floor(cellSize * 0.44);

  const animatedResultStyle = useAnimatedStyle(() => ({
    opacity: resultOpacity.value,
    transform: [{ scale: resultScale.value }]
  }));

  const animatedOverlayStyle = useAnimatedStyle(() => ({
    opacity: resultOpacity.value,
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.85)',
    zIndex: 100,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    paddingHorizontal: 20,
  }));

  return (
    <ScreenWrapper scroll={false} horizontalPadding={0}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.bg} />
      
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="close" size={24} color={Colors.neonPink} />
        </Pressable>
        <View style={styles.roundBadge}><Text style={styles.roundTxt}>ROUND {roundNumber}</Text></View>
        <View style={styles.levelBadge}><Text style={styles.levelTxt}>LV {level}</Text></View>
      </View>

      <View style={styles.content}>
        {/* Player HUD */}
        <View style={styles.players}>
          <View style={[styles.playerCard, state.currentPlayer === 'X' && state.status === 'playing' && styles.activeCard]}>
            <Text style={[styles.symbol, { color: Colors.neonPink }]}>X</Text>
            <Text style={styles.name}>You</Text>
            {winStreak > 0 && <Text style={styles.streak}>🔥 {winStreak}</Text>}
          </View>
          <View style={styles.vsContainer}><Text style={styles.vsTxt}>VS</Text></View>
          <View style={[styles.playerCard, state.currentPlayer === 'O' && state.status === 'playing' && styles.activeCard]}>
            <Text style={[styles.symbol, { color: Colors.neonBlue }]}>O</Text>
            <Text style={styles.name}>{activeDifficulty.toUpperCase()} AI</Text>
            <Text style={styles.botLevel}>Mode: {config.difficulty}</Text>
          </View>
        </View>

        {/* Instruction Card */}
        {state.status === 'playing' && (
          <View style={styles.instructionCard}>
            <View style={styles.instrRow}>
              <Text style={styles.instrEmoji}>🎯</Text>
              <Text style={styles.instrLabel}>{config.gridSize}x{config.gridSize} • {config.winLength} in a row</Text>
            </View>
            <View style={styles.instrRow}>
              <Text style={styles.instrEmoji}>📦</Text>
              <Text style={styles.instrLabel}>Pieces: {getPlayerPieces(state.board, 'X').length} / {config.maxPieces}</Text>
            </View>
            <View style={styles.instrHintBox}>
              <Text style={styles.instrHintTxt}>
                {isThinking 
                  ? '⌛ AI is thinking...' 
                  : state.phase === 'placement' 
                    ? `👉 Place ${config.maxPieces - getPlayerPieces(state.board, 'X').length} more` 
                    : '👉 Move a piece'}
              </Text>
            </View>
          </View>
        )}

        {/* Board */}
        <View 
          key={`board-${config.gridSize}`}
          pointerEvents="auto"
          style={[styles.boardContainer, { alignSelf: 'center' }]}
        >
          <View style={[styles.board, { width: BOARD_WIDTH, height: BOARD_WIDTH }]}>
            {state.board.map((cell, idx) => (
              <Cell 
                key={idx} index={idx} value={cell} boardSize={config.gridSize}
                size={cellSize}
                isSelected={state.selectedIndex === idx} isWinCell={state.winningLine?.includes(idx)}
                fontSize={boardFontSize} disabled={state.currentPlayer !== 'X' || state.status !== 'playing' || isThinking}
                onPress={handleCellPress} onLayout={(i: number, l: any) => setTileLayouts(p => ({ ...p, [i]: l }))}
              />
            ))}
            <StrikeLine winLine={state.winningLine || null} layouts={tileLayouts} />
          </View>
        </View>

      </View>

      {/* Result Overlay */}
      {state.status !== 'playing' && (
        <Animated.View style={animatedOverlayStyle}>
          <Animated.View style={[styles.resultBanner, animatedResultStyle]}>
            <Text style={[styles.resultTitle, { color: state.winner === 'X' ? Colors.neonYellow : state.winner === 'O' ? Colors.neonPink : Colors.textPrimary }]}
            >
              {state.winner === 'X' ? 'VICTORY!' : state.winner === 'O' ? 'DEFEAT' : 'DRAW'}
            </Text>
            {xpGained && <View style={styles.xpBadge}><Text style={styles.xpTxt}>+{xpGained} XP</Text></View>}
            
            <View style={{ marginTop: 20, width: '100%', gap: 12 }}>
              <NeonButton 
                title="NEXT ROUND" 
                onPress={startNextRound}
                color={Colors.neonPurple}
              />
              <NeonButton 
                title="EXIT TO LOBBY" 
                onPress={() => {
                  navigation.dispatch(
                    CommonActions.reset({
                      index: 0,
                      routes: [
                        {
                          name: 'Main',
                          params: { screen: 'Home' },
                        },
                      ],
                    })
                  );
                }}
                color={Colors.textSecondary}
                variant="outline"
              />
            </View>
          </Animated.View>
        </Animated.View>
      )}

      <View pointerEvents="none" style={styles.confettiOverlay}>
        <NeonConfetti show={showConfetti} onComplete={() => setShowConfetti(false)} />
      </View>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
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
    backgroundColor: Colors.neonPurple + '22', paddingHorizontal: 14, paddingVertical: 7,
    borderRadius: 10, borderWidth: 1, borderColor: Colors.neonPurple,
    ...glow(Colors.neonPurple, 6),
  },
  roundTxt: { color: Colors.neonPurple, fontWeight: '900', fontSize: 12, letterSpacing: 1 },
  levelBadge: {
    backgroundColor: Colors.card, paddingHorizontal: 14, paddingVertical: 7,
    borderRadius: 10, borderWidth: 1, borderColor: Colors.neonYellow + '66',
  },
  levelTxt: { color: Colors.neonYellow, fontWeight: '900', fontSize: 12, letterSpacing: 1 },

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
    shadowColor: Colors.neonYellow, shadowOpacity: 0.7, shadowRadius: 18, elevation: 10,
  },
  symbol: { fontSize: 24, fontWeight: '900', marginBottom: 2 },
  name: { fontSize: 13, color: Colors.textPrimary, fontWeight: '800' },
  botLevel: { fontSize: 10, color: Colors.textSecondary, marginTop: 2, letterSpacing: 0.5 },
  streak: { fontSize: 11, color: Colors.neonYellow, fontWeight: '900', marginTop: 2 },
  vsContainer: {
    width: 36, height: 36, borderRadius: 18, backgroundColor: '#160B28',
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, borderColor: Colors.neonPurple + '66',
  },
  vsTxt: { color: Colors.neonPurple, fontWeight: '900', fontSize: 11 },

  instructionCard: {
    width: '100%', backgroundColor: Colors.card, borderRadius: 20, padding: 15,
    borderWidth: 1, borderColor: Colors.border,
    ...glow(Colors.neonPurple, 4),
  },
  instrRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4, gap: 8 },
  instrEmoji: { fontSize: 16 },
  instrLabel: { color: Colors.textPrimary, fontSize: 13, fontWeight: '700' },
  instrHintBox: { marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: Colors.border },
  instrHintTxt: { color: Colors.neonPurple, fontSize: 13, fontWeight: '900' },

  boardContainer: {
    shadowColor: Colors.neonPurple, shadowOpacity: 0.3, shadowRadius: 24, elevation: 15,
  },
  board: {
    flex: 0, flexDirection: 'row', flexWrap: 'wrap', backgroundColor: Colors.card,
    borderRadius: 20, overflow: 'hidden',
    borderWidth: 2, borderColor: Colors.neonPurple + '55',
  },
  cellInner: {
    width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center',
    borderWidth: 0.5, borderColor: Colors.border,
  },

  resultBanner: {
    width: '100%',
    backgroundColor: '#130820', borderRadius: 24, padding: 28,
    alignItems: 'center', borderWidth: 2, borderColor: Colors.neonPurple,
    ...glow(Colors.neonPurple, 20),
  },
  resultTitle: { fontSize: 32, fontWeight: '900', marginBottom: 10, letterSpacing: 2 },
  xpBadge: {
    backgroundColor: 'rgba(255,214,10,0.12)', borderColor: Colors.neonYellow,
    borderWidth: 1, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 12, marginBottom: 12,
    ...glow(Colors.neonYellow, 6),
  },
  xpTxt: { color: Colors.neonYellow, fontWeight: '900', fontSize: 16 },
  nextRoundTxt: { color: Colors.textSecondary, fontSize: 12, fontWeight: '600' },
  confettiOverlay: { ...StyleSheet.absoluteFillObject, zIndex: 999 },
});
