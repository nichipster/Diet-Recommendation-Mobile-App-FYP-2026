import React, { useRef, useState } from 'react';
import { View, Text, TouchableOpacity, TextInput, StyleSheet } from 'react-native';

const ACTIVITY_LEVELS = [
  { id: 'sedentary',      label: 'Sedentary',    desc: 'Little or no exercise' },
  { id: 'lightly_active', label: 'Light',         desc: '1–3 days/week' },
  { id: 'active',         label: 'Moderate',      desc: '3–5 days/week' },
  { id: 'very_active',    label: 'Very Active',   desc: '6–7 days/week' },
];

type Props = {
  gender: string; setGender: (v: string) => void;
  dob: string; setDob: (v: string) => void;  // ← changed from age
  weight: string; setWeight: (v: string) => void;
  height: string; setHeight: (v: string) => void;
  desiredWeight: string; setDesiredWeight: (v: string) => void;
  goalType: string;
  activity: string; setActivity: (v: string) => void;
  onNext: () => void;
};

export default function ProfileStep({
  gender, setGender, dob, setDob,  // ← changed from age
  weight, setWeight, height, setHeight,
  desiredWeight, setDesiredWeight,
  goalType, activity, setActivity, onNext,
}: Props) {

  const [errors, setErrors] = useState({
    dob: '', weight: '', height: '', desiredWeight: '',  // ← changed from age
  });

  const monthRef = useRef<TextInput>(null);
  const yearRef  = useRef<TextInput>(null);

  const validateDob = (value: string): boolean => {
    const parts = value.split('-');
    if (parts.length !== 3 || !parts[0] || !parts[1] || !parts[2]) return false;
    if (parts[2].length < 4) return false;

    const [day, month, year] = parts.map(Number);
    const date = new Date(year, month - 1, day);

    if (
      isNaN(date.getTime()) ||
      date.getDate() !== day ||
      date.getMonth() !== month - 1 ||
      date.getFullYear() !== year
    ) return false;

    const today = new Date();
    let age = today.getFullYear() - date.getFullYear();
    const m = today.getMonth() - date.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < date.getDate())) age--;

    return age >= 10 && age <= 100;
  };

  const validate = (): boolean => {
    const newErrors = { dob: '', weight: '', height: '', desiredWeight: '' };
    let hasError = false;

    if (!dob || !validateDob(dob)) {
      newErrors.dob = 'Please enter a valid date of birth (age must be 10–100)';
      hasError = true;
    }

    const weightNum = parseFloat(weight);
    if (!weight) {
      newErrors.weight = 'Weight is required';
      hasError = true;
    } else if (isNaN(weightNum) || weightNum < 30 || weightNum > 150) {
      newErrors.weight = 'Weight must be between 30 and 150 kg';
      hasError = true;
    }

    const heightNum = parseFloat(height);
    if (!height) {
      newErrors.height = 'Height is required';
      hasError = true;
    } else if (isNaN(heightNum) || heightNum < 100 || heightNum > 210) {
      newErrors.height = 'Height must be between 100 and 210 cm';
      hasError = true;
    }

    if (goalType === 'lose' && desiredWeight) {
      const dw = parseFloat(desiredWeight);
      const w = parseFloat(weight);
      if (isNaN(dw) || dw < 30 || dw > 150) {
        newErrors.desiredWeight = 'Desired weight must be between 30 and 150 kg';
        hasError = true;
      } else if (dw >= w) {
        newErrors.desiredWeight = 'Desired weight must be lower than your current weight';
        hasError = true;
      }
    }

    if (goalType === 'gain' && desiredWeight) {
      const dw = parseFloat(desiredWeight);
      const w = parseFloat(weight);
      if (isNaN(dw) || dw < 30 || dw > 150) {
        newErrors.desiredWeight = 'Desired weight must be between 30 and 150 kg';
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
        <Text style={styles.title}>Your Profile</Text>
        <Text style={styles.sub}>We use this to calculate your personalised nutrition targets.</Text>

        {/* Gender */}
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

        {/* Date of Birth */}
        <Text style={styles.fieldLabel}>Date of Birth</Text>
        <View style={styles.dobRow}>
          <View style={styles.dobGroup}>
            <TextInput
              style={[styles.dobInput, errors.dob ? styles.inputBoxError : null]}
              value={dob.split('-')[0] ?? ''}
              onChangeText={v => {
                const clean = v.replace(/[^0-9]/g, '').slice(0, 2);
                const parts = dob.split('-');
                const next = `${clean}-${parts[1] ?? ''}-${parts[2] ?? ''}`;
                setDob(next);
                setErrors(e => ({ ...e, dob: '' }));
                if (clean.length === 2) monthRef.current?.focus();
              }}
              keyboardType="number-pad"
              placeholder="DD"
              placeholderTextColor="#9ca3af"
              maxLength={2}
            />
            <Text style={styles.dobLabel}>Day</Text>
          </View>

          <Text style={styles.dobSeparator}>-</Text>

          <View style={styles.dobGroup}>
            <TextInput
              ref={monthRef}
              style={[styles.dobInput, errors.dob ? styles.inputBoxError : null]}
              value={dob.split('-')[1] ?? ''}
              onChangeText={v => {
                const clean = v.replace(/[^0-9]/g, '').slice(0, 2);
                const parts = dob.split('-');
                const next = `${parts[0] ?? ''}-${clean}-${parts[2] ?? ''}`;
                setDob(next);
                setErrors(e => ({ ...e, dob: '' }));
                if (clean.length === 2) yearRef.current?.focus();
              }}
              keyboardType="number-pad"
              placeholder="MM"
              placeholderTextColor="#9ca3af"
              maxLength={2}
            />
            <Text style={styles.dobLabel}>Month</Text>
          </View>

          <Text style={styles.dobSeparator}>-</Text>

          <View style={styles.dobGroup}>
            <TextInput
              ref={yearRef}
              style={[styles.dobInput, errors.dob ? styles.inputBoxError : null]}
              value={dob.split('-')[2] ?? ''}
              onChangeText={v => {
                const clean = v.replace(/[^0-9]/g, '').slice(0, 4);
                const parts = dob.split('-');
                const next = `${parts[0] ?? ''}-${parts[1] ?? ''}-${clean}`;
                setDob(next);
                setErrors(e => ({ ...e, dob: '' }));
              }}
              keyboardType="number-pad"
              placeholder="YYYY"
              placeholderTextColor="#9ca3af"
              maxLength={4}
            />
            <Text style={styles.dobLabel}>Year</Text>
          </View>
        </View>
        {errors.dob ? <Text style={styles.errorText}>{errors.dob}</Text> : null}

        {/* Weight / Height */}
        <View style={styles.inputRow}>
          {[
            { label: 'Weight', unit: 'kg', val: weight, set: setWeight, placeholder: '70', errorKey: 'weight' },
            { label: 'Height', unit: 'cm', val: height, set: setHeight, placeholder: '170', errorKey: 'height' },
          ].map(f => (
            <View key={f.label} style={styles.inputGroup}>
              <Text style={styles.fieldLabel}>{f.label}</Text>
              <View style={[
                styles.inputBox,
                errors[f.errorKey as keyof typeof errors] ? styles.inputBoxError : null
              ]}>
                <TextInput
                  style={styles.input}
                  placeholder={f.placeholder}
                  placeholderTextColor="#9ca3af"
                  keyboardType="numeric"
                  value={f.val}
                  onChangeText={v => {
                    f.set(v);
                    setErrors(e => ({ ...e, [f.errorKey]: '' }));
                  }}
                />
                <Text style={styles.inputUnit}>{f.unit}</Text>
              </View>
              {errors[f.errorKey as keyof typeof errors] ? (
                <Text style={styles.errorText}>{errors[f.errorKey as keyof typeof errors]}</Text>
              ) : null}
            </View>
          ))}
        </View>

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
  dobRow:      { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4, marginBottom: 4 },
  dobGroup:    { flex: 1, alignItems: 'center', gap: 4 },
  dobInput: {
    width: '100%', textAlign: 'center', fontSize: 16, fontWeight: '700',
    color: '#111827', backgroundColor: '#f9fafb', borderRadius: 10,
    borderWidth: 1.5, borderColor: '#e5e7eb', paddingHorizontal: 8, paddingVertical: 10,
  },
  dobSeparator: { fontSize: 18, fontWeight: '700', color: '#9ca3af', marginBottom: 16 },
  dobLabel:    { fontSize: 11, color: '#9ca3af', fontWeight: '600' },
  inputRow: { flexDirection: 'row', gap: 10, marginBottom: 8, marginTop: 12 },
  inputGroup: { flex: 1 },
  inputBox: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#f9fafb', borderRadius: 10,
    borderWidth: 1.5, borderColor: '#e5e7eb',
    paddingHorizontal: 10, paddingVertical: 10,
  },
  inputBoxError: { borderColor: '#ef4444', backgroundColor: '#fff5f5' },
  input: { flex: 1, fontSize: 16, fontWeight: '700', color: '#111827' },
  inputUnit: { fontSize: 12, color: '#9ca3af', fontWeight: '600' },
  errorText: { fontSize: 11, color: '#ef4444', marginTop: 4, fontWeight: '500' },
  desiredWeightBox: {
    backgroundColor: '#f0fdf4', borderRadius: 14, padding: 14,
    borderWidth: 1.5, borderColor: '#d1fae5', marginTop: 12,
  },
  desiredWeightLabel: { fontSize: 14, fontWeight: '700', color: '#10b981', marginBottom: 2 },
  desiredWeightSub: { fontSize: 12, color: '#6b7280', marginBottom: 10 },
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