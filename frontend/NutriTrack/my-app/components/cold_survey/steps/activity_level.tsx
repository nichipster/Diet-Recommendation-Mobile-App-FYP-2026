import React from 'react';
import { Text, View } from 'react-native';
import { ActivityLevel, data } from '../CSConsts';
import { ACTIVITY_LEVELS } from '../constants/data';
import { styles } from '../styles/styles';
import OptionCard from '../cards/optioncard';

type Props = {
  data: data;
  errors: Partial<Record<keyof data, string>>;
  update: (key: keyof data, value: any) => void;
};

export default function ActivityLevels({ data, errors, update }: Props) {
  return (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>How active are you?</Text>
      <Text style={styles.stepSubtitle}>Be honest — this directly affects your calorie target.</Text>

      <View style={styles.fieldGroup}>
        {ACTIVITY_LEVELS.map(al => (
          <OptionCard
            key={al.label}
            label={al.label}
            desc={al.desc}
            selected={data.activityLevel === al.label}
            onPress={() => update('activityLevel', al.label as ActivityLevel)}
            badge={<Text style={styles.multiplierBadge}>{al.multiplier}</Text>}
          />
        ))}
        {errors.activityLevel ? <Text style={styles.errorText}>{errors.activityLevel}</Text> : null}
      </View>
    </View>
  );
}