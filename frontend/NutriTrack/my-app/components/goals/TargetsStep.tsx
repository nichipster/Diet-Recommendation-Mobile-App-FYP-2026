import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const GOAL_TYPES = [
  { id: 'lose', name: 'Lose Weight' },
  { id: 'maintain', name: 'Maintain' },
  { id: 'gain', name: 'Gain Muscle' },
];

const ACTIVITY_LEVELS = [
  { id: 'sedentary',      label: 'Sedentary' },
  { id: 'lightly_active', label: 'Light' },
  { id: 'active',         label: 'Moderate' },
  { id: 'very_active',    label: 'Very Active' },
];

const MACROS = [
  { key: 'carbs',   label: 'Carbs',   emoji: '🌾', color: '#f97316' },
  { key: 'protein', label: 'Protein', emoji: '🥩', color: '#3b82f6' },
  { key: 'fats',    label: 'Fats',    emoji: '🥑', color: '#eab308' },
];

type Targets = { calories: number; protein: number; fats: number; carbs: number };

type Props = {
  targets: Targets;
  goalType: string;
  activity: string;
  projectedGoalDate?: string; // ← add this
};

export default function TargetsStep({ targets, goalType, activity, projectedGoalDate }: Props) {
  return (
    <>
      <View style={styles.card}>
        <Text style={styles.tag}>YOUR TARGETS</Text>
        <Text style={styles.title}>Goal Saved ✓</Text>
        <Text style={styles.sub}>
          Your daily nutrition targets have been calculated and saved.
        </Text>

        {/* Calories */}
        <View style={styles.calorieBox}>
          <Text style={styles.calorieLabel}>Daily Calories</Text>
          <View style={styles.calorieRow}>
            <Text style={styles.calorieValue}>{targets.calories}</Text>
            <Text style={styles.calorieUnit}>kcal</Text>
          </View>
        </View>

        {/* Macros */}
        {MACROS.map(macro => (
          <View key={macro.key} style={styles.macroRow}>
            <View style={[styles.macroIcon, { backgroundColor: macro.color + '20' }]}>
              <Text style={styles.macroEmoji}>{macro.emoji}</Text>
            </View>
            <View style={styles.macroInfo}>
              <Text style={styles.macroName}>{macro.label}</Text>
              <Text style={styles.macroHint}>Daily target</Text>
            </View>
            <View style={styles.macroValueBox}>
              <Text style={[styles.macroValue, { color: macro.color }]}>
                {targets[macro.key as keyof Targets]}
              </Text>
              <Text style={styles.macroUnit}>g</Text>
            </View>
          </View>
        ))}
      </View>

      {/* Summary */}
      <View style={styles.summaryPill}>
        <Text style={styles.summaryText}>
          🎯 Goal: <Text style={styles.summaryBold}>
            {GOAL_TYPES.find(g => g.id === goalType)?.name}
          </Text>
          {'  •  '}
          Activity: <Text style={styles.summaryBold}>
            {ACTIVITY_LEVELS.find(a => a.id === activity)?.label}
          </Text>
        </Text>
      </View>

      {/* Projected goal date */}
      {projectedGoalDate && (
        <View style={styles.projectedBox}>
          <Text style={styles.projectedLabel}>📅 Projected Goal Date</Text>
          <Text style={styles.projectedDate}>{projectedGoalDate}</Text>
          <Text style={styles.projectedSub}>
            Based on your current weight and weekly goal rate
          </Text>
        </View>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff', borderRadius: 20, padding: 20,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06, shadowRadius: 16, elevation: 3, marginBottom: 12,
  },
  tag:   { fontSize: 11, fontWeight: '700', color: '#10b981', letterSpacing: 1, marginBottom: 6 },
  title: { fontSize: 20, fontWeight: '800', color: '#111827', marginBottom: 4 },
  sub:   { fontSize: 13, color: '#6b7280', marginBottom: 20, lineHeight: 18 },
  calorieBox: {
    backgroundColor: '#f0fdf4', borderRadius: 16, padding: 16,
    alignItems: 'center', marginBottom: 20,
    borderWidth: 1.5, borderColor: '#d1fae5',
  },
  calorieLabel: { fontSize: 12, fontWeight: '600', color: '#10b981', marginBottom: 4 },
  calorieRow:   { flexDirection: 'row', alignItems: 'baseline', gap: 4 },
  calorieValue: { fontSize: 42, fontWeight: '800', color: '#111827' },
  calorieUnit:  { fontSize: 16, color: '#6b7280', fontWeight: '600' },
  macroRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f3f4f6',
  },
  macroIcon: {
    width: 40, height: 40, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
  },
  macroEmoji:    { fontSize: 20 },
  macroInfo:     { flex: 1 },
  macroName:     { fontSize: 14, fontWeight: '700', color: '#111827' },
  macroHint:     { fontSize: 11, color: '#9ca3af' },
  macroValueBox: { flexDirection: 'row', alignItems: 'baseline', gap: 3 },
  macroValue:    { fontSize: 22, fontWeight: '800', minWidth: 60, textAlign: 'right' },
  macroUnit:     { fontSize: 13, color: '#6b7280', fontWeight: '600' },
  summaryPill: {
    backgroundColor: '#fff', borderRadius: 12, padding: 12,
    marginBottom: 12, borderWidth: 1, borderColor: '#e5e7eb', alignItems: 'center',
  },
  summaryText:  { fontSize: 12, color: '#6b7280' },
  summaryBold:  { color: '#111827', fontWeight: '700' },
  projectedBox: {
    backgroundColor: '#fff', borderRadius: 16, padding: 16,
    borderWidth: 1.5, borderColor: '#d1fae5', alignItems: 'center', marginBottom: 16,
  },
  projectedLabel: { fontSize: 12, fontWeight: '600', color: '#10b981', marginBottom: 4 },
  projectedDate:  { fontSize: 24, fontWeight: '800', color: '#111827', marginBottom: 4 },
  projectedSub:   { fontSize: 11, color: '#9ca3af', textAlign: 'center' },
});