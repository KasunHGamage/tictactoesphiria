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
  const color = glowColor ?? t.primary;

  return (
    <View
      style={[
        styles.card,
        { backgroundColor: t.card, borderColor: t.border },
        !noBorder && { borderColor: color + '55' },
        t.glow(color, 8) as any,
        style,
      ]}
    >
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 20,
    borderWidth: 1,
    padding: Spacing.md,
  },
});

export default NeonCard;
