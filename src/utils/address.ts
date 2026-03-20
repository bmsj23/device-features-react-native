import type { LocationGeocodedAddress } from 'expo-location';

type Coordinates = {
  latitude: number;
  longitude: number;
};

function normalizeSegment(value: string | null | undefined): string | null {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmedValue = value.trim();
  return trimmedValue.length > 0 ? trimmedValue : null;
}

function uniqueSegments(values: Array<string | null | undefined>): string[] {
  const seenValues = new Set<string>();

  return values.reduce<string[]>((segments, value) => {
    const normalizedValue = normalizeSegment(value);

    if (!normalizedValue) {
      return segments;
    }

    const key = normalizedValue.toLowerCase();

    if (seenValues.has(key)) {
      return segments;
    }

    seenValues.add(key);
    segments.push(normalizedValue);
    return segments;
  }, []);
}

export function buildAddressFromGeocodeResult(
  places: LocationGeocodedAddress[]
): string {
  const firstMatch = places[0];

  if (!firstMatch) {
    return '';
  }

  const formattedAddress = normalizeSegment(firstMatch.formattedAddress);

  if (formattedAddress && formattedAddress.length >= 8) {
    return formattedAddress;
  }

  const streetLine = uniqueSegments([
    [firstMatch.streetNumber, firstMatch.street].filter(Boolean).join(' '),
    firstMatch.name,
  ]);
  const localityLine = uniqueSegments([
    firstMatch.district,
    firstMatch.city,
    firstMatch.subregion,
    firstMatch.region,
    firstMatch.country,
  ]);
  const combined = uniqueSegments([...streetLine, ...localityLine]);

  return combined.length >= 2 ? combined.join(', ') : '';
}

export function isValidCoordinatePair(value: unknown): value is Coordinates {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const candidate = value as Partial<Coordinates>;

  return (
    typeof candidate.latitude === 'number' &&
    Number.isFinite(candidate.latitude) &&
    candidate.latitude >= -90 &&
    candidate.latitude <= 90 &&
    typeof candidate.longitude === 'number' &&
    Number.isFinite(candidate.longitude) &&
    candidate.longitude >= -180 &&
    candidate.longitude <= 180 &&
    !(candidate.latitude === 0 && candidate.longitude === 0)
  );
}

function parseRationalComponent(value: string): number | null {
  const trimmedValue = value.trim();

  if (!trimmedValue) {
    return null;
  }

  const rationalMatch = trimmedValue.match(
    /^(-?\d+(?:\.\d+)?)\/(-?\d+(?:\.\d+)?)$/
  );

  if (rationalMatch) {
    const numerator = Number(rationalMatch[1]);
    const denominator = Number(rationalMatch[2]);

    if (
      !Number.isFinite(numerator) ||
      !Number.isFinite(denominator) ||
      denominator === 0
    ) {
      return null;
    }

    return numerator / denominator;
  }

  const directNumeric = Number(trimmedValue);

  if (Number.isFinite(directNumeric)) {
    return directNumeric;
  }

  const decimalCommaMatch = trimmedValue.match(/^(-?\d+),(\d+)$/);

  if (decimalCommaMatch) {
    const commaNumeric = Number(
      `${decimalCommaMatch[1]}.${decimalCommaMatch[2]}`
    );

    return Number.isFinite(commaNumeric) ? commaNumeric : null;
  }

  return null;
}

