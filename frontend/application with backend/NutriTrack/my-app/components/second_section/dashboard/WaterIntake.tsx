import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useGoals } from '../../../context/GoalsContext';

export default function WaterIntake() {
  const { waterGoalMl, waterGoalGlasses } = useGoals();
  const [glassesConsumed, setGlassesConsumed] = useState(0);

  const progressPercent = Math.min(
    (glassesConsumed / waterGoalGlasses) * 100, 100
  );

  const toggleGlass = (glass: number) => {
    if (glassesConsumed === glass) {
      setGlassesConsumed(glass - 1);
    } else {
      setGlassesConsumed(glass);
    }
  };

  return (
    <View style={styles.waterCard}>
      <View style={styles.waterHeader}>
        <Text style={styles.sectionTitle}>💧 Water Intake</Text>
        <Text style={styles.waterCount}>
          {glassesConsumed} / {waterGoalGlasses} glasses
        </Text>
      </View>

      <View style={styles.progressBarContainer}>
        <View style={[styles.waterBar, { width: `${progressPercent}%` }]} />
      </View>

      <Text style={styles.waterSubtext}>
        Recommended: {waterGoalGlasses} glasses ({waterGoalMl.toLocaleString()}ml) per day
      </Text>

      <View style={styles.waterGlasses}>
        {Array.from({ length: waterGoalGlasses }, (_, i) => i + 1).map((glass) => (
          <TouchableOpacity
            key={glass}
            style={[styles.glassBtn, glass <= glassesConsumed && styles.glassFilled]}
            onPress={() => toggleGlass(glass)}
          >
            <Text style={styles.glassEmoji}>
              {glass <= glassesConsumed ? '💧' : '🫙'}
            </Text>
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
    flexWrap: 'wrap',
    gap: 8,
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