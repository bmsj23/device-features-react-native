import { useCallback, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Image } from 'expo-image';

import { ActionButton } from '../components/ActionButton';
import type { RootStackParamList } from '../navigation/types';
import {
  extractGalleryCoordinatesAsync,
  pickSingleImageFromGalleryAsync,
  requestGalleryPermissionsAsync,
} from '../services/gallery';
import { deleteSavedPhotoAsync, persistCapturedPhotoAsync } from '../services/files';
import {
  LocationLookupError,
  resolveAddressFromCoordinatesAsync,
  resolveCurrentAddressAsync,
} from '../services/location';
import { sendEntrySavedNotificationAsync } from '../services/notifications';
import { useAppContext, useAppTheme } from '../state/AppProvider';
import { createInitialDraftEntryState, type DraftEntryState } from '../types/app';
import { createTravelEntryId } from '../utils/ids';
import { hasResolvedAddress } from '../utils/validation';

type AddEntryScreenProps = NativeStackScreenProps<RootStackParamList, 'AddEntry'>;
type SourceSelection = 'camera' | null;

export function AddTravelEntryScreen({ navigation }: AddEntryScreenProps) {
  const { addEntry } = useAppContext();
  const theme = useAppTheme();
  const styles = createStyles(theme);
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [draft, setDraft] = useState<DraftEntryState>(
    createInitialDraftEntryState()
  );
  const [sourceSelection, setSourceSelection] = useState<SourceSelection>(null);
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [galleryNeedsSettingsRecovery, setGalleryNeedsSettingsRecovery] =
    useState(false);
  const cameraReference = useRef<CameraView | null>(null);
  const draftPhotoUriReference = useRef<string | null>(null);

  const resetDraft = useCallback(
    async (options?: { keepCameraReady?: boolean }) => {
      const draftPhotoUri = draftPhotoUriReference.current;

      draftPhotoUriReference.current = null;
      setSourceSelection(options?.keepCameraReady ? 'camera' : null);
      setIsCameraReady(false);
      setGalleryNeedsSettingsRecovery(false);
      setDraft(createInitialDraftEntryState());

      try {
        await deleteSavedPhotoAsync(draftPhotoUri);
      } catch {
        // Temporary preview cleanup is best effort only.
      }
    },
    []
  );

  useFocusEffect(
    useCallback(() => {
      return () => {
        void resetDraft();
      };
    }, [resetDraft])
  );

  const setCurrentLocationError = useCallback(
    (message: string, preserveGalleryChoice = false) => {
      setDraft((currentDraft) => ({
        ...currentDraft,
        latitude: null,
        longitude: null,
        address: '',
        locationStrategy: 'current-device',
        requiresGalleryLocationChoice: preserveGalleryChoice,
        isResolvingAddress: false,
        errorMessage: message,
      }));
    },
    []
  );

  const applyCurrentLocationToDraft = useCallback(
    async (options?: { preserveGalleryChoice?: boolean }) => {
      const preserveGalleryChoice = options?.preserveGalleryChoice ?? false;

      setDraft((currentDraft) => ({
        ...currentDraft,
        latitude: null,
        longitude: null,
        address: '',
        locationStrategy: 'current-device',
        requiresGalleryLocationChoice: preserveGalleryChoice,
        isResolvingAddress: true,
        errorMessage: null,
      }));

      try {
        const resolvedAddress = await resolveCurrentAddressAsync();

        setDraft((currentDraft) => ({
          ...currentDraft,
          latitude: resolvedAddress.latitude,
          longitude: resolvedAddress.longitude,
          address: resolvedAddress.address,
          locationStrategy: 'current-device',
          requiresGalleryLocationChoice: false,
          isResolvingAddress: false,
          errorMessage: null,
        }));
      } catch (error) {
        const errorMessage =
          error instanceof LocationLookupError
            ? error.message
            : 'We could not fetch your current address. Please try again.';

        setCurrentLocationError(errorMessage, preserveGalleryChoice);
      }
    },
    [setCurrentLocationError]
  );

  const applyGalleryMetadataLocationToDraft = useCallback(
    async (coordinates: { latitude: number; longitude: number }) => {
      setDraft((currentDraft) => ({
        ...currentDraft,
        latitude: coordinates.latitude,
        longitude: coordinates.longitude,
        address: '',
        locationStrategy: 'gallery-metadata',
        requiresGalleryLocationChoice: false,
        isResolvingAddress: true,
        errorMessage: null,
      }));

      try {
        const resolvedAddress = await resolveAddressFromCoordinatesAsync(
          coordinates
        );

        setDraft((currentDraft) => ({
          ...currentDraft,
          latitude: resolvedAddress.latitude,
          longitude: resolvedAddress.longitude,
          address: resolvedAddress.address,
          locationStrategy: 'gallery-metadata',
          requiresGalleryLocationChoice: false,
          isResolvingAddress: false,
          errorMessage: null,
        }));
      } catch (error) {
        const errorMessage =
          error instanceof LocationLookupError
            ? error.message
            : 'We found photo location metadata, but could not resolve an address from it.';

        setDraft((currentDraft) => ({
          ...currentDraft,
          latitude: coordinates.latitude,
          longitude: coordinates.longitude,
          address: '',
          locationStrategy: 'gallery-metadata',
          requiresGalleryLocationChoice: false,
          isResolvingAddress: false,
          errorMessage: errorMessage,
        }));
      }
    },
    []
  );

  const handleCameraPermissionRequest = useCallback(async () => {
    try {
      const permissionResponse = await requestCameraPermission();

      if (permissionResponse.status !== 'granted') {
        setDraft((currentDraft) => ({
          ...currentDraft,
          errorMessage:
            'Camera permission is required before you can capture a travel photo.',
        }));
        return;
      }

      setDraft((currentDraft) => ({
        ...currentDraft,
        errorMessage: null,
      }));
    } catch {
      setDraft((currentDraft) => ({
        ...currentDraft,
        errorMessage:
          'We could not request camera permission right now. Please try again.',
      }));
    }
  }, [requestCameraPermission]);

  const replaceDraftPhotoAsync = useCallback(async (photoUri: string) => {
    const previousDraftPhotoUri = draftPhotoUriReference.current;

    draftPhotoUriReference.current = photoUri;

    if (previousDraftPhotoUri && previousDraftPhotoUri !== photoUri) {
      try {
        await deleteSavedPhotoAsync(previousDraftPhotoUri);
      } catch {
        // Replacing a draft should not fail because cleanup missed.
      }
    }
  }, []);

  const handleChooseCameraSource = useCallback(() => {
    setGalleryNeedsSettingsRecovery(false);
    setSourceSelection('camera');
    setDraft((currentDraft) => ({
      ...currentDraft,
      errorMessage: null,
    }));
  }, []);

  const handleChooseFromGallery = useCallback(async () => {
    setGalleryNeedsSettingsRecovery(false);
    setSourceSelection(null);

    try {
      const permissionResponse = await requestGalleryPermissionsAsync();

      if (permissionResponse.status !== 'granted') {
        setGalleryNeedsSettingsRecovery(!permissionResponse.canAskAgain);
        setDraft((currentDraft) => ({
          ...currentDraft,
          errorMessage: permissionResponse.canAskAgain
            ? 'Photo library permission is required before you can choose a gallery image.'
            : 'Photo library access is turned off. Open Settings to choose a gallery image.',
        }));
        return;
      }

      const selectedAsset = await pickSingleImageFromGalleryAsync();

      if (!selectedAsset) {
        return;
      }

      await replaceDraftPhotoAsync(selectedAsset.uri);

      setDraft((currentDraft) => ({
        ...currentDraft,
        photoUri: selectedAsset.uri,
        photoSource: 'gallery',
        selectedAssetId: selectedAsset.assetId ?? null,
        latitude: null,
        longitude: null,
        address: '',
        locationStrategy: null,
        requiresGalleryLocationChoice: false,
        isResolvingAddress: false,
        isSaving: false,
        errorMessage: null,
      }));

      const metadataCoordinates = await extractGalleryCoordinatesAsync(
        selectedAsset
      );

      if (!metadataCoordinates) {
        setDraft((currentDraft) => ({
          ...currentDraft,
          photoUri: selectedAsset.uri,
          photoSource: 'gallery',
          selectedAssetId: selectedAsset.assetId ?? null,
          latitude: null,
          longitude: null,
          address: '',
          locationStrategy: null,
          requiresGalleryLocationChoice: true,
          isResolvingAddress: false,
          isSaving: false,
          errorMessage:
            'This photo does not include saved location metadata. Use your current location, leave the location unavailable, or choose another photo.',
        }));
        return;
      }

      await applyGalleryMetadataLocationToDraft(metadataCoordinates);
    } catch {
      setDraft((currentDraft) => ({
        ...currentDraft,
        errorMessage:
          'We could not open the photo library right now. Please try again.',
      }));
    }
  }, [applyGalleryMetadataLocationToDraft, replaceDraftPhotoAsync]);

  const handleCapture = useCallback(async () => {
    setGalleryNeedsSettingsRecovery(false);

    if (!cameraReference.current || !isCameraReady) {
      setDraft((currentDraft) => ({
        ...currentDraft,
        errorMessage: 'The camera is still getting ready. Please try again.',
      }));
      return;
    }

    try {
      const capturedPhoto = await cameraReference.current.takePictureAsync({
        quality: 0.82,
      });

      if (!capturedPhoto?.uri) {
        throw new Error('No captured photo was returned.');
      }

      await replaceDraftPhotoAsync(capturedPhoto.uri);
      setDraft((currentDraft) => ({
        ...currentDraft,
        photoUri: capturedPhoto.uri,
        photoSource: 'camera',
        selectedAssetId: null,
        latitude: null,
        longitude: null,
        address: '',
        locationStrategy: 'current-device',
        requiresGalleryLocationChoice: false,
        isResolvingAddress: false,
        isSaving: false,
        errorMessage: null,
      }));

      await applyCurrentLocationToDraft();
    } catch {
      setDraft((currentDraft) => ({
        ...currentDraft,
        errorMessage:
          'We could not capture that photo. Please try taking the picture again.',
      }));
    }
  }, [applyCurrentLocationToDraft, isCameraReady, replaceDraftPhotoAsync]);

  const handlePrimaryReplaceAction = useCallback(async () => {
    if (draft.photoSource === 'gallery') {
      await handleChooseFromGallery();
      return;
    }

    await resetDraft({ keepCameraReady: true });
  }, [draft.photoSource, handleChooseFromGallery, resetDraft]);

  const handleRetryLocationResolution = useCallback(async () => {
    if (
      draft.locationStrategy === 'gallery-metadata' &&
      draft.latitude !== null &&
      draft.longitude !== null
    ) {
      await applyGalleryMetadataLocationToDraft({
        latitude: draft.latitude,
        longitude: draft.longitude,
      });
      return;
    }

    await applyCurrentLocationToDraft({
      preserveGalleryChoice: draft.photoSource === 'gallery',
    });
  }, [
    applyCurrentLocationToDraft,
    applyGalleryMetadataLocationToDraft,
    draft.latitude,
    draft.locationStrategy,
    draft.longitude,
    draft.photoSource,
  ]);

  const handleUseCurrentLocationInstead = useCallback(async () => {
    await applyCurrentLocationToDraft({ preserveGalleryChoice: true });
  }, [applyCurrentLocationToDraft]);

  const handleLeaveLocationUnavailable = useCallback(() => {
    setDraft((currentDraft) => ({
      ...currentDraft,
      latitude: null,
      longitude: null,
      address: '',
      locationStrategy: 'location-unavailable',
      requiresGalleryLocationChoice: false,
      isResolvingAddress: false,
      errorMessage: null,
    }));
  }, []);

  const handleOpenSettings = useCallback(async () => {
    try {
      await Linking.openSettings();
    } catch {
      Alert.alert(
        'Settings unavailable',
        'We could not open the device settings from here.'
      );
    }
  }, []);

  const canSave =
    draft.photoUri !== null &&
    !draft.isResolvingAddress &&
    !draft.isSaving &&
    (draft.locationStrategy === 'location-unavailable' ||
      (draft.latitude !== null &&
        draft.longitude !== null &&
        hasResolvedAddress(draft.address)));

  const handleSave = useCallback(async () => {
    if (!canSave || !draft.photoUri) {
      return;
    }

    let savedPhotoUri: string | null = null;
    let notificationWasDelivered = true;

    setDraft((currentDraft) => ({
      ...currentDraft,
      isSaving: true,
      errorMessage: null,
    }));

    try {
      savedPhotoUri = await persistCapturedPhotoAsync(draft.photoUri);

      await addEntry({
        id: createTravelEntryId(),
        imageUri: savedPhotoUri,
        address:
          draft.locationStrategy === 'location-unavailable'
            ? ''
            : draft.address.trim(),
        latitude:
          draft.locationStrategy === 'location-unavailable'
            ? null
            : draft.latitude,
        longitude:
          draft.locationStrategy === 'location-unavailable'
            ? null
            : draft.longitude,
        createdAt: new Date().toISOString(),
      });

      try {
        notificationWasDelivered = await sendEntrySavedNotificationAsync();
      } catch {
        notificationWasDelivered = false;
      }

      try {
        await deleteSavedPhotoAsync(draft.photoUri);
      } catch {
        // Temporary preview cleanup should not undo a successful save.
      }

      draftPhotoUriReference.current = null;
      setSourceSelection(null);
      setDraft(createInitialDraftEntryState());
      navigation.goBack();

      if (!notificationWasDelivered) {
        setTimeout(() => {
          Alert.alert(
            'Entry saved',
            'Your travel entry was saved, but notifications are disabled on this device.'
          );
        }, 100);
      }
    } catch {
      if (savedPhotoUri) {
        try {
          await deleteSavedPhotoAsync(savedPhotoUri);
        } catch {
          // If rollback cleanup fails, keep the save error visible to the user.
        }
      }

      setDraft((currentDraft) => ({
        ...currentDraft,
        isSaving: false,
        errorMessage:
          'We could not save this entry. Please make sure the photo is ready, then try again.',
      }));
    }
  }, [
    addEntry,
    canSave,
    draft.address,
    draft.latitude,
    draft.locationStrategy,
    draft.longitude,
    draft.photoUri,
    navigation,
  ]);

  const shouldShowSourceSelection =
    draft.photoUri === null && sourceSelection === null;
  const shouldShowCamera = draft.photoUri === null && sourceSelection === 'camera';
  const shouldShowPermissionCard =
    shouldShowCamera && cameraPermission !== null && !cameraPermission.granted;
  const shouldShowCameraLoadingState =
    shouldShowCamera && cameraPermission === null;
  const shouldShowAddressRetry =
    draft.photoUri !== null &&
    !draft.requiresGalleryLocationChoice &&
    !draft.isResolvingAddress &&
    !hasResolvedAddress(draft.address) &&
    draft.locationStrategy !== null &&
    draft.locationStrategy !== 'location-unavailable';
  const addressCardLabel =
    draft.locationStrategy === 'location-unavailable'
      ? 'Location'
      : draft.photoSource === 'gallery' &&
          draft.locationStrategy === 'gallery-metadata'
        ? 'Photo Address'
        : draft.locationStrategy === 'current-device'
          ? 'Current Address'
          : 'Address';
  const sourceButtonLabel =
    draft.photoSource === 'gallery' ? 'Choose Another Photo' : 'Retake';

  return (
    <ScrollView
      contentContainerStyle={styles.scrollContent}
      contentInsetAdjustmentBehavior="automatic"
      style={styles.screen}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.heroCard}>
        <Text style={styles.heroEyebrow}>Travel Stamp Draft</Text>
        <Text style={styles.heroTitle}>Create a passport-ready travel stamp.</Text>
        <Text style={styles.heroBody}>
          Start by choosing how you want to add the photo, then save it with a
          resolved location or mark the location as unavailable.
        </Text>
      </View>

      {shouldShowSourceSelection ? (
        <View style={styles.placeholderCard}>
          <Text style={styles.placeholderTitle}>Choose your image source</Text>
          <Text style={styles.placeholderBody}>
            Pick a saved image from your gallery or choose the camera only when
            you are ready to capture a new travel photo.
          </Text>
          <View style={styles.actionsColumn}>
            <ActionButton
              label="Take Photo"
              onPress={handleChooseCameraSource}
            />
            <ActionButton
              label="Choose From Gallery"
              onPress={() => {
                void handleChooseFromGallery();
              }}
              variant="secondary"
            />
            {galleryNeedsSettingsRecovery ? (
              <ActionButton
                label="Open Settings"
                onPress={() => {
                  void handleOpenSettings();
                }}
                variant="secondary"
              />
            ) : null}
          </View>
        </View>
      ) : null}

      {shouldShowCameraLoadingState ? (
        <View style={styles.placeholderCard}>
          <Text style={styles.placeholderTitle}>Checking camera access</Text>
          <Text style={styles.placeholderBody}>
            We&apos;re preparing the capture panel for this entry.
          </Text>
          <ActivityIndicator color={theme.colors.accent} size="small" />
          <ActionButton
            label="Back to Source Options"
            onPress={() => {
              void resetDraft();
            }}
            variant="secondary"
          />
        </View>
      ) : null}

      {shouldShowPermissionCard ? (
        <View style={styles.placeholderCard}>
          <Text style={styles.placeholderTitle}>Camera permission needed</Text>
          <Text style={styles.placeholderBody}>
            Enable camera access if you want to capture a new image for this
            travel stamp.
          </Text>
          <View style={styles.actionsColumn}>
            <ActionButton
              label="Enable Camera"
              onPress={() => {
                void handleCameraPermissionRequest();
              }}
            />
            <ActionButton
              label="Back to Source Options"
              onPress={() => {
                void resetDraft();
              }}
              variant="secondary"
            />
          </View>
        </View>
      ) : null}

      {shouldShowCamera && cameraPermission?.granted ? (
        <View style={styles.cameraCard}>
          <View style={styles.cameraFrame}>
            <CameraView
              facing="back"
              onCameraReady={() => {
                setIsCameraReady(true);
              }}
              onMountError={(event) => {
                setDraft((currentDraft) => ({
                  ...currentDraft,
                  errorMessage: event.message,
                }));
              }}
              ref={cameraReference}
              style={styles.camera}
            />
          </View>
          <View style={styles.actionsColumn}>
            <ActionButton
              disabled={!isCameraReady}
              label={isCameraReady ? 'Capture Photo' : 'Preparing Camera'}
              onPress={() => {
                void handleCapture();
              }}
            />
            <ActionButton
              label="Back to Source Options"
              onPress={() => {
                void resetDraft();
              }}
              variant="secondary"
            />
          </View>
        </View>
      ) : null}

      {draft.photoUri ? (
        <View style={styles.previewCard}>
          <View style={styles.previewShell}>
            <Image
              cachePolicy="memory-disk"
              contentFit="cover"
              source={{ uri: draft.photoUri }}
              style={styles.previewImage}
              transition={180}
            />
          </View>
          <Text style={styles.previewCaption}>
            {draft.photoSource === 'gallery'
              ? 'Selected gallery image preview'
              : 'Captured memory preview'}
          </Text>
        </View>
      ) : null}

      <View style={styles.addressCard}>
        <Text style={styles.addressEyebrow}>{addressCardLabel}</Text>
        {draft.isResolvingAddress ? (
          <View style={styles.addressLoadingRow}>
            <ActivityIndicator color={theme.colors.accent} size="small" />
            <Text style={styles.addressLoadingText}>
              Resolving the address...
            </Text>
          </View>
        ) : null}
        {!draft.isResolvingAddress && hasResolvedAddress(draft.address) ? (
          <Text style={styles.addressValue}>{draft.address}</Text>
        ) : null}
        {!draft.isResolvingAddress &&
        draft.locationStrategy === 'location-unavailable' ? (
          <Text style={styles.addressHint}>
            Location unavailable for this stamp. The photo can still be saved.
          </Text>
        ) : null}
        {!draft.isResolvingAddress &&
        !hasResolvedAddress(draft.address) &&
        draft.photoSource === 'gallery' &&
        draft.requiresGalleryLocationChoice ? (
          <Text style={styles.addressHint}>
            This gallery image has no saved location metadata. Use your current
            location, leave the location unavailable, or choose another photo.
          </Text>
        ) : null}
        {!draft.isResolvingAddress &&
        !hasResolvedAddress(draft.address) &&
        draft.locationStrategy !== 'location-unavailable' &&
        (!draft.photoSource || !draft.requiresGalleryLocationChoice) ? (
          <Text style={styles.addressHint}>
            Save stays locked until the app resolves a location or you mark it
            unavailable.
          </Text>
        ) : null}
      </View>

      {draft.errorMessage ? (
        <View style={styles.errorCard}>
          <Text style={styles.errorTitle}>Validation Note</Text>
          <Text style={styles.errorBody}>{draft.errorMessage}</Text>
        </View>
      ) : null}

      <View style={styles.actionsColumn}>
        {draft.photoUri ? (
          <>
            <ActionButton
              disabled={draft.isSaving}
              label={sourceButtonLabel}
              onPress={() => {
                void handlePrimaryReplaceAction();
              }}
              variant="secondary"
            />
            {draft.photoSource === 'gallery' &&
            draft.requiresGalleryLocationChoice ? (
              <>
                <ActionButton
                  disabled={draft.isSaving}
                  label="Use Current Location"
                  onPress={() => {
                    void handleUseCurrentLocationInstead();
                  }}
                  variant="secondary"
                />
                <ActionButton
                  disabled={draft.isSaving}
                  label="Leave Location Unavailable"
                  onPress={handleLeaveLocationUnavailable}
                  variant="secondary"
                />
              </>
            ) : null}
            {shouldShowAddressRetry ? (
              <ActionButton
                disabled={draft.isSaving}
                label="Retry Address"
                onPress={() => {
                  void handleRetryLocationResolution();
                }}
                variant="secondary"
              />
            ) : null}
            <ActionButton
              disabled={!canSave}
              label={draft.isSaving ? 'Saving Entry...' : 'Save Entry'}
              onPress={() => {
                void handleSave();
              }}
            />
          </>
        ) : null}
      </View>
    </ScrollView>
  );
}