function parseCoordinateValue(value: unknown): number | null {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null;
  }

  if (
    typeof value === 'object' &&
    value !== null &&
    'numerator' in value &&
    'denominator' in value
  ) {
    return parseCoordinateValue(
      `${String((value as { numerator: unknown }).numerator)}/${String(
        (value as { denominator: unknown }).denominator
      )}`
    );
  }

  if (Array.isArray(value)) {
    const parts = value
      .map((item) => parseCoordinateValue(item))
      .filter((item): item is number => item !== null);

    if (parts.length === 0) {
      return null;
    }

    if (parts.length === 1) {
      return parts[0];
    }

    const [degrees, minutes = 0, seconds = 0] = parts;
    const absoluteDegrees =
      Math.abs(degrees) + minutes / 60 + seconds / 3600;

    return degrees < 0 ? -absoluteDegrees : absoluteDegrees;
  }

  if (typeof value === 'string') {
    const trimmedValue = value.trim();

    if (!trimmedValue) {
      return null;
    }

    const directNumeric = parseRationalComponent(trimmedValue);

    if (directNumeric !== null) {
      return directNumeric;
    }

    const parts = trimmedValue
      .split(/[,\s]+/)
      .map((part) => parseRationalComponent(part))
      .filter((part): part is number => part !== null);

    if (parts.length === 0) {
      return null;
    }

    if (parts.length === 1) {
      return parts[0];
    }

    const [degrees, minutes = 0, seconds = 0] = parts;
    const absoluteDegrees =
      Math.abs(degrees) + minutes / 60 + seconds / 3600;

    return degrees < 0 ? -absoluteDegrees : absoluteDegrees;
  }

  return null;
}

function normalizeDirection(value: unknown): 'N' | 'S' | 'E' | 'W' | null {
  if (typeof value !== 'string') {
    return null;
  }

  const normalizedDirection = value.trim().toUpperCase();

  return normalizedDirection === 'N' ||
    normalizedDirection === 'S' ||
    normalizedDirection === 'E' ||
    normalizedDirection === 'W'
    ? normalizedDirection
    : null;
}

function applyDirection(
  coordinate: number | null,
  direction: 'N' | 'S' | 'E' | 'W' | null
): number | null {
  if (coordinate === null) {
    return null;
  }

  if (direction === 'S' || direction === 'W') {
    return -Math.abs(coordinate);
  }

  if (direction === 'N' || direction === 'E') {
    return Math.abs(coordinate);
  }

  return coordinate;
}

function getNestedRecordValue(
  record: Record<string, unknown>,
  keys: string[]
): unknown {
  for (const key of keys) {
    if (key in record) {
      return record[key];
    }
  }

  return undefined;
}

export function extractCoordinatesFromExif(
  exif: Record<string, unknown> | null | undefined
): Coordinates | null {
  if (!exif) {
    return null;
  }

  const gpsInfo =
    (getNestedRecordValue(exif, ['GPSInfo', 'gpsInfo', 'gps']) as
      | Record<string, unknown>
      | undefined) ?? null;
  const latitude = applyDirection(
    parseCoordinateValue(
      getNestedRecordValue(exif, [
        'GPSLatitude',
        'latitude',
        'Latitude',
        'lat',
      ]) ??
        (gpsInfo
          ? getNestedRecordValue(gpsInfo, [
              'GPSLatitude',
              'latitude',
              'Latitude',
              '2',
            ])
          : undefined)
    ),
    normalizeDirection(
      getNestedRecordValue(exif, [
        'GPSLatitudeRef',
        'latitudeRef',
        'LatitudeRef',
      ]) ??
        (gpsInfo
          ? getNestedRecordValue(gpsInfo, [
              'GPSLatitudeRef',
              'latitudeRef',
              'LatitudeRef',
              '1',
            ])
          : undefined)
    )
  );
  const longitude = applyDirection(
    parseCoordinateValue(
      getNestedRecordValue(exif, [
        'GPSLongitude',
        'longitude',
        'Longitude',
        'lng',
        'lon',
      ]) ??
        (gpsInfo
          ? getNestedRecordValue(gpsInfo, [
              'GPSLongitude',
              'longitude',
              'Longitude',
              '4',
            ])
          : undefined)
    ),
    normalizeDirection(
      getNestedRecordValue(exif, [
        'GPSLongitudeRef',
        'longitudeRef',
        'LongitudeRef',
      ]) ??
        (gpsInfo
          ? getNestedRecordValue(gpsInfo, [
              'GPSLongitudeRef',
              'longitudeRef',
              'LongitudeRef',
              '3',
            ])
          : undefined)
    )
  );

  const coordinates =
    latitude !== null && longitude !== null
      ? {
          latitude,
          longitude,
        }
      : null;

  return coordinates && isValidCoordinatePair(coordinates) ? coordinates : null;
}
