import React from 'react';
import { Text, View } from 'react-native';
import { data, Goal } from '../CSConsts';
import { styles } from '../styles/styles';
import OptionCard from '../cards/optioncard';

type Props = {
  data: data;
  errors: Partial<Record<keyof data, string>>;
  update: (key: keyof data, value: any) => void;
};

const GOALS = [
  { value: 'Lose', label: 'Lose weight', desc: 'Reduce body fat sustainably' },
  { value: 'Maintain', label: 'Maintain weight', desc: 'Keep current weight stable' },
  { value: 'Gain', label: 'Gain muscle', desc: 'Build muscle and increase weight' },
];

export default function Goals({ data, errors, update }: Props) {
  return (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>What is your goal?</Text>
      <Text style={styles.stepSubtitle}>We'll tailor your calorie and macro targets accordingly.</Text>

      <View style={styles.fieldGroup}>
        {GOALS.map(g => (
          <OptionCard
            key={g.value}
            label={g.label}
            desc={g.desc}
            selected={data.goal === g.value}
            onPress={() => update('goal', g.value as Goal)}
          />
        ))}
        {errors.goal ? <Text style={styles.errorText}>{errors.goal}</Text> : null}
      </View>
    </View>
  );
}