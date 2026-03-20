import * as ImagePicker from 'expo-image-picker';
import * as MediaLibrary from 'expo-media-library';

type Coordinates = {
  latitude: number;
  longitude: number;
};

function toFiniteNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string') {
    const parsedValue = Number.parseFloat(value);

    return Number.isFinite(parsedValue) ? parsedValue : null;
  }

  if (
    typeof value === 'object' &&
    value !== null &&
    'numerator' in value &&
    'denominator' in value
  ) {
    const numerator = toFiniteNumber(
      (value as { numerator: unknown }).numerator
    );
    const denominator = toFiniteNumber(
      (value as { denominator: unknown }).denominator
    );

    if (numerator === null || denominator === null || denominator === 0) {
      return null;
    }

    return numerator / denominator;
  }

  return null;
}

function normalizeExifCoordinate(value: unknown): number | null {
  if (Array.isArray(value) && value.length === 3) {
    const degrees = toFiniteNumber(value[0]);
    const minutes = toFiniteNumber(value[1]);
    const seconds = toFiniteNumber(value[2]);

    if (degrees === null || minutes === null || seconds === null) {
      return null;
    }

    return degrees + minutes / 60 + seconds / 3600;
  }

  return toFiniteNumber(value);
}

function applyCoordinateReference(
  coordinate: number | null,
  reference: unknown
): number | null {
  if (coordinate === null) {
    return null;
  }

  if (reference === 'S' || reference === 'W') {
    return -Math.abs(coordinate);
  }

  return coordinate;
}

function parseCoordinatesFromExif(
  exif: Record<string, unknown> | object | null | undefined
): Coordinates | null {
  if (!exif || typeof exif !== 'object') {
    return null;
  }

  const exifRecord = exif as Record<string, unknown>;
  const latitude = applyCoordinateReference(
    normalizeExifCoordinate(
      exifRecord.GPSLatitude ?? exifRecord.latitude ?? exifRecord.Latitude
    ),
    exifRecord.GPSLatitudeRef
  );
  const longitude = applyCoordinateReference(
    normalizeExifCoordinate(
      exifRecord.GPSLongitude ?? exifRecord.longitude ?? exifRecord.Longitude
    ),
    exifRecord.GPSLongitudeRef
  );

  if (latitude === null || longitude === null) {
    return null;
  }

  return { latitude, longitude };
}

export async function requestGalleryPermissionsAsync() {
  return ImagePicker.requestMediaLibraryPermissionsAsync();
}

export async function pickSingleImageFromGalleryAsync(): Promise<ImagePicker.ImagePickerAsset | null> {
  const pickerResult = await ImagePicker.launchImageLibraryAsync({
    allowsMultipleSelection: false,
    exif: true,
    mediaTypes: ['images'],
    quality: 1,
  });

  if (pickerResult.canceled) {
    return null;
  }

  return pickerResult.assets[0] ?? null;
}

export async function extractGalleryCoordinatesAsync(
  selectedAsset: ImagePicker.ImagePickerAsset
): Promise<Coordinates | null> {
  if (selectedAsset.assetId) {
    try {
      const assetInfo = await MediaLibrary.getAssetInfoAsync(selectedAsset.assetId);

      if (assetInfo.location) {
        return {
          latitude: assetInfo.location.latitude,
          longitude: assetInfo.location.longitude,
        };
      }

      const assetExifCoordinates = parseCoordinatesFromExif(assetInfo.exif);

      if (assetExifCoordinates) {
        return assetExifCoordinates;
      }
    } catch {
      // Fall through to EXIF parsing from the picker asset.
    }
  }

  return parseCoordinatesFromExif(selectedAsset.exif);
}
