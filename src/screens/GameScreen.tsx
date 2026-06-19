import React, { useCallback, useEffect, useRef, useState, useContext } from 'react';
import ScreenWrapper from '../components/ScreenWrapper';
import { Pressable, StatusBar, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { CommonActions } from '@react-navigation/native';
import Animated, {
  useSharedValue, useAnimatedStyle, withTiming, withSequence,
  withDelay, withRepeat, Easing, useDerivedValue,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import NeonConfetti from '../components/NeonConfetti';
import NeonButton from '../components/NeonButton';
import { useAppTheme } from '../context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { GameState, Board, GameConfig } from '../game/gameTypes';
import {
  canPlace, createBoard, getPlayerPieces,
  isDraw, movePiece, placePiece, getWinningLine, DEFAULT_CONFIG,
} from '../game/gameEngine';
import { getAIMove, resetAIMemory } from '../game/aiEngine';
import { AuthContext } from '../auth/AuthContext';
import { recordMatchResult, getUserProfile, getAutoDifficulty } from '../services/userService';

// ── StrikeLine ────────────────────────────────────────────────────
function StrikeLine({ winLine, layouts, lineColor }: {
  winLine: number[] | null;
  layouts: Record<number, any>;
  lineColor: string;
}) {
  const progress     = useSharedValue(0);
  const winLineValue = useDerivedValue(() => winLine);

  useEffect(() => {
    progress.value = winLine
      ? withDelay(200, withTiming(1, { duration: 450, easing: Easing.out(Easing.quad) }))
      : 0;
  }, [winLine]);

  const animStyle = useAnimatedStyle(() => {
    const line = winLineValue.value;
    if (!line || !layouts[line[0]] || !layouts[line[line.length - 1]]) return { opacity: 0 };
    const s = layouts[line[0]];
    const e = layouts[line[line.length - 1]];
    const sx = s.x + s.w / 2, sy = s.y + s.h / 2;
    const ex = e.x + e.w / 2, ey = e.y + e.h / 2;
    const dx = ex - sx, dy = ey - sy;
    return {
      position: 'absolute', top: sy - 3, left: sx,
      width: Math.sqrt(dx * dx + dy * dy), height: 6,
      backgroundColor: lineColor, borderRadius: 4, zIndex: 20, opacity: 1,
      transform: [{ rotate: `${Math.atan2(dy, dx)}rad` }, { scaleX: progress.value }],
      // @ts-ignore
      transformOrigin: 'left',
    };
  });

  return <Animated.View pointerEvents="none" style={animStyle} />;
}

// ── Cell ─────────────────────────────────────────────────────────
function Cell({ index, value, isSelected, isWinCell, size, fontSize, disabled, onPress, onLayout, colors }: any) {
  const scale = useSharedValue(1);
  const pulse = useSharedValue(1);

  useEffect(() => {
    pulse.value = isWinCell
      ? withRepeat(withSequence(withTiming(1.12, { duration: 600 }), withTiming(1, { duration: 600 })), -1, true)
      : 1;
  }, [isWinCell]);

  const { winColor, selectedColor, cellBg, cellBorder } = colors;
  const animCell = useAnimatedStyle(() => ({
    transform: [{ scale: isWinCell ? pulse.value : scale.value }],
    borderColor: isWinCell ? winColor : isSelected ? selectedColor : cellBorder,
    backgroundColor: isSelected ? selectedColor + '18' : isWinCell ? winColor + '22' : cellBg,
  }));

  const pieceColor = value === 'X' ? colors.xColor : colors.oColor;

  return (
    <Pressable
      onLayout={e => { const { x, y, width: w, height: h } = e.nativeEvent.layout; onLayout(index, { x, y, w, h }); }}
      onPress={() => {
        if (disabled) return;
        scale.value = withSequence(withTiming(0.84, { duration: 70 }), withTiming(1, { duration: 110 }));
        onPress(index);
      }}
      style={{ width: size, height: size }}
    >
      <Animated.View style={[styles.cellInner, { borderColor: cellBorder }, animCell]}>
        {value && (
          <Text style={{
            fontSize, fontWeight: '900', color: pieceColor,
            textShadowColor: 'transparent',
            textShadowRadius: 0,
          }}>
            {value === 'X' ? '✕' : '○'}
          </Text>
        )}
      </Animated.View>
    </Pressable>
  );
}

// ── Main Screen ───────────────────────────────────────────────────
export default function GameScreen({ navigation, route }: any) {
  const { user }    = useContext(AuthContext);
  const { width: W } = useWindowDimensions();
  const t           = useAppTheme();
  const isCalm      = t.mode === 'calm';

  const config: GameConfig = route.params?.config || DEFAULT_CONFIG;
  const BOARD_WIDTH = W - 32;
  const cellSize    = Math.floor((BOARD_WIDTH - 4) / config.gridSize);

  const [roundNumber,       setRoundNumber]       = useState(1);
  const [winStreak,         setWinStreak]         = useState(0);
  const [level,             setLevel]             = useState(1);
  const [xpGained,          setXpGained]          = useState<number | null>(null);
  const [showConfetti,      setShowConfetti]      = useState(false);
  const [isProcessingRound, setIsProcessingRound] = useState(false);
  const [isThinking,        setIsThinking]        = useState(false);
  const [tileLayouts,       setTileLayouts]       = useState<Record<number, any>>({});

  const [state, setState] = useState<GameState>(() => ({
    board: createBoard(config.gridSize), config,
    currentPlayer: 'X', phase: 'placement',
    status: 'playing', winner: null, winningLine: null, selectedIndex: null,
  }));

  const boardRef        = useRef(state.board);
  const isAIRunning     = useRef(false);
  const resultScale     = useSharedValue(0.8);
  const resultOpacity   = useSharedValue(0);

  useEffect(() => { boardRef.current = state.board; }, [state.board]);

  useEffect(() => {
    if (!user?.uid) return;
    getUserProfile(user.uid).then(p => { if (p) setLevel(p.level || 1); });
  }, [user?.uid]);

  const activeDifficulty = config.difficulty === 'auto' ? getAutoDifficulty(level) : config.difficulty;

  const triggerAI = useCallback(() => {
    if (isAIRunning.current || state.status !== 'playing') return;
    isAIRunning.current = true;
    setIsThinking(true);
    setTimeout(() => {
      const board = boardRef.current;
      const move  = getAIMove(board, activeDifficulty, config.gridSize, config.winLength, config.maxPieces);
      const next  = move.fromIndex !== undefined
        ? movePiece(board, move.fromIndex, move.toIndex, 'O')
        : placePiece(board, move.toIndex, 'O');
      if (next) {
        const wl = getWinningLine(next, config.gridSize, config.winLength);
        setState(p => ({
          ...p, board: next, currentPlayer: 'X',
          phase: canPlace(next, 'X', config.maxPieces) ? 'placement' : 'movement',
          status: wl ? 'won' : isDraw(next, config.gridSize, config.winLength) ? 'draw' : 'playing',
          winner: wl ? 'O' : null, winningLine: wl ?? null, selectedIndex: null,
        }));
      }
      setIsThinking(false);
      isAIRunning.current = false;
    }, 500);
  }, [config, activeDifficulty, state.status]);

  useEffect(() => {
    if (state.status === 'playing' || isProcessingRound) return;
    setIsProcessingRound(true);
    const won = state.winner === 'X';
    if (won) { setShowConfetti(true); setWinStreak(p => p + 1); Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); }
    else { setWinStreak(0); if (state.winner === 'O') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error); }
    setXpGained((won ? 50 : state.status === 'draw' ? 30 : 20) + (won ? winStreak * 10 : 0));
    if (user?.uid) recordMatchResult(user.uid, won, won ? winStreak + 1 : 0).then(() =>
      getUserProfile(user.uid).then(p => { if (p) setLevel(p.level); })
    );
    resultOpacity.value = withTiming(1, { duration: 400 });
    resultScale.value   = withTiming(1, { duration: 500, easing: Easing.out(Easing.back(1.5)) });
  }, [state.status, state.winner]);

  const startNextRound = () => {
    setState(p => ({ ...p, board: createBoard(config.gridSize), currentPlayer: 'X', phase: 'placement', status: 'playing', winner: null, winningLine: null, selectedIndex: null }));
    setTileLayouts({}); setShowConfetti(false); setXpGained(null); setIsProcessingRound(false); setIsThinking(false);
    isAIRunning.current = false; resetAIMemory();
    resultOpacity.value = 0; resultScale.value = 0.8;
    setRoundNumber(p => p + 1);
  };

  const handleCellPress = (index: number) => {
    if (state.status !== 'playing' || state.currentPlayer !== 'X' || isThinking || isAIRunning.current) return;
    const { board, phase, selectedIndex } = state;
    const { gridSize, winLength, maxPieces } = config;
    let next: Partial<GameState> | null = null;

    if (phase === 'placement') {
      if (board[index]) return;
      const nb = placePiece(board, index, 'X'); if (!nb) return;
      const wl = getWinningLine(nb, gridSize, winLength);
      next = { board: nb, currentPlayer: wl ? 'X' : 'O', phase: canPlace(nb, 'O', maxPieces) ? 'placement' : 'movement', status: wl ? 'won' : isDraw(nb, gridSize, winLength) ? 'draw' : 'playing', winner: wl ? 'X' : null, winningLine: wl };
    } else {
      if (selectedIndex === null) { if (board[index] !== 'X') return; setState(p => ({ ...p, selectedIndex: index })); return; }
      if (selectedIndex === index) { setState(p => ({ ...p, selectedIndex: null })); return; }
      if (board[index] === 'X')  { setState(p => ({ ...p, selectedIndex: index })); return; }
      if (board[index] !== null) return;
      const nb = movePiece(board, selectedIndex, index, 'X'); if (!nb) return;
      const wl = getWinningLine(nb, gridSize, winLength);
      next = { board: nb, currentPlayer: wl ? 'X' : 'O', phase: canPlace(nb, 'O', maxPieces) ? 'placement' : 'movement', status: wl ? 'won' : isDraw(nb, gridSize, winLength) ? 'draw' : 'playing', winner: wl ? 'X' : null, winningLine: wl, selectedIndex: null };
    }

    if (next) setState(p => {
      const m = { ...p, ...next };
      if (m.status === 'playing' && m.currentPlayer === 'O') triggerAI();
      return m;
    });
  };

  const animResult  = useAnimatedStyle(() => ({ opacity: resultOpacity.value, transform: [{ scale: resultScale.value }] }));
  const animOverlay = useAnimatedStyle(() => ({
    opacity: resultOpacity.value, ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.85)', zIndex: 100,
    justifyContent: 'center' as const, alignItems: 'center' as const, paddingHorizontal: 20,
  }));

  const cellColors = { winColor: t.warning, selectedColor: t.primary, cellBg: t.card, cellBorder: t.border, xColor: t.accent, oColor: t.secondary, isCalm };
  const resultColor = state.winner === 'X' ? t.win : state.winner === 'O' ? t.lose : t.textPrimary;
  const modalBg    = isCalm ? { backgroundColor: t.bg, borderColor: t.border, borderWidth: 1.5 } : { backgroundColor: t.cardAlt, borderColor: t.primary, borderWidth: 1.5 };

  return (
    <ScreenWrapper scroll={false} horizontalPadding={0}>
      <StatusBar barStyle={isCalm ? 'dark-content' : 'light-content'} backgroundColor={t.bg} />

      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={[styles.backBtn, { backgroundColor: t.card, borderColor: t.accent + '66' }]}>
          <Ionicons name="close" size={24} color={t.accent} />
        </Pressable>
        <View style={[styles.badge, { backgroundColor: t.primary + '22', borderColor: t.primary }, t.glow(t.primary, 6) as any]}>
          <Text style={[styles.badgeTxt, { color: t.primary }]}>ROUND {roundNumber}</Text>
        </View>
        <View style={[styles.badge, { backgroundColor: t.card, borderColor: isCalm ? t.border : t.warning + '66' }]}>
          <Text style={[styles.badgeTxt, { color: isCalm ? t.textSecondary : t.warning }]}>LV {level}</Text>
        </View>
      </View>

      <View style={styles.content}>
        {/* Player HUD */}
        <View style={styles.players}>
          <View style={[
            styles.playerCard, { backgroundColor: t.card, borderColor: t.border },
            state.currentPlayer === 'X' && state.status === 'playing' && { borderColor: t.primary, borderWidth: 2, ...(t.glow(t.primary, 14) as any) },
          ]}>
            <Text style={[styles.symbol, { color: t.accent }]}>X</Text>
            <Text style={[styles.name, { color: t.textPrimary }]}>You</Text>
            {winStreak > 0 && <Text style={[styles.streak, { color: t.warning }]}>🔥 {winStreak}</Text>}
          </View>

          <View style={styles.vsContainer}>
            <View style={[styles.vsCircle, { backgroundColor: t.cardAlt, borderColor: t.primary + '66' }]}>
              <Text style={[styles.vsTxt, { color: t.primary }]}>VS</Text>
            </View>
          </View>

          <View style={[
            styles.playerCard, { backgroundColor: t.card, borderColor: t.border },
            state.currentPlayer === 'O' && state.status === 'playing' && { borderColor: t.primary, borderWidth: 2, ...(t.glow(t.primary, 14) as any) },
          ]}>
            <Text style={[styles.symbol, { color: t.secondary }]}>O</Text>
            <Text style={[styles.name, { color: t.textPrimary }]}>{`${activeDifficulty.toUpperCase()} AI`}</Text>
            <Text style={[styles.botLevel, { color: t.textSecondary }]}>Mode: {config.difficulty}</Text>
          </View>
        </View>

        {/* Info Card */}
        {state.status === 'playing' && (
          <View style={[styles.infoCard, { backgroundColor: t.card, borderColor: t.border }, t.glow(t.primary, 4) as any]}>
            <View style={styles.instrRow}>
              <Text style={styles.emoji}>🎯</Text>
              <Text style={[styles.instrLbl, { color: t.textPrimary }]}>{config.gridSize}×{config.gridSize} • {config.winLength} in a row</Text>
            </View>
            <View style={styles.instrRow}>
              <Text style={styles.emoji}>📦</Text>
              <Text style={[styles.instrLbl, { color: t.textPrimary }]}>Pieces: {getPlayerPieces(state.board, 'X').length} / {config.maxPieces}</Text>
            </View>
            <View style={[styles.hintBox, { borderTopColor: t.border }]}>
              <Text style={[styles.hintTxt, { color: t.primary }]}>
                {isThinking ? '⌛ AI is thinking…'
                  : state.phase === 'placement'
                    ? `👉 Place ${config.maxPieces - getPlayerPieces(state.board, 'X').length} more`
                    : '👉 Move a piece'}
              </Text>
            </View>
          </View>
        )}

        {/* Board */}
        <View style={[styles.boardWrap, { alignSelf: 'center' }, t.glow(t.primary, 16) as any]}>
          <View style={[styles.board, { width: BOARD_WIDTH, height: BOARD_WIDTH, backgroundColor: t.card, borderColor: t.primary + '55' }]}>
            {state.board.map((cell, idx) => (
              <Cell key={idx} index={idx} value={cell} size={cellSize} fontSize={Math.floor(cellSize * 0.44)}
                isSelected={state.selectedIndex === idx} isWinCell={!!state.winningLine?.includes(idx)}
                disabled={state.currentPlayer !== 'X' || state.status !== 'playing' || isThinking}
                onPress={handleCellPress}
                onLayout={(i: number, l: any) => setTileLayouts(p => ({ ...p, [i]: l }))}
                colors={cellColors}
              />
            ))}
            <StrikeLine winLine={state.winningLine ?? null} layouts={tileLayouts} lineColor={t.warning} />
          </View>
        </View>
      </View>

      {/* Result Overlay */}
      {state.status !== 'playing' && (
        <Animated.View style={animOverlay}>
          <Animated.View style={[styles.modal, modalBg, animResult]}>
            <Text style={[styles.resultTitle, { color: resultColor }]}>
              {state.winner === 'X' ? 'VICTORY!' : state.winner === 'O' ? 'DEFEAT' : 'DRAW'}
            </Text>
            {xpGained != null && (
              <View style={[styles.xpBadge, { backgroundColor: t.warning + '18', borderColor: t.warning }]}>
                <Text style={[styles.xpTxt, { color: t.warning }]}>+{xpGained} XP</Text>
              </View>
            )}
            <View style={{ marginTop: 20, width: '100%', gap: 12 }}>
              <NeonButton title="NEXT ROUND"     onPress={startNextRound} variant="primary" />
              <NeonButton title="EXIT TO LOBBY"  variant="secondary"
                onPress={() => navigation.dispatch(CommonActions.reset({ index: 0, routes: [{ name: 'Main', params: { screen: 'Home' } }] }))}
              />
            </View>
          </Animated.View>
        </Animated.View>
      )}

      <View pointerEvents="none" style={StyleSheet.absoluteFill}>
        <NeonConfetti show={showConfetti} onComplete={() => setShowConfetti(false)} />
      </View>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, marginTop: 10, marginBottom: 20, gap: 10 },
  backBtn: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', borderWidth: 1 },
  badge: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 10, borderWidth: 1 },
  badgeTxt: { fontWeight: '900', fontSize: 12, letterSpacing: 1 },

  content: { marginTop: 20, gap: 20, paddingHorizontal: 16 },
  players: { flexDirection: 'row', alignItems: 'center' },
  playerCard: { flex: 1, borderRadius: 20, padding: 15, alignItems: 'center', borderWidth: 1 },
  symbol: { fontSize: 24, fontWeight: '900', marginBottom: 2 },
  name: { fontSize: 13, fontWeight: '800' },
  botLevel: { fontSize: 10, marginTop: 2, letterSpacing: 0.5 },
  streak: { fontSize: 11, fontWeight: '900', marginTop: 2 },
  vsContainer: { width: 70, alignItems: 'center', justifyContent: 'center' },
  vsCircle: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center', borderWidth: 1 },
  vsTxt: { fontWeight: '900', fontSize: 11 },

  infoCard: { borderRadius: 20, padding: 15, borderWidth: 1 },
  instrRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4, gap: 8 },
  emoji: { fontSize: 16 },
  instrLbl: { fontSize: 13, fontWeight: '700' },
  hintBox: { marginTop: 8, paddingTop: 8, borderTopWidth: 1 },
  hintTxt: { fontSize: 13, fontWeight: '900' },

  boardWrap: {},
  board: { flexDirection: 'row', flexWrap: 'wrap', borderRadius: 20, overflow: 'hidden', borderWidth: 2 },
  cellInner: { width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center', borderWidth: 0.5 },

  modal: { width: '100%', borderRadius: 24, padding: 28, alignItems: 'center' },
  resultTitle: { fontSize: 32, fontWeight: '900', marginBottom: 10, letterSpacing: 2 },
  xpBadge: { borderWidth: 1, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 12, marginBottom: 12 },
  xpTxt: { fontWeight: '900', fontSize: 16 },
});
