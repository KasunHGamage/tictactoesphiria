import React from 'react';
import { StyleSheet, Text, View, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInRight } from 'react-native-reanimated';
import SetupStepWrapper from '../../components/setup/SetupStepWrapper';
import { useAppTheme } from '../../context/ThemeContext';
import { Spacing } from '../../../constants/themes';
import { Difficulty } from '../../game/gameTypes';

export default function DifficultyStep({ navigation }: any) {
  const t = useAppTheme();

  const isCalm = t.mode === 'calm';

  const options: { label: string; value: Difficulty; desc: string; icon: any; color: string }[] = [
    { label: 'Auto',   value: 'auto',   desc: 'AI scales with your player level.',  icon: 'sparkles', color: isCalm ? t.primary : t.primary  },
    { label: 'Easy',   value: 'easy',   desc: 'Perfect for learning the moves.',    icon: 'leaf',     color: isCalm ? t.primary : t.success  },
    { label: 'Medium', value: 'medium', desc: 'A balanced challenge.',              icon: 'medal',    color: isCalm ? t.primary : t.warning  },
    { label: 'Hard',   value: 'hard',   desc: 'The ultimate engine test.',          icon: 'flame',    color: isCalm ? t.primary : t.accent   },
  ];

  return (
    <SetupStepWrapper
      title="Difficulty"
      subtitle="Choose the intelligence level of your opponent."
      currentStep={1}
      totalSteps={5}
      onBack={() => navigation.goBack()}
    >
      <View style={s.container}>
        {options.map((opt, idx) => (
          <Animated.View key={opt.value} entering={FadeInRight.delay(idx * 100)}>
            <Pressable
              style={({ pressed }) => [
                s.card,
                { backgroundColor: t.card, borderColor: t.border },
                pressed && s.cardPressed,
              ]}
              onPress={() => navigation.navigate('SetupGridSize', { mode: 'ai', difficulty: opt.value })}
            >
              <View style={[
                s.iconCircle,
                isCalm 
                  ? { backgroundColor: t.cardAlt, borderColor: 'transparent' } 
                  : { backgroundColor: opt.color + '22', borderColor: opt.color + '44' }
              ]}>
                <Ionicons name={opt.icon} size={24} color={opt.color} />
              </View>
              <View style={s.cardInfo}>
                <Text style={[s.cardTitle, { color: t.textPrimary }]}>{opt.label}</Text>
                <Text style={[s.cardDesc,  { color: t.textSecondary }]}>{opt.desc}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={t.textSecondary} />
            </Pressable>
          </Animated.View>
        ))}
      </View>
    </SetupStepWrapper>
  );
}

const s = StyleSheet.create({
  container:   { gap: Spacing.md },
  card:        { flexDirection: 'row', alignItems: 'center', borderRadius: 20, padding: Spacing.lg, borderWidth: 1, gap: Spacing.md },
  cardPressed: { transform: [{ scale: 0.98 }], opacity: 0.9 },
  iconCircle:  { width: 52, height: 52, borderRadius: 26, justifyContent: 'center', alignItems: 'center', borderWidth: 1 },
  cardInfo:    { flex: 1 },
  cardTitle:   { fontSize: 18, fontWeight: '900', marginBottom: 4 },
  cardDesc:    { fontSize: 12 },
});
