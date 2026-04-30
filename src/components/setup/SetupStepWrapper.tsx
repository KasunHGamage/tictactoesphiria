import React from 'react';
import { StyleSheet, Text, View, Pressable, StatusBar } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ScreenWrapper from '../ScreenWrapper';
import { useAppTheme } from '../../context/ThemeContext';
import { Spacing } from '../../../constants/themes';
import Animated, { FadeIn } from 'react-native-reanimated';

interface Props {
  title: string;
  subtitle: string;
  currentStep: number;
  totalSteps: number;
  onBack: () => void;
  accentColor?: string;
  children: React.ReactNode;
}

export default function SetupStepWrapper({
  title, subtitle, currentStep, totalSteps, onBack, accentColor, children,
}: Props) {
  const t       = useAppTheme();
  const accent  = accentColor ?? t.primary;
  const isCalm  = t.mode === 'calm';
  const progress = (currentStep / totalSteps) * 100;

  return (
    <ScreenWrapper horizontalPadding={0}>
      <StatusBar barStyle={isCalm ? 'dark-content' : 'light-content'} />

      {/* Header */}
      <View style={s.header}>
        <Pressable
          onPress={onBack}
          style={[s.backBtn, { backgroundColor: t.card, borderColor: t.border }]}
        >
          <Ionicons name="chevron-back" size={24} color={t.textPrimary} />
        </Pressable>

        <View style={s.progressContainer}>
          <View style={[s.progressBg, { backgroundColor: t.card, borderColor: t.border }]}>
            <Animated.View
              entering={FadeIn.delay(200)}
              style={[s.progressFill, { width: `${progress}%`, backgroundColor: accent }]}
            />
          </View>
          <Text style={[s.stepText, { color: t.textSecondary }]}>
            STEP {currentStep} OF {totalSteps}
          </Text>
        </View>

        <View style={{ width: 48 }} />
      </View>

      <View style={s.content}>
        <View style={s.titleSection}>
          <Text style={[s.title, { color: t.textPrimary, ...(t.textGlow(accent) as any) }]}>
            {title}
          </Text>
          <Text style={[s.subtitle, { color: t.textSecondary }]}>{subtitle}</Text>
        </View>
        {children}
      </View>
    </ScreenWrapper>
  );
}

const s = StyleSheet.create({
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.md, marginTop: Spacing.sm, marginBottom: Spacing.xl,
  },
  backBtn: {
    width: 48, height: 48, borderRadius: 24,
    justifyContent: 'center', alignItems: 'center', borderWidth: 1,
  },
  progressContainer: { flex: 1, alignItems: 'center', paddingHorizontal: Spacing.lg },
  progressBg:   { width: '100%', height: 6, borderRadius: 3, overflow: 'hidden', marginBottom: 8, borderWidth: 1 },
  progressFill: { height: '100%', borderRadius: 3 },
  stepText:     { fontSize: 10, fontWeight: '900', letterSpacing: 2 },

  content:      { flex: 1, paddingHorizontal: Spacing.lg },
  titleSection: { marginBottom: Spacing.xl * 1.5 },
  title:    { fontSize: 28, fontWeight: '900', marginBottom: 8, letterSpacing: 1 },
  subtitle: { fontSize: 14, lineHeight: 20 },
});
