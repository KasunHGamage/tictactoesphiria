import React, { useCallback, useEffect, useRef, useState } from 'react';
import ScreenWrapper from '../components/ScreenWrapper';
import {
  Pressable, StatusBar, StyleSheet, Text, useWindowDimensions,
  View, Alert, ActivityIndicator,
} from 'react-native';
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
import { Board, Player } from '../game/gameTypes';
import { canPlace, getWinningLine, getPlayerPieces } from '../game/gameEngine';
import { useMatch } from '../hooks/useMatch';
import { recordMatchResult } from '../services/userService';
import { triggerTimeout, continueMatch, forfeitMatch, setReadyForNextRound, startNextRound } from '../services/matchService';

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
    if (!line || !layouts[line[0]] || !layouts[line[2]]) return { opacity: 0 };
    const s = layouts[line[0]], e = layouts[line[2]];
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
function Cell({ index, value, isSelected, isWinCell, isOtherDimmed, size, fontSize, disabled, onPress, onLayout, colors }: any) {
  const scale = useSharedValue(1);
  const pulse = useSharedValue(1);

  useEffect(() => {
    pulse.value = isWinCell
      ? withRepeat(withSequence(withTiming(1.12, { duration: 600 }), withTiming(1, { duration: 600 })), -1, true)
      : 1;
  }, [isWinCell]);

  const { winColor, selectedColor, cellBg, cellBorder, xColor, oColor, isCalm } = colors;
  const animCell = useAnimatedStyle(() => ({
    transform: [{ scale: isWinCell ? pulse.value : scale.value }],
    opacity: isOtherDimmed && !isWinCell ? 0.4 : 1,
    borderColor: isWinCell ? winColor : isSelected ? selectedColor : cellBorder,
    backgroundColor: isSelected ? selectedColor + '18' : isWinCell ? winColor + '22' : cellBg,
  }));

  const pieceColor = value === 'X' ? xColor : oColor;

  return (
    <Pressable
      onLayout={e => { const { x, y, width: w, height: h } = e.nativeEvent.layout; onLayout(index, { x, y, w, h }); }}
      accessibilityLabel={`cell-${index}`}
      onPress={() => {
        if (disabled) return;
        scale.value = withSequence(withTiming(0.84, { duration: 70 }), withTiming(1, { duration: 110 }));
        onPress(index);
      }}
      style={{ width: size, height: size }}
    >
      <Animated.View style={[ms.cellInner, { borderColor: cellBorder }, animCell]}>
        {value && (
          <Text style={{
            fontSize, fontWeight: '900', color: pieceColor,
            textShadowColor: isCalm ? 'transparent' : pieceColor,
            textShadowRadius: isCalm ? 0 : 12,
          }}>
            {value === 'X' ? '✕' : '○'}
          </Text>
        )}
      </Animated.View>
    </Pressable>
  );
}

