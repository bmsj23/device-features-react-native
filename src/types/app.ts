export type ThemeMode = 'light' | 'dark';
export type DraftImageSource = 'camera' | 'gallery' | null;
export type DraftLocationStrategy =
  | 'current-device'
  | 'gallery-metadata'
  | 'location-unavailable'
  | null;

export interface TravelEntry {
  id: string;
  imageUri: string;
  address: string;
  latitude: number | null;
  longitude: number | null;
  createdAt: string;
}

export interface AppState {
  entries: TravelEntry[];
  themeMode: ThemeMode;
  isHydrated: boolean;
}

export interface DraftEntryState {
  photoUri: string | null;
  photoSource: DraftImageSource;
  selectedAssetId: string | null;
  latitude: number | null;
  longitude: number | null;
  address: string;
  locationStrategy: DraftLocationStrategy;
  requiresGalleryLocationChoice: boolean;
  isResolvingAddress: boolean;
  isSaving: boolean;
  errorMessage: string | null;
}

export const DEFAULT_THEME_MODE: ThemeMode = 'light';

export function createInitialDraftEntryState(): DraftEntryState {
  return {
    photoUri: null,
    photoSource: null,
    selectedAssetId: null,
    latitude: null,
    longitude: null,
    address: '',
    locationStrategy: null,
    requiresGalleryLocationChoice: false,
    isResolvingAddress: false,
    isSaving: false,
    errorMessage: null,
  };
}
