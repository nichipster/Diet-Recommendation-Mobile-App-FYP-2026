import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

type Props = {
  avgCalories: number; calorieGoal: number;
  avgProtein:  number; proteinGoal:  number;
  avgCarbs:    number; carbsGoal:    number;
  avgFats:     number; fatsGoal:     number;
};

function getColor(actual: number, goal: number): string {
  if (goal === 0) return '#9ca3af';
  const diff = Math.abs(actual - goal) / goal;
  if (diff <= 0.10) return '#10b981';
  if (diff <= 0.25) return '#f59e0b';
  return '#9ca3af';
}

function getStatus(actual: number, goal: number): string {
  if (goal === 0) return '—';
  const diff = Math.abs(actual - goal) / goal * 100;
  if (actual > goal) return `+${Math.round(diff)}% over`;
  if (actual < goal) return `${Math.round(diff)}% under`;
  return 'On target';
}

function StatBox({ label, actual, goal, unit }: { label: string; actual: number; goal: number; unit: string }) {
  const color = getColor(actual, goal);
  const status = getStatus(actual, goal);
  return (
    <View style={styles.box}>
      <Text style={styles.boxLabel}>{label}</Text>
      <Text style={[styles.boxNum, { color }]}>{actual}</Text>
      <Text style={styles.boxUnit}>{unit}</Text>
      <Text style={styles.boxGoal}>Goal {goal}{unit}</Text>
      <Text style={[styles.boxStatus, { color }]}>{status}</Text>
    </View>
  );
}

export default function MonthlyOverview({
  avgCalories, calorieGoal,
  avgProtein, proteinGoal,
  avgCarbs, carbsGoal,
  avgFats, fatsGoal,
}: Props) {
  return (
    <View style={styles.card}>
      <Text style={styles.title}>Monthly averages vs goal</Text>
      <Text style={styles.subtitle}>Average per logged day</Text>
      <View style={styles.grid}>
        <StatBox label="Calories" actual={avgCalories} goal={calorieGoal} unit=" kcal" />
        <StatBox label="Protein"  actual={avgProtein}  goal={proteinGoal}  unit="g" />
        <StatBox label="Carbs"    actual={avgCarbs}    goal={carbsGoal}    unit="g" />
        <StatBox label="Fats"     actual={avgFats}     goal={fatsGoal}     unit="g" />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff', borderRadius: 20, padding: 18,
    marginBottom: 14, shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06, shadowRadius: 12, elevation: 3,
  },
  title: { fontSize: 15, fontWeight: '700', color: '#111827', marginBottom: 2 },
  subtitle: { fontSize: 12, color: '#9ca3af', marginBottom: 14 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  box: {
    width: '47%', backgroundColor: '#f9fafb',
    borderRadius: 14, padding: 14, alignItems: 'center',
  },
  boxLabel: { fontSize: 11, fontWeight: '600', color: '#6b7280', marginBottom: 4 },
  boxNum: { fontSize: 26, fontWeight: '800' },
  boxUnit: { fontSize: 12, color: '#9ca3af', marginBottom: 2 },
  boxGoal: { fontSize: 11, color: '#9ca3af', marginBottom: 2 },
  boxStatus: { fontSize: 11, fontWeight: '700' },
});