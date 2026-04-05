import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

const WEEKLY_GOALS = [
  {
    id: 'conservative',
    label: 'Conservative',
    desc: '0.25kg per week',
    emoji: '🐢',
    sub: 'Slow and steady — easier to maintain',
  },
  {
    id: 'moderate',
    label: 'Moderate',
    desc: '0.5kg per week',
    emoji: '🚶',
    sub: 'Balanced approach — recommended for most',
  },
  {
    id: 'aggressive',
    label: 'Aggressive',
    desc: '1kg per week',
    emoji: '🚀',
    sub: 'Fast results — requires strict discipline',
  },
];

type Props = {
  weeklyGoal: string;
  setWeeklyGoal: (v: string) => void;
  onNext: () => void;
};

export default function WeeklyGoalStep({ weeklyGoal, setWeeklyGoal, onNext }: Props) {
  return (
    <>
      <View style={styles.card}>
        <Text style={styles.tag}>STEP 2</Text>
        <Text style={styles.title}>How fast do you want to progress?</Text>
        <Text style={styles.sub}>
          Choose a weekly rate that fits your lifestyle and commitment level.
        </Text>

        {WEEKLY_GOALS.map(g => (
          <TouchableOpacity
            key={g.id}
            style={[styles.option, weeklyGoal === g.id && styles.optionSelected]}
            onPress={() => setWeeklyGoal(g.id)}
          >
            <Text style={styles.emoji}>{g.emoji}</Text>
            <View style={styles.optionText}>
              <View style={styles.optionRow}>
                <Text style={[styles.label, weeklyGoal === g.id && styles.labelActive]}>
                  {g.label}
                </Text>
                <Text style={[styles.desc, weeklyGoal === g.id && styles.descActive]}>
                  {g.desc}
                </Text>
              </View>
              <Text style={styles.sub2}>{g.sub}</Text>
            </View>
            {weeklyGoal === g.id && <Text style={styles.check}>✓</Text>}
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity
        style={[styles.btnPrimary, !weeklyGoal && styles.btnDisabled]}
        onPress={onNext}
        disabled={!weeklyGoal}
      >
        <Text style={styles.btnText}>Continue →</Text>
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
  tag:  { fontSize: 11, fontWeight: '700', color: '#10b981', letterSpacing: 1, marginBottom: 6 },
  title:{ fontSize: 20, fontWeight: '800', color: '#111827', marginBottom: 4 },
  sub:  { fontSize: 13, color: '#6b7280', marginBottom: 20, lineHeight: 18 },
  option: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    padding: 14, borderRadius: 14, marginBottom: 10,
    backgroundColor: '#fafafa', borderWidth: 1.5, borderColor: '#f3f4f6',
  },
  optionSelected: { borderColor: '#10b981', backgroundColor: '#f0fdf4' },
  emoji:          { fontSize: 28 },
  optionText:     { flex: 1 },
  optionRow:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  label:          { fontSize: 14, fontWeight: '700', color: '#374151' },
  labelActive:    { color: '#10b981' },
  desc:           { fontSize: 12, fontWeight: '600', color: '#9ca3af' },
  descActive:     { color: '#10b981' },
  sub2:           { fontSize: 11, color: '#9ca3af', marginTop: 2 },
  check:          { fontSize: 14, color: '#10b981', fontWeight: '700' },
  btnPrimary: {
    backgroundColor: '#10b981', borderRadius: 14,
    paddingVertical: 15, alignItems: 'center', marginBottom: 16,
    shadowColor: '#10b981', shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 4 }, shadowRadius: 12, elevation: 4,
  },
  btnDisabled:    { backgroundColor: '#a7f3d0' },
  btnText:        { color: '#fff', fontSize: 15, fontWeight: '700' },
});