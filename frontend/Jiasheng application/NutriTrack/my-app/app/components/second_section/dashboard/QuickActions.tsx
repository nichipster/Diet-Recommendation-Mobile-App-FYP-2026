import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { router } from 'expo-router';

export default function QuickActions() {
  return (
    <View style={styles.card}>
      <Text style={styles.sectionTitle}>Quick Actions</Text>
      <View style={styles.actionsRow}>

        <TouchableOpacity style={styles.actionBtn} activeOpacity={0.7}
          onPress={() => router.push('/(tabs)/meal_logger' as any)}>
          <Text style={styles.actionEmoji}>🔍</Text>
          <Text style={styles.actionLabel}>Search</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionBtn} activeOpacity={0.7}
          onPress={() => router.push('/recommendmeal' as any)}>
          <Text style={styles.actionEmoji}>🍽️</Text>
          <Text style={styles.actionLabel}>Recommend Meal</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionBtn} activeOpacity={0.7}
          onPress={() => router.push('/(tabs)/meal_logger' as any)}>
          <Text style={styles.actionEmoji}>📷</Text>
          <Text style={styles.actionLabel}>Scan Barcode</Text>
        </TouchableOpacity>

      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 16,
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  actionBtn: {
    flex: 1,
    backgroundColor: '#f0fdf4',
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: '#d1fae5',
  },
  actionEmoji: { fontSize: 24 },
  actionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#065f46',
    textAlign: 'center',
  },
});