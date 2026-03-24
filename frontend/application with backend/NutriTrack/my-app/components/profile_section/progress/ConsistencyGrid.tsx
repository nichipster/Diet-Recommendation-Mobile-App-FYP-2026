import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

type Meal = { date: string; calories?: number };

type Props = {
  meals: Meal[];
  selectedMonth: number;
  selectedYear: number;
};

export default function ConsistencyGrid({ meals, selectedMonth, selectedYear }: Props) {
  const daysInMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate();
  const loggedDays  = new Set(meals.map(m => m.date));

  const caloriesPerDay: Record<string, number> = {};
  meals.forEach(m => {
    caloriesPerDay[m.date] = (caloriesPerDay[m.date] || 0) + (m.calories || 0);
  });

  const today = new Date().toISOString().split('T')[0];

  const bestStreak = (() => {
    let best = 0, current = 0;
    for (let i = 1; i <= daysInMonth; i++) {
      const d = new Date(selectedYear, selectedMonth, i);
      const key = d.toISOString().split('T')[0];
      if (loggedDays.has(key)) { current++; best = Math.max(best, current); }
      else { current = 0; }
    }
    return best;
  })();

  const currentStreak = (() => {
    let count = 0;
    const d = new Date();
    while (true) {
      const key = d.toISOString().split('T')[0];
      if (!loggedDays.has(key)) break;
      count++;
      d.setDate(d.getDate() - 1);
    }
    return count;
  })();

  return (
    <View style={styles.card}>
      <Text style={styles.title}>Logging consistency</Text>

      <View style={styles.streakRow}>
        <View style={styles.streakBox}>
          <Text style={styles.streakNum}>{loggedDays.size}</Text>
          <Text style={styles.streakLbl}>Days logged</Text>
        </View>
        <View style={styles.streakBox}>
          <Text style={styles.streakNum}>{currentStreak}</Text>
          <Text style={styles.streakLbl}>Current streak</Text>
        </View>
        <View style={styles.streakBox}>
          <Text style={styles.streakNum}>{bestStreak}</Text>
          <Text style={styles.streakLbl}>Best streak</Text>
        </View>
      </View>

      <View style={styles.grid}>
        {Array.from({ length: daysInMonth }, (_, i) => {
          const d   = new Date(selectedYear, selectedMonth, i + 1);
          const key = d.toISOString().split('T')[0];
          const cal = caloriesPerDay[key] || 0;
          const isFuture = key > today;
          let bg = '#f3f4f6';
          if (!isFuture && loggedDays.has(key)) {
            bg = cal >= 500 ? '#10b981' : '#d1fae5';
          }
          return (
            <View key={i} style={[styles.gridCell, { backgroundColor: bg }]}>
              <Text style={styles.gridDay}>{i + 1}</Text>
            </View>
          );
        })}
      </View>

      <View style={styles.gridLegend}>
        <View style={styles.gridLegendRow}>
          <View style={[styles.gridDot, { backgroundColor: '#10b981' }]} />
          <Text style={styles.gridLegendText}>Fully logged</Text>
        </View>
        <View style={styles.gridLegendRow}>
          <View style={[styles.gridDot, { backgroundColor: '#d1fae5' }]} />
          <Text style={styles.gridLegendText}>Partially logged</Text>
        </View>
        <View style={styles.gridLegendRow}>
          <View style={[styles.gridDot, { backgroundColor: '#f3f4f6' }]} />
          <Text style={styles.gridLegendText}>Not logged</Text>
        </View>
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
  title: { fontSize: 15, fontWeight: '700', color: '#111827', marginBottom: 12 },
  streakRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  streakBox: {
    flex: 1, backgroundColor: '#f0fdf4',
    borderRadius: 12, padding: 10, alignItems: 'center',
  },
  streakNum: { fontSize: 22, fontWeight: '800', color: '#10b981' },
  streakLbl: { fontSize: 10, color: '#6b7280', marginTop: 2, textAlign: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginBottom: 12 },
  gridCell: {
    width: 34, height: 34, borderRadius: 8,
    alignItems: 'center', justifyContent: 'center',
  },
  gridDay: { fontSize: 10, fontWeight: '600', color: '#374151' },
  gridLegend: { flexDirection: 'row', gap: 14 },
  gridLegendRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  gridDot: { width: 8, height: 8, borderRadius: 4 },
  gridLegendText: { fontSize: 11, color: '#6b7280' },
});