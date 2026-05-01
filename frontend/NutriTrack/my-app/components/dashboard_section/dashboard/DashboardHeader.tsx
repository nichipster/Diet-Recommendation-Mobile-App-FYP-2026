import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useUser } from '../../../context/UserContext';

export default function DashboardHeader() {
  const { user } = useUser();

  return (
    <View style={styles.header}>
        <Text style={styles.greetingTitle}>Hello, {user.firstName}! 👋</Text>
        <Text style={styles.greetingSubtitle}>Let's track your nutrition</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    backgroundColor: '#10b981',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 80,
    alignItems: 'center',
  },
  greetingTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 4,
  },
  greetingSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
  },
});