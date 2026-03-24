import React from 'react';
import { ScrollView, TouchableOpacity, Text, StyleSheet, View } from 'react-native';

type Week = { label: string; start: Date; end: Date };

type Props = {
  weeks: Week[];
  selectedWeek: number | null;
  onSelect: (week: number | null) => void;
};

export default function WeekFilter({ weeks, selectedWeek, onSelect }: Props) {
  return (
    <View style={styles.wrapper}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
        <TouchableOpacity
          style={[styles.pill, selectedWeek === null && styles.pillActive]}
          onPress={() => onSelect(null)}
        >
          <Text style={[styles.pillText, selectedWeek === null && styles.pillTextActive]}>
            Monthly
          </Text>
        </TouchableOpacity>
        {weeks.map((w, i) => (
          <TouchableOpacity
            key={i}
            style={[styles.pill, selectedWeek === i && styles.pillActive]}
            onPress={() => onSelect(i)}
          >
            <Text style={[styles.pillText, selectedWeek === i && styles.pillTextActive]}>
              {w.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { marginBottom: 14 },
  row: { gap: 8, paddingVertical: 2 },
  pill: {
    paddingHorizontal: 16, paddingVertical: 7,
    borderRadius: 20, backgroundColor: '#fff',
    borderWidth: 1, borderColor: '#e5e7eb',
  },
  pillActive: { backgroundColor: '#10b981', borderColor: '#10b981' },
  pillText: { fontSize: 13, fontWeight: '600', color: '#374151' },
  pillTextActive: { color: '#fff' },
});