import AsyncStorage from '@react-native-async-storage/async-storage';

import type { ThemeMode, TravelEntry } from '../types/app';
import { DEFAULT_THEME_MODE } from '../types/app';
import { sanitizeThemeMode, sanitizeTravelEntries } from '../utils/validation';

const STORAGE_KEYS = {
  entries: 'travel-diary.entries',
  themeMode: 'travel-diary.theme-mode',
} as const;

export async function loadEntriesFromStorage(): Promise<TravelEntry[]> {
  try {
    const rawEntries = await AsyncStorage.getItem(STORAGE_KEYS.entries);

    if (!rawEntries) {
      return [];
    }

    return sanitizeTravelEntries(JSON.parse(rawEntries));
  } catch {
    return [];
  }
}

export async function saveEntriesToStorage(
  entries: TravelEntry[]
): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEYS.entries, JSON.stringify(entries));
}

export async function loadThemeModeFromStorage(): Promise<ThemeMode> {
  try {
    const rawThemeMode = await AsyncStorage.getItem(STORAGE_KEYS.themeMode);

    if (!rawThemeMode) {
      return DEFAULT_THEME_MODE;
    }

    return sanitizeThemeMode(JSON.parse(rawThemeMode));
  } catch {
    return DEFAULT_THEME_MODE;
  }
}

export async function saveThemeModeToStorage(mode: ThemeMode): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEYS.themeMode, JSON.stringify(mode));
}
