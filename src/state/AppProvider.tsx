import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  type PropsWithChildren,
} from 'react';

import { deleteSavedPhotoAsync } from '../services/files';
import {
  loadEntriesFromStorage,
  loadThemeModeFromStorage,
  saveEntriesToStorage,
  saveThemeModeToStorage,
} from '../services/storage';
import { getAppTheme, type AppTheme } from '../theme';
import type { AppState, ThemeMode, TravelEntry } from '../types/app';
import { DEFAULT_THEME_MODE } from '../types/app';

type AppAction =
  | {
      type: 'hydrate';
      payload: {
        entries: TravelEntry[];
        themeMode: ThemeMode;
      };
    }
  | {
      type: 'addEntry';
      payload: TravelEntry;
    }
  | {
      type: 'removeEntry';
      payload: string;
    }
  | {
      type: 'toggleTheme';
    };

interface AppContextValue {
  state: AppState;
  addEntry: (entry: TravelEntry) => Promise<void>;
  removeEntry: (entryId: string, imageUri: string) => Promise<void>;
  toggleTheme: () => Promise<void>;
}

const initialState: AppState = {
  entries: [],
  themeMode: DEFAULT_THEME_MODE,
  isHydrated: false,
};

function sortEntries(entries: TravelEntry[]): TravelEntry[] {
  return [...entries].sort(
    (left, right) =>
      new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime()
  );
}

function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'hydrate':
      return {
        entries: sortEntries(action.payload.entries),
        themeMode: action.payload.themeMode,
        isHydrated: true,
      };
    case 'addEntry':
      return {
        ...state,
        entries: sortEntries([action.payload, ...state.entries]),
      };
    case 'removeEntry':
      return {
        ...state,
        entries: state.entries.filter((entry) => entry.id !== action.payload),
      };
    case 'toggleTheme':
      return {
        ...state,
        themeMode: state.themeMode === 'light' ? 'dark' : 'light',
      };
    default:
      return state;
  }
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: PropsWithChildren) {
  const [state, dispatch] = useReducer(appReducer, initialState);

  useEffect(() => {
    let isMounted = true;

    async function hydrateAppAsync() {
      const [entries, themeMode] = await Promise.all([
        loadEntriesFromStorage(),
        loadThemeModeFromStorage(),
      ]);

      if (!isMounted) {
        return;
      }

      dispatch({
        type: 'hydrate',
        payload: {
          entries,
          themeMode,
        },
      });
    }

    void hydrateAppAsync();

    return () => {
      isMounted = false;
    };
  }, []);

  const addEntry = useCallback(
    async (entry: TravelEntry) => {
      const nextEntries = sortEntries([entry, ...state.entries]);

      await saveEntriesToStorage(nextEntries);
      dispatch({ type: 'addEntry', payload: entry });
    },
    [state.entries]
  );

  const removeEntry = useCallback(
    async (entryId: string, imageUri: string) => {
      const nextEntries = state.entries.filter((entry) => entry.id !== entryId);

      await saveEntriesToStorage(nextEntries);
      dispatch({ type: 'removeEntry', payload: entryId });

      try {
        await deleteSavedPhotoAsync(imageUri);
      } catch {
        // Best-effort cleanup only. The saved list should still be updated.
      }
    },
    [state.entries]
  );

  const toggleTheme = useCallback(async () => {
    const nextThemeMode = state.themeMode === 'light' ? 'dark' : 'light';

    await saveThemeModeToStorage(nextThemeMode);
    dispatch({ type: 'toggleTheme' });
  }, [state.themeMode]);

  const value = useMemo(
    () => ({
      state,
      addEntry,
      removeEntry,
      toggleTheme,
    }),
    [addEntry, removeEntry, state, toggleTheme]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useAppContext(): AppContextValue {
  const context = useContext(AppContext);

  if (!context) {
    throw new Error('useAppContext must be used inside an AppProvider.');
  }

  return context;
}

export function useAppTheme(): AppTheme {
  const {
    state: { themeMode },
  } = useAppContext();

  return getAppTheme(themeMode);
}
