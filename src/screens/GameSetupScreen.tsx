import React, { useState } from 'react';
import ScreenWrapper from '../components/ScreenWrapper';
import {
  StyleSheet, Text, View, Pressable,
  StatusBar, Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useAuth } from '../auth/AuthContext';
import { GameConfig, Difficulty } from '../game/gameTypes';
import { createMatch } from '../services/matchService';
import { Colors, Spacing, glow, glowStrong, textGlow } from '../../constants/theme';

type Mode = 'ai' | 'friend';

export default function GameSetupScreen({ navigation, route }: any) {
  const { user } = useAuth();
  const initialMode: Mode = route.params?.mode || 'ai';

  const [mode, setMode] = useState<Mode>(initialMode);
  const [difficulty, setDifficulty] = useState<Difficulty>('auto');
  const [gridSize, setGridSize] = useState<number>(3);
  const [winLength, setWinLength] = useState<number>(3);
  const [maxPieces, setMaxPieces] = useState<number>(3);
  const [loading, setLoading] = useState(false);

  const updateGridSize = (val: number) => {
    setGridSize(val);
    setWinLength(val);
    if (maxPieces > val) setMaxPieces(val);
  };

  const handleStart = async () => {
    const config: GameConfig = { gridSize, winLength, maxPieces, difficulty };
    if (mode === 'friend') {
      setLoading(true);
      try {
        const matchId = await createMatch(user!.uid, user!.displayName || 'Player', config);
        navigation.navigate('Friends', { matchId, config });
      } catch (e) {
        Alert.alert('Error', 'Failed to create match');
      } finally {
        setLoading(false);
      }
    } else {
      navigation.navigate('SinglePlayer', { config });
    }
  };

  // ── Option Chip ───────────────────────────────────────────────────
  const renderOption = (
    label: string, value: any, current: any, setter: (v: any) => void,
    accentColor = Colors.neonPurple,
  ) => {
    const selected = current === value;
    return (
      <Pressable
        key={label}
        onPress={() => setter(value)}
        style={[
          s.chip,
          selected && {
            backgroundColor: '#0E0E18',
            borderColor: accentColor,
            shadowColor: accentColor,
            shadowOpacity: 0.55,
            shadowRadius: 10,
            elevation: 6,
          },
        ]}
      >
        <Text style={[s.chipText, selected && { color: accentColor, fontWeight: '700', letterSpacing: 0.5 }]}>
          {label}
        </Text>
      </Pressable>
    );
  };

  return (
    <ScreenWrapper horizontalPadding={0}>
      <StatusBar barStyle="light-content" />

      {/* Header */}
      <View style={s.header}>
        <Pressable onPress={() => navigation.goBack()} style={s.backBtn}>
          <Ionicons name="chevron-back" size={22} color={Colors.textPrimary} />
        </Pressable>
        <Text style={[s.headerTitle, textGlow(Colors.neonPurple) as any]}>GAME SETUP</Text>
        <View style={{ width: 44 }} />
      </View>

      <View style={s.content}>
        {/* ── Mode Selection ── */}
        <Animated.View entering={FadeInDown.delay(80)} style={s.section}>
          <Text style={s.sectionTitle}>PLAY MODE</Text>
          <View style={s.modeRow}>
            {/* VS AI */}
            <Pressable
              onPress={() => setMode('ai')}
              style={[s.modeBtn, mode === 'ai' && s.modeBtnActiveAI]}
            >
              <Ionicons
                name="desktop-outline" size={22}
                color={mode === 'ai' ? Colors.neonBlue : Colors.textSecondary}
              />
              <Text style={[s.modeBtnText, mode === 'ai' && { color: Colors.neonBlue }]}>
                VS AI
              </Text>
            </Pressable>
            {/* Friend */}
            <Pressable
              onPress={() => setMode('friend')}
              style={[s.modeBtn, mode === 'friend' && s.modeBtnActiveFriend]}
            >
              <Ionicons
                name="people-outline" size={22}
                color={mode === 'friend' ? Colors.neonPurple : Colors.textSecondary}
              />
              <Text style={[s.modeBtnText, mode === 'friend' && { color: Colors.neonPurple }]}>
                WITH FRIEND
              </Text>
            </Pressable>
          </View>
        </Animated.View>

        {/* ── Difficulty (AI only) ── */}
        {mode === 'ai' && (
          <Animated.View entering={FadeInDown.delay(160)} style={s.section}>
            <Text style={s.sectionTitle}>DIFFICULTY</Text>
            <View style={s.chipRow}>
              {renderOption('Auto',   'auto',   difficulty, setDifficulty, Colors.neonPurple)}
              {renderOption('Easy',   'easy',   difficulty, setDifficulty, Colors.neonGreen)}
              {renderOption('Medium', 'medium', difficulty, setDifficulty, Colors.neonYellow)}
              {renderOption('Hard',   'hard',   difficulty, setDifficulty, Colors.neonPink)}
            </View>
            <Text style={s.hint}>
              {difficulty === 'auto'
                ? 'AI scales with your player level automatically.'
                : `Fixed ${difficulty} challenge.`}
            </Text>
          </Animated.View>
        )}

        {/* ── Grid Size ── */}
        <Animated.View entering={FadeInDown.delay(240)} style={s.section}>
          <Text style={s.sectionTitle}>GRID SIZE</Text>
          <View style={s.chipRow}>
            {renderOption('3×3', 3, gridSize, updateGridSize, Colors.neonBlue)}
            {renderOption('4×4', 4, gridSize, updateGridSize, Colors.neonBlue)}
            {renderOption('5×5', 5, gridSize, updateGridSize, Colors.neonBlue)}
          </View>
        </Animated.View>

        {/* ── Win Condition ── */}
        {gridSize > 3 && (
          <Animated.View entering={FadeInDown.delay(300)} style={s.section}>
            <Text style={s.sectionTitle}>WIN CONDITION</Text>
            <View style={s.chipRow}>
              {gridSize >= 4 && renderOption('4 in a row', 4, winLength, setWinLength, Colors.neonYellow)}
              {gridSize >= 5 && renderOption('5 in a row', 5, winLength, setWinLength, Colors.neonYellow)}
            </View>
          </Animated.View>
        )}

        {/* ── Pieces ── */}
        <Animated.View entering={FadeInDown.delay(360)} style={s.section}>
          <Text style={s.sectionTitle}>PIECES PER PLAYER</Text>
          <View style={s.chipRow}>
            {renderOption('3', 3, maxPieces, setMaxPieces, Colors.neonPink)}
            {gridSize >= 4 && renderOption('4', 4, maxPieces, setMaxPieces, Colors.neonPink)}
            {gridSize >= 5 && renderOption('5', 5, maxPieces, setMaxPieces, Colors.neonPink)}
          </View>
          {maxPieces > gridSize && (
            <Text style={s.errorHint}>Pieces should be ≤ Grid Size for optimal balance.</Text>
          )}
        </Animated.View>

        {/* ── Summary Card ── */}
        <Animated.View entering={FadeInDown.delay(440)} style={s.summaryCard}>
          <View style={s.summaryRow}>
            <View style={s.summaryItem}>
              <Text style={s.summaryLabel}>GRID</Text>
              <Text style={s.summaryVal}>{gridSize}×{gridSize}</Text>
            </View>
            <View style={s.summaryDivider} />
            <View style={s.summaryItem}>
              <Text style={s.summaryLabel}>WIN</Text>
              <Text style={s.summaryVal}>{winLength} in a row</Text>
            </View>
            <View style={s.summaryDivider} />
            <View style={s.summaryItem}>
              <Text style={s.summaryLabel}>PIECES</Text>
              <Text style={s.summaryVal}>{maxPieces} each</Text>
            </View>
          </View>
        </Animated.View>

        {/* ── Start Button ── */}
        <View style={s.footer}>
          <Pressable
            onPress={handleStart}
            disabled={loading}
            style={({ pressed }) => [
              s.startBtn,
              pressed && { transform: [{ scale: 0.97 }], opacity: 0.9 },
              loading && { opacity: 0.6 },
            ]}
          >
            <Text style={s.startBtnText}>{loading ? 'CREATING...' : 'START GAME'}</Text>
            <Ionicons name="play" size={20} color="#FFF" />
          </Pressable>
        </View>
      </View>
    </ScreenWrapper>
  );
}

