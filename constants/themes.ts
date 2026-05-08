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
//  CALM THEME — linen white, earthy & minimal
//  Palette:
//    #FAF9F6  Background  — "Linen" warm white
//    #E5E5E5  Grid Lines  — Light gray borders
//    #333333  X Marker    — Charcoal (soft black)
//    #BC8F8F  O Marker    — Rosy Brown (muted pink-tan)
//    #D4A373  Highlight   — Muted sand (wins / active / CTA)
// ══════════════════════════════════════════════════════════════════
export const calmTheme: AppTheme = {
  mode: 'calm',

  bg:        '#FAF9F6',   // linen warm white — main background
  card:      '#FFFFFF',   // pure white cards
  cardAlt:   '#F3EDE4',   // warm oat — hero / promo card
  avatarBg:  '#F3EDE4',   // warm oat avatar background
  border:    '#E5E5E5',   // light gray — grid lines & dividers

  primary:   '#D4A373',   // sand highlight — buttons, CTAs, active
  secondary: '#BC8F8F',   // rosy brown — O marker / secondary accent
  accent:    '#333333',   // charcoal — X marker / danger
  success:   '#7A9E7E',   // soft sage green for wins
  warning:   '#D4A373',   // reuse sand as warning/highlight
  lose:      '#BC8F8F',   // rosy brown for losses
  win:       '#D4A373',   // sand for wins

  textPrimary:   '#2C2C2C',   // near-charcoal — headings & body
  textSecondary: '#888888',   // mid-gray — labels & subtitles
  textOnPrimary: '#FFFFFF',   // white on sand/rosy buttons

  tabBg:       '#FFFFFF',
  tabBorder:   '#E5E5E5',
  tabActive:   '#D4A373',
  tabInactive: '#CCCCCC',

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
