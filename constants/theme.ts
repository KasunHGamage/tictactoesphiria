/**
 * constants/theme.ts — Backwards-Compatibility Shim
 *
 * Screens that haven't been migrated to useAppTheme() still import
 * Colors / glow / textGlow from here. This shim maps the OLD property
 * names (Colors.neonPurple, etc.) back to arcade-theme values so those
 * screens keep compiling and rendering in Arcade style.
 *
 * New / migrated code imports from 'constants/themes' and calls useAppTheme().
 */

// ── Re-export shared layout tokens ────────────────────────────────
export { Typography, Spacing } from './themes';

// ── Legacy Colors object (matches the original shape exactly) ─────
export const Colors = {
  // Base
  bg:     '#07070D',
  card:   '#11111A',
  border: '#2B2B44',

  // Neon accents
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

  // Aliases
  success:    '#39FF14',
  accentGlow: '#BF7FFF',
} as const;

// ── Legacy glow helpers (Arcade-only; no-ops are handled in theme) ─
export const glow = (color: string, radius = 14) => ({
  shadowColor:   color,
  shadowOffset:  { width: 0, height: 0 },
  shadowOpacity: 0.9,
  shadowRadius:  radius,
  elevation:     12,
});

export const glowStrong = (color: string) => glow(color, 24);
export const glowSubtle = (color: string) => glow(color, 8);

export const textGlow = (color: string) => ({
  textShadowColor:  color,
  textShadowOffset: { width: 0, height: 0 },
  textShadowRadius: 12,
});

export default { Colors, glow, glowStrong, glowSubtle, textGlow };
