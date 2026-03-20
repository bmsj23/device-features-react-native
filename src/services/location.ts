import * as Location from 'expo-location';

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

function formatSingleAddress(
  address: Location.LocationGeocodedAddress
): string {
  const seenParts = new Set<string>();
  const orderedParts = [
    address.name,
    address.street,
    address.district,
    address.city,
    address.subregion,
    address.region,
    address.country,
  ]
    .filter((part): part is string => typeof part === 'string' && part.trim().length > 0)
    .map((part) => part.trim())
    .filter((part) => {
      const normalized = part.toLowerCase();

      if (seenParts.has(normalized)) {
        return false;
      }

      seenParts.add(normalized);
      return true;
    });

  return orderedParts.join(', ');
}

function formatResolvedAddress(
  addresses: Location.LocationGeocodedAddress[]
): string {
  for (const address of addresses) {
    const formattedAddress = formatSingleAddress(address);

    if (formattedAddress.length > 0) {
      return formattedAddress;
    }
  }

  return '';
}

export async function resolveAddressFromCoordinatesAsync(coordinates: {
  latitude: number;
  longitude: number;
}): Promise<{
  latitude: number;
  longitude: number;
  address: string;
}> {
  try {
    const reverseGeocode = await Location.reverseGeocodeAsync(coordinates);
    const address = formatResolvedAddress(reverseGeocode);

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
