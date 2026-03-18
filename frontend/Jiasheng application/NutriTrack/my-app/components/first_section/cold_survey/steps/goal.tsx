import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { data, Goal } from '../CSConsts';
import { styles } from '../styles/styles';

type Props = {
  data: data;
  errors: Partial<Record<keyof data, string>>;
  update: (key: keyof data, value: any) => void;
};

const GOALS = [
  { value: 'Lose', label: 'Lose weight', desc: 'Reduce body fat sustainably' },
  { value: 'Maintain', label: 'Maintain weight', desc: 'Keep current weight stable' },
  { value: 'Gain', label: 'Gain weight', desc: 'Build muscle and increase weight' },
];

export default function Goals({ data, errors, update }: Props) {
  return (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>What is your goal?</Text>
      <Text style={styles.stepSubtitle}>We'll tailor your calorie and macro targets accordingly.</Text>

      <View style={styles.fieldGroup}>
        {GOALS.map(g => (
          <TouchableOpacity
            key={g.value}
            style={[styles.optionCard, data.goal === g.value && styles.optionCardActive]}
            onPress={() => update('goal', g.value as Goal)}
          >
            <View style={styles.optionTextGroup}>
              <Text style={[styles.optionLabel, data.goal === g.value && styles.optionLabelActive]}>
                {g.label}
              </Text>
              <Text style={styles.optionDesc}>{g.desc}</Text>
            </View>
            <View style={[styles.radioOuter, data.goal === g.value && styles.radioOuterActive]}>
              {data.goal === g.value && <View style={styles.radioInner} />}
            </View>
          </TouchableOpacity>
        ))}
        {errors.goal ? <Text style={styles.errorText}>{errors.goal}</Text> : null}
      </View>
    </View>
  );
}