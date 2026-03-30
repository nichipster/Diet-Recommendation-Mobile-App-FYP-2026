import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { data } from '../CSConsts';
import { CARDIO_OPTIONS } from '../constants/data';
import { styles } from '../styles/styles';

type Props = {
  data: data;
  update: (key: keyof data, value: any) => void;
};

export default function Cardio({ data, update }: Props) {
  return (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>How often do you do cardio?</Text>
      <Text style={styles.stepSubtitle}>Average number of cardio sessions per week.</Text>

      <View style={styles.fieldGroup}>
        <View style={styles.cardioGrid}>
          {CARDIO_OPTIONS.map(opt => (
            <TouchableOpacity
              key={opt}
              style={[styles.cardioBtn, data.cardioPerWeek === opt && styles.cardioBtnActive]}
              onPress={() => update('cardioPerWeek', opt)}
            >
              <Text style={[styles.cardioText, data.cardioPerWeek === opt && styles.cardioTextActive]}>
                {opt}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        <Text style={styles.hint}>💡 Helps fine-tune your daily calorie burn estimate.</Text>
      </View>
    </View>
  );
}