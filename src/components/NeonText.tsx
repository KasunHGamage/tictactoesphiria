import React from 'react';
import { Text, StyleSheet, TextProps } from 'react-native';
import { Colors, Typography, textGlow } from '../../constants/theme';

export const NeonTitle: React.FC<TextProps> = ({ children, style, ...rest }) => (
  <Text style={[styles.title, style]} {...rest}>{children}</Text>
);

export const NeonLabel: React.FC<TextProps> = ({ children, style, ...rest }) => (
  <Text style={[styles.label, style]} {...rest}>{children}</Text>
);

export const NeonX: React.FC<TextProps> = ({ children, style, ...rest }) => (
  <Text style={[styles.x, style]} {...rest}>{children}</Text>
);

export const NeonO: React.FC<TextProps> = ({ children, style, ...rest }) => (
  <Text style={[styles.o, style]} {...rest}>{children}</Text>
);

const styles = StyleSheet.create({
  title: {
    fontSize: Typography.titleSize,
    color: Colors.neonPurple,
    fontWeight: '900',
    letterSpacing: 1,
    fontFamily: Typography.fontFamily,
    ...(textGlow(Colors.neonPurple) as any),
  },
  label: {
    fontSize: Typography.labelSize,
    color: Colors.textSecondary,
    fontWeight: '900',
    letterSpacing: 2,
    fontFamily: Typography.fontFamily,
  },
  x: {
    color: Colors.neonPink,
    textShadowColor: Colors.neonPink,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 14,
    fontSize: 44,
    fontWeight: '900',
    fontFamily: Typography.fontFamily,
  },
  o: {
    color: Colors.neonBlue,
    textShadowColor: Colors.neonBlue,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 14,
    fontSize: 44,
    fontWeight: '900',
    fontFamily: Typography.fontFamily,
  },
});

// Default export kept for backwards compat
export default NeonTitle;
