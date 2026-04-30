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

  const borderColor =
    variant === 'primary'   ? t.primary :
    variant === 'secondary' ? t.secondary :
    t.accent;

  const bgColor = isCalm
    ? (variant === 'primary' ? t.primary : variant === 'secondary' ? t.secondary : t.accent)
    : (variant === 'primary' ? t.primary : variant === 'secondary' ? 'transparent' : '#1A0010');

  const textColor = isCalm
    ? t.textOnPrimary // in calm mode, all buttons are solid, so text should be white
    : (variant === 'secondary' ? t.secondary : variant === 'danger' ? t.accent : t.textOnPrimary);

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.base,
        { backgroundColor: bgColor, borderColor },
        t.glow(borderColor, 10) as any,
        pressed && [styles.pressed, { ...(t.glow(borderColor, 20) as any) }],
        disabled && styles.disabled,
        style,
      ]}
    >
      {/* Top shine strip — arcade only */}
      {t.mode === 'arcade' && (
        <View style={styles.shine} pointerEvents="none" />
      )}
      <Text style={[styles.text, small && styles.textSmall, { color: textColor }]}>
        {title}
      </Text>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  base: {
    borderRadius: 14,
    borderWidth: 1.5,
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
    borderTopLeftRadius: 14,
    borderTopRightRadius: 14,
  },
  pressed: {
    transform: [{ scale: 0.97 }],
    opacity: 0.9,
  },
  disabled: { opacity: 0.4 },
  text: {
    fontSize: 15,
    fontWeight: '900',
    fontFamily: Typography.fontFamily,
    letterSpacing: 1.5,
  },
  textSmall: {
    fontSize: 12,
    letterSpacing: 1,
  },
});

export default NeonButton;
