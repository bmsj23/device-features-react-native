import {
  DarkTheme as NavigationDarkTheme,
  DefaultTheme as NavigationDefaultTheme,
  type Theme as NavigationTheme,
} from '@react-navigation/native';

import type { AppTheme } from './tokens';

export { getAppTheme, type AppTheme } from './tokens';

export function createNavigationTheme(theme: AppTheme): NavigationTheme {
  const baseTheme =
    theme.mode === 'dark' ? NavigationDarkTheme : NavigationDefaultTheme;

  return {
    ...baseTheme,
    colors: {
      ...baseTheme.colors,
      background: theme.colors.background,
      card: theme.colors.surface,
      text: theme.colors.text,
      border: theme.colors.border,
      primary: theme.colors.accent,
      notification: theme.colors.accent,
    },
  };
}
