import { Platform } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as MediaLibrary from 'expo-media-library';

import {
  extractCoordinatesFromExif,
  isValidCoordinatePair,
} from '../utils/address';

type GalleryPermissionResponse = {
  status: 'granted' | 'denied' | 'undetermined';
  canAskAgain: boolean;
  accessPrivileges?: 'all' | 'limited' | 'none';
};
type Coordinates = {
  latitude: number;
  longitude: number;
};

async function findMatchingAssetIdAsync(
  selectedAsset: ImagePicker.ImagePickerAsset
): Promise<string | null> {
  const targetFileName = selectedAsset.fileName ?? null;

  if (!targetFileName) {
    return null;
  }

  let after: string | undefined;
  let pageCount = 0;

  while (pageCount < 5) {
    const page = await MediaLibrary.getAssetsAsync({
      mediaType: MediaLibrary.MediaType.photo,
      first: 200,
      after,
      sortBy: [MediaLibrary.SortBy.creationTime],
    });

    const matchingAsset = page.assets.find((asset) => {
      const matchesFileName = asset.filename === targetFileName;
      const matchesDimensions =
        asset.width === selectedAsset.width && asset.height === selectedAsset.height;

      return matchesFileName && matchesDimensions;
    });

    if (matchingAsset) {
      return matchingAsset.id;
    }

    if (!page.hasNextPage) {
      break;
    }

    after = page.endCursor;
    pageCount += 1;
  }

  return null;
}

function mergeGalleryPermissionResponses(
  pickerPermission: ImagePicker.MediaLibraryPermissionResponse,
  mediaLibraryPermission: MediaLibrary.PermissionResponse
): GalleryPermissionResponse {
  if (
    pickerPermission.status === 'granted' &&
    mediaLibraryPermission.status === 'granted'
  ) {
    return {
      status: 'granted',
      canAskAgain:
        pickerPermission.canAskAgain && mediaLibraryPermission.canAskAgain,
      accessPrivileges:
        mediaLibraryPermission.accessPrivileges ??
        pickerPermission.accessPrivileges,
    };
  }

  const deniedPermission =
    pickerPermission.status !== 'granted'
      ? pickerPermission
      : mediaLibraryPermission;

  return {
    status: deniedPermission.status,
    canAskAgain:
      pickerPermission.canAskAgain && mediaLibraryPermission.canAskAgain,
    accessPrivileges:
      mediaLibraryPermission.accessPrivileges ?? pickerPermission.accessPrivileges,
  };
}

export async function requestGalleryPermissionsAsync(): Promise<GalleryPermissionResponse> {
  const pickerPermission = await ImagePicker.requestMediaLibraryPermissionsAsync();

  if (pickerPermission.status !== 'granted') {
    return {
      status: pickerPermission.status,
      canAskAgain: pickerPermission.canAskAgain,
      accessPrivileges: pickerPermission.accessPrivileges,
    };
  }

  const mediaLibraryPermission = await MediaLibrary.requestPermissionsAsync(
    false,
    Platform.OS === 'android' ? ['photo'] : undefined
  );

  return mergeGalleryPermissionResponses(
    pickerPermission,
    mediaLibraryPermission
  );
}

export async function pickSingleImageFromGalleryAsync(): Promise<ImagePicker.ImagePickerAsset | null> {
  const pickerResult = await ImagePicker.launchImageLibraryAsync({
    allowsMultipleSelection: false,
    exif: true,
    mediaTypes: ['images'],
    preferredAssetRepresentationMode:
      ImagePicker.UIImagePickerPreferredAssetRepresentationMode.Current,
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
  const resolvedAssetId =
    selectedAsset.assetId ?? (await findMatchingAssetIdAsync(selectedAsset));

  if (resolvedAssetId) {
    try {
      const assetInfo = await MediaLibrary.getAssetInfoAsync(
        resolvedAssetId,
        {
          shouldDownloadFromNetwork: true,
        }
      );

      if (assetInfo.location) {
        const coordinates = {
          latitude: assetInfo.location.latitude,
          longitude: assetInfo.location.longitude,
        };

        if (isValidCoordinatePair(coordinates)) {
          return coordinates;
        }
      }

      const assetExifCoordinates = extractCoordinatesFromExif(
        (assetInfo.exif as Record<string, unknown> | null | undefined) ?? null
      );

      if (assetExifCoordinates) {
        return assetExifCoordinates;
      }
    } catch {
      // Fall through to EXIF parsing from the picker asset.
    }
  }

  return extractCoordinatesFromExif(
    (selectedAsset.exif as Record<string, unknown> | null | undefined) ?? null
  );
}
