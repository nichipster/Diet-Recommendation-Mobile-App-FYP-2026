import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function CalorieCard() {
  return (
    <View style={styles.summaryCard}>
      <View style={styles.calorieCenter}>
        <Text style={styles.calorieLabel}>Today's Calories</Text>
        <Text style={styles.calorieMain}>
          1,450 <Text style={styles.calorieGoal}>/ 2,000</Text>
        </Text>
      </View>

      <View style={styles.progressBarContainer}>
        <View style={styles.progressBarFill} />
      </View>

      <View style={styles.macroGrid}>
        <View style={styles.macroItem}>
          <Text style={[styles.macroValue, styles.carbsColor]}>125g</Text>
          <Text style={styles.macroLabel}>Carbs</Text>
          <Text style={styles.macroTarget}>of 275g</Text>
          <View style={styles.macroProgressBg}>
            <View style={[styles.macroProgressFill, styles.carbsBar, { width: '45%' }]} />
          </View>
        </View>
        <View style={styles.macroItem}>
          <Text style={[styles.macroValue, styles.proteinColor]}>65g</Text>
          <Text style={styles.macroLabel}>Protein</Text>
          <Text style={styles.macroTarget}>of 150g</Text>
          <View style={styles.macroProgressBg}>
            <View style={[styles.macroProgressFill, styles.proteinBar, { width: '43%' }]} />
          </View>
        </View>
        <View style={styles.macroItem}>
          <Text style={[styles.macroValue, styles.fatsColor]}>48g</Text>
          <Text style={styles.macroLabel}>Fats</Text>
          <Text style={styles.macroTarget}>of 65g</Text>
          <View style={styles.macroProgressBg}>
            <View style={[styles.macroProgressFill, styles.fatsBar, { width: '74%' }]} />
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  summaryCard: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 8,
    marginBottom: 24,
  },
  calorieCenter: {
    alignItems: 'center',
    marginBottom: 16,
  },
  calorieLabel: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 4,
  },
  calorieMain: {
    fontSize: 40,
    fontWeight: '700',
    color: '#111827',
  },
  calorieGoal: {
    fontSize: 18,
    color: '#9ca3af',
    fontWeight: '400',
  },
  progressBarContainer: {
    backgroundColor: '#f3f4f6',
    height: 16,
    borderRadius: 999,
    marginBottom: 16,
    overflow: 'hidden',
  },
  progressBarFill: {
    backgroundColor: '#10b981',
    height: '100%',
    width: '73%',
    borderRadius: 999,
  },
  macroGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  macroItem: {
    flex: 1,
    alignItems: 'center',
  },
  macroValue: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 4,
  },
  carbsColor: { color: '#f97316' },
  proteinColor: { color: '#3b82f6' },
  fatsColor: { color: '#eab308' },
  macroLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 2,
  },
  macroTarget: {
    fontSize: 11,
    color: '#9ca3af',
    marginBottom: 4,
  },
  macroProgressBg: {
    width: '80%',
    height: 4,
    backgroundColor: '#f3f4f6',
    borderRadius: 999,
    overflow: 'hidden',
  },
  macroProgressFill: {
    height: '100%',
    borderRadius: 999,
  },
  carbsBar: { backgroundColor: '#f97316' },
  proteinBar: { backgroundColor: '#3b82f6' },
  fatsBar: { backgroundColor: '#eab308' },
});