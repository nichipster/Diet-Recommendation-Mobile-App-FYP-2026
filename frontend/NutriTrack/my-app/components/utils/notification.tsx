import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SchedulableTriggerInputTypes } from 'expo-notifications';
import { MOTIVATIONAL_QUOTES } from '../profile_section/profile/motivational/motivational';

export function setupNotificationHandler() {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true, 
    }),
  });
}

const KEYS = {
  notifId: 'daily_quote_notif_id',
  notificationsEnabled: 'notificationsEnabled',
  motivationalEnabled: 'motivationalEnabled',
};


const getDailyQuote = (): string => {
  const today = new Date();
  const seed =
    today.getFullYear() * 10000 +
    (today.getMonth() + 1) * 100 +
    today.getDate();
  return MOTIVATIONAL_QUOTES[seed % MOTIVATIONAL_QUOTES.length];
};

export async function requestNotificationPermission(): Promise<boolean> {
  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

export async function saveNotificationSettings(settings: {
  notificationsEnabled: boolean;
  motivationalEnabled: boolean;
}) {
  await AsyncStorage.setItem(
    KEYS.notificationsEnabled,
    JSON.stringify(settings.notificationsEnabled)
  );
  await AsyncStorage.setItem(
    KEYS.motivationalEnabled,
    JSON.stringify(settings.motivationalEnabled)
  );
}

export async function loadNotificationSettings(): Promise<{
  notificationsEnabled: boolean;
  motivationalEnabled: boolean;
}> {
  const notifications = await AsyncStorage.getItem(KEYS.notificationsEnabled);
  const motivational = await AsyncStorage.getItem(KEYS.motivationalEnabled);
  return {
    notificationsEnabled: notifications !== null ? JSON.parse(notifications) : true,
    motivationalEnabled: motivational !== null ? JSON.parse(motivational) : true,
  };
}

export async function scheduleDailyQuoteNotification() {
  // Step 1: Check user preferences
  const { notificationsEnabled, motivationalEnabled } = await loadNotificationSettings();

  // Step 2: Always cancel the old notification first, regardless of toggles.
  // This ensures that if the user turned OFF notifications, the old one
  // gets properly removed rather than continuing to fire.
  const existingId = await AsyncStorage.getItem(KEYS.notifId);
  if (existingId) {
    await Notifications.cancelScheduledNotificationAsync(existingId);
    await AsyncStorage.removeItem(KEYS.notifId);
  }

  // Step 3: Respect user's choice — exit without scheduling
  if (!notificationsEnabled || !motivationalEnabled) return;

  // Step 4: Request permission (required on Android 13+ / API 33+)
  const granted = await requestNotificationPermission();
  if (!granted) return;

  // Step 5: Schedule a DAILY notification.
  const id = await Notifications.scheduleNotificationAsync({
    content: {
      title: '🌟 Daily Motivation',
      body: getDailyQuote(),
      priority: Notifications.AndroidNotificationPriority.HIGH,
    },
    trigger: {
      type: SchedulableTriggerInputTypes.DAILY,
      hour: 9,
      minute: 0,
    },
  });

  // Step 6: Persist the ID so next app open can cancel and replace it cleanly
  await AsyncStorage.setItem(KEYS.notifId, id);
}

// ─────────────────────────────────────────────
// For testing purposes and will be removed later on
export async function resetNotificationForTesting() {
  const existingId = await AsyncStorage.getItem(KEYS.notifId);
  if (existingId) {
    await Notifications.cancelScheduledNotificationAsync(existingId);
    await AsyncStorage.removeItem(KEYS.notifId);
  }

  // Fire immediately for testing
  await Notifications.scheduleNotificationAsync({
    content: {
      title: '🌟 Daily Motivation (Test)',
      body: getDailyQuote(),
      priority: Notifications.AndroidNotificationPriority.HIGH,
    },
    trigger: {
      type: SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: 1,  // fires in 1 second
    },
  });

  console.log('🔔 Test notification scheduled — fires in 2 seconds');
}