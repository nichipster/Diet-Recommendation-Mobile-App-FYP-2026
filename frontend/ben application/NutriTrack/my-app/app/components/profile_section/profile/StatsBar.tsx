import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function StatsBar() {
  return (
    <View style={styles.card}>
      <View style={styles.statItem}>
        <Text style={styles.statNumber}>🔥 23</Text>
        <Text style={styles.statLabel}>Day Streak</Text>
      </View>
      <View style={styles.divider} />
      <View style={styles.statItem}>
        <Text style={styles.statNumber}>🍽️ 14</Text>
        <Text style={styles.statLabel}>Meals Logged</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 24,
    marginHorizontal: 16,
    marginTop: -52,
    padding: 20,
    flexDirection: 'row',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 24,
    elevation: 6,
    marginBottom: 16,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 22,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#6b7280',
    fontWeight: '600',
  },
  divider: {
    width: 1,
    backgroundColor: '#f3f4f6',
    marginVertical: 4,
  },
});