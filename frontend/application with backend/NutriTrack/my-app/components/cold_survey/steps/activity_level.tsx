import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { ActivityLevel, data } from '../CSConsts';
import { ACTIVITY_LEVELS } from '../constants/data';
import { styles } from '../styles/styles';

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
          <TouchableOpacity
            key={al.label}
            style={[styles.optionCard, data.activityLevel === al.label && styles.optionCardActive]}
            onPress={() => update('activityLevel', al.label as ActivityLevel)}
          >
            <View style={styles.optionTextGroup}>
              <View style={styles.optionLabelRow}>
                <Text style={[styles.optionLabel, data.activityLevel === al.label && styles.optionLabelActive]}>
                  {al.label}
                </Text>
                <Text style={styles.multiplierBadge}>{al.multiplier}</Text>
              </View>
              <Text style={styles.optionDesc}>{al.desc}</Text>
            </View>
            <View style={[styles.radioOuter, data.activityLevel === al.label && styles.radioOuterActive]}>
              {data.activityLevel === al.label && <View style={styles.radioInner} />}
            </View>
          </TouchableOpacity>
        ))}
        {errors.activityLevel ? <Text style={styles.errorText}>{errors.activityLevel}</Text> : null}
      </View>
    </View>
  );
}