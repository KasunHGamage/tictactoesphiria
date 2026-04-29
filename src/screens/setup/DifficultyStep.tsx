import React from 'react';
import { StyleSheet, Text, View, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInRight } from 'react-native-reanimated';
import SetupStepWrapper from '../../components/setup/SetupStepWrapper';
import { Colors, Spacing, glow } from '../../../constants/theme';
import { Difficulty } from '../../game/gameTypes';

export default function DifficultyStep({ navigation }: any) {
  const options: { label: string; value: Difficulty; desc: string; icon: any; color: string }[] = [
    { label: 'Auto', value: 'auto', desc: 'AI scales with your player level.', icon: 'sparkles', color: Colors.neonPurple },
    { label: 'Easy', value: 'easy', desc: 'Perfect for learning the moves.', icon: 'leaf', color: Colors.neonGreen },
    { label: 'Medium', value: 'medium', desc: 'A balanced challenge.', icon: 'medal', color: Colors.neonYellow },
    { label: 'Hard', value: 'hard', desc: 'The ultimate engine test.', icon: 'flame', color: Colors.neonPink },
  ];

  const handleSelect = (difficulty: Difficulty) => {
    navigation.navigate('SetupGridSize', { mode: 'ai', difficulty });
  };

  return (
    <SetupStepWrapper
      title="Difficulty"
      subtitle="Choose the intelligence level of your opponent."
      currentStep={1}
      totalSteps={5}
      onBack={() => navigation.goBack()}
      accentColor={Colors.neonBlue}
    >
      <View style={s.container}>
        {options.map((opt, idx) => (
          <Animated.View key={opt.value} entering={FadeInRight.delay(idx * 100)}>
            <Pressable
              style={({ pressed }) => [s.card, pressed && s.cardPressed]}
              onPress={() => handleSelect(opt.value)}
            >
              <View style={[s.iconCircle, { backgroundColor: opt.color + '22', borderColor: opt.color + '44' }]}>
                <Ionicons name={opt.icon} size={24} color={opt.color} />
              </View>
              <View style={s.cardInfo}>
                <Text style={s.cardTitle}>{opt.label}</Text>
                <Text style={s.cardDesc}>{opt.desc}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={Colors.textSecondary} />
            </Pressable>
          </Animated.View>
        ))}
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
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  cardInfo: { flex: 1 },
  cardTitle: { fontSize: 18, fontWeight: '900', color: Colors.textPrimary, marginBottom: 4 },
  cardDesc: { fontSize: 12, color: Colors.textSecondary },
});
