// ─────────────────────────────────────────────────────────────────────────────
//  Theme context — light / dark with persistence
//
//  Usage in any component:
//    import { useTheme } from '../context/ThemeContext';
//    const { colors, isDark, toggleTheme } = useTheme();
// ─────────────────────────────────────────────────────────────────────────────

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const THEME_KEY = '@cooktrack_theme';

// ── Color token type ──────────────────────────────────────────────────────────

export interface Colors {
  // Foundations
  background: string;
  surface: string;
  surfaceAlt: string;

  // Text
  text: string;
  textSecondary: string;
  textMuted: string;
  textDisabled: string;

  // Inputs
  inputBg: string;
  placeholder: string;
  border: string;
  borderLight: string;

  // Progress bars
  progressTrack: string;
  progressFill: string;

  // Primary pill button
  btnPrimary: string;
  btnPrimaryText: string;
  btnDisabled: string;
  btnDisabledText: string;

  // Inverted / dark feature card (subscription offer card, etc.)
  cardInverted: string;
  cardInvertedText: string;
  cardInvertedSub: string;
  cardInvertedDivider: string;

  // Selected option cards / chips
  cardActive: string;
  cardActiveText: string;
  cardActiveSub: string;

  // Back button circle
  backBtnBg: string;

  // Social auth buttons
  appleBtn: string;
  appleBtnText: string;
  googleBtn: string;
  googleBtnText: string;

  // Bottom tab bar
  tabBarBg: string;
  tabBarBorder: string;
  tabActive: string;
  tabInactive: string;

  // Tint backgrounds (for decorative pastel cards / badges)
  tintRed: string;
  tintGreen: string;
  tintBlue: string;
  tintYellow: string;
  tintPink: string;
  tintOrange: string;
  tintMint: string;
  tintPurple: string;
  rolloverGreenBg: string;
  rolloverGreenText: string;

  // Brand / accent — identical in both modes
  primary: string;
  primaryLight: string;
  primaryDark: string;
  secondary: string;
  secondaryLight: string;
  accent: string;
  error: string;
  success: string;
  info: string;
  carbs: string;
  protein: string;
  fat: string;
  white: string;
  black: string;
}

// ── Light theme ───────────────────────────────────────────────────────────────

export const lightColors: Colors = {
  background: '#F5F5F0',
  surface: '#FFFFFF',
  surfaceAlt: '#F0F0F0',

  text: '#111111',
  textSecondary: '#444444',
  textMuted: '#888888',
  textDisabled: '#AAAAAA',

  inputBg: '#FFFFFF',
  placeholder: '#BDBDBD',
  border: '#E5E5E5',
  borderLight: '#F0F0F0',

  progressTrack: '#E8E8E8',
  progressFill: '#111111',

  btnPrimary: '#111111',
  btnPrimaryText: '#FFFFFF',
  btnDisabled: '#CCCCCC',
  btnDisabledText: '#FFFFFF',

  cardInverted: '#111111',
  cardInvertedText: '#FFFFFF',
  cardInvertedSub: 'rgba(255,255,255,0.55)',
  cardInvertedDivider: 'rgba(255,255,255,0.1)',

  cardActive: '#111111',
  cardActiveText: '#FFFFFF',
  cardActiveSub: 'rgba(255,255,255,0.65)',

  backBtnBg: '#FFFFFF',

  appleBtn: '#111111',
  appleBtnText: '#FFFFFF',
  googleBtn: '#FFFFFF',
  googleBtnText: '#111111',

  tabBarBg: '#FFFFFF',
  tabBarBorder: '#F0F0F0',
  tabActive: '#111111',
  tabInactive: '#BBBBBB',

  tintRed: '#FFF0F0',
  tintGreen: '#F0FFF4',
  tintBlue: '#EEF4FF',
  tintYellow: '#FFF8E0',
  tintPink: '#FFF0F5',
  tintOrange: '#FFF3E8',
  tintMint: '#EDFAF3',
  tintPurple: '#F3E5F5',
  rolloverGreenBg: '#E8F5E9',
  rolloverGreenText: '#2E7D32',

  primary: '#FF6B35',
  primaryLight: '#FF8C5A',
  primaryDark: '#E05520',
  secondary: '#4CAF50',
  secondaryLight: '#81C784',
  accent: '#FFB300',
  error: '#EF4444',
  success: '#22C55E',
  info: '#3B82F6',
  carbs: '#F59E0B',
  protein: '#3B82F6',
  fat: '#EC4899',
  white: '#FFFFFF',
  black: '#000000',
};

