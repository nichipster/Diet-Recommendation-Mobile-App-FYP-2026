import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

export default function QuickActions() {
  return (
    <View style={styles.quickActions}>
      <TouchableOpacity style={styles.actionBtn}>
        <View style={[styles.actionIcon, styles.scanBg]}>
          <Text style={styles.actionEmoji}>📸</Text>
        </View>
        <Text style={styles.actionText}>Scan Barcode</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.actionBtn}>
        <View style={[styles.actionIcon, styles.searchBg]}>
          <Text style={styles.actionEmoji}>🔍</Text>
        </View>
        <Text style={styles.actionText}>Search</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.actionBtn}>
        <View style={[styles.actionIcon, styles.favoritesBg]}>
          <Text style={styles.actionEmoji}>⭐</Text>
        </View>
        <Text style={styles.actionText}>Favorites</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  quickActions: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
    marginTop: 20,
  },
  actionBtn: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  actionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  actionEmoji: {
    fontSize: 22,
  },
  scanBg: { backgroundColor: '#d1fae5' },
  searchBg: { backgroundColor: '#dbeafe' },
  favoritesBg: { backgroundColor: '#e9d5ff' },
  actionText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
  },
});