import React, { useState } from 'react';
import ScreenWrapper from '../components/ScreenWrapper';
import {
  StyleSheet, Text, View, Pressable,
  StatusBar, useWindowDimensions, Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { 
  FadeInDown
} from 'react-native-reanimated';
import { useAuth } from '../auth/AuthContext';
import { GameConfig, Difficulty } from '../game/gameTypes';
import { createMatch } from '../services/matchService';

const C = {
  bg: '#0D0D1A', surface: '#14142B', card: '#1C1C3A', border: '#2A2A5A',
  accent: '#7C5CFC', accentGlow: '#9B7DFF', accentDim: '#3D2E7C',
  textPrimary: '#F0F0FF', textSecondary: '#8888AA',
  success: '#4ADE80', warning: '#FBBF24',
};

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

  // Update winLength and maxPieces when gridSize changes to keep them valid
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

  const renderOption = (label: string, value: any, current: any, setter: (v: any) => void) => {
    const isSelected = current === value;
    return (
      <Pressable 
        onPress={() => setter(value)}
        style={[s.option, isSelected && s.optionSelected]}
      >
        <Text style={[s.optionText, isSelected && s.optionTextSelected]}>{label}</Text>
      </Pressable>
    );
  };

  return (
    <ScreenWrapper horizontalPadding={0}>
      <StatusBar barStyle="light-content" />
      <View style={s.header}>
        <Pressable onPress={() => navigation.goBack()} style={s.backBtn}>
          <Ionicons name="chevron-back" size={24} color={C.textPrimary} />
        </Pressable>
        <Text style={s.headerTitle}>Game Setup</Text>
        <View style={{ width: 44 }} />
      </View>

      <View style={s.content}>
        {/* Mode Selection */}
        <Animated.View entering={FadeInDown.delay(100)} style={s.section}>
          <Text style={s.sectionTitle}>PLAY MODE</Text>
          <View style={s.modeRow}>
            <Pressable 
              onPress={() => setMode('ai')}
              style={[s.modeBtn, mode === 'ai' && s.modeBtnSelected]}
            >
              <Ionicons name="desktop-outline" size={24} color={mode === 'ai' ? '#FFF' : C.textSecondary} />
              <Text style={[s.modeBtnText, mode === 'ai' && s.modeBtnTextSelected]}>VS AI</Text>
            </Pressable>
            <Pressable 
              onPress={() => setMode('friend')}
              style={[s.modeBtn, mode === 'friend' && s.modeBtnSelected]}
            >
              <Ionicons name="people-outline" size={24} color={mode === 'friend' ? '#FFF' : C.textSecondary} />
              <Text style={[s.modeBtnText, mode === 'friend' && s.modeBtnTextSelected]}>WITH FRIEND</Text>
            </Pressable>
          </View>
        </Animated.View>

        {/* Difficulty Selection (AI Only) */}
        {mode === 'ai' && (
          <Animated.View entering={FadeInDown.delay(200)} style={s.section}>
            <Text style={s.sectionTitle}>DIFFICULTY</Text>
            <View style={s.optionsGrid}>
              {renderOption('Auto', 'auto', difficulty, setDifficulty)}
              {renderOption('Easy', 'easy', difficulty, setDifficulty)}
              {renderOption('Medium', 'medium', difficulty, setDifficulty)}
              {renderOption('Hard', 'hard', difficulty, setDifficulty)}
            </View>
            <Text style={s.hint}>
              {difficulty === 'auto' ? 'AI scales with your player level automatically.' : `Fixed ${difficulty} challenge.`}
            </Text>
          </Animated.View>
        )}

        {/* Grid Size Selection */}
        <Animated.View entering={FadeInDown.delay(300)} style={s.section}>
          <Text style={s.sectionTitle}>GRID SIZE</Text>
          <View style={s.optionsGrid}>
            {renderOption('3x3', 3, gridSize, updateGridSize)}
            {renderOption('4x4', 4, gridSize, updateGridSize)}
            {renderOption('5x5', 5, gridSize, updateGridSize)}
          </View>
        </Animated.View>

        {/* Win Condition Selection */}
        {gridSize > 3 && (
          <Animated.View entering={FadeInDown.delay(350)} style={s.section}>
            <Text style={s.sectionTitle}>WIN CONDITION</Text>
            <View style={s.optionsGrid}>
              {gridSize >= 4 && renderOption('4 in a row', 4, winLength, setWinLength)}
              {gridSize >= 5 && renderOption('5 in a row', 5, winLength, setWinLength)}
            </View>
          </Animated.View>
        )}

        {/* Pieces Selection */}
        <Animated.View entering={FadeInDown.delay(400)} style={s.section}>
          <Text style={s.sectionTitle}>PIECES PER PLAYER</Text>
          <View style={s.optionsGrid}>
            {renderOption('3', 3, maxPieces, setMaxPieces)}
            {gridSize >= 4 && renderOption('4', 4, maxPieces, setMaxPieces)}
            {gridSize >= 5 && renderOption('5', 5, maxPieces, setMaxPieces)}
          </View>
          {maxPieces > gridSize && (
            <Text style={s.errorHint}>Pieces should be ≤ Grid Size for optimal balance.</Text>
          )}
        </Animated.View>

        {/* Summary Card */}
        <Animated.View entering={FadeInDown.delay(500)} style={s.summaryCard}>
          <View style={s.summaryRow}>
            <View style={s.summaryItem}>
              <Text style={s.summaryLabel}>Rules</Text>
              <Text style={s.summaryValue}>{winLength} in a row to win</Text>
            </View>
            <View style={s.summaryItem}>
              <Text style={s.summaryLabel}>Pieces</Text>
              <Text style={s.summaryValue}>{maxPieces} moving pieces</Text>
            </View>
          </View>
        </Animated.View>

        <View style={s.footer}>
          <Pressable 
            onPress={handleStart} 
            disabled={loading}
            style={({ pressed }) => [s.startBtn, pressed && s.startBtnPressed, loading && { opacity: 0.7 }]}
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
    paddingHorizontal: 16, marginTop: 10, marginBottom: 20
  },
  backBtn: { 
    width: 44, height: 44, borderRadius: 22, backgroundColor: C.card, 
    justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: C.border 
  },
  headerTitle: { fontSize: 20, fontWeight: '900', color: C.textPrimary, letterSpacing: 1 },
  content: { marginTop: 20, paddingHorizontal: 16, gap: 20 },
  section: { marginBottom: 12 },
  sectionTitle: { fontSize: 12, fontWeight: '900', color: C.accentGlow, letterSpacing: 2, marginBottom: 16 },
  modeRow: { flexDirection: 'row', gap: 12 },
  modeBtn: { 
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', 
    backgroundColor: C.card, borderRadius: 16, paddingVertical: 16, gap: 10,
    borderWidth: 1, borderColor: C.border
  },
  modeBtnSelected: { backgroundColor: C.accent, borderColor: C.accentGlow },
  modeBtnText: { color: C.textSecondary, fontWeight: '800', fontSize: 14 },
  modeBtnTextSelected: { color: '#FFF' },
  optionsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  option: { 
    paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12, 
    backgroundColor: C.card, borderWidth: 1, borderColor: C.border, minWidth: 80, alignItems: 'center'
  },
  optionSelected: { backgroundColor: C.accentDim, borderColor: C.accent },
  optionText: { color: C.textSecondary, fontWeight: '700', fontSize: 14 },
  optionTextSelected: { color: C.accentGlow },
  hint: { fontSize: 12, color: C.textSecondary, marginTop: 12, fontStyle: 'italic' },
  errorHint: { fontSize: 12, color: '#FF6B6B', marginTop: 10, fontWeight: '600' },
  summaryCard: { 
    backgroundColor: C.surface, borderRadius: 24, padding: 20, 
    borderWidth: 1, borderColor: C.border, borderStyle: 'dashed' 
  },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-around' },
  summaryItem: { alignItems: 'center' },
  summaryLabel: { fontSize: 11, color: C.textSecondary, marginBottom: 4, fontWeight: '600' },
  summaryValue: { fontSize: 14, color: C.textPrimary, fontWeight: '800' },
  footer: { marginTop: 20, marginBottom: 40 },
  startBtn: { 
    backgroundColor: C.accent, borderRadius: 20, height: 64, 
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12,
    shadowColor: C.accent, shadowOpacity: 0.4, shadowRadius: 15, elevation: 8
  },
  startBtnPressed: { transform: [{ scale: 0.98 }], opacity: 0.9 },
  startBtnText: { color: '#FFF', fontSize: 18, fontWeight: '900', letterSpacing: 1.5 },
});
