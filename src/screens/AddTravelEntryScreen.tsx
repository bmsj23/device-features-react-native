import { useCallback, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
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
import { deleteSavedPhotoAsync, persistCapturedPhotoAsync } from '../services/files';
import {
  LocationLookupError,
  resolveCurrentAddressAsync,
} from '../services/location';
import { sendEntrySavedNotificationAsync } from '../services/notifications';
import { useAppContext, useAppTheme } from '../state/AppProvider';
import { createInitialDraftEntryState, type DraftEntryState } from '../types/app';
import { createTravelEntryId } from '../utils/ids';
import { hasResolvedAddress } from '../utils/validation';

type AddEntryScreenProps = NativeStackScreenProps<RootStackParamList, 'AddEntry'>;

export function AddTravelEntryScreen({ navigation }: AddEntryScreenProps) {
  const { addEntry } = useAppContext();
  const theme = useAppTheme();
  const styles = createStyles(theme);
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [draft, setDraft] = useState<DraftEntryState>(
    createInitialDraftEntryState()
  );
  const [isCameraReady, setIsCameraReady] = useState(false);
  const cameraReference = useRef<CameraView | null>(null);
  const draftPhotoUriReference = useRef<string | null>(null);

  const resetDraft = useCallback(async () => {
    const draftPhotoUri = draftPhotoUriReference.current;

    draftPhotoUriReference.current = null;
    setIsCameraReady(false);
    setDraft(createInitialDraftEntryState());

    try {
      await deleteSavedPhotoAsync(draftPhotoUri);
    } catch {
      // Temporary camera cache cleanup is best effort only.
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      return () => {
        void resetDraft();
      };
    }, [resetDraft])
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

  const lookupCurrentAddress = useCallback(async () => {
    setDraft((currentDraft) => ({
      ...currentDraft,
      latitude: null,
      longitude: null,
      address: '',
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
        isResolvingAddress: false,
        errorMessage: null,
      }));
    } catch (error) {
      const errorMessage =
        error instanceof LocationLookupError
          ? error.message
          : 'We could not fetch your current address. Please try again.';

      setDraft((currentDraft) => ({
        ...currentDraft,
        latitude: null,
        longitude: null,
        address: '',
        isResolvingAddress: false,
        errorMessage: errorMessage,
      }));
    }
  }, []);

  const handleCapture = useCallback(async () => {
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

      draftPhotoUriReference.current = capturedPhoto.uri;
      setDraft((currentDraft) => ({
        ...currentDraft,
        photoUri: capturedPhoto.uri,
        latitude: null,
        longitude: null,
        address: '',
        isResolvingAddress: false,
        isSaving: false,
        errorMessage: null,
      }));

      await lookupCurrentAddress();
    } catch {
      setDraft((currentDraft) => ({
        ...currentDraft,
        errorMessage:
          'We could not capture that photo. Please try taking the picture again.',
      }));
    }
  }, [isCameraReady, lookupCurrentAddress]);

  const handleRetake = useCallback(async () => {
    await resetDraft();
  }, [resetDraft]);

  const canSave =
    draft.photoUri !== null &&
    draft.latitude !== null &&
    draft.longitude !== null &&
    hasResolvedAddress(draft.address) &&
    !draft.isResolvingAddress &&
    !draft.isSaving;

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
        address: draft.address.trim(),
        latitude: draft.latitude as number,
        longitude: draft.longitude as number,
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
        // Temporary cache cleanup should not undo a successful save.
      }

      draftPhotoUriReference.current = null;
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
          'We could not save this entry. Please make sure the photo and address are ready, then try again.',
      }));
    }
  }, [addEntry, canSave, draft.address, draft.latitude, draft.longitude, draft.photoUri, navigation]);

  const shouldShowCamera = draft.photoUri === null;
  const shouldShowPermissionCard =
    shouldShowCamera && cameraPermission !== null && !cameraPermission.granted;
  const shouldShowCameraLoadingState =
    shouldShowCamera && cameraPermission === null;
  const shouldShowAddressRetry =
    draft.photoUri !== null &&
    !draft.isResolvingAddress &&
    !hasResolvedAddress(draft.address);

  return (
    <ScrollView
      contentContainerStyle={styles.scrollContent}
      contentInsetAdjustmentBehavior="automatic"
      style={styles.screen}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.heroCard}>
        <Text style={styles.heroEyebrow}>Field Capture</Text>
        <Text style={styles.heroTitle}>Create a passport-ready travel stamp.</Text>
        <Text style={styles.heroBody}>
          Take a fresh picture, wait for the automatic address lookup, then save
          it into your on-device diary.
        </Text>
      </View>

      {shouldShowCameraLoadingState ? (
        <View style={styles.placeholderCard}>
          <Text style={styles.placeholderTitle}>Checking camera access</Text>
          <Text style={styles.placeholderBody}>
            We&apos;re preparing the capture panel for this entry.
          </Text>
          <ActivityIndicator color={theme.colors.accent} size="small" />
        </View>
      ) : null}

      {shouldShowPermissionCard ? (
        <View style={styles.placeholderCard}>
          <Text style={styles.placeholderTitle}>Camera permission needed</Text>
          <Text style={styles.placeholderBody}>
            Enable camera access so you can capture the image for this travel
            entry.
          </Text>
          <ActionButton
            label="Enable Camera"
            onPress={() => {
              void handleCameraPermissionRequest();
            }}
          />
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
          <ActionButton
            disabled={!isCameraReady}
            label={isCameraReady ? 'Capture Photo' : 'Preparing Camera'}
            onPress={() => {
              void handleCapture();
            }}
          />
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
          <Text style={styles.previewCaption}>Captured memory preview</Text>
        </View>
      ) : null}

      <View style={styles.addressCard}>
        <Text style={styles.addressEyebrow}>Current Address</Text>
        {draft.isResolvingAddress ? (
          <View style={styles.addressLoadingRow}>
            <ActivityIndicator color={theme.colors.accent} size="small" />
            <Text style={styles.addressLoadingText}>
              Looking up your current address...
            </Text>
          </View>
        ) : null}
        {!draft.isResolvingAddress && hasResolvedAddress(draft.address) ? (
          <Text style={styles.addressValue}>{draft.address}</Text>
        ) : null}
        {!draft.isResolvingAddress && !hasResolvedAddress(draft.address) ? (
          <Text style={styles.addressHint}>
            Save stays locked until the automatic reverse geocoding returns a
            usable address.
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
              label="Retake"
              onPress={() => {
                void handleRetake();
              }}
              variant="secondary"
            />
            {shouldShowAddressRetry ? (
              <ActionButton
                disabled={draft.isSaving}
                label="Retry Address"
                onPress={() => {
                  void lookupCurrentAddress();
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
