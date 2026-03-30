import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { styles } from '../styles/styles';

type Props = {
  label: string;
  desc?: string;
  selected: boolean;
  onPress: () => void;
  badge?: React.ReactNode; // for the multiplier or "Recommended" badge
};

export default function OptionCard({ label, desc, selected, onPress, badge }: Props) {
  return (
    <TouchableOpacity
      style={[styles.optionCard, selected && styles.optionCardActive]}
      onPress={onPress}
    >
      <View style={styles.optionTextGroup}>
        <View style={styles.optionLabelRow}>
          <Text style={[styles.optionLabel, selected && styles.optionLabelActive]}>
            {label}
          </Text>
          {badge}
        </View>
        {desc && <Text style={styles.optionDesc}>{desc}</Text>}
      </View>
      <View style={[styles.radioOuter, selected && styles.radioOuterActive]}>
        {selected && <View style={styles.radioInner} />}
      </View>
    </TouchableOpacity>
  );
}