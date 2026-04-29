import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Colors, Spacing, glow } from '../../constants/theme';

interface Props {
  children?: React.ReactNode;
  style?: any;
  glowColor?: string;
  noBorder?: boolean;
}

const NeonCard: React.FC<Props> = ({
  children, style, glowColor = Colors.neonPurple, noBorder = false,
}) => {
  return (
    <View
      style={[
        styles.card,
        !noBorder && { borderColor: glowColor + '55' },
        glow(glowColor, 8) as any,
        style,
      ]}
    >
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.card,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.md,
  },
});

export default NeonCard;
