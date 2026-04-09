import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { router } from 'expo-router';
// remove later on AsyncStorage
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function QuickActions() {
  return (
    <View style={styles.card}>
      <Text style={styles.sectionTitle}>Quick Actions</Text>
      <View style={styles.actionsRow}>
        <TouchableOpacity style={styles.actionBtn} activeOpacity={0.7}
          onPress={() => Alert.alert('Coming Soon', 'Search is under construction.')}>
          <Text style={styles.actionEmoji}>🔍</Text>
          <Text style={styles.actionLabel}>Search</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionBtn} activeOpacity={0.7}
          onPress={() => router.push('/recommendmeal' as any)}>
          <Text style={styles.actionEmoji}>🍽️</Text>
          <Text style={styles.actionLabel}>Recommend Meal</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionBtn} activeOpacity={0.7}
          onPress={() => Alert.alert('Coming Soon', 'Scan Barcode is under construction.')}>
          <Text style={styles.actionEmoji}>📷</Text>
          <Text style={styles.actionLabel}>Scan Barcode</Text>
        </TouchableOpacity>
      </View>

      {/* remove later on */}
      {__DEV__ && (
        <View style={styles.devSection}>
          <Text style={styles.devLabel}>🧪 Dev Tools</Text>

          <TouchableOpacity
            style={styles.devBtn}
            onPress={async () => {
              await AsyncStorage.removeItem('nutritrack_promo_claimed');
              await AsyncStorage.removeItem('nutritrack_promo_last_shown');
              Alert.alert('Done', 'Promo reset. Restart the app.');
            }}
          >
            <Text style={styles.devBtnText}>Reset Promo</Text>
          </TouchableOpacity>
        </View>
      )}
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
  // remove later on
  devSection: {
    marginTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
    paddingTop: 12,
    gap: 8,
  },
  devLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#9ca3af',
    marginBottom: 4,
  },
  devBtn: {
    backgroundColor: '#f59e0b',
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  devBtnText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 13,
  },
});