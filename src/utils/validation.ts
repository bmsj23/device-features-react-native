import type { ThemeMode, TravelEntry } from '../types/app';

type UnknownRecord = Record<string, unknown>;

export function isThemeMode(value: unknown): value is ThemeMode {
  return value === 'light' || value === 'dark';
}

export function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function isTravelEntryRecord(value: unknown): value is UnknownRecord {
  return typeof value === 'object' && value !== null;
}

export function isTravelEntry(value: unknown): value is TravelEntry {
  if (!isTravelEntryRecord(value)) {
    return false;
  }

  return (
    isNonEmptyString(value.id) &&
    isNonEmptyString(value.imageUri) &&
    isNonEmptyString(value.address) &&
    isFiniteNumber(value.latitude) &&
    isFiniteNumber(value.longitude) &&
    isNonEmptyString(value.createdAt)
  );
}

export function sanitizeTravelEntries(value: unknown): TravelEntry[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter(isTravelEntry)
    .sort(
      (left, right) =>
        new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime()
    );
}

export function sanitizeThemeMode(value: unknown): ThemeMode {
  return isThemeMode(value) ? value : 'light';
}

export function hasResolvedAddress(address: string): boolean {
  return address.trim().length > 0;
}
