import React from 'react';
import { Pressable, Text, StyleSheet, View } from 'react-native';
import { useAppTheme } from '../context/ThemeContext';
import { Spacing, Typography } from '../../constants/themes';

interface Props {
  title: string;
  onPress?: () => void;
  variant?: 'primary' | 'secondary' | 'danger';
  disabled?: boolean;
  style?: any;
  small?: boolean;
}

const NeonButton: React.FC<Props> = ({
  title, onPress, variant = 'primary', disabled, style, small,
}) => {
  const t = useAppTheme();
  const isCalm = t.mode === 'calm';

  // Premium color determination
  const getPremiumColors = () => {
    if (variant === 'primary') {
      return { bg: t.primary, text: t.textOnPrimary, border: t.primary };
    } else if (variant === 'secondary') {
      return { bg: 'transparent', text: t.secondary, border: t.secondary };
    } else {
      return { bg: t.accent, text: t.textOnPrimary, border: t.accent };
    }
  };

  const { bg, text, border } = getPremiumColors();

  // For calm theme: use premium soft shadows, thin borders
  // For arcade: keep glow effects
  const shadowStyle = isCalm
    ? (t.shadowElevation('md') as any)
    : (t.glow(border, 10) as any);

  const pressedShadowStyle = isCalm
    ? (t.shadowElevation('sm') as any)
    : (t.glow(border, 20) as any);

  const borderColor = isCalm ? 'rgba(200,155,109,0.2)' : border;
  const borderWidth = isCalm ? 0.8 : 1.5;

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.base,
        {
          backgroundColor: bg,
          borderColor,
          borderWidth,
        },
        shadowStyle,
        pressed && [styles.pressed, pressedShadowStyle],
        disabled && styles.disabled,
        style,
      ]}
    >
      {/* Top shine strip — arcade only */}
      {t.mode === 'arcade' && (
        <View style={styles.shine} pointerEvents="none" />
      )}
      <Text
        style={[
          styles.text,
          small && styles.textSmall,
          { color: text, fontWeight: Typography.semibold as any },
        ]}
      >
        {title}
      </Text>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  base: {
    borderRadius: 12,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  shine: {
    position: 'absolute',
    top: 0, left: 0, right: 0,
    height: '45%',
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  pressed: {
    transform: [{ scale: 0.97 }],
    opacity: 0.85,
  },
  disabled: { opacity: 0.4 },
  text: {
    fontSize: 15,
    fontFamily: Typography.fontFamily,
    letterSpacing: 0.3,
  },
  textSmall: {
    fontSize: 12,
    letterSpacing: 0.2,
  },
});

export default NeonButton;
