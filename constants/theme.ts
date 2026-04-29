/**
 * Retro Neon Arcade Design System
 * Premium dark base + electric neon accents
 */

import { Platform } from 'react-native';

// ── Color Palette ──────────────────────────────────────────────────
export const Colors = {
  // Base
  bg:     '#07070D',
  card:   '#11111A',
  border: '#2B2B44',

  // Primary
  neonPurple: '#9D4EDD',
  neonPink:   '#FF2D9B',
  neonBlue:   '#00E5FF',
  neonGreen:  '#39FF14',
  neonYellow: '#FFD60A',

  // Text
  textPrimary:   '#FFFFFF',
  textSecondary: '#7878A0',

  // States
  win:  '#39FF14',
  lose: '#FF3355',

  // Aliases used across codebase
  success:    '#39FF14',
  accentGlow: '#BF7FFF',
} as const;

// ── Spacing ─────────────────────────────────────────────────────────
export const Spacing = {
  xs: 8,
  sm: 12,
  md: 16,
  lg: 20,
  xl: 28,
} as const;

// ── Typography ───────────────────────────────────────────────────────
export const Typography = {
  fontFamily: Platform.select({
    ios: 'Orbitron', android: 'Orbitron', default: 'Orbitron',
  }) as string,
  titleSize: 32,
  labelSize: 12,
  bodySize:  16,
} as const;

// ── Glow Helpers ─────────────────────────────────────────────────────
export const glow = (color: string, radius = 14) => ({
  shadowColor:   color,
  shadowOffset:  { width: 0, height: 0 },
  shadowOpacity: 0.9,
  shadowRadius:  radius,
  elevation:     12,
});

export const glowStrong = (color: string) => glow(color, 24);
export const glowSubtle = (color: string) => glow(color, 8);

// ── Text glow (textShadow for headings) ────────────────────────────
export const textGlow = (color: string) => ({
  textShadowColor:  color,
  textShadowOffset: { width: 0, height: 0 },
  textShadowRadius: 12,
});

export default { Colors, Spacing, Typography, glow, glowStrong, glowSubtle, textGlow };