const createStyles = (theme: ReturnType<typeof useAppTheme>) =>
  StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    scrollContent: {
      paddingHorizontal: theme.spacing.lg,
      paddingTop: theme.spacing.lg,
      paddingBottom: theme.spacing.xxl,
      gap: theme.spacing.lg,
    },
    heroCard: {
      gap: theme.spacing.md,
      borderRadius: theme.radius.xl,
      borderWidth: 1,
      borderColor: theme.colors.borderStrong,
      backgroundColor: theme.colors.surface,
      padding: theme.spacing.xl,
    },
    heroEyebrow: {
      color: theme.colors.accent,
      fontFamily: theme.typography.mono,
      fontSize: 12,
      fontWeight: '700',
      letterSpacing: 1.6,
      textTransform: 'uppercase',
    },
    heroTitle: {
      color: theme.colors.text,
      fontFamily: theme.typography.display,
      fontSize: 30,
      lineHeight: 36,
      fontWeight: '700',
    },
    heroBody: {
      color: theme.colors.mutedText,
      fontSize: 15,
      lineHeight: 22,
    },
    placeholderCard: {
      gap: theme.spacing.md,
      borderRadius: theme.radius.xl,
      borderWidth: 1,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.surface,
      padding: theme.spacing.xl,
    },
    placeholderTitle: {
      color: theme.colors.text,
      fontFamily: theme.typography.display,
      fontSize: 24,
      lineHeight: 30,
      fontWeight: '700',
    },
    placeholderBody: {
      color: theme.colors.mutedText,
      fontSize: 15,
      lineHeight: 22,
    },
    cameraCard: {
      gap: theme.spacing.md,
      borderRadius: theme.radius.xl,
      borderWidth: 1,
      borderColor: theme.colors.borderStrong,
      backgroundColor: theme.colors.surface,
      padding: theme.spacing.md,
    },
    cameraFrame: {
      overflow: 'hidden',
      borderRadius: theme.radius.xl,
      backgroundColor: theme.colors.cameraFrame,
      borderWidth: 1,
      borderColor: theme.colors.border,
      padding: theme.spacing.sm,
    },
    camera: {
      width: '100%',
      height: 420,
      borderRadius: theme.radius.lg,
      overflow: 'hidden',
      backgroundColor: theme.colors.cameraFrame,
    },
    previewCard: {
      gap: theme.spacing.sm,
      borderRadius: theme.radius.xl,
      borderWidth: 1,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.surface,
      padding: theme.spacing.md,
    },
    previewShell: {
      overflow: 'hidden',
      borderRadius: theme.radius.lg,
      backgroundColor: theme.colors.paper,
      minHeight: 300,
    },
    previewImage: {
      width: '100%',
      height: 320,
      backgroundColor: theme.colors.paper,
    },
    previewCaption: {
      color: theme.colors.mutedText,
      fontFamily: theme.typography.mono,
      fontSize: 11,
      fontWeight: '700',
      letterSpacing: 1.2,
      textTransform: 'uppercase',
    },
    addressCard: {
      gap: theme.spacing.sm,
      borderRadius: theme.radius.xl,
      borderWidth: 1,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.surface,
      padding: theme.spacing.xl,
    },
    addressEyebrow: {
      color: theme.colors.accent,
      fontFamily: theme.typography.mono,
      fontSize: 12,
      fontWeight: '700',
      letterSpacing: 1.4,
      textTransform: 'uppercase',
    },
    addressLoadingRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.sm,
    },
    addressLoadingText: {
      color: theme.colors.mutedText,
      fontSize: 15,
      lineHeight: 22,
    },
    addressValue: {
      color: theme.colors.text,
      fontFamily: theme.typography.display,
      fontSize: 24,
      lineHeight: 32,
      fontWeight: '700',
    },
    addressHint: {
      color: theme.colors.mutedText,
      fontSize: 15,
      lineHeight: 22,
    },
    errorCard: {
      gap: theme.spacing.xs,
      borderRadius: theme.radius.lg,
      borderWidth: 1,
      borderColor: theme.colors.danger,
      backgroundColor: theme.colors.dangerSoft,
      padding: theme.spacing.lg,
    },
    errorTitle: {
      color: theme.colors.danger,
      fontFamily: theme.typography.mono,
      fontSize: 11,
      fontWeight: '700',
      letterSpacing: 1.2,
      textTransform: 'uppercase',
    },
    errorBody: {
      color: theme.colors.danger,
      fontSize: 14,
      lineHeight: 20,
    },
    actionsColumn: {
      gap: theme.spacing.md,
    },
  });
