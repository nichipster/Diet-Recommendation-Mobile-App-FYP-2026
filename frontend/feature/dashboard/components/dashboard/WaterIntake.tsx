import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

export default function WaterIntake() {
  return (
    <View style={styles.waterCard}>
      <View style={styles.waterHeader}>
        <Text style={styles.sectionTitle}>💧 Water Intake</Text>
        <Text style={styles.waterCount}>5 / 8 glasses</Text>
      </View>
      <View style={styles.progressBarContainer}>
        <View style={styles.waterBar} />
      </View>
      <Text style={styles.waterSubtext}>Recommended: 8 glasses (2,000ml) per day</Text>
      <View style={styles.waterGlasses}>
        {[1,2,3,4,5,6,7,8].map((glass) => (
          <TouchableOpacity key={glass} style={[styles.glassBtn, glass <= 5 && styles.glassFilled]}>
            <Text style={styles.glassEmoji}>{glass <= 5 ? '💧' : '🫙'}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  waterCard: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 24,
    marginTop: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  waterHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  waterCount: {
    fontSize: 14,
    fontWeight: '700',
    color: '#3b82f6',
  },
  progressBarContainer: {
    backgroundColor: '#f3f4f6',
    height: 16,
    borderRadius: 999,
    marginBottom: 8,
    overflow: 'hidden',
  },
  waterBar: {
    backgroundColor: '#3b82f6',
    height: '100%',
    width: '62.5%',
    borderRadius: 999,
  },
  waterSubtext: {
    fontSize: 12,
    color: '#9ca3af',
    marginTop: 4,
    marginBottom: 16,
  },
  waterGlasses: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  glassBtn: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  glassFilled: {
    backgroundColor: '#dbeafe',
  },
  glassEmoji: {
    fontSize: 18,
  },
});