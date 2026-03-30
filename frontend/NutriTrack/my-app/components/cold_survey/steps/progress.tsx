import React from 'react';
import { Text, View } from 'react-native';
import { data, WeeklyGoal } from '../CSConsts';
import { WEEKLY_GOALS } from '../constants/data';
import { styles } from '../styles/styles';
import OptionCard from '../cards/optioncard';

type Props = {
  data: data;
  errors: Partial<Record<keyof data, string>>;
  update: (key: keyof data, value: any) => void;
};

export default function Progress({ data, errors, update }: Props) {
  return (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>How fast do you want to progress?</Text>
      <Text style={styles.stepSubtitle}>We recommend Moderate for sustainable results.</Text>

      <View style={styles.fieldGroup}>
        {WEEKLY_GOALS.map(wg => (
          <OptionCard
            key={wg.label}
            label={wg.label}
            desc={wg.value}
            selected={data.weeklyGoal === wg.label}
            onPress={() => update('weeklyGoal', wg.label as WeeklyGoal)}
            badge={
              wg.recommended ? (
                <View style={styles.recommendedBadge}>
                  <Text style={styles.recommendedText}>Recommended</Text>
                </View>
              ) : undefined
            }
          />
        ))}
        {errors.weeklyGoal ? <Text style={styles.errorText}>{errors.weeklyGoal}</Text> : null}
      </View>
    </View>
  );
}