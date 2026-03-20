export type ThemeMode = 'light' | 'dark';

export interface TravelEntry {
  id: string;
  imageUri: string;
  address: string;
  latitude: number;
  longitude: number;
  createdAt: string;
}

export interface AppState {
  entries: TravelEntry[];
  themeMode: ThemeMode;
  isHydrated: boolean;
}

export interface DraftEntryState {
  photoUri: string | null;
  latitude: number | null;
  longitude: number | null;
  address: string;
  isResolvingAddress: boolean;
  isSaving: boolean;
  errorMessage: string | null;
}

export const DEFAULT_THEME_MODE: ThemeMode = 'light';

export function createInitialDraftEntryState(): DraftEntryState {
  return {
    photoUri: null,
    latitude: null,
    longitude: null,
    address: '',
    isResolvingAddress: false,
    isSaving: false,
    errorMessage: null,
  };
}
