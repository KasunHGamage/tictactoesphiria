import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useAppTheme } from '../context/ThemeContext';
import { Spacing } from '../../constants/themes';

interface Props {
  children?: React.ReactNode;
  style?: any;
  glowColor?: string;
  noBorder?: boolean;
}

const NeonCard: React.FC<Props> = ({
  children, style, glowColor, noBorder = false,
}) => {
  const t = useAppTheme();
  const isCalm = t.mode === 'calm';
  const color = glowColor ?? t.primary;

  const cardStyle = isCalm
    ? [
        styles.card,
        { backgroundColor: t.card },
        { borderColor: t.premiumBorder },
        t.shadowElevation('md') as any,
        style,
      ]
    : [
        styles.card,
        { backgroundColor: t.card, borderColor: t.border },
        !noBorder && { borderColor: color + '55' },
        t.glow(color, 8) as any,
        style,
      ];

  return (
    <View style={cardStyle}>
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    borderWidth: 0.8,
    padding: Spacing.md,
  },
});

export default NeonCard;
