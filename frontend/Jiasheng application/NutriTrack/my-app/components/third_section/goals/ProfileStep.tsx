import React from 'react';
import { View, Text, TouchableOpacity, TextInput, StyleSheet } from 'react-native';

const ACTIVITY_LEVELS = [
  { id: 'sedentary', label: 'Sedentary', desc: 'Little or no exercise' },
  { id: 'light', label: 'Light', desc: '1–3 days/week' },
  { id: 'moderate', label: 'Moderate', desc: '3–5 days/week' },
  { id: 'active', label: 'Very Active', desc: '6–7 days/week' },
];

type Props = {
  gender: string; setGender: (v: string) => void;
  age: string; setAge: (v: string) => void;
  weight: string; setWeight: (v: string) => void;
  height: string; setHeight: (v: string) => void;
  desiredWeight: string; setDesiredWeight: (v: string) => void;
  goalType: string;
  activity: string; setActivity: (v: string) => void;
  onNext: () => void;
};

export default function ProfileStep({
  gender, setGender, age, setAge,
  weight, setWeight, height, setHeight,
  desiredWeight, setDesiredWeight,
  goalType,
  activity, setActivity, onNext,
}: Props) {
  return (
    <>
      <View style={styles.card}>
        <Text style={styles.tag}>STEP 2</Text>
        <Text style={styles.title}>Your Profile</Text>
        <Text style={styles.sub}>We use this to calculate your personalised nutrition targets.</Text>

        <Text style={styles.fieldLabel}>Gender</Text>
        <View style={styles.genderRow}>
          {['male', 'female'].map(g => (
            <TouchableOpacity
              key={g}
              style={[styles.genderBtn, gender === g && styles.genderSelected]}
              onPress={() => setGender(g)}
            >
              <Text style={styles.genderEmoji}>{g === 'male' ? '👨' : '👩'}</Text>
              <Text style={[styles.genderLabel, gender === g && styles.genderLabelActive]}>
                {g.charAt(0).toUpperCase() + g.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.inputRow}>
          {[
            { label: 'Age', unit: 'yrs', val: age, set: setAge, placeholder: '25' },
            { label: 'Weight', unit: 'kg', val: weight, set: setWeight, placeholder: '70' },
            { label: 'Height', unit: 'cm', val: height, set: setHeight, placeholder: '170' },
          ].map(f => (
            <View key={f.label} style={styles.inputGroup}>
              <Text style={styles.fieldLabel}>{f.label}</Text>
              <View style={styles.inputBox}>
                <TextInput
                  style={styles.input}
                  placeholder={f.placeholder}
                  placeholderTextColor="#9ca3af"
                  keyboardType="numeric"
                  value={f.val}
                  onChangeText={f.set}
                />
                <Text style={styles.inputUnit}>{f.unit}</Text>
              </View>
            </View>
          ))}
        </View>

        {goalType === 'lose' && (
          <View style={styles.desiredWeightBox}>
            <Text style={styles.desiredWeightLabel}>🎯 Desired Weight</Text>
            <Text style={styles.desiredWeightSub}>What is your target weight?</Text>
            <View style={styles.desiredWeightInputRow}>
              <View style={styles.desiredWeightInput}>
                <TextInput
                  style={styles.input}
                  placeholder="60"
                  placeholderTextColor="#9ca3af"
                  keyboardType="numeric"
                  value={desiredWeight}
                  onChangeText={setDesiredWeight}
                />
                <Text style={styles.inputUnit}>kg</Text>
              </View>
            </View>
          </View>
        )}
      </View>

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

      <TouchableOpacity style={styles.btnPrimary} onPress={onNext}>
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
  tag: { fontSize: 11, fontWeight: '700', color: '#10b981', letterSpacing: 1, marginBottom: 6 },
  title: { fontSize: 20, fontWeight: '800', color: '#111827', marginBottom: 4 },
  sub: { fontSize: 13, color: '#6b7280', marginBottom: 20, lineHeight: 18 },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 8, marginTop: 4 },
  genderRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  genderBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, padding: 12, borderRadius: 12,
    borderWidth: 2, borderColor: '#f3f4f6', backgroundColor: '#fafafa',
  },
  genderSelected: { borderColor: '#10b981', backgroundColor: '#f0fdf4' },
  genderEmoji: { fontSize: 20 },
  genderLabel: { fontSize: 14, fontWeight: '600', color: '#374151' },
  genderLabelActive: { color: '#10b981' },
  inputRow: { flexDirection: 'row', gap: 10, marginBottom: 8 },
  inputGroup: { flex: 1 },
  inputBox: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#f9fafb', borderRadius: 10,
    borderWidth: 1.5, borderColor: '#e5e7eb',
    paddingHorizontal: 10, paddingVertical: 10,
  },
  input: { flex: 1, fontSize: 16, fontWeight: '700', color: '#111827' },
  inputUnit: { fontSize: 12, color: '#9ca3af', fontWeight: '600' },
  desiredWeightBox: {
    backgroundColor: '#f0fdf4', borderRadius: 14, padding: 14,
    borderWidth: 1.5, borderColor: '#d1fae5', marginTop: 12,
  },
  desiredWeightLabel: { fontSize: 14, fontWeight: '700', color: '#10b981', marginBottom: 2 },
  desiredWeightSub: { fontSize: 12, color: '#6b7280', marginBottom: 10 },
  desiredWeightInputRow: { flexDirection: 'row' },
  desiredWeightInput: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fff', borderRadius: 10,
    borderWidth: 1.5, borderColor: '#d1fae5',
    paddingHorizontal: 10, paddingVertical: 10, flex: 1,
  },
  activityRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    padding: 12, borderRadius: 12, marginBottom: 8,
    backgroundColor: '#fafafa', borderWidth: 1.5, borderColor: '#f3f4f6',
  },
  activitySelected: { borderColor: '#10b981', backgroundColor: '#f0fdf4' },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#e5e7eb' },
  dotActive: { backgroundColor: '#10b981' },
  activityText: { flex: 1 },
  activityLabel: { fontSize: 14, fontWeight: '600', color: '#374151' },
  activityLabelActive: { color: '#10b981' },
  activityDesc: { fontSize: 12, color: '#9ca3af' },
  check: { fontSize: 14, color: '#10b981', fontWeight: '700' },
  btnPrimary: {
    backgroundColor: '#10b981', borderRadius: 14,
    paddingVertical: 15, alignItems: 'center', marginBottom: 16,
    shadowColor: '#10b981', shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 4 }, shadowRadius: 12, elevation: 4,
  },
  btnPrimaryText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});