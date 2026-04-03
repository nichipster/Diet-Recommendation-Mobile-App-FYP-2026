import React, { useState, useEffect } from 'react';
import { View, Text, Switch, StyleSheet, Alert } from 'react-native';
import * as Notifications from 'expo-notifications';

// Define the notification types and their settings
type NotificationType = 'meals' | 'water';

type NotificationSettings = {
  [key in NotificationType]: boolean;
};

const NOTIFICATION_CONFIG: Record<NotificationType, { title: string; body: string; hour: number; minute: number }> = {
  meals: { title: '🍎 Meal Reminder', body: 'Log your meals today!', hour: 9, minute: 0 },
  water: { title: '💧 Water Reminder', body: 'Log your water intake to stay hydrated!', hour: 11, minute: 0 },
};

export default function NotificationsScreen() {
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [types, setTypes] = useState<NotificationSettings>({ meals: true, water: true });

  // Listen for incoming notifications
  useEffect(() => {
    const subscription = Notifications.addNotificationReceivedListener((notification: Notifications.Notification) => {
      console.log('Notification received:', notification);
    });
    return () => subscription.remove();
  }, []);

  // Toggle overall notifications
  const toggleNotifications = async (value: boolean) => {
    if (value) {
      const { status } = await Notifications.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission denied', 'Cannot send notifications without permission.');
        return;
      }
      Alert.alert('Notifications Enabled', 'You will receive selected notifications.');
    } else {
      await Notifications.cancelAllScheduledNotificationsAsync();
      Alert.alert('Notifications Disabled', 'All notifications have been turned off.');
    }
    setNotificationsEnabled(value);
  };

  // Toggle individual notification types
  const toggleType = (type: NotificationType) => {
    setTypes(prev => ({ ...prev, [type]: !prev[type] }));
  };

  // Schedule notifications based on enabled types
  const scheduleNotifications = async () => {
    if (!notificationsEnabled) return;

    await Notifications.cancelAllScheduledNotificationsAsync();

    for (const type of Object.keys(types) as NotificationType[]) {
      if (types[type]) {
        const config = NOTIFICATION_CONFIG[type];
        try {
          await Notifications.scheduleNotificationAsync({
            content: { title: config.title, body: config.body },
            trigger: { type: Notifications.SchedulableTriggerInputTypes.DAILY, hour: config.hour, minute: config.minute },
          });
        } catch (error) {
          console.error(`Failed to schedule ${type} notification:`, error);
        }
      }
    }
  };

  // Reschedule whenever notification settings change
  useEffect(() => {
    scheduleNotifications();
  }, [notificationsEnabled, types]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Notifications</Text>

      <View style={styles.row}>
        <Text style={styles.label}>Enable Notifications</Text>
        <Switch value={notificationsEnabled} onValueChange={toggleNotifications} />
      </View>

      {notificationsEnabled && (
        <>
          <Text style={styles.subtitle}>Select types of notifications:</Text>
          {Object.keys(types).map(type => (
            <View key={type} style={styles.row}>
              <Text style={styles.label}>{type.charAt(0).toUpperCase() + type.slice(1)}</Text>
              <Switch value={types[type as NotificationType]} onValueChange={() => toggleType(type as NotificationType)} />
            </View>
          ))}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, justifyContent: 'center' },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 20 },
  subtitle: { fontSize: 16, marginVertical: 10 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginVertical: 10 },
  label: { fontSize: 16 },
});