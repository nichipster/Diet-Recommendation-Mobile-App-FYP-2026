import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

const GOAL_TYPES = [
  { id: 'lose', emoji: '🔥', name: 'Lose Weight', desc: 'Calorie deficit' },
  { id: 'maintain', emoji: '⚖️', name: 'Maintain', desc: 'Stay balanced' },
  { id: 'gain', emoji: '💪', name: 'Gain Muscle', desc: 'Calorie surplus' },
];

type Props = {
  goalType: string;
  setGoalType: (v: string) => void;
  onNext: () => void;
};

export default function GoalTypeStep({ goalType, setGoalType, onNext }: Props) {
  return (
    <>
      <View style={styles.card}>
        <Text style={styles.tag}>STEP 1</Text>
        <Text style={styles.title}>What's your goal?</Text>
        <Text style={styles.sub}>This helps us calculate the right calorie targets for you.</Text>
        <View style={styles.grid}>
          {GOAL_TYPES.map(g => (
            <TouchableOpacity
              key={g.id}
              style={[styles.option, goalType === g.id && styles.optionSelected]}
              onPress={() => setGoalType(g.id)}
            >
              <Text style={styles.emoji}>{g.emoji}</Text>
              <Text style={[styles.name, goalType === g.id && styles.nameActive]}>{g.name}</Text>
              <Text style={styles.desc}>{g.desc}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <TouchableOpacity style={styles.btnPrimary} onPress={onNext}>
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
  tag: { fontSize: 11, fontWeight: '700', color: '#10b981', letterSpacing: 1, marginBottom: 6 },
  title: { fontSize: 20, fontWeight: '800', color: '#111827', marginBottom: 4 },
  sub: { fontSize: 13, color: '#6b7280', marginBottom: 20, lineHeight: 18 },
  grid: { flexDirection: 'row', gap: 8 },
  option: {
    flex: 1, borderWidth: 2, borderColor: '#f3f4f6',
    borderRadius: 14, padding: 12,
    alignItems: 'center', gap: 4, backgroundColor: '#fafafa',
  },
  optionSelected: { borderColor: '#10b981', backgroundColor: '#f0fdf4' },
  emoji: { fontSize: 26 },
  name: { fontSize: 11, fontWeight: '700', color: '#374151', textAlign: 'center' },
  nameActive: { color: '#10b981' },
  desc: { fontSize: 10, color: '#9ca3af', textAlign: 'center' },
  btnPrimary: {
    backgroundColor: '#10b981', borderRadius: 14,
    paddingVertical: 15, alignItems: 'center', marginBottom: 16,
    shadowColor: '#10b981', shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 4 }, shadowRadius: 12, elevation: 4,
  },
  btnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});