import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function GoalsHeader() {
  return (
    <View style={styles.header}>
      <Text style={styles.title}>My Goals </Text>
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
  title: { fontSize: 26, fontWeight: '800', color: '#fff', letterSpacing: -0.5 },
  subtitle: { fontSize: 14, color: 'rgba(255,255,255,0.75)', marginTop: 4 },
});