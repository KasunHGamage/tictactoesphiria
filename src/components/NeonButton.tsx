import React from 'react';
import { Pressable, Text, StyleSheet, View } from 'react-native';
import { Colors, Spacing, Typography, glow } from '../../constants/theme';

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
  const borderColor =
    variant === 'primary'   ? Colors.neonPurple :
    variant === 'secondary' ? Colors.neonBlue :
    Colors.lose;

  const bgColor =
    variant === 'primary'   ? Colors.neonPurple :
    variant === 'secondary' ? 'transparent' :
    '#1A0010';

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.base,
        small && styles.small,
        { backgroundColor: bgColor, borderColor },
        pressed && [styles.pressed, { ...(glow(borderColor, 20) as any) }],
        disabled && styles.disabled,
        style,
      ]}
    >
      {/* Top shine strip */}
      <View style={styles.shine} pointerEvents="none" />
      <Text
        style={[
          styles.text,
          small && styles.textSmall,
          variant === 'secondary' && { color: Colors.neonBlue },
          variant === 'danger'    && { color: Colors.lose },
        ]}
      >
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
    ...glow(Colors.neonPurple, 10),
  },
  small: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: 10,
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
    color: Colors.textPrimary,
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
