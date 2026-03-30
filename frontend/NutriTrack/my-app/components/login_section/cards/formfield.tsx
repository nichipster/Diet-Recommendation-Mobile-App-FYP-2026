import React from 'react';
import { View, Text, TextInput, KeyboardTypeOptions } from 'react-native';
import { styles } from '../styles/createaccountstyles';

type Props = {
  label: string;
  placeholder: string;
  value: string;
  error: string;
  onChangeText: (value: string) => void;
  onBlur?: () => void;
  secureTextEntry?: boolean;
  keyboardType?: KeyboardTypeOptions;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
};

export default function FormField({
  label, placeholder, value, error,
  onChangeText, onBlur,
  secureTextEntry = false,
  keyboardType = 'default',
  autoCapitalize = 'sentences',
}: Props) {
  return (
    <View style={styles.fieldGroup}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={[styles.input, error ? styles.inputError : null]}
        placeholder={placeholder}
        placeholderTextColor="#A0A0A0"
        value={value}
        onChangeText={onChangeText}
        onBlur={onBlur}
        secureTextEntry={secureTextEntry}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
      />
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );
}