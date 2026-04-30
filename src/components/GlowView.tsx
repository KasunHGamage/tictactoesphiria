import React from 'react';
import { View, StyleSheet, ViewProps } from 'react-native';
import { useAppTheme } from '../context/ThemeContext';

const GlowView: React.FC<ViewProps & { color?: string; style?: any }> = ({
  children, color, style, ...rest
}) => {
  const t = useAppTheme();
  const glowColor = color ?? t.primary;

  return (
    <View style={[styles.base, t.glow(glowColor), style]} {...rest}>
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  base: { borderRadius: 20 },
});

export default GlowView;
