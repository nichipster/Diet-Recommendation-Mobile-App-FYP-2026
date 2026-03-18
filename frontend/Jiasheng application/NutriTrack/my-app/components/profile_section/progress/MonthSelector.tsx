import React from 'react';
import { ScrollView, TouchableOpacity, Text, StyleSheet, View } from 'react-native';

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

type Props = {
  selectedMonth: number;
  selectedYear: number;
  onSelect: (month: number) => void;
};

export default function MonthSelector({ selectedMonth, selectedYear, onSelect }: Props) {
  const currentMonth = new Date().getMonth();
  return (
    <View style={styles.wrapper}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
        {MONTHS.map((m, i) => {
          const isActive = i === selectedMonth;
          const isFuture = i > currentMonth;
          return (
            <TouchableOpacity
              key={m}
              style={[styles.pill, isActive && styles.pillActive, isFuture && styles.pillDisabled]}
              onPress={() => !isFuture && onSelect(i)}
              disabled={isFuture}
            >
              <Text style={[styles.pillText, isActive && styles.pillTextActive, isFuture && styles.pillTextDisabled]}>
                {m}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { marginBottom: 12 },
  row: { gap: 8, paddingVertical: 2 },
  pill: {
    paddingHorizontal: 16, paddingVertical: 7,
    borderRadius: 20, backgroundColor: '#fff',
    borderWidth: 1, borderColor: '#e5e7eb',
  },
  pillActive: { backgroundColor: '#10b981', borderColor: '#10b981' },
  pillDisabled: { backgroundColor: '#f9fafb', borderColor: '#f3f4f6' },
  pillText: { fontSize: 13, fontWeight: '600', color: '#374151' },
  pillTextActive: { color: '#fff' },
  pillTextDisabled: { color: '#d1d5db' },
});