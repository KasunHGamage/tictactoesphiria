// ─────────────────────────────────────────────
//  GameScreen.tsx — Full game UI + state machine
//  Layout: percentage-based, aspectRatio cells
// ─────────────────────────────────────────────

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  Platform,
  Pressable,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';

import { GamePhase, GameState, Player, Board } from '../game/gameTypes';
import {
  canPlace,
  checkWinner,
  createBoard,
  getPlayerPieces,
  isDraw,
  movePiece,
  placePiece,
  getWinningLine,
} from '../game/gameEngine';
import { getAIMove } from '../game/aiEngine';

// ── Colors ────────────────────────────────────────────────────────

const C = {
  bg: '#0D0D1A',
  surface: '#14142B',
  card: '#1C1C3A',
  border: '#2A2A5A',
  accent: '#7C5CFC',
  accentGlow: '#9B7DFF',
  accentDim: '#3D2E7C',
  xColor: '#FF6B8A',
  xGlow: '#FF4D73',
  oColor: '#4FC3F7',
  oGlow: '#29B6F6',
  textSecondary: '#8888AA',
  selected: '#FFD700',
  selectedBg: '#3A3000',
  winCell: '#2A2600',
};

// ── Win lines (for highlight) ─────────────────────────────────────



// ── Helpers ───────────────────────────────────────────────────────

function createInitialState(): GameState {
  return {
    board: createBoard(3),
    boardSize: 3,
    winLength: 3,
    pieceLimit: 3,
    currentPlayer: 'X',
    phase: 'placement',
    status: 'playing',
    winner: null,
    selectedIndex: null,
  };
}

function derivePhase(board: ReturnType<typeof createBoard>, player: Player): GamePhase {
  return canPlace(board, player) ? 'placement' : 'movement';
}

function getWinCells(board: Board, size: number, winLength: number): Set<number> {
  const line = getWinningLine(board, size, winLength);
  return new Set(line || []);
}

// ── Cell ──────────────────────────────────────────────────────────
// Uses width:'33.33%' + aspectRatio:1 — no fixed pixels.

interface CellProps {
  index: number;
  value: Player | null;
  isSelected: boolean;
  isWinCell: boolean;
  fontSize: number;
  onPress: (index: number) => void;
}

function Cell({ index, value, isSelected, isWinCell, fontSize, onPress }: CellProps) {
  const scale = useRef(new Animated.Value(1)).current;

  const handlePress = () => {
    Animated.sequence([
      Animated.timing(scale, { toValue: 0.84, duration: 70, useNativeDriver: true }),
      Animated.timing(scale, { toValue: 1.0, duration: 120, useNativeDriver: true }),
    ]).start();
    onPress(index);
  };

  const borderColor = isWinCell
    ? C.selected
    : isSelected
    ? C.selected
    : C.border;

  const bgColor = isSelected
    ? C.selectedBg
    : isWinCell
    ? C.winCell
    : C.card;

  return (
    <Pressable
      onPress={handlePress}
      accessibilityLabel={`cell-${index}`}
      style={styles.cellPressable}
    >
      <Animated.View
        style={[
          styles.cellInner,
          { borderColor, backgroundColor: bgColor },
          { transform: [{ scale }] },
        ]}
      >
        {value === 'X' && (
          <Text
            style={{
              fontSize,
              fontWeight: '900',
              color: C.xColor,
              textShadowColor: C.xGlow,
              textShadowOffset: { width: 0, height: 0 },
              textShadowRadius: 12,
            }}
          >
            ✕
          </Text>
        )}
        {value === 'O' && (
          <Text
            style={{
              fontSize,
              fontWeight: '900',
              color: C.oColor,
              textShadowColor: C.oGlow,
              textShadowOffset: { width: 0, height: 0 },
              textShadowRadius: 12,
            }}
          >
            ○
          </Text>
        )}
      </Animated.View>
    </Pressable>
  );
}

// ── PieceBadge ────────────────────────────────────────────────────

function PieceBadge({ player, board }: { player: Player; board: ReturnType<typeof createBoard> }) {
  const count = getPlayerPieces(board, player).length;
  const color = player === 'X' ? C.xColor : C.oColor;
  return (
    <View style={[styles.badge, { borderColor: color }]}>
      <Text style={[styles.badgeLabel, { color: C.textSecondary }]}>{player}</Text>
      <Text style={[styles.badgeCount, { color }]}>{count}/3</Text>
    </View>
  );
}

// ── GameScreen ────────────────────────────────────────────────────

