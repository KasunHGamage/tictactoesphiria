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

  // ── Premium shadow tokens ─────────────────────
  shadowElevation: (level: 'sm' | 'md' | 'lg') => object;
  premiumBorder: string;  // thin elegant borders

  // ── Glow helpers (no-ops in Calm) ─────────────
  glow: (color: string, radius?: number) => object;
  glowStrong: (color: string) => object;
  glowSubtle: (color: string) => object;
  textGlow: (color: string) => object;
}

// ── Shared typography ──────────────────────────────────────────────
export const Typography = {
  fontFamily: Platform.select({
    ios: '-apple-system', android: 'System', default: 'System',
  }) as string,
  titleSize: 32,
  labelSize: 12,
  bodySize:  16,
  // Premium weights for hierarchy
  thin: '300',
  regular: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
};

// ── Spacing (shared across themes) ────────────────────────────────
export const Spacing = {
  xs: 8,
  sm: 12,
  md: 16,
  lg: 20,
  xl: 28,
  xxl: 40,
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

// Premium shadow system for calm theme
const makePremiumShadow = (level: 'sm' | 'md' | 'lg') => {
  const config = {
    sm: { shadowRadius: 4, shadowOpacity: 0.06, elevation: 2 },
    md: { shadowRadius: 12, shadowOpacity: 0.08, elevation: 4 },
    lg: { shadowRadius: 20, shadowOpacity: 0.1, elevation: 8 },
  };
  const c = config[level];
  return {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: level === 'sm' ? 1 : level === 'md' ? 2 : 4 },
    shadowRadius: c.shadowRadius,
    shadowOpacity: c.shadowOpacity,
    elevation: c.elevation,
  };
};

// ══════════════════════════════════════════════════════════════════
//  ARCADE THEME — energetic neon, dark base
// ══════════════════════════════════════════════════════════════════
export const arcadeTheme: AppTheme = {
  mode: 'arcade',

  bg:        '#07070D',
  card:      '#11111A',
  cardAlt:   '#161622',
  avatarBg:  '#161622',
  border:    'rgba(168,85,247,0.35)',

  primary:   '#A855F7',
  secondary: '#C084FC',
  accent:    '#F472B6',
  success:   '#34D399',
  warning:   '#FBBF24',
  lose:      '#F87171',
  win:       '#34D399',

  textPrimary:   '#FFFFFF',
  textSecondary: '#94A3B8',
  textOnPrimary: '#FFFFFF',

  tabBg:       '#080812',
  tabBorder:   'rgba(168,85,247,0.20)',
  tabActive:   '#A855F7',
  tabInactive: '#475569',

  premiumBorder: 'rgba(168,85,247,0.35)',
  shadowElevation: () => ({}),  // No-op for arcade

  glow:       noGlow,
  glowStrong: noGlow,
  glowSubtle: noGlow,
  textGlow:   noTextGlow,
};

// ══════════════════════════════════════════════════════════════════
//  CALM THEME — Premium luxury aesthetic inspired by Apple, Linear, Notion
//  Palette (premium warm neutrals):
//    #F5F1EA  Background  — Soft warm beige
//    #FFFDFC  Cards       — Luxurious off-white
//    #1E1E1E  Text        — Rich almost-black
//    #7B7B7B  Secondary   — Soft mid-tone gray
//    rgba(200,155,109,0.35)  Borders — Subtle warm brown
//    #C89B6D  Primary     — Premium accent gold
//    #6FA3FF  Blue        — Muted sophisticated blue
//    #7FA37C  Green       — Soft sage green
//    #C89A9A  Red         — Soft dusty rose
// ══════════════════════════════════════════════════════════════════
export const calmTheme: AppTheme = {
  mode: 'calm',

  bg:        '#F5F1EA',   // soft warm beige — main background
  card:      '#FFFDFC',   // luxurious off-white cards
  cardAlt:   '#FAF8F5',   // warmer off-white — hero / promo
  avatarBg:  '#FAF8F5',   // warmer off-white avatar background
  border:    'rgba(200,155,109,0.35)',  // subtle warm brown border

  primary:   '#C89B6D',   // premium accent gold — CTAs, active states
  secondary: '#6FA3FF',   // muted sophisticated blue — accents
  accent:    '#C89A9A',   // soft dusty rose — alerts / accents
  success:   '#7FA37C',   // soft sage green for wins
  warning:   '#C89B6D',   // gold as warning/highlight
  lose:      '#C89A9A',   // soft rose for losses
  win:       '#7FA37C',   // sage green for wins

  textPrimary:   '#1E1E1E',   // rich almost-black — headings & body
  textSecondary: '#7B7B7B',   // soft mid-gray — labels & subtitles
  textOnPrimary: '#FFFFFF',   // white text on colored buttons

  tabBg:       '#FFFDFC',
  tabBorder:   'rgba(200,155,109,0.2)',     // very subtle border
  tabActive:   '#C89B6D',    // gold for active tab
  tabInactive: '#A8A8A8',    // muted gray for inactive

  premiumBorder: 'rgba(200,155,109,0.35)',  // thin elegant borders

  shadowElevation: makePremiumShadow,

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
