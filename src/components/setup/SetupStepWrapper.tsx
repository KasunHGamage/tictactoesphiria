import React from 'react';
import { StyleSheet, Text, View, Pressable, StatusBar } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ScreenWrapper from '../ScreenWrapper';
import { Colors, Spacing, textGlow } from '../../../constants/theme';
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
  title,
  subtitle,
  currentStep,
  totalSteps,
  onBack,
  accentColor = Colors.neonPurple,
  children
}: Props) {
  const progress = (currentStep / totalSteps) * 100;

  return (
    <ScreenWrapper horizontalPadding={0}>
      <StatusBar barStyle="light-content" />
      
      {/* Header */}
      <View style={s.header}>
        <Pressable onPress={onBack} style={s.backBtn}>
          <Ionicons name="chevron-back" size={24} color={Colors.textPrimary} />
        </Pressable>
        <View style={s.progressContainer}>
          <View style={s.progressBarBg}>
            <Animated.View 
              entering={FadeIn.delay(200)}
              style={[s.progressBarFill, { width: `${progress}%`, backgroundColor: accentColor }]} 
            />
          </View>
          <Text style={s.stepText}>STEP {currentStep} OF {totalSteps}</Text>
        </View>
        <View style={{ width: 48 }} />
      </View>

      <View style={s.content}>
        <View style={s.titleSection}>
          <Text style={[s.title, textGlow(accentColor) as any]}>{title}</Text>
          <Text style={s.subtitle}>{subtitle}</Text>
        </View>

        {children}
      </View>
    </ScreenWrapper>
  );
}

const s = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    marginTop: Spacing.sm,
    marginBottom: Spacing.xl,
  },
  backBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.card,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  progressContainer: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
  },
  progressBarBg: {
    width: '100%',
    height: 6,
    backgroundColor: Colors.card,
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  stepText: {
    fontSize: 10,
    fontWeight: '900',
    color: Colors.textSecondary,
    letterSpacing: 2,
  },
  content: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
  },
  titleSection: {
    marginBottom: Spacing.xl * 1.5,
  },
  title: {
    fontSize: 28,
    fontWeight: '900',
    color: Colors.textPrimary,
    marginBottom: 8,
    letterSpacing: 1,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
});
