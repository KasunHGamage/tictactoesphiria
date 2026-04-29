import React from 'react';
import { View, StyleSheet, ViewProps } from 'react-native';
import { glow } from '../../constants/theme';

const GlowView: React.FC<ViewProps & { color?: string; style?: any }> = ({ children, color = '#9D4EDD', style, ...rest }) => {
  return (
    <View style={[styles.glow, glow(color), style]} {...rest}>
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  glow: {
    borderRadius: 20,
  },
});

export default GlowView;