const s = StyleSheet.create({
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.md, marginTop: Spacing.sm, marginBottom: Spacing.md,
  },
  backBtn: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: Colors.card, justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, borderColor: Colors.border,
  },
  headerTitle: {
    fontSize: 16, fontWeight: '900', color: Colors.textPrimary, letterSpacing: 2,
  },

  content: { paddingHorizontal: Spacing.md, gap: Spacing.lg },

  section: {},
  sectionTitle: {
    fontSize: 10, fontWeight: '900', color: Colors.textSecondary,
    letterSpacing: 3, marginBottom: Spacing.md,
  },

  // Mode buttons
  modeRow: { flexDirection: 'row', gap: Spacing.sm },
  modeBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: Colors.card, borderRadius: 14, paddingVertical: 16, gap: 10,
    borderWidth: 1, borderColor: Colors.border,
  },
  modeBtnActiveAI: {
    backgroundColor: '#0E0E18',
    borderColor: Colors.neonBlue,
    shadowColor: Colors.neonBlue,
    shadowOpacity: 0.55,
    shadowRadius: 10,
    elevation: 6,
  },
  modeBtnActiveFriend: {
    backgroundColor: '#0E0E18',
    borderColor: Colors.neonPurple,
    shadowColor: Colors.neonPurple,
    shadowOpacity: 0.55,
    shadowRadius: 10,
    elevation: 6,
  },
  modeBtnText: { color: Colors.textSecondary, fontWeight: '700', fontSize: 13, letterSpacing: 0.3 },

  // Chips
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  chip: {
    paddingHorizontal: 18, paddingVertical: 12, borderRadius: 12,
    backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.border,
    minWidth: 72, alignItems: 'center',
  },
  chipText: { color: Colors.textSecondary, fontWeight: '600', fontSize: 13 },

  hint: { fontSize: 12, color: Colors.textSecondary, marginTop: 10, fontStyle: 'italic' },
  errorHint: { fontSize: 12, color: Colors.neonPink, marginTop: 8, fontWeight: '700' },

  // Summary
  summaryCard: {
    backgroundColor: '#0E0E18', borderRadius: 20, padding: Spacing.lg,
    borderWidth: 1, borderColor: Colors.border,
  },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center' },
  summaryItem: { alignItems: 'center' },
  summaryDivider: { width: 1, height: 32, backgroundColor: Colors.border },
  summaryLabel: { fontSize: 9, color: Colors.textSecondary, fontWeight: '900', letterSpacing: 2, marginBottom: 6 },
  summaryVal: { fontSize: 14, color: Colors.textPrimary, fontWeight: '900' },

  // Start button — strongest CTA, intentionally brighter than chip selections
  footer: { marginTop: Spacing.sm, marginBottom: 40 },
  startBtn: {
    backgroundColor: Colors.neonPurple, borderRadius: 16, height: 64,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12,
    borderWidth: 1.5, borderColor: '#C47FFF',
    shadowColor: Colors.neonPurple, shadowOpacity: 0.85, shadowRadius: 20, elevation: 16,
  },
  startBtnText: { color: '#FFF', fontSize: 17, fontWeight: '900', letterSpacing: 2 },
});