export default function GameScreen() {
  const { width: W } = useWindowDimensions();
  // Font size derived from board width (90% of screen) divided by 3 cells
  const CELL_PX = (W * 0.9) / 3;
  const FONT_SIZE = Math.floor(CELL_PX * 0.44);

  const [state, setState] = useState<GameState>(createInitialState);
  const aiRunning = useRef(false);

  // ── AI turn ──────────────────────────────────────────────────────
  const runAI = useCallback((_s: GameState) => {
    if (aiRunning.current) return;
    aiRunning.current = true;

    setTimeout(() => {
      setState(prev => {
        if (prev.status !== 'playing' || prev.currentPlayer !== 'O') {
          aiRunning.current = false;
          return prev;
        }

        const move = getAIMove(prev.board);
        let nextBoard = prev.board;

        if (move.fromIndex !== undefined) {
          const result = movePiece(prev.board, move.fromIndex, move.toIndex, 'O');
          if (!result) { aiRunning.current = false; return prev; }
          nextBoard = result;
        } else {
          const result = placePiece(prev.board, move.toIndex, 'O');
          if (!result) { aiRunning.current = false; return prev; }
          nextBoard = result;
        }

        // ✅ Win determined ONLY by line pattern — never piece count
        const winner = checkWinner(nextBoard);
        const draw = !winner && isDraw(nextBoard);
        aiRunning.current = false;

        return {
          ...prev,
          board: nextBoard,
          currentPlayer: 'X',
          phase: derivePhase(nextBoard, 'X'),
          status: winner ? 'won' : draw ? 'draw' : 'playing',
          winner: winner ?? null,
          selectedIndex: null,
        };
      });
    }, 380 + Math.random() * 200);
  }, []);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (state.currentPlayer === 'O' && state.status === 'playing') runAI(state);
  }, [state.currentPlayer, state.status]);

  // ── Human tap ────────────────────────────────────────────────────
  const handleCellPress = useCallback((index: number) => {
    setState(prev => {
      if (prev.status !== 'playing' || prev.currentPlayer !== 'X') return prev;
      const { board, phase, selectedIndex } = prev;

      // ── Placement ──
      if (phase === 'placement') {
        if (board[index] !== null) return prev;
        const nextBoard = placePiece(board, index, 'X');
        if (!nextBoard) return prev;

        // ✅ Win determined ONLY by line pattern
        const winner = checkWinner(nextBoard);
        const draw = !winner && isDraw(nextBoard);

        return {
          ...prev,
          board: nextBoard,
          currentPlayer: 'O',
          phase: derivePhase(nextBoard, 'O'),
          status: winner ? 'won' : draw ? 'draw' : 'playing',
          winner: winner ?? null,
          selectedIndex: null,
        };
      }

      // ── Movement ──
      if (selectedIndex === null) {
        if (board[index] !== 'X') return prev;           // must select own piece
        return { ...prev, selectedIndex: index };
      }
      if (selectedIndex === index) return { ...prev, selectedIndex: null };  // deselect
      if (board[index] === 'X') return { ...prev, selectedIndex: index };    // switch piece

      if (board[index] !== null) return prev;             // blocked by opponent

      const nextBoard = movePiece(board, selectedIndex, index, 'X');
      if (!nextBoard) return prev;

      // ✅ Win determined ONLY by line pattern
      const winner = checkWinner(nextBoard);
      const draw = !winner && isDraw(nextBoard);

      return {
        ...prev,
        board: nextBoard,
        currentPlayer: 'O',
        phase: derivePhase(nextBoard, 'O'),
        status: winner ? 'won' : draw ? 'draw' : 'playing',
        winner: winner ?? null,
        selectedIndex: null,
      };
    });
  }, []);

  // ── Reset ────────────────────────────────────────────────────────
  const handleReset = useCallback(() => {
    aiRunning.current = false;
    setState(createInitialState());
  }, []);

  // ── Derived UI ────────────────────────────────────────────────────
  const { board, currentPlayer, phase, status, winner, selectedIndex } = state;
  const winCells = getWinCells(board, state.boardSize, state.winLength);

  const phaseHint =
    status !== 'playing' ? ''
    : currentPlayer === 'X'
      ? phase === 'placement' ? '⟶ Place your piece'
        : selectedIndex === null ? '⟶ Select your piece'
        : '⟶ Tap an empty cell'
    : 'AI is thinking…';

  const statusLabel =
    status === 'won' ? (winner === 'X' ? '🎉 You Win!' : '🤖 AI Wins!')
    : status === 'draw' ? '🤝 It\'s a Draw!'
    : currentPlayer === 'X' ? 'Your Turn  ✕'
    : 'AI Turn  ○';

  const statusColor =
    status === 'won' ? (winner === 'X' ? C.xColor : C.oColor)
    : status === 'draw' ? C.selected
    : currentPlayer === 'X' ? C.xColor : C.oColor;

  return (
    // ✅ flex:1 — parent fills the whole screen
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />

      {/* Title */}
      <View style={styles.titleRow}>
        <Text style={styles.titleMain}>MOVING</Text>
        <Text style={styles.titleSub}>TIC TAC TOE</Text>
      </View>

      {/* Status */}
      <View style={styles.statusCard}>
        <Text style={[styles.statusText, { color: statusColor }]}>{statusLabel}</Text>
        {phaseHint !== '' && (
          <Text style={styles.phaseHint}>{phaseHint}</Text>
        )}
      </View>

      {/* Piece counters */}
      <View style={styles.badgeRow}>
        <PieceBadge player="X" board={board} />
        <View style={styles.vsCircle}>
          <Text style={styles.vsText}>VS</Text>
        </View>
        <PieceBadge player="O" board={board} />
      </View>

      {/*
        ✅ BOARD:
        - width: '90%'     → responsive, no fixed pixels
        - aspectRatio: 1   → always square
        - alignSelf: 'center'
      */}
      <View style={styles.board}>
        {board.map((cell, idx) => (
          <Cell
            key={idx}
            index={idx}
            value={cell}
            isSelected={selectedIndex === idx}
            isWinCell={winCells.has(idx)}
            fontSize={FONT_SIZE}
            onPress={handleCellPress}
          />
        ))}
      </View>

      {/* Phase label */}
      {status === 'playing' && (
        <View style={styles.phaseTag}>
          <Text style={styles.phaseTagText}>
            {phase === 'placement' ? '📍 Placement Phase' : '🔄 Movement Phase'}
          </Text>
        </View>
      )}

      {/* Reset */}
      <Pressable
        style={({ pressed }) => [styles.resetBtn, pressed && styles.resetBtnActive]}
        onPress={handleReset}
        accessibilityLabel="reset-button"
      >
        <Text style={styles.resetBtnText}>
          {status !== 'playing' ? '▶  Play Again' : '↺  Restart'}
        </Text>
      </Pressable>
    </SafeAreaView>
  );
}

