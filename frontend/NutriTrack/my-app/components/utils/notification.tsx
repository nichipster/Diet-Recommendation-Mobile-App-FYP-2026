import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MOTIVATIONAL_QUOTES } from '../profile_section/profile/motivational/motivational';

export function setupNotificationHandler() {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}

const getDailyQuote = (): string => {
  const today = new Date();
  const seed =
    today.getFullYear() * 10000 +
    (today.getMonth() + 1) * 100 +
    today.getDate();
  return MOTIVATIONAL_QUOTES[seed % MOTIVATIONAL_QUOTES.length];
};

// ✅ Keys for persisting toggle states
const KEYS = {
  lastQuoteDate: 'lastQuoteNotificationDate',
  motivationalEnabled: 'motivationalEnabled',
  notificationsEnabled: 'notificationsEnabled',
};

// ✅ Save toggle states
export async function saveNotificationSettings(settings: {
  notificationsEnabled: boolean;
  motivationalEnabled: boolean;
}) {
  await AsyncStorage.setItem(KEYS.notificationsEnabled, JSON.stringify(settings.notificationsEnabled));
  await AsyncStorage.setItem(KEYS.motivationalEnabled, JSON.stringify(settings.motivationalEnabled));
}

// ✅ Load toggle states (returns defaults if never saved)
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
  // ✅ Check persisted setting before scheduling
  const { notificationsEnabled, motivationalEnabled } = await loadNotificationSettings();
  if (!notificationsEnabled || !motivationalEnabled) return; // ✅ Respect user's choice

  const { status } = await Notifications.requestPermissionsAsync();
  if (status !== 'granted') return;

  const today = new Date().toISOString().split('T')[0];
  const lastSent = await AsyncStorage.getItem(KEYS.lastQuoteDate);
  if (lastSent === today) return;

  await Notifications.cancelAllScheduledNotificationsAsync();

  await Notifications.scheduleNotificationAsync({
    content: {
      title: '🌟 Daily Motivation',
      body: getDailyQuote(),
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: 1,
    },
  });

  await AsyncStorage.setItem(KEYS.lastQuoteDate, today);
}

export async function resetNotificationForTesting() {
  await AsyncStorage.removeItem(KEYS.lastQuoteDate);
  await Notifications.cancelAllScheduledNotificationsAsync();
  console.log('🔔 Notification reset — will fire again on next dashboard mount');
}