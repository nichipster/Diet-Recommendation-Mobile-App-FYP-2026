import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

type Props = {
  protein: number;
  carbs: number;
  fats: number;
};

export default function MacroDonut({ protein, carbs, fats }: Props) {
  const proteinCal = protein * 4;
  const carbsCal   = carbs   * 4;
  const fatsCal    = fats    * 9;
  const total      = proteinCal + carbsCal + fatsCal || 1;

  const proteinPct = Math.round((proteinCal / total) * 100);
  const carbsPct   = Math.round((carbsCal   / total) * 100);
  const fatsPct    = Math.round((fatsCal    / total) * 100);

  const macros = [
    { label: 'Carbs',   pct: carbsPct,   color: '#f97316', grams: carbs   },
    { label: 'Protein', pct: proteinPct, color: '#3b82f6', grams: protein },
    { label: 'Fats',    pct: fatsPct,    color: '#eab308', grams: fats    },
  ];

  return (
    <View style={styles.card}>
      <Text style={styles.title}>Macro split (average day)</Text>
      <Text style={styles.subtitle}>Based on calorie contribution per macro</Text>

      <View style={styles.stackedBar}>
        {macros.map(m => (
          <View
            key={m.label}
            style={[
              styles.stackedSegment,
              { width: `${m.pct}%` as any, backgroundColor: m.color }
            ]}
          />
        ))}
      </View>

      {macros.map(m => (
        <View key={m.label} style={styles.row}>
          <View style={[styles.dot, { backgroundColor: m.color }]} />
          <Text style={styles.rowLabel}>{m.label}</Text>
          <View style={styles.barTrack}>
            <View style={[
              styles.barFill,
              { width: `${m.pct}%` as any, backgroundColor: m.color }
            ]} />
          </View>
          <Text style={[styles.pctText, { color: m.color }]}>{m.pct}%</Text>
          <Text style={styles.gramText}>{m.grams}g</Text>
        </View>
      ))}
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
  stackedBar: {
    flexDirection: 'row', height: 12,
    borderRadius: 6, overflow: 'hidden',
    backgroundColor: '#f3f4f6', marginBottom: 16,
  },
  stackedSegment: { height: '100%' },
  row: {
    flexDirection: 'row', alignItems: 'center',
    gap: 8, marginBottom: 10,
  },
  dot: { width: 10, height: 10, borderRadius: 5, flexShrink: 0 },
  rowLabel: { fontSize: 13, fontWeight: '600', color: '#374151', width: 52 },
  barTrack: {
    flex: 1, height: 7, backgroundColor: '#f3f4f6',
    borderRadius: 4, overflow: 'hidden',
  },
  barFill: { height: '100%', borderRadius: 4 },
  pctText: { fontSize: 13, fontWeight: '800', width: 36, textAlign: 'right' },
  gramText: { fontSize: 12, color: '#9ca3af', width: 36, textAlign: 'right' },
});