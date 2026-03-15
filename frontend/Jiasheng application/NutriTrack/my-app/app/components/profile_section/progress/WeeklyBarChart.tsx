import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

type Meal = { date: string; calories?: number };

type Props = {
  meals: Meal[];
  weekStart: Date;
  calorieGoal: number;
};

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function getBarColor(cal: number, goal: number): string {
  if (cal === 0) return '#e5e7eb';
  const diff = Math.abs(cal - goal) / goal;
  if (diff <= 0.10) return '#10b981';
  if (diff <= 0.25) return '#f59e0b';
  return '#9ca3af';
}

export default function WeeklyBarChart({ meals, weekStart, calorieGoal }: Props) {
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + i);
    return d.toISOString().split('T')[0];
  });

  const dailyCalories = days.map(date =>
    meals.filter(m => m.date === date).reduce((s, m) => s + (m.calories || 0), 0)
  );

  const maxVal = Math.max(...dailyCalories, calorieGoal, 1);

  return (
    <View style={styles.card}>
      <Text style={styles.title}>Daily calories this week</Text>
      <Text style={styles.subtitle}>Goal: {calorieGoal.toLocaleString()} kcal/day</Text>

      <View style={styles.barsRow}>
        {dailyCalories.map((cal, i) => {
          const heightPct = Math.round((cal / maxVal) * 100);
          const goalPct   = Math.round((calorieGoal / maxVal) * 100);
          return (
            <View key={i} style={styles.barCol}>
              <Text style={styles.calLabel}>{cal > 0 ? cal : '—'}</Text>
              <View style={styles.barTrack}>
                <View style={styles.barTrackInner}>
                  <View style={[
                    styles.barFill,
                    { height: `${heightPct}%` as any, backgroundColor: getBarColor(cal, calorieGoal) }
                  ]} />
                </View>
                <View style={[styles.goalLine, { bottom: `${goalPct}%` as any }]} />
              </View>
              <Text style={styles.dayLabel}>{DAY_LABELS[i]}</Text>
            </View>
          );
        })}
      </View>

      <View style={styles.goalHint}>
        <View style={styles.goalLineSample} />
        <Text style={styles.goalHintText}>Daily goal line</Text>
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
  subtitle: { fontSize: 12, color: '#9ca3af', marginBottom: 16 },
  barsRow: {
    flexDirection: 'row', alignItems: 'flex-end',
    height: 160, gap: 6, paddingBottom: 20,
  },
  barCol: {
    flex: 1, alignItems: 'center',
    height: '100%', justifyContent: 'flex-end',
  },
  calLabel: {
    fontSize: 9, color: '#6b7280',
    marginBottom: 4, textAlign: 'center',
  },
  barTrack: {
    flex: 1, width: '100%',
    position: 'relative', justifyContent: 'flex-end',
  },
  barTrackInner: {
    width: '100%', height: '100%',
    backgroundColor: '#f3f4f6', borderRadius: 6,
    justifyContent: 'flex-end', overflow: 'hidden',
  },
  barFill: { width: '100%', borderRadius: 6, minHeight: 4 },
  goalLine: {
    position: 'absolute', left: 0, right: 0,
    height: 2, backgroundColor: '#10b981',
  },
  dayLabel: {
    fontSize: 10, color: '#9ca3af',
    fontWeight: '600', marginTop: 4,
  },
  goalHint: {
    flexDirection: 'row', alignItems: 'center',
    gap: 6, marginTop: 8,
  },
  goalLineSample: {
    width: 16, height: 2, backgroundColor: '#10b981', borderRadius: 1,
  },
  goalHintText: { fontSize: 11, color: '#9ca3af' },
});