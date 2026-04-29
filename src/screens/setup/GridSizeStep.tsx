import React from 'react';
import { StyleSheet, Text, View, Pressable, Alert, ActivityIndicator } from 'react-native';
import { CommonActions } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInRight } from 'react-native-reanimated';
import SetupStepWrapper from '../../components/setup/SetupStepWrapper';
import { Colors, Spacing } from '../../../constants/theme';
import { useAuth } from '../../auth/AuthContext';
import { createMatch } from '../../services/matchService';
import { GameConfig } from '../../game/gameTypes';

export default function GridSizeStep({ navigation, route }: any) {
  const { user } = useAuth();
  const { mode, difficulty } = route.params;
  const isAI = mode === 'ai';
  const [loading, setLoading] = React.useState(false);
  
  const options = [
    { label: '3×3', value: 3, desc: 'Classic speed.', icon: 'apps' },
    { label: '4×4', value: 4, desc: 'Strategic depth.', icon: 'grid' },
    { label: '5×5', value: 5, desc: 'Grand arena.', icon: 'grid-outline' },
  ];

  const handleSelect = async (gridSize: number) => {
    setLoading(true);
    try {
      // Preset Logic: Pieces and WinLength match GridSize for simplicity
      const config: GameConfig = { 
        gridSize, 
        winLength: gridSize, 
        maxPieces: gridSize, 
        difficulty: difficulty || 'auto' 
      };

      if (mode === 'friend') {
        const matchId = await createMatch(user!.uid, user!.displayName || 'Player', config);
        // Friends is a tab inside MainTabs — navigate with nested params
        navigation.dispatch(
          CommonActions.navigate('Main', {
            screen: 'Friends',
            params: { pendingMatchId: matchId },
          })
        );
      } else {
        navigation.navigate('SinglePlayer', { config });
      }
    } catch (e) {
      console.error("[SETUP] Failed to start match:", e);
      Alert.alert('Error', 'Failed to enter arena. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SetupStepWrapper
      title="Grid Size"
      subtitle="Select the board dimensions for the match."
      currentStep={isAI ? 2 : 1}
      totalSteps={isAI ? 2 : 1}
      onBack={() => navigation.goBack()}
      accentColor={Colors.neonBlue}
    >
      <View style={s.container}>
        {options.map((opt, idx) => (
          <Animated.View key={opt.value} entering={FadeInRight.delay(idx * 100)}>
            <Pressable
              style={({ pressed }) => [s.card, pressed && s.cardPressed, loading && { opacity: 0.7 }]}
              onPress={() => !loading && handleSelect(opt.value)}
              disabled={loading}
            >
              <View style={s.iconCircle}>
                {loading ? <ActivityIndicator color={Colors.neonBlue} /> : <Ionicons name={opt.icon as any} size={24} color={Colors.neonBlue} />}
              </View>
              <View style={s.cardInfo}>
                <Text style={s.cardTitle}>{opt.label}</Text>
                <Text style={s.cardDesc}>{opt.desc}</Text>
              </View>
              {!loading && <Ionicons name="chevron-forward" size={20} color={Colors.textSecondary} />}
            </Pressable>
          </Animated.View>
        ))}
        <View style={s.badge}>
          <Ionicons name="flash" size={12} color={Colors.neonYellow} />
          <Text style={s.badgeText}>AUTO-CONFIG ACTIVE</Text>
        </View>
      </View>
    </SetupStepWrapper>
  );
}

const s = StyleSheet.create({
  container: { gap: Spacing.md },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.card,
    borderRadius: 20,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: Spacing.md,
  },
  cardPressed: { transform: [{ scale: 0.98 }], opacity: 0.9 },
  iconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: Colors.neonBlue + '22',
    borderColor: Colors.neonBlue + '44',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  cardInfo: { flex: 1 },
  cardTitle: { fontSize: 18, fontWeight: '900', color: Colors.textPrimary, marginBottom: 4 },
  cardDesc: { fontSize: 12, color: Colors.textSecondary },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: Spacing.md,
    opacity: 0.6,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '900',
    color: Colors.neonYellow,
    letterSpacing: 2,
  },
});
