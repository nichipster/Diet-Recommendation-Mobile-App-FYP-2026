import React, { useState, useEffect } from 'react';
import { View, Text, Switch, StyleSheet, Alert } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Permissions from 'expo-permissions';

export default function NotificationsScreen() {
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [types, setTypes] = useState({
    meals: true,
    water: true,
  });

  useEffect(() => {
    const subscription = Notifications.addNotificationReceivedListener(notification => {
      console.log('Notification received:', notification);
    });
    return () => subscription.remove();
  }, []);

  const toggleNotifications = async (value) => {
    if (value) {
      const { status } = await Permissions.askAsync(Permissions.NOTIFICATIONS);
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

  const toggleType = (type) => {
    setTypes({ ...types, [type]: !types[type] });
  };

  const scheduleNotifications = async () => {
    if (!notificationsEnabled) return;

    await Notifications.cancelAllScheduledNotificationsAsync();

    if (types.meals) {
      await Notifications.scheduleNotificationAsync({
        content: { title: '🍎 Meal Reminder', body: 'Log your meals today!' },
        trigger: { hour: 9, minute: 0, repeats: true },
      });
    }

    if (types.water) {
      await Notifications.scheduleNotificationAsync({
        content: { title: '💧 Water Reminder', body: 'Log your water intake to stay hydrated!' },
        trigger: { hour: 11, minute: 0, repeats: true },
      });
    }
  };

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
          <View style={styles.row}>
            <Text style={styles.label}>Meals</Text>
            <Switch value={types.meals} onValueChange={() => toggleType('meals')} />
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Water</Text>
            <Switch value={types.water} onValueChange={() => toggleType('water')} />
          </View>
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