// ── Dark theme ────────────────────────────────────────────────────────────────

export const darkColors: Colors = {
  background: '#0A0A0A',
  surface: '#1A1A1A',
  surfaceAlt: '#252525',

  text: '#F2F2F2',
  textSecondary: '#B0B0B0',
  textMuted: '#6E6E6E',
  textDisabled: '#555555',

  inputBg: '#1E1E1E',
  placeholder: '#4A4A4A',
  border: '#2C2C2E',
  borderLight: '#2C2C2E',

  progressTrack: '#2C2C2E',
  progressFill: '#FFFFFF',

  btnPrimary: '#FFFFFF',
  btnPrimaryText: '#111111',
  btnDisabled: '#2A2A2A',
  btnDisabledText: '#555555',

  cardInverted: '#1C1C1E',
  cardInvertedText: '#FFFFFF',
  cardInvertedSub: 'rgba(255,255,255,0.55)',
  cardInvertedDivider: 'rgba(255,255,255,0.1)',

  cardActive: '#FFFFFF',
  cardActiveText: '#111111',
  cardActiveSub: 'rgba(0,0,0,0.55)',

  backBtnBg: '#1E1E1E',

  appleBtn: '#FFFFFF',
  appleBtnText: '#111111',
  googleBtn: '#1E1E1E',
  googleBtnText: '#F2F2F2',

  tabBarBg: '#111111',
  tabBarBorder: '#1E1E1E',
  tabActive: '#FFFFFF',
  tabInactive: '#555555',

  tintRed: 'rgba(239,68,68,0.12)',
  tintGreen: 'rgba(34,197,94,0.12)',
  tintBlue: 'rgba(59,130,246,0.12)',
  tintYellow: 'rgba(245,158,11,0.12)',
  tintPink: 'rgba(236,72,153,0.12)',
  tintOrange: 'rgba(255,107,53,0.12)',
  tintMint: 'rgba(52,211,153,0.12)',
  tintPurple: 'rgba(167,139,250,0.12)',
  rolloverGreenBg: 'rgba(34,197,94,0.12)',
  rolloverGreenText: '#4CAF50',

  primary: '#FF6B35',
  primaryLight: '#FF8C5A',
  primaryDark: '#E05520',
  secondary: '#4CAF50',
  secondaryLight: '#81C784',
  accent: '#FFB300',
  error: '#EF4444',
  success: '#22C55E',
  info: '#3B82F6',
  carbs: '#F59E0B',
  protein: '#3B82F6',
  fat: '#EC4899',
  white: '#FFFFFF',
  black: '#000000',
};

// ── Context ───────────────────────────────────────────────────────────────────

type ThemeMode = 'light' | 'dark';

interface ThemeContextValue {
  colors: Colors;
  isDark: boolean;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  colors: lightColors,
  isDark: false,
  toggleTheme: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useColorScheme();
  // null = not yet loaded from storage
  const [userTheme, setUserTheme] = useState<ThemeMode | null>(null);
  const [loaded, setLoaded] = useState(false);

  // Load persisted preference on mount
  useEffect(() => {
    AsyncStorage.getItem(THEME_KEY).then((stored) => {
      if (stored === 'light' || stored === 'dark') {
        setUserTheme(stored);
      }
      setLoaded(true);
    });
  }, []);

  // Determine active theme: user choice > system
  const isDark = loaded
    ? (userTheme !== null ? userTheme === 'dark' : systemScheme === 'dark')
    : systemScheme === 'dark';

  const colors = isDark ? darkColors : lightColors;

  const toggleTheme = useCallback(() => {
    const next: ThemeMode = isDark ? 'light' : 'dark';
    setUserTheme(next);
    AsyncStorage.setItem(THEME_KEY, next);
  }, [isDark]);

  return (
    <ThemeContext.Provider value={{ colors, isDark, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
