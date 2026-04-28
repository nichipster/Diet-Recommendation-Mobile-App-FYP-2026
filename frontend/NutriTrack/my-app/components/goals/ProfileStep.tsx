import React, { useState } from 'react';
import { View, Text, TouchableOpacity, TextInput, StyleSheet } from 'react-native';

const ACTIVITY_LEVELS = [
  { id: 'sedentary',      label: 'Sedentary',    desc: 'Little or no exercise' },
  { id: 'lightly_active', label: 'Light',         desc: '1–3 days/week' },
  { id: 'active',         label: 'Moderate',      desc: '3–5 days/week' },
  { id: 'very_active',    label: 'Very Active',   desc: '6–7 days/week' },
];

type Props = {
  weight: string; setWeight: (v: string) => void;
  desiredWeight: string; setDesiredWeight: (v: string) => void;
  goalType: string;
  activity: string; setActivity: (v: string) => void;
  onNext: () => void;
};

export default function ProfileStep({
  weight, setWeight,
  desiredWeight, setDesiredWeight,
  goalType, activity, setActivity, onNext,
}: Props) {

  const [errors, setErrors] = useState({
    weight: '', desiredWeight: '',
  });

  const validate = (): boolean => {
    const newErrors = { weight: '', desiredWeight: '' };
    let hasError = false;

    const weightNum = parseFloat(weight);
    if (!weight) {
      newErrors.weight = 'Weight is required';
      hasError = true;
    } else if (isNaN(weightNum) || weightNum < 30 || weightNum > 300) {
      newErrors.weight = 'Weight must be between 30 and 300 kg';
      hasError = true;
    }

    if (goalType === 'lose' && desiredWeight) {
      const dw = parseFloat(desiredWeight);
      const w = parseFloat(weight);
      if (isNaN(dw) || dw < 30 || dw > 300) {
        newErrors.desiredWeight = 'Desired weight must be between 30 and 300 kg';
        hasError = true;
      } else if (dw >= w) {
        newErrors.desiredWeight = 'Desired weight must be lower than your current weight';
        hasError = true;
      }
    }

    if (goalType === 'gain' && desiredWeight) {
      const dw = parseFloat(desiredWeight);
      const w = parseFloat(weight);
      if (isNaN(dw) || dw < 30 || dw > 300) {
        newErrors.desiredWeight = 'Desired weight must be between 30 and 300 kg';
        hasError = true;
      } else if (dw <= w) {
        newErrors.desiredWeight = 'Desired weight must be higher than your current weight';
        hasError = true;
      }
    }

    setErrors(newErrors);
    return !hasError;
  };

  const handleNext = () => {
    if (validate()) onNext();
  };

  return (
    <>
      <View style={styles.card}>
        <Text style={styles.tag}>STEP 2</Text>
        <Text style={styles.title}>Your Weight</Text>
        <Text style={styles.sub}>
          We'll use your profile data for calculations. Just confirm your current weight.
        </Text>

        {/* Weight */}
        <Text style={styles.fieldLabel}>Current Weight</Text>
        <View style={[styles.inputBox, errors.weight ? styles.inputBoxError : null]}>
          <TextInput
            style={styles.input}
            placeholder="70"
            placeholderTextColor="#9ca3af"
            keyboardType="numeric"
            value={weight}
            onChangeText={v => {
              setWeight(v);
              setErrors(e => ({ ...e, weight: '' }));
            }}
          />
          <Text style={styles.inputUnit}>kg</Text>
        </View>
        {errors.weight ? <Text style={styles.errorText}>{errors.weight}</Text> : null}

        {/* Desired weight */}
        {(goalType === 'lose' || goalType === 'gain') && (
          <View style={styles.desiredWeightBox}>
            <Text style={styles.desiredWeightLabel}>
              {goalType === 'lose' ? '🎯 Desired Weight' : '💪 Target Weight'}
            </Text>
            <Text style={styles.desiredWeightSub}>
              {goalType === 'lose'
                ? 'What is your target weight?'
                : 'What weight do you want to reach?'}
            </Text>
            <View style={[
              styles.desiredWeightInput,
              errors.desiredWeight ? styles.inputBoxError : null
            ]}>
              <TextInput
                style={styles.input}
                placeholder={goalType === 'lose' ? '60' : '80'}
                placeholderTextColor="#9ca3af"
                keyboardType="numeric"
                value={desiredWeight}
                onChangeText={v => {
                  setDesiredWeight(v);
                  setErrors(e => ({ ...e, desiredWeight: '' }));
                }}
              />
              <Text style={styles.inputUnit}>kg</Text>
            </View>
            {errors.desiredWeight ? (
              <Text style={styles.errorText}>{errors.desiredWeight}</Text>
            ) : null}
          </View>
        )}
      </View>

      {/* Activity Level */}
      <View style={styles.card}>
        <Text style={styles.fieldLabel}>Activity Level</Text>
        {ACTIVITY_LEVELS.map(a => (
          <TouchableOpacity
            key={a.id}
            style={[styles.activityRow, activity === a.id && styles.activitySelected]}
            onPress={() => setActivity(a.id)}
          >
            <View style={[styles.dot, activity === a.id && styles.dotActive]} />
            <View style={styles.activityText}>
              <Text style={[styles.activityLabel, activity === a.id && styles.activityLabelActive]}>
                {a.label}
              </Text>
              <Text style={styles.activityDesc}>{a.desc}</Text>
            </View>
            {activity === a.id && <Text style={styles.check}>✓</Text>}
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity style={styles.btnPrimary} onPress={handleNext}>
        <Text style={styles.btnPrimaryText}>Calculate →</Text>
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
  tag:       { fontSize: 11, fontWeight: '700', color: '#10b981', letterSpacing: 1, marginBottom: 6 },
  title:     { fontSize: 20, fontWeight: '800', color: '#111827', marginBottom: 4 },
  sub:       { fontSize: 13, color: '#6b7280', marginBottom: 20, lineHeight: 18 },
  fieldLabel:{ fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 8, marginTop: 4 },
  inputBox: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#f9fafb', borderRadius: 10,
    borderWidth: 1.5, borderColor: '#e5e7eb',
    paddingHorizontal: 10, paddingVertical: 10, marginBottom: 4,
  },
  inputBoxError: { borderColor: '#ef4444', backgroundColor: '#fff5f5' },
  input:     { flex: 1, fontSize: 16, fontWeight: '700', color: '#111827' },
  inputUnit: { fontSize: 12, color: '#9ca3af', fontWeight: '600' },
  errorText: { fontSize: 11, color: '#ef4444', marginTop: 4, fontWeight: '500' },
  desiredWeightBox: {
    backgroundColor: '#f0fdf4', borderRadius: 14, padding: 14,
    borderWidth: 1.5, borderColor: '#d1fae5', marginTop: 12,
  },
  desiredWeightLabel: { fontSize: 14, fontWeight: '700', color: '#10b981', marginBottom: 2 },
  desiredWeightSub:   { fontSize: 12, color: '#6b7280', marginBottom: 10 },
  desiredWeightInput: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fff', borderRadius: 10,
    borderWidth: 1.5, borderColor: '#d1fae5',
    paddingHorizontal: 10, paddingVertical: 10,
  },
  activityRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    padding: 12, borderRadius: 12, marginBottom: 8,
    backgroundColor: '#fafafa', borderWidth: 1.5, borderColor: '#f3f4f6',
  },
  activitySelected:    { borderColor: '#10b981', backgroundColor: '#f0fdf4' },
  dot:                 { width: 10, height: 10, borderRadius: 5, backgroundColor: '#e5e7eb' },
  dotActive:           { backgroundColor: '#10b981' },
  activityText:        { flex: 1 },
  activityLabel:       { fontSize: 14, fontWeight: '600', color: '#374151' },
  activityLabelActive: { color: '#10b981' },
  activityDesc:        { fontSize: 12, color: '#9ca3af' },
  check:               { fontSize: 14, color: '#10b981', fontWeight: '700' },
  btnPrimary: {
    backgroundColor: '#10b981', borderRadius: 14,
    paddingVertical: 15, alignItems: 'center', marginBottom: 16,
    shadowColor: '#10b981', shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 4 }, shadowRadius: 12, elevation: 4,
  },
  btnPrimaryText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});