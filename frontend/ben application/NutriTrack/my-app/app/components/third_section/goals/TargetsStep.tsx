import React from 'react';
import { View, Text, TouchableOpacity, TextInput, StyleSheet } from 'react-native';

const GOAL_TYPES = [
  { id: 'lose', name: 'Lose Weight' },
  { id: 'maintain', name: 'Maintain' },
  { id: 'gain', name: 'Gain Muscle' },
];

const ACTIVITY_LEVELS = [
  { id: 'sedentary', label: 'Sedentary' },
  { id: 'light', label: 'Light' },
  { id: 'moderate', label: 'Moderate' },
  { id: 'active', label: 'Very Active' },
];

const MACROS = [
  { key: 'carbs', label: 'Carbs', emoji: '🌾', color: '#f97316' },
  { key: 'protein', label: 'Protein', emoji: '🥩', color: '#3b82f6' },
  { key: 'fats', label: 'Fats', emoji: '🥑', color: '#eab308' },
];

type Targets = { calories: number; protein: number; fats: number; carbs: number };

type Props = {
  targets: Targets;
  setTargets: (t: Targets) => void;
  goalType: string;
  activity: string;
  saved: boolean;
  onSave: () => void;
};

export default function TargetsStep({
  targets, setTargets, goalType, activity, saved, onSave,
}: Props) {
  return (
    <>
      <View style={styles.card}>
        <Text style={styles.tag}>STEP 3</Text>
        <Text style={styles.title}>Your Daily Targets</Text>
        <Text style={styles.sub}>
          Calculated based on your profile. You can adjust any value manually.
        </Text>

        <View style={styles.calorieBox}>
          <Text style={styles.calorieLabel}>Daily Calories</Text>
          <View style={styles.calorieRow}>
            <TextInput
              style={styles.calorieInput}
              value={String(targets.calories)}
              onChangeText={v => setTargets({ ...targets, calories: parseInt(v) || 0 })}
              keyboardType="numeric"
            />
            <Text style={styles.calorieUnit}>kcal</Text>
          </View>
        </View>

        {MACROS.map(macro => (
          <View key={macro.key} style={styles.macroRow}>
            <View style={[styles.macroIcon, { backgroundColor: macro.color + '20' }]}>
              <Text style={styles.macroEmoji}>{macro.emoji}</Text>
            </View>
            <View style={styles.macroInfo}>
              <Text style={styles.macroName}>{macro.label}</Text>
              <Text style={styles.macroHint}>Daily target</Text>
            </View>
            <View style={styles.macroInputBox}>
              <TextInput
                style={[styles.macroInput, { color: macro.color }]}
                value={String(targets[macro.key as keyof Targets])}
                onChangeText={v => setTargets({ ...targets, [macro.key]: parseInt(v) || 0 })}
                keyboardType="numeric"
              />
              <Text style={styles.macroUnit}>g</Text>
            </View>
          </View>
        ))}
      </View>

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

      <TouchableOpacity
        style={[styles.btnPrimary, saved && styles.btnSaved]}
        onPress={onSave}
      >
        <Text style={styles.btnPrimaryText}>{saved ? '✓ Saved!' : 'Save Goals'}</Text>
      </TouchableOpacity>
    </>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff', borderRadius: 20, padding: 20,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06, shadowRadius: 16, elevation: 3, marginBottom: 12,
  },
  tag: { fontSize: 11, fontWeight: '700', color: '#10b981', letterSpacing: 1, marginBottom: 6 },
  title: { fontSize: 20, fontWeight: '800', color: '#111827', marginBottom: 4 },
  sub: { fontSize: 13, color: '#6b7280', marginBottom: 20, lineHeight: 18 },
  calorieBox: {
    backgroundColor: '#f0fdf4', borderRadius: 16, padding: 16,
    alignItems: 'center', marginBottom: 20,
    borderWidth: 1.5, borderColor: '#d1fae5',
  },
  calorieLabel: { fontSize: 12, fontWeight: '600', color: '#10b981', marginBottom: 4 },
  calorieRow: { flexDirection: 'row', alignItems: 'baseline', gap: 4 },
  calorieInput: {
    fontSize: 42, fontWeight: '800', color: '#111827',
    textAlign: 'center', minWidth: 120,
  },
  calorieUnit: { fontSize: 16, color: '#6b7280', fontWeight: '600' },
  macroRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f3f4f6',
  },
  macroIcon: {
    width: 40, height: 40, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
  },
  macroEmoji: { fontSize: 20 },
  macroInfo: { flex: 1 },
  macroName: { fontSize: 14, fontWeight: '700', color: '#111827' },
  macroHint: { fontSize: 11, color: '#9ca3af' },
  macroInputBox: { flexDirection: 'row', alignItems: 'baseline', gap: 3 },
  macroInput: { fontSize: 22, fontWeight: '800', minWidth: 60, textAlign: 'right' },
  macroUnit: { fontSize: 13, color: '#6b7280', fontWeight: '600' },
  summaryPill: {
    backgroundColor: '#fff', borderRadius: 12, padding: 12,
    marginBottom: 12, borderWidth: 1, borderColor: '#e5e7eb', alignItems: 'center',
  },
  summaryText: { fontSize: 12, color: '#6b7280' },
  summaryBold: { color: '#111827', fontWeight: '700' },
  btnPrimary: {
    backgroundColor: '#10b981', borderRadius: 14,
    paddingVertical: 15, alignItems: 'center', marginBottom: 16,
    shadowColor: '#10b981', shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 4 }, shadowRadius: 12, elevation: 4,
  },
  btnSaved: { backgroundColor: '#059669' },
  btnPrimaryText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});