// ── Main Screen ───────────────────────────────────────────────────
export default function MultiplayerGameScreen({ route, navigation }: any) {
  const { matchId, playerSide, myUid, myName } = route.params;
  const { width: W } = useWindowDimensions();
  const t       = useAppTheme();
  const isCalm  = t.mode === 'calm';
  const BOARD_WIDTH = W - 32;

  const { match, optimisticBoard, myTurn, error, applyMove, resign } = useMatch(matchId, myUid, playerSide);

  const [selectedIdx,    setSelectedIdx]    = useState<number | null>(null);
  const [resultRecorded, setResultRecorded] = useState(false);
  const [showConfetti,   setShowConfetti]   = useState(false);
  const [tileLayouts,    setTileLayouts]    = useState<Record<number, any>>({});
  const [xpGained,       setXpGained]       = useState<number | null>(null);
  const [timeLeft,       setTimeLeft]       = useState<number | null>(null);
  const [gameEnded,      setGameEnded]      = useState(false);

  const boardScale    = useSharedValue(1);
  const resultScale   = useSharedValue(0.8);
  const resultOpacity = useSharedValue(0);
  const turnPulse     = useSharedValue(1);

  const isEndingMatch = useRef(false);

  const handleEndMatch = async () => {
    if (isEndingMatch.current || match?.status === 'finished') return;
    isEndingMatch.current = true;
    try { await forfeitMatch(matchId, playerSide); setGameEnded(true); }
    catch (err) { console.error(err); isEndingMatch.current = false; }
  };

  const handleTileLayout = useCallback((index: number, layout: any) =>
    setTileLayouts(prev => ({ ...prev, [index]: layout })), []);

  const resetLocalState = useCallback(() => {
    setSelectedIdx(null); setResultRecorded(false); setShowConfetti(false); setXpGained(null);
    boardScale.value = 1; resultScale.value = 0.8; resultOpacity.value = 0;
  }, []);

  useEffect(() => {
    turnPulse.value = withRepeat(
      withSequence(withTiming(1.05, { duration: 600, easing: Easing.inOut(Easing.ease) }), withTiming(1, { duration: 600, easing: Easing.inOut(Easing.ease) })),
      -1, true
    );
  }, []);

  useEffect(() => {
    if (match?.status === 'playing' && (resultRecorded || resultOpacity.value > 0)) resetLocalState();
    if (match?.status === 'finished') setGameEnded(true);
  }, [match?.status, resultRecorded, resetLocalState]);

  const gridSize   = match?.gridSize || 3;
  const cellSize   = Math.floor((BOARD_WIDTH - 4) / gridSize);
  const board: Board = optimisticBoard ?? match?.board ?? Array(gridSize * gridSize).fill(null);
  const winLength  = match?.winLength || 3;
  const maxPieces  = match?.maxPieces || 3;
  const bFontSize  = Math.floor(cellSize * 0.44);

  // Timeout countdown
  useEffect(() => {
    if (!match || match.status !== 'playing' || !match.turnStartedAt || !match.turnDuration) { setTimeLeft(null); return; }
    const startMs = match.turnStartedAt.toMillis ? match.turnStartedAt.toMillis() : match.turnStartedAt.seconds * 1000;
    const iv = setInterval(() => {
      const rem = Math.max(0, match.turnDuration - Math.floor((Date.now() - startMs) / 1000));
      setTimeLeft(rem);
      if (rem <= 5 && rem > 0 && match.currentPlayer === playerSide) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      if (rem === 0) { clearInterval(iv); if (match.status === 'playing') triggerTimeout(matchId, match.currentPlayer).catch(console.error); }
    }, 1000);
    return () => clearInterval(iv);
  }, [match?.turnStartedAt, match?.status, match?.currentPlayer, playerSide, matchId]);

  const phase      = match ? (canPlace(board, playerSide, maxPieces) ? 'placement' : 'movement') : 'placement';
  const winner     = match?.winner;
  const winningLine = match?.winningLine;
  const winSet     = new Set(winningLine || []);
  const isWinner   = winner === playerSide;
  const isLoser    = winner && winner !== playerSide;
  const opponentSide: Player = playerSide === 'X' ? 'O' : 'X';
  const opponentName = playerSide === 'X' ? match?.playerO?.displayName ?? 'Opponent' : match?.playerX?.displayName ?? 'Opponent';
  const myScore    = match?.scores?.[myUid] || 0;
  const oppUid     = playerSide === 'X' ? match?.playerO?.uid : match?.playerX?.uid;
  const oppScore   = (oppUid && match?.scores?.[oppUid]) || 0;
  const myStreak   = match?.winStreaks?.[myUid] || 0;
  const status     = match?.status;

  // Win sequence
  useEffect(() => {
    if (status === 'finished' || status === 'abandoned' || status === 'timeout_pending' || status === 'waiting_next_round') {
      const animate = () => {
        resultOpacity.value = withTiming(1, { duration: 400 });
        resultScale.value   = withTiming(1, { duration: 500, easing: Easing.out(Easing.back(1.5)) });
      };
      if (winner) { boardScale.value = withDelay(100, withTiming(1.05, { duration: 400 })); setTimeout(() => { if (isWinner) setShowConfetti(true); animate(); }, 600); }
      else setTimeout(animate, 600);
      if (status === 'timeout_pending') return;
      if (!resultRecorded) {
        setResultRecorded(true);
        setXpGained((isWinner ? 50 : 20) + myStreak * 10);
        recordMatchResult(myUid, !!isWinner, isWinner ? myStreak : 0);
        if (isWinner) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        else if (isLoser) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
    }
  }, [status, winner, isWinner, isLoser, myUid, resultRecorded, myStreak]);

  // Auto-trigger next round when both are ready
  useEffect(() => {
    if (match?.status === 'waiting_next_round' && match?.readyPlayers?.length === 2) {
      if (playerSide === 'X') {
        startNextRound(matchId).catch(console.error);
      }
    }
  }, [match?.status, match?.readyPlayers?.length, playerSide, matchId]);

  const handleCell = useCallback(async (index: number) => {
    if (!match || !myTurn || match.status !== 'playing') return;
    if (phase === 'placement') { if (board[index]) return; await applyMove({ type: 'place', toIndex: index }); return; }
    if (selectedIdx === null) { if (board[index] !== playerSide) return; setSelectedIdx(index); return; }
    if (selectedIdx === index) { setSelectedIdx(null); return; }
    if (board[index] === playerSide) { setSelectedIdx(index); return; }
    if (board[index] !== null) return;
    const from = selectedIdx; setSelectedIdx(null);
    await applyMove({ type: 'move', fromIndex: from, toIndex: index });
  }, [match, myTurn, phase, board, selectedIdx, playerSide, matchId]);

  const handleResign = () => Alert.alert('Exit Match?', 'Session will be saved.', [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Exit', style: 'destructive', onPress: () => resign().then(() => navigation.goBack()) },
  ]);

  const statusLabel = !match ? 'Connecting…'
    : status === 'waiting' ? 'Waiting for opponent…'
    : status === 'timeout_pending' ? (match?.timedOutPlayer === playerSide ? "Time's Up!" : `Waiting for ${opponentName}…`)
    : status === 'finished' ? (isWinner ? 'Victory!' : isLoser ? 'Defeat' : 'Draw')
    : status === 'abandoned' ? (isWinner ? 'Opponent left — You win!' : 'You left the match')
    : myTurn
      ? phase === 'placement' ? `Place Piece (${getPlayerPieces(board, playerSide).length}/${maxPieces})`
        : selectedIdx === null ? 'Select Piece' : 'Move to Target'
    : `${opponentName}'s turn…`;

  const animBoard  = useAnimatedStyle(() => ({ transform: [{ scale: boardScale.value }] }));
  const animResult = useAnimatedStyle(() => ({ opacity: resultOpacity.value, transform: [{ scale: resultScale.value }] }));
  const animOverlay = useAnimatedStyle(() => ({
    opacity: resultOpacity.value, ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.85)', zIndex: 100,
    justifyContent: 'center' as const, alignItems: 'center' as const, paddingHorizontal: 20,
  }));
  const animMyCard  = useAnimatedStyle(() => ({ transform: [{ scale: myTurn  && status === 'playing' ? turnPulse.value : 1 }] }));
  const animOppCard = useAnimatedStyle(() => ({ transform: [{ scale: !myTurn && status === 'playing' ? turnPulse.value : 1 }] }));

  const cellColors = { winColor: t.warning, selectedColor: t.primary, cellBg: t.card, cellBorder: t.border, xColor: t.accent, oColor: t.secondary, isCalm };
  const resultTitleColor = isWinner ? t.win : isLoser ? t.lose : t.textPrimary;
  const modalStyle = isCalm
    ? { backgroundColor: '#F9FAFB', borderColor: t.border, borderWidth: 1 }
    : { backgroundColor: '#130820', borderColor: t.primary, borderWidth: 2, ...(t.glow(t.primary, 22) as any) };

  const exitToLobby = () => navigation.dispatch(CommonActions.reset({ index: 0, routes: [{ name: 'Main', params: { screen: 'Home' } }] }));

  return (
    <ScreenWrapper scroll={false} horizontalPadding={0}>
      <StatusBar barStyle={isCalm ? 'dark-content' : 'light-content'} backgroundColor={t.bg} />

      {/* Header */}
      <View style={ms.header}>
        <Pressable onPress={handleResign} style={[ms.backBtn, { backgroundColor: t.card, borderColor: t.accent + '66' }]}>
          <Ionicons name="close" size={24} color={t.accent} />
        </Pressable>
        <View style={[ms.badge, { backgroundColor: t.primary + '22', borderColor: t.primary }, t.glow(t.primary, 6) as any]}>
          <Text style={[ms.badgeTxt, { color: t.primary }]}>ROUND {match?.roundNumber || 1}</Text>
        </View>
        <Text style={[ms.matchCode, { color: t.textSecondary }]}>{matchId}</Text>
      </View>

      <View style={ms.content}>
        {/* Player HUD */}
        <View style={ms.players}>
          <Animated.View style={[
            ms.playerCard, { backgroundColor: t.card, borderColor: t.border },
            myTurn && status === 'playing' && { borderColor: t.primary, borderWidth: 2, ...(t.glow(t.primary, 14) as any) },
            animMyCard,
          ]}>
            <Text style={[ms.symbol, { color: playerSide === 'X' ? t.accent : t.secondary }]}>{playerSide}</Text>
            <Text style={[ms.score, { color: t.textPrimary }]}>{myScore}</Text>
            {myStreak > 0 && <Text style={[ms.streak, { color: t.warning }]}>🔥 {myStreak}</Text>}
            <Text style={[ms.name, { color: t.textSecondary }]} numberOfLines={1}>{myName}</Text>
          </Animated.View>

          <View style={ms.vsContainer}>
            <View style={[ms.vsCircle, { backgroundColor: isCalm ? t.cardAlt : '#160B28', borderColor: t.primary + '66' }, t.glow(t.primary, 5) as any]}>
              <Text style={[ms.vsTxt, { color: t.primary }]}>VS</Text>
            </View>
          </View>

          <Animated.View style={[
            ms.playerCard, { backgroundColor: t.card, borderColor: t.border },
            !myTurn && status === 'playing' && { borderColor: t.primary, borderWidth: 2, ...(t.glow(t.primary, 14) as any) },
            animOppCard,
          ]}>
            <Text style={[ms.symbol, { color: opponentSide === 'X' ? t.accent : t.secondary }]}>{opponentSide}</Text>
            <Text style={[ms.score, { color: t.textPrimary }]}>{oppScore}</Text>
            <Text style={[ms.name, { color: t.textSecondary }]} numberOfLines={1}>{opponentName}</Text>
          </Animated.View>
        </View>

        {/* Instruction Card */}
        {status === 'playing' && (
          <View style={[ms.infoCard, { backgroundColor: t.card, borderColor: t.border }, t.glow(t.primary, 4) as any]}>
            <View style={ms.instrRow}><Text style={ms.emoji}>🎯</Text><Text style={[ms.instrLbl, { color: t.textPrimary }]}>{gridSize}×{gridSize} • {winLength} in a row</Text></View>
            <View style={ms.instrRow}><Text style={ms.emoji}>📦</Text><Text style={[ms.instrLbl, { color: t.textPrimary }]}>Pieces: {getPlayerPieces(board, playerSide).length} / {maxPieces}</Text></View>
            <View style={[ms.hintBox, { borderTopColor: t.border }]}>
              <Text style={[ms.hintTxt, { color: t.primary }]}>
                {phase === 'placement'
                  ? `👉 Place ${maxPieces - getPlayerPieces(board, playerSide).length} more`
                  : '👉 Select a piece to move'}
              </Text>
            </View>
            {timeLeft != null && (
              <View style={[ms.instrRow, { marginTop: 8 }]}>
                <Text style={ms.emoji}>⏱</Text>
                <Text style={[ms.instrLbl, { color: timeLeft <= 10 ? t.lose : t.textPrimary, fontWeight: timeLeft <= 10 ? '900' : '700' }]}>
                  Time left: {timeLeft}s
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Board */}
        <Animated.View style={[ms.boardWrap, animBoard, { alignSelf: 'center' }, t.glow(t.primary, 20) as any]}>
          <View style={[ms.board, { width: BOARD_WIDTH, height: BOARD_WIDTH, backgroundColor: t.card, borderColor: t.primary + '55' }]}>
            {board.map((cell, idx) => (
              <Cell key={idx} index={idx} value={cell} isSelected={selectedIdx === idx}
                isWinCell={winSet.has(idx)} isOtherDimmed={!!winner}
                size={cellSize} fontSize={bFontSize}
                disabled={!myTurn || status !== 'playing'}
                boardSize={gridSize} onPress={handleCell} onLayout={handleTileLayout}
                colors={cellColors}
              />
            ))}
            <StrikeLine winLine={winningLine ?? null} layouts={tileLayouts} lineColor={t.warning} />
          </View>
        </Animated.View>

        {/* HUD Info */}
        <View style={ms.hudInfo}>
          <View style={[ms.ruleTag, { backgroundColor: t.card, borderColor: t.border }]}>
            <Text style={[ms.ruleTxt, { color: t.textSecondary }]}>{gridSize}×{gridSize} • {winLength} in a row</Text>
          </View>
          <Text style={[ms.statusMain, { color: myTurn ? t.primary : t.textSecondary }]}>{statusLabel}</Text>
          <Text style={[ms.phaseMain, { color: t.primary, textShadowColor: isCalm ? 'transparent' : t.primary, textShadowRadius: isCalm ? 0 : 8 }]}>
            {phase === 'placement' ? 'PLACEMENT' : 'MOVEMENT'}
          </Text>
        </View>
      </View>

      {/* Result Overlay */}
      {(status === 'finished' || status === 'abandoned' || status === 'waiting_next_round') && (
        <Animated.View style={animOverlay}>
          <Animated.View style={[ms.modal, modalStyle, animResult]}>
            <Text style={[ms.resultTitle, { color: resultTitleColor }]}>
              {match?.endReason === 'timeout' ? "TIME'S UP!"
                : status === 'abandoned' && isWinner ? 'OPPONENT LEFT'
                : isWinner ? 'VICTORY!' : isLoser ? 'DEFEAT' : 'DRAW'}
            </Text>
            {match?.endReason === 'timeout' && (
              <Text style={[ms.subTxt, { color: isWinner ? t.win : t.lose, marginBottom: 10 }]}>
                {isWinner ? 'Opponent timed out!' : 'You ran out of time!'}
              </Text>
            )}
            {xpGained != null && (
              <View style={[ms.xpBadge, { backgroundColor: t.warning + '18', borderColor: t.warning }]}>
                <Text style={[ms.xpTxt, { color: t.warning }]}>+{xpGained} XP</Text>
              </View>
            )}
            <View style={{ marginTop: 20, width: '100%', gap: 12 }}>
              {match?.endReason !== 'resign' && (
                match?.readyPlayers?.includes(myUid) ? (
                  <NeonButton title="WAITING FOR OPPONENT..." variant="secondary" onPress={() => {}} disabled />
                ) : (
                  <NeonButton title="NEXT ROUND" variant="primary"
                    onPress={() => setReadyForNextRound(matchId, myUid)}
                  />
                )
              )}
              <NeonButton title="EXIT TO LOBBY" variant="secondary" onPress={exitToLobby} />
            </View>
          </Animated.View>
        </Animated.View>
      )}

      {/* Timeout Modal */}
      {status === 'timeout_pending' && (
        <Animated.View style={animOverlay}>
          <Animated.View style={[ms.modal, modalStyle, animResult]}>
            <Text style={[ms.resultTitle, { color: t.lose }]}>TIME'S UP</Text>
            {match?.timedOutPlayer === playerSide ? (
              <>
                <Text style={[ms.subTxt, { marginBottom: 20, textAlign: 'center', color: t.textSecondary }]}>
                  You didn't make a move in time. Continue or end the match?
                </Text>
                <View style={{ gap: 15, width: '100%' }}>
                  <NeonButton title="CONTINUE"   variant="primary"  onPress={() => continueMatch(matchId)} />
                  <NeonButton title="END MATCH"  variant="danger"   onPress={handleEndMatch} />
                </View>
              </>
            ) : (
              <>
                <Text style={[ms.subTxt, { textAlign: 'center', color: t.textSecondary }]}>
                  Waiting for {opponentName} to decide...
                </Text>
                <View style={{ marginTop: 25 }}>
                  <ActivityIndicator color={t.primary} size="large" />
                </View>
              </>
            )}
          </Animated.View>
        </Animated.View>
      )}

      <View pointerEvents="none" style={[StyleSheet.absoluteFill, { zIndex: 999 }]}>
        <NeonConfetti show={showConfetti} onComplete={() => setShowConfetti(false)} />
      </View>
    </ScreenWrapper>
  );
}

const ms = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, marginTop: 10, marginBottom: 20, gap: 10 },
  backBtn: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', borderWidth: 1 },
  badge: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12, borderWidth: 1 },
  badgeTxt: { fontWeight: '900', fontSize: 13, letterSpacing: 1.5 },
  matchCode: { flex: 1, textAlign: 'right', fontWeight: '700', fontSize: 11, letterSpacing: 1 },

  content: { marginTop: 20, gap: 20, paddingHorizontal: 16 },
  players: { flexDirection: 'row', alignItems: 'center' },
  playerCard: { flex: 1, borderRadius: 20, padding: 15, alignItems: 'center', borderWidth: 1 },
  symbol: { fontSize: 28, fontWeight: '900', marginBottom: 5 },
  score: { fontSize: 26, fontWeight: '900' },
  streak: { fontSize: 11, fontWeight: '900', marginTop: 3 },
  name: { fontSize: 11, marginTop: 5, fontWeight: '700', letterSpacing: 0.5 },
  vsContainer: { width: 70, alignItems: 'center', justifyContent: 'center' },
  vsCircle: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', borderWidth: 1 },
  vsTxt: { fontWeight: '900', fontSize: 12 },

  boardWrap: {},
  board: { flexDirection: 'row', flexWrap: 'wrap', borderRadius: 20, overflow: 'hidden', borderWidth: 2 },
  cellInner: { width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center', borderWidth: 0.5 },

  hudInfo: { alignItems: 'center', marginTop: 10 },
  ruleTag: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 10, marginBottom: 12, borderWidth: 1 },
  ruleTxt: { fontSize: 11, fontWeight: '800', letterSpacing: 1 },
  statusMain: { fontSize: 20, fontWeight: '900', letterSpacing: 1, marginBottom: 5 },
  phaseMain: { fontSize: 10, fontWeight: '900', letterSpacing: 3, textShadowOffset: { width: 0, height: 0 } },

  infoCard: { borderRadius: 20, padding: 15, borderWidth: 1 },
  instrRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 5, gap: 10 },
  emoji: { fontSize: 17 },
  instrLbl: { fontSize: 13, fontWeight: '700' },
  hintBox: { marginTop: 10, paddingTop: 10, borderTopWidth: 1 },
  hintTxt: { fontSize: 13, fontWeight: '900' },

  modal: { width: '100%', borderRadius: 24, padding: 28, alignItems: 'center' },
  resultTitle: { fontSize: 34, fontWeight: '900', marginBottom: 14, letterSpacing: 2 },
  subTxt: { fontSize: 13, fontWeight: '600' },
  xpBadge: { borderWidth: 1, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 14, marginBottom: 14 },
  xpTxt: { fontWeight: '900', fontSize: 18 },
});
