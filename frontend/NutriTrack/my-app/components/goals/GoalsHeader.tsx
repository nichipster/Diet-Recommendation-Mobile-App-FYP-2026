import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';

interface Props {
  onBack: () => void;
  backLabel: string;
}

export default function GoalsHeader({ onBack, backLabel }: Props) {
  return (
    <View style={styles.header}>
      <TouchableOpacity onPress={onBack} style={styles.backBtn}>
        <Text style={styles.backArrow}>‹</Text>
        <Text style={styles.backText}>{backLabel}</Text>
      </TouchableOpacity>
      <Text style={styles.title}>My Goals</Text>
      <Text style={styles.subtitle}>Personalise your daily targets</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    backgroundColor: '#10b981',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 72,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    marginBottom: 12,
  },
  backArrow: { fontSize: 26, color: '#fff', fontWeight: '300', lineHeight: 28 },
  backText:  { fontSize: 15, color: '#fff', fontWeight: '600' },
  title:    { fontSize: 26, fontWeight: '800', color: '#fff', letterSpacing: -0.5, textAlign: 'center' },
  subtitle: { fontSize: 14, color: 'rgba(255,255,255,0.75)', marginTop: 4, textAlign: 'center' },
});