import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

export const DEFAULT_NOTIFICATION_CHANNEL_ID = 'travel-entry-saves';

let hasConfiguredNotifications = false;

export async function configureNotificationsAsync(): Promise<void> {
  if (hasConfiguredNotifications) {
    return;
  }

  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(
      DEFAULT_NOTIFICATION_CHANNEL_ID,
      {
        name: 'Travel Entry Saves',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 200, 180, 200],
        lightColor: '#A55A2A',
      }
    );
  }

  hasConfiguredNotifications = true;
}

export async function ensureNotificationPermissionAsync(): Promise<boolean> {
  const existingPermission = await Notifications.getPermissionsAsync();

  if (existingPermission.granted) {
    return true;
  }

  const requestedPermission = await Notifications.requestPermissionsAsync();

  return requestedPermission.granted;
}

export async function sendEntrySavedNotificationAsync(): Promise<boolean> {
  const hasPermission = await ensureNotificationPermissionAsync();

  if (!hasPermission) {
    return false;
  }

  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Travel entry saved',
      body: 'Your latest stop has been stamped into the diary.',
      sound: 'default',
    },
    trigger: null,
  });

  return true;
}
