import { Platform } from 'react-native';

import type { ThemeMode } from '../types/app';

export interface AppTheme {
  mode: ThemeMode;
  colors: {
    background: string;
    surface: string;
    surfaceMuted: string;
    paper: string;
    text: string;
    mutedText: string;
    accent: string;
    accentSoft: string;
    border: string;
    borderStrong: string;
    danger: string;
    dangerSoft: string;
    cameraFrame: string;
  };
  spacing: {
    xs: number;
    sm: number;
    md: number;
    lg: number;
    xl: number;
    xxl: number;
  };
  radius: {
    sm: number;
    md: number;
    lg: number;
    xl: number;
    pill: number;
  };
  typography: {
    display?: string;
    mono?: string;
  };
}

const displayFont = Platform.select({
  ios: 'Georgia',
  android: 'serif',
  default: undefined,
});

const monoFont = Platform.select({
  ios: 'Courier',
  android: 'monospace',
  default: undefined,
});

const sharedTheme = {
  spacing: {
    xs: 6,
    sm: 10,
    md: 16,
    lg: 20,
    xl: 28,
    xxl: 36,
  },
  radius: {
    sm: 12,
    md: 18,
    lg: 24,
    xl: 32,
    pill: 999,
  },
  typography: {
    display: displayFont,
    mono: monoFont,
  },
} satisfies Omit<AppTheme, 'mode' | 'colors'>;

const lightColors: AppTheme['colors'] = {
  background: '#F3EADB',
  surface: '#FFF9F0',
  surfaceMuted: '#F6E7CE',
  paper: '#FDF6EA',
  text: '#152339',
  mutedText: '#5E6E82',
  accent: '#A55A2A',
  accentSoft: '#E6C8AA',
  border: '#D7C6AE',
  borderStrong: '#A99374',
  danger: '#C44B4B',
  dangerSoft: '#F7D6D3',
  cameraFrame: '#1D3858',
};

const darkColors: AppTheme['colors'] = {
  background: '#030303',
  surface: '#111111',
  surfaceMuted: '#1A1A1A',
  paper: '#0A0A0A',
  text: '#F2E8D8',
  mutedText: '#B9AE9B',
  accent: '#E2A56C',
  accentSoft: '#3A2715',
  border: '#2A2A2A',
  borderStrong: '#4A4A4A',
  danger: '#F08A84',
  dangerSoft: '#3B1D1B',
  cameraFrame: '#050505',
};

export function getAppTheme(mode: ThemeMode): AppTheme {
  return {
    mode,
    colors: mode === 'dark' ? darkColors : lightColors,
    ...sharedTheme,
  };
}
