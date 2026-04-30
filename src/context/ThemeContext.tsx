// ─────────────────────────────────────────────
//  ThemeContext.tsx — Dual Arcade / Calm theme
// ─────────────────────────────────────────────

import React, {
  createContext, useContext, useEffect, useState, useRef,
} from 'react';
import { Animated } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppTheme, ThemeMode, THEMES, arcadeTheme } from '../../constants/themes';

const STORAGE_KEY = '@theme_mode';

// ── Context shape ─────────────────────────────────────────────────
interface ThemeContextValue {
  theme:      AppTheme;
  themeMode:  ThemeMode;
  toggleTheme: () => void;
  setTheme:   (mode: ThemeMode) => void;
  fadeAnim:   Animated.Value;   // 0→1, used for fade-in after switch
}

const ThemeContext = createContext<ThemeContextValue>({
  theme:      arcadeTheme,
  themeMode:  'arcade',
  toggleTheme: () => {},
  setTheme:   () => {},
  fadeAnim:   new Animated.Value(1),
});

// ── Provider ──────────────────────────────────────────────────────
export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [themeMode, setThemeMode] = useState<ThemeMode>('arcade');
  const fadeAnim = useRef(new Animated.Value(1)).current;

  // Restore persisted preference on mount
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then(stored => {
      if (stored === 'arcade' || stored === 'calm') {
        setThemeMode(stored);
      }
    });
  }, []);

  const applyTheme = (mode: ThemeMode) => {
    // Fade out → switch → fade in
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 150,
      useNativeDriver: true,
    }).start(() => {
      setThemeMode(mode);
      AsyncStorage.setItem(STORAGE_KEY, mode);
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();
    });
  };

  const toggleTheme = () =>
    applyTheme(themeMode === 'arcade' ? 'calm' : 'arcade');

  const setTheme = (mode: ThemeMode) => {
    if (mode !== themeMode) applyTheme(mode);
  };

  return (
    <ThemeContext.Provider value={{
      theme:      THEMES[themeMode],
      themeMode,
      toggleTheme,
      setTheme,
      fadeAnim,
    }}>
      {children}
    </ThemeContext.Provider>
  );
};

// ── Hooks ─────────────────────────────────────────────────────────

/** Returns the full theme object — use for colors & glow helpers */
export const useAppTheme = (): AppTheme => useContext(ThemeContext).theme;

/** Returns { themeMode, toggleTheme, setTheme, fadeAnim } */
export const useThemeControls = () => {
  const { themeMode, toggleTheme, setTheme, fadeAnim } = useContext(ThemeContext);
  return { themeMode, toggleTheme, setTheme, fadeAnim };
};
