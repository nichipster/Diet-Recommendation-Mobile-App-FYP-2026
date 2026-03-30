import React from 'react';
import { Text, TextInput, View } from 'react-native';
import { WeightLogic } from '../constants/weightconsts';
import { data } from '../CSConsts';
import { styles } from '../styles/styles';

type Props = {
  data: data;
  errors: Partial<Record<keyof data, string>>;
  update: (key: keyof data, value: any) => void;
};

export default function Weight({ data, errors, update }: Props) {
    const WeightError = WeightLogic(data) || errors.goalWeight;

  return (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>
        {data.goal === 'Lose' ? 'What is your target weight?' : 'What weight do you want to reach?'}
      </Text>
      <Text style={styles.stepSubtitle}>
        Current weight: <Text style={styles.highlight}>{data.weight} kg</Text>
      </Text>

      <View style={styles.fieldGroup}>
        <Text style={styles.label}>Goal weight</Text>
        <View style={styles.inputWithUnit}>
          <TextInput
            style={[styles.input, styles.inputFlex, errors.goalWeight ? styles.inputError : null]}
            placeholder={data.goal === 'Lose' ? '65' : '80'}
            placeholderTextColor="#A0A0A0"
            keyboardType="numeric"
            value={data.goalWeight}
            onChangeText={v => update('goalWeight', v)}
          />
          <Text style={styles.unit}>kg</Text>
        </View>
        {WeightError ? <Text style={styles.errorText}>{WeightError}</Text> : null}

        {data.goalWeight && !isNaN(Number(data.goalWeight)) && !WeightError && (
        <View style={styles.diffBadge}>
            <Text style={styles.diffText}>
            {data.goal === 'Lose' ? '↓' : '↑'}{' '}
            {Math.abs(Number(data.weight) - Number(data.goalWeight)).toFixed(1)} kg to go
            </Text>
        </View>
        )}
      </View>
    </View>
  );
}