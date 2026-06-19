import React from 'react';
import { Text, StyleSheet, TextProps } from 'react-native';
import { useAppTheme } from '../context/ThemeContext';
import { Typography } from '../../constants/themes';

export const NeonTitle: React.FC<TextProps> = ({ children, style, ...rest }) => {
  const t = useAppTheme();
  return (
    <Text
      style={[
        styles.titleBase,
        { color: t.primary, ...(t.textGlow(t.primary) as any) },
        style,
      ]}
      {...rest}
    >
      {children}
    </Text>
  );
};

export const NeonLabel: React.FC<TextProps> = ({ children, style, ...rest }) => {
  const t = useAppTheme();
  return (
    <Text
      style={[styles.labelBase, { color: t.textSecondary }, style]}
      {...rest}
    >
      {children}
    </Text>
  );
};

export const NeonX: React.FC<TextProps> = ({ children, style, ...rest }) => {
  const t = useAppTheme();
  return (
    <Text
      style={[
        styles.piece,
        {
          color: t.accent,
          textShadowColor: 'transparent',
          textShadowOffset: { width: 0, height: 0 },
          textShadowRadius: 0,
        },
        style,
      ]}
      {...rest}
    >
      {children}
    </Text>
  );
};

export const NeonO: React.FC<TextProps> = ({ children, style, ...rest }) => {
  const t = useAppTheme();
  return (
    <Text
      style={[
        styles.piece,
        {
          color: t.secondary,
          textShadowColor: 'transparent',
          textShadowOffset: { width: 0, height: 0 },
          textShadowRadius: 0,
        },
        style,
      ]}
      {...rest}
    >
      {children}
    </Text>
  );
};

const styles = StyleSheet.create({
  titleBase: {
    fontSize: Typography.titleSize,
    fontWeight: '900',
    letterSpacing: 1,
    fontFamily: Typography.fontFamily,
  },
  labelBase: {
    fontSize: Typography.labelSize,
    fontWeight: '900',
    letterSpacing: 2,
    fontFamily: Typography.fontFamily,
  },
  piece: {
    fontSize: 44,
    fontWeight: '900',
    fontFamily: Typography.fontFamily,
  },
});

// Default export kept for backwards compat
export default NeonTitle;
