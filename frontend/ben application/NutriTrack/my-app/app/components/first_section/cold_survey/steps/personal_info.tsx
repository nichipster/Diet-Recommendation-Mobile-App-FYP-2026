import React from 'react';
import { View, Text, TextInput } from 'react-native';
import { styles } from '../styles/styles';
import { data, Gender } from '../CSConsts';
import { TouchableOpacity } from 'react-native';

type Props = {
  data: data;
  errors: Partial<Record<keyof data, string>>;
  update: (key: keyof data, value: any) => void;
};

export default function PersonalInfo({ data, errors, update }: Props) {
  return (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Tell us about yourself</Text>
      <Text style={styles.stepSubtitle}>This helps us calculate your personalised nutrition targets.</Text>

      <View style={styles.fieldGroup}>
        <Text style={styles.label}>Gender</Text>
        <View style={styles.toggleRow}>
          {(['Male', 'Female'] as Gender[]).map(g => (
            <TouchableOpacity
              key={g}
              style={[styles.toggleBtn, data.gender === g && styles.toggleBtnActive]}
              onPress={() => update('gender', g)}
            >
              <Text style={[styles.toggleText, data.gender === g && styles.toggleTextActive]}>
                {g === 'Male' ? '♂  Male' : '♀  Female'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        {errors.gender ? <Text style={styles.errorText}>{errors.gender}</Text> : null}
      </View>

      <View style={styles.fieldGroup}>
        <Text style={styles.label}>Age</Text>
        <View style={styles.inputWithUnit}>
          <TextInput
            style={[styles.input, styles.inputFlex, errors.age ? styles.inputError : null]}
            placeholder="25" placeholderTextColor="#A0A0A0"
            keyboardType="numeric" value={data.age}
            onChangeText={v => update('age', v)}
          />
          <Text style={styles.unit}>years</Text>
        </View>
        {errors.age ? <Text style={styles.errorText}>{errors.age}</Text> : null}
      </View>

      <View style={styles.fieldGroup}>
        <Text style={styles.label}>Height</Text>
        <View style={styles.inputWithUnit}>
          <TextInput
            style={[styles.input, styles.inputFlex, errors.height ? styles.inputError : null]}
            placeholder="170" placeholderTextColor="#A0A0A0"
            keyboardType="numeric" value={data.height}
            onChangeText={v => update('height', v)}
          />
          <Text style={styles.unit}>cm</Text>
        </View>
        {errors.height ? <Text style={styles.errorText}>{errors.height}</Text> : null}
      </View>

      <View style={styles.fieldGroup}>
        <Text style={styles.label}>Current Weight</Text>
        <View style={styles.inputWithUnit}>
          <TextInput
            style={[styles.input, styles.inputFlex, errors.weight ? styles.inputError : null]}
            placeholder="70" placeholderTextColor="#A0A0A0"
            keyboardType="numeric" value={data.weight}
            onChangeText={v => update('weight', v)}
          />
          <Text style={styles.unit}>kg</Text>
        </View>
        <Text style={styles.hint}>💡 Weigh yourself first thing in the morning, before eating or drinking.</Text>
        {errors.weight ? <Text style={styles.errorText}>{errors.weight}</Text> : null}
      </View>
    </View>
  );
}