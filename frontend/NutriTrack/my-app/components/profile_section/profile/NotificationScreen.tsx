import React, { useState, useEffect } from 'react';
import { View, Text, Switch, StyleSheet, Alert } from 'react-native';
import { MOTIVATIONAL_QUOTES } from './motivational/motivational';
import {
  scheduleDailyQuoteNotification,
  saveNotificationSettings,
  loadNotificationSettings,
} from '../../utils/notification';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';

const getDailyQuote = (): string => {
  const today = new Date();
  const seed = today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate();
  return MOTIVATIONAL_QUOTES[seed % MOTIVATIONAL_QUOTES.length];
};

export default function NotificationsScreen() {
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [mealsEnabled, setMealsEnabled] = useState(true);
  const [waterEnabled, setWaterEnabled] = useState(true);
  const [motivationalEnabled, setMotivationalEnabled] = useState(true);
  const [dailyQuote] = useState<string>(getDailyQuote());

  // ✅ Load persisted toggle states on mount
  useEffect(() => {
    const loadSettings = async () => {
      const settings = await loadNotificationSettings();
      setNotificationsEnabled(settings.notificationsEnabled);
      setMotivationalEnabled(settings.motivationalEnabled);
    };
    loadSettings();
  }, []);

  const toggleNotifications = async (value: boolean) => {
    setNotificationsEnabled(value);
    await saveNotificationSettings({ notificationsEnabled: value, motivationalEnabled }); // ✅ persist

    if (!value) {
      await Notifications.cancelAllScheduledNotificationsAsync();
      await AsyncStorage.removeItem('lastQuoteNotificationDate');
    } else {
      if (motivationalEnabled) {
        await AsyncStorage.removeItem('lastQuoteNotificationDate');
        await scheduleDailyQuoteNotification();
      }
    }

    Alert.alert(
      value ? 'Notifications Enabled' : 'Notifications Disabled',
      value ? 'You will now receive reminders.' : 'All reminders have been turned off.'
    );
  };

  const toggleMeals = () => {
    const newValue = !mealsEnabled;
    setMealsEnabled(newValue);
    Alert.alert('Meals Reminder', newValue ? 'Notifications Enabled 🍎' : 'Notifications Disabled');
  };

  const toggleWater = () => {
    const newValue = !waterEnabled;
    setWaterEnabled(newValue);
    Alert.alert('Water Reminder', newValue ? 'Notifications Enabled 💧' : 'Notifications Disabled');
  };

  const toggleMotivational = async () => {
    const newValue = !motivationalEnabled;
    setMotivationalEnabled(newValue);
    await saveNotificationSettings({ notificationsEnabled, motivationalEnabled: newValue }); // ✅ persist

    if (!newValue) {
      await Notifications.cancelAllScheduledNotificationsAsync();
      await AsyncStorage.removeItem('lastQuoteNotificationDate');
    } else {
      await scheduleDailyQuoteNotification();
    }

    Alert.alert(
      'Motivational Quotes',
      newValue ? 'Motivational Quotes Enabled 🌟' : 'Motivational Quotes Disabled'
    );
  };

  return (
    <View style={styles.container}>
      {/* HEADER */}
      <View style={styles.header}>
        <Text style={styles.title}>Notifications 🔔</Text>
        <Text style={styles.subtitle}>Manage Your Reminders</Text>
      </View>

      {/* CONTENT */}
      <View style={styles.content}>
        <View style={styles.card}>
          <View style={styles.row}>
            <Text style={styles.label}>Enable Notifications</Text>
            <Switch
              value={notificationsEnabled}
              onValueChange={toggleNotifications}
              trackColor={{ true: '#10b981' }}
            />
          </View>
        </View>

        {notificationsEnabled && (
          <>
            <Text style={styles.sectionTitle}>Reminder Types</Text>

            <View style={styles.card}>
              <View style={styles.row}>
                <View>
                  <Text style={styles.label}>🍎 Meals Reminder</Text>
                  <Text style={styles.desc}>Log Your Meals Daily</Text>
                </View>
                <Switch
                  value={mealsEnabled}
                  onValueChange={toggleMeals}
                  trackColor={{ true: '#10b981' }}
                />
              </View>
            </View>

            <View style={styles.card}>
              <View style={styles.row}>
                <View>
                  <Text style={styles.label}>💧 Water Reminder</Text>
                  <Text style={styles.desc}>Stay Hydrated</Text>
                </View>
                <Switch
                  value={waterEnabled}
                  onValueChange={toggleWater}
                  trackColor={{ true: '#10b981' }}
                />
              </View>
            </View>

            <View style={styles.card}>
              <View style={styles.row}>
                <View>
                  <Text style={styles.label}>🌟 Motivational Quotes</Text>
                  <Text style={styles.desc}>Get Inspired Daily</Text>
                </View>
                <Switch
                  value={motivationalEnabled}
                  onValueChange={toggleMotivational}
                  trackColor={{ true: '#10b981' }}
                />
              </View>
            </View>

            {motivationalEnabled && (
              <View style={styles.quoteCard}>
                <Text style={styles.quoteTitle}>💬 Today's Quote</Text>
                <Text style={styles.quoteText}>{dailyQuote}</Text>
              </View>
            )}
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0fdf4',
  },
  header: {
    backgroundColor: '#10b981',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 60,
  },
  back: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 10,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
  },
  subtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 4,
  },
  content: {
    flex: 1,
    padding: 16,
    marginTop: -40,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#065f46',
    marginBottom: 10,
    marginTop: 10,
  },
  card: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 14,
    marginBottom: 12,
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111',
  },
  desc: {
    fontSize: 13,
    color: '#666',
    marginTop: 2,
  },
  quoteCard: {
    backgroundColor: '#d1fae5',
    padding: 16,
    borderRadius: 14,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#10b981',
  },
  quoteTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#065f46',
    marginBottom: 6,
  },
  quoteText: {
    fontSize: 14,
    color: '#065f46',
    fontStyle: 'italic',
    lineHeight: 20,
  },
});