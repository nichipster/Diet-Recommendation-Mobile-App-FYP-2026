import React, { useState } from 'react';
import { View, Text, Switch, StyleSheet, Alert } from 'react-native';
import { router } from 'expo-router';

export default function NotificationsScreen() {
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [mealsEnabled, setMealsEnabled] = useState(true);
  const [waterEnabled, setWaterEnabled] = useState(true);

  // Toggle master notifications
  const toggleNotifications = (value: boolean) => {
    setNotificationsEnabled(value);
    Alert.alert(
      value ? 'Notifications Enabled' : 'Notifications Disabled',
      value
        ? 'You will now receive reminders.'
        : 'All reminders have been turned off.'
    );
  };

  // Toggle individual types
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

  return (
    <View style={styles.container}>
      {/* HEADER */}
      <View style={styles.header}>
        <Text style={styles.back} onPress={() => router.back()}>
          ← Back
        </Text>
        <Text style={styles.title}>Notifications 🔔</Text>
        <Text style={styles.subtitle}>Manage Your Reminders</Text>
      </View>

      {/* CONTENT */}
      <View style={styles.content}>
        {/* Master Toggle */}
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

        {/* Individual Toggles */}
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
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0fdf4', // light green
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
    marginTop: -40, // overlap cards into header
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
});