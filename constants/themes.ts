/**
 * Dual Theme System — Arcade + Calm
 *
 * Each theme bundles:
 *  - All semantic color tokens
 *  - glow / textGlow helpers (no-ops in Calm)
 *  - Per-theme navigation bar colors
 */

import { Platform } from 'react-native';

export type ThemeMode = 'arcade' | 'calm';

export interface AppTheme {
  mode: ThemeMode;

  // ── Base surfaces ─────────────────────────────
  bg: string;
  card: string;
  cardAlt: string;   // hero / promo card background
  avatarBg: string;
  border: string;

  // ── Brand / accents ───────────────────────────
  primary: string;   // main CTA colour
  secondary: string; // alt accent
  accent: string;    // danger / love / pink
  success: string;
  warning: string;
  lose: string;
  win: string;

  // ── Text ──────────────────────────────────────
  textPrimary: string;
  textSecondary: string;
  textOnPrimary: string;   // text ON a primary-coloured surface

  // ── Tab bar ───────────────────────────────────
  tabBg: string;
  tabBorder: string;
  tabActive: string;
  tabInactive: string;

  // ── Glow helpers (no-ops in Calm) ─────────────
  glow: (color: string, radius?: number) => object;
  glowStrong: (color: string) => object;
  glowSubtle: (color: string) => object;
  textGlow: (color: string) => object;
}

// ── Shared typography ──────────────────────────────────────────────
export const Typography = {
  fontFamily: Platform.select({
    ios: 'Orbitron', android: 'Orbitron', default: 'Orbitron',
  }) as string,
  titleSize: 32,
  labelSize: 12,
  bodySize:  16,
};

// ── Spacing (shared across themes) ────────────────────────────────
export const Spacing = {
  xs: 8,
  sm: 12,
  md: 16,
  lg: 20,
  xl: 28,
};

// ── Helpers ───────────────────────────────────────────────────────
const makeGlow = (color: string, radius = 14) => ({
  shadowColor:   color,
  shadowOffset:  { width: 0, height: 0 },
  shadowOpacity: 0.9,
  shadowRadius:  radius,
  elevation:     12,
});

const makeTextGlow = (color: string) => ({
  textShadowColor:  color,
  textShadowOffset: { width: 0, height: 0 },
  textShadowRadius: 12,
});

const noGlow = () => ({});
const noTextGlow = () => ({});

// ══════════════════════════════════════════════════════════════════
//  ARCADE THEME — energetic neon, dark base
// ══════════════════════════════════════════════════════════════════
export const arcadeTheme: AppTheme = {
  mode: 'arcade',

  bg:        '#07070D',
  card:      '#11111A',
  cardAlt:   '#1A0B2E',
  avatarBg:  '#1A0B2E',
  border:    '#2B2B44',

  primary:   '#9D4EDD',
  secondary: '#00E5FF',
  accent:    '#FF2D9B',
  success:   '#39FF14',
  warning:   '#FFD60A',
  lose:      '#FF3355',
  win:       '#39FF14',

  textPrimary:   '#FFFFFF',
  textSecondary: '#7878A0',
  textOnPrimary: '#FFFFFF',

  tabBg:       '#0A0A14',
  tabBorder:   '#2B2B44',
  tabActive:   '#9D4EDD',
  tabInactive: '#3A3A5C',

  glow:       makeGlow,
  glowStrong: (c) => makeGlow(c, 24),
  glowSubtle: (c) => makeGlow(c, 8),
  textGlow:   makeTextGlow,
};

// ══════════════════════════════════════════════════════════════════
//  CALM THEME — clean, soft, premium, no neon
// ══════════════════════════════════════════════════════════════════
export const calmTheme: AppTheme = {
  mode: 'calm',

  bg:        '#F5F7FB',
  card:      '#FFFFFF',
  cardAlt:   '#EEF2FF',
  avatarBg:  '#EEF2FF',
  border:    '#E5E7EB',

  primary:   '#6366F1',   // requested solid primary
  secondary: '#374151',   // requested solid secondary
  accent:    '#DC2626',   // requested solid danger
  success:   '#3A9A5C',   // forest green
  warning:   '#C89A20',   // warm gold
  lose:      '#DC2626',
  win:       '#3A9A5C',

  textPrimary:   '#111827',
  textSecondary: '#6B7280',
  textOnPrimary: '#FFFFFF',

  tabBg:       '#FFFFFF',
  tabBorder:   '#E2DFDA',
  tabActive:   '#6D5ACD',
  tabInactive: '#BBBBCC',

  // No glow in Calm — return empty objects
  glow:       noGlow,
  glowStrong: noGlow,
  glowSubtle: noGlow,
  textGlow:   noTextGlow,
};

export const THEMES: Record<ThemeMode, AppTheme> = {
  arcade: arcadeTheme,
  calm:   calmTheme,
};
