import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const STEPS = ['Goal', 'Profile', 'Targets'];

export default function StepIndicator({ currentStep }: { currentStep: number }) {
  return (
    <View style={styles.card}>
      {STEPS.map((label, i) => (
        <React.Fragment key={i}>
          <View style={styles.stepItem}>
            <View style={[
              styles.circle,
              i < currentStep && styles.circleDone,
              i === currentStep && styles.circleActive,
            ]}>
              <Text style={[
                styles.circleText,
                (i === currentStep || i < currentStep) && styles.circleTextActive,
              ]}>
                {i < currentStep ? '✓' : i + 1}
              </Text>
            </View>
            <Text style={[styles.label, i === currentStep && styles.labelActive]}>
              {label}
            </Text>
          </View>
          {i < STEPS.length - 1 && (
            <View style={[styles.line, i < currentStep && styles.lineDone]} />
          )}
        </React.Fragment>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 24,
    elevation: 6,
    marginBottom: 14,
  },
  stepItem: { alignItems: 'center', gap: 4 },
  circle: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: '#f3f4f6',
    alignItems: 'center', justifyContent: 'center',
  },
  circleActive: {
    backgroundColor: '#10b981',
    shadowColor: '#10b981',
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 4,
  },
  circleDone: { backgroundColor: '#d1fae5' },
  circleText: { fontSize: 12, fontWeight: '700', color: '#9ca3af' },
  circleTextActive: { color: '#fff' },
  label: { fontSize: 10, fontWeight: '600', color: '#9ca3af' },
  labelActive: { color: '#10b981' },
  line: { flex: 1, height: 2, backgroundColor: '#f3f4f6', marginBottom: 16 },
  lineDone: { backgroundColor: '#d1fae5' },
});