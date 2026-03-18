import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { data, WeeklyGoal } from '../CSConsts';
import { WEEKLY_GOALS } from '../constants/data';
import { styles } from '../styles/styles';

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
          <TouchableOpacity
            key={wg.label}
            style={[styles.optionCard, data.weeklyGoal === wg.label && styles.optionCardActive]}
            onPress={() => update('weeklyGoal', wg.label as WeeklyGoal)}
          >
            <View style={styles.optionTextGroup}>
              <View style={styles.optionLabelRow}>
                <Text style={[styles.optionLabel, data.weeklyGoal === wg.label && styles.optionLabelActive]}>
                  {wg.label}
                </Text>
                {wg.recommended && (
                  <View style={styles.recommendedBadge}>
                    <Text style={styles.recommendedText}>Recommended</Text>
                  </View>
                )}
              </View>
              <Text style={[styles.optionDesc, { color: wg.color }]}>{wg.value}</Text>
            </View>
            <View style={[styles.radioOuter, data.weeklyGoal === wg.label && styles.radioOuterActive]}>
              {data.weeklyGoal === wg.label && <View style={styles.radioInner} />}
            </View>
          </TouchableOpacity>
        ))}
        {errors.weeklyGoal ? <Text style={styles.errorText}>{errors.weeklyGoal}</Text> : null}
      </View>
    </View>
  );
}