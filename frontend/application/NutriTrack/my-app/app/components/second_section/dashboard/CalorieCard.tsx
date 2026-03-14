import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useGoals } from '../../../context/GoalsContext';

export default function CalorieCard() {
  const { targets, goalsSaved, meals } = useGoals();

  const calorieGoal  = goalsSaved ? targets.calories : 2000;
  const carbsGoal    = goalsSaved ? targets.carbs    : 275;
  const proteinGoal  = goalsSaved ? targets.protein  : 150;
  const fatsGoal     = goalsSaved ? targets.fats     : 65;

  // Only sum meals from today
  const today = new Date().toISOString().split('T')[0];
  const todayMeals = meals.filter(m => m.date === today);

  const currentCalories = todayMeals.reduce((sum, m) => sum + (m.calories || 0), 0);
  const currentCarbs    = todayMeals.reduce((sum, m) => sum + (m.carbs    || 0), 0);
  const currentProtein  = todayMeals.reduce((sum, m) => sum + (m.protein  || 0), 0);
  const currentFats     = todayMeals.reduce((sum, m) => sum + (m.fats     || 0), 0);

  const caloriePercent = Math.min((currentCalories / calorieGoal) * 100, 100);
  const carbsPercent   = Math.min((currentCarbs    / carbsGoal)   * 100, 100);
  const proteinPercent = Math.min((currentProtein  / proteinGoal) * 100, 100);
  const fatsPercent    = Math.min((currentFats     / fatsGoal)    * 100, 100);

  return (
    <View style={styles.summaryCard}>
      <View style={styles.calorieCenter}>
        <Text style={styles.calorieLabel}>Today's Calories</Text>
        <Text style={styles.calorieMain}>
          {currentCalories.toLocaleString()}{' '}
          <Text style={styles.calorieGoal}>/ {calorieGoal.toLocaleString()}</Text>
        </Text>
      </View>

      <View style={styles.progressBarContainer}>
        <View style={[styles.progressBarFill, { width: `${caloriePercent}%` }]} />
      </View>

      <View style={styles.macroGrid}>
        <View style={styles.macroItem}>
          <Text style={[styles.macroValue, styles.carbsColor]}>{currentCarbs}g</Text>
          <Text style={styles.macroLabel}>Carbs</Text>
          <Text style={styles.macroTarget}>of {carbsGoal}g</Text>
          <View style={styles.macroProgressBg}>
            <View style={[styles.macroProgressFill, styles.carbsBar, { width: `${carbsPercent}%` }]} />
          </View>
        </View>
        <View style={styles.macroItem}>
          <Text style={[styles.macroValue, styles.proteinColor]}>{currentProtein}g</Text>
          <Text style={styles.macroLabel}>Protein</Text>
          <Text style={styles.macroTarget}>of {proteinGoal}g</Text>
          <View style={styles.macroProgressBg}>
            <View style={[styles.macroProgressFill, styles.proteinBar, { width: `${proteinPercent}%` }]} />
          </View>
        </View>
        <View style={styles.macroItem}>
          <Text style={[styles.macroValue, styles.fatsColor]}>{currentFats}g</Text>
          <Text style={styles.macroLabel}>Fats</Text>
          <Text style={styles.macroTarget}>of {fatsGoal}g</Text>
          <View style={styles.macroProgressBg}>
            <View style={[styles.macroProgressFill, styles.fatsBar, { width: `${fatsPercent}%` }]} />
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
  calorieCenter: { alignItems: 'center', marginBottom: 16 },
  calorieLabel: { fontSize: 14, color: '#6b7280', marginBottom: 4 },
  calorieMain: { fontSize: 40, fontWeight: '700', color: '#111827' },
  calorieGoal: { fontSize: 18, color: '#9ca3af', fontWeight: '400' },
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
    borderRadius: 999,
  },
  macroGrid: { flexDirection: 'row', justifyContent: 'space-between' },
  macroItem: { flex: 1, alignItems: 'center' },
  macroValue: { fontSize: 24, fontWeight: '700', marginBottom: 4 },
  carbsColor: { color: '#f97316' },
  proteinColor: { color: '#3b82f6' },
  fatsColor: { color: '#eab308' },
  macroLabel: { fontSize: 12, color: '#6b7280', marginBottom: 2 },
  macroTarget: { fontSize: 11, color: '#9ca3af', marginBottom: 4 },
  macroProgressBg: {
    width: '80%',
    height: 4,
    backgroundColor: '#f3f4f6',
    borderRadius: 999,
    overflow: 'hidden',
  },
  macroProgressFill: { height: '100%', borderRadius: 999 },
  carbsBar: { backgroundColor: '#f97316' },
  proteinBar: { backgroundColor: '#3b82f6' },
  fatsBar: { backgroundColor: '#eab308' },
});