import * as Location from 'expo-location';

import {
  buildAddressFromGeocodeResult,
  isValidCoordinatePair,
} from '../utils/address';

export type LocationLookupErrorCode =
  | 'permission-denied'
  | 'services-disabled'
  | 'address-not-found'
  | 'lookup-failed';

export class LocationLookupError extends Error {
  constructor(
    public readonly code: LocationLookupErrorCode,
    message: string
  ) {
    super(message);
    this.name = 'LocationLookupError';
  }
}

export async function resolveAddressFromCoordinatesAsync(coordinates: {
  latitude: number;
  longitude: number;
}): Promise<{
  latitude: number;
  longitude: number;
  address: string;
}> {
  if (!isValidCoordinatePair(coordinates)) {
    throw new LocationLookupError(
      'lookup-failed',
      'We could not read a usable location from this photo.'
    );
  }

  try {
    const reverseGeocode = await Location.reverseGeocodeAsync(coordinates);
    const address = buildAddressFromGeocodeResult(reverseGeocode);

    if (address.length === 0) {
      throw new LocationLookupError(
        'address-not-found',
        'We could not determine a usable address for this location yet.'
      );
    }

    return {
      latitude: coordinates.latitude,
      longitude: coordinates.longitude,
      address,
    };
  } catch (error) {
    if (error instanceof LocationLookupError) {
      throw error;
    }

    throw new LocationLookupError(
      'lookup-failed',
      'We could not fetch an address from these coordinates. Please try again.'
    );
  }
}

export async function resolveCurrentAddressAsync(): Promise<{
  latitude: number;
  longitude: number;
  address: string;
}> {
  const permissionResponse = await Location.requestForegroundPermissionsAsync();

  if (permissionResponse.status !== 'granted') {
    throw new LocationLookupError(
      'permission-denied',
      'Location permission is required so we can attach your current address.'
    );
  }

  const servicesEnabled = await Location.hasServicesEnabledAsync();

  if (!servicesEnabled) {
    throw new LocationLookupError(
      'services-disabled',
      'Turn on device location services to fetch your current address.'
    );
  }

  try {
    const position = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });
    return await resolveAddressFromCoordinatesAsync({
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
    });
  } catch (error) {
    if (error instanceof LocationLookupError) {
      throw error;
    }

    throw new LocationLookupError(
      'lookup-failed',
      'We could not fetch your current address. Please try again.'
    );
  }
}