// ── Styles ────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  // ✅ flex:1 — fills the whole screen
  safe: {
    flex: 1,
    backgroundColor: C.bg,
    alignItems: 'center',
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight ?? 24) + 4 : 8,
    paddingBottom: 20,
  },

  titleRow: {
    alignItems: 'center',
    marginBottom: 10,
  },
  titleMain: {
    fontSize: 28,
    fontWeight: '900',
    letterSpacing: 8,
    color: C.accentGlow,
  },
  titleSub: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 5,
    color: C.textSecondary,
    marginTop: -3,
  },

  statusCard: {
    backgroundColor: C.card,
    borderRadius: 14,
    paddingVertical: 9,
    paddingHorizontal: 22,
    marginBottom: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: C.border,
    minWidth: 200,
  },
  statusText: {
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: 1,
  },
  phaseHint: {
    fontSize: 12,
    color: C.textSecondary,
    marginTop: 2,
    fontWeight: '500',
  },

  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  badge: {
    borderWidth: 1.5,
    borderRadius: 12,
    paddingVertical: 5,
    paddingHorizontal: 16,
    alignItems: 'center',
    backgroundColor: C.card,
  },
  badgeLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 2,
  },
  badgeCount: {
    fontSize: 18,
    fontWeight: '900',
  },
  vsCircle: {
    backgroundColor: C.accentDim,
    borderRadius: 17,
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
  },
  vsText: {
    color: C.accentGlow,
    fontWeight: '900',
    fontSize: 11,
    letterSpacing: 1,
  },

  // ✅ BOARD: width:'90%', aspectRatio:1, alignSelf:'center'
  board: {
    width: '90%',
    aspectRatio: 1,
    alignSelf: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: C.surface,
    borderWidth: 1.5,
    borderColor: C.border,
  },

  // ✅ CELL: width:'33.33%', aspectRatio:1
  cellPressable: {
    width: '33.33%',
    aspectRatio: 1,
  },
  cellInner: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },

  phaseTag: {
    marginTop: 12,
    backgroundColor: C.accentDim,
    borderRadius: 18,
    paddingVertical: 5,
    paddingHorizontal: 16,
  },
  phaseTagText: {
    color: C.accentGlow,
    fontWeight: '700',
    fontSize: 12,
    letterSpacing: 0.5,
  },

  resetBtn: {
    marginTop: 14,
    backgroundColor: C.accent,
    borderRadius: 14,
    paddingVertical: 13,
    paddingHorizontal: 46,
  },
  resetBtnActive: {
    backgroundColor: C.accentDim,
    transform: [{ scale: 0.96 }],
  },
  resetBtnText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 1,
  },
});
