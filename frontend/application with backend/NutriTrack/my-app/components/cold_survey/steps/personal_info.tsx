import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { styles } from '../styles/styles';
import { data, Gender } from '../CSConsts';
import NumericField from '../cards/numericfield';

type Props = {
  data: data;
  errors: Partial<Record<keyof data, string>>;
  update: (key: keyof data, value: any) => void;
};

export default function PersonalInfo({ data, errors, update }: Props) {
  return (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Tell us about yourself</Text>
      <Text style={styles.stepSubtitle}>This helps us calculate your personalised nutrition targets.</Text>

      <View style={styles.fieldGroup}>
        <Text style={styles.label}>Gender</Text>
        <View style={styles.toggleRow}>
          {(['Male', 'Female'] as Gender[]).map(g => (
            <TouchableOpacity
              key={g}
              style={[styles.toggleBtn, data.gender === g && styles.toggleBtnActive]}
              onPress={() => update('gender', g)}
            >
              <Text style={[styles.toggleText, data.gender === g && styles.toggleTextActive]}>
                {g === 'Male' ? '♂  Male' : '♀  Female'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        {errors.gender ? <Text style={styles.errorText}>{errors.gender}</Text> : null}
      </View>

      <NumericField
        label="Age"
        placeholder="25"
        value={data.age}
        unit="years"
        error={errors.age}
        onChangeText={v => update('age', v)}
      />

      <NumericField
        label="Height"
        placeholder="170"
        value={data.height}
        unit="cm"
        error={errors.height}
        onChangeText={v => update('height', v)}
      />

      <NumericField
        label="Current Weight"
        placeholder="70"
        value={data.weight}
        unit="kg"
        error={errors.weight}
        onChangeText={v => update('weight', v)}
        hint="💡 Weigh yourself first thing in the morning, before eating or drinking."
      />

    </View>
  );
}