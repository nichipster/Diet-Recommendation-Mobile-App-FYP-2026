import React from 'react';
import { View, Text, TextInput } from 'react-native';
import { styles } from '../styles/styles';

type Props = {
  label: string;
  placeholder: string;
  value: string;
  unit: string;
  error?: string;
  onChangeText: (v: string) => void;
  hint?: string;
};

export default function NumericField({ label, placeholder, value, unit, error, onChangeText, hint }: Props) {
  return (
    <View style={styles.fieldGroup}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.inputWithUnit}>
        <TextInput
          style={[styles.input, styles.inputFlex, error ? styles.inputError : null]}
          placeholder={placeholder}
          placeholderTextColor="#A0A0A0"
          keyboardType="numeric"
          value={value}
          onChangeText={onChangeText}
        />
        <Text style={styles.unit}>{unit}</Text>
      </View>
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}
    </View>
  );
}