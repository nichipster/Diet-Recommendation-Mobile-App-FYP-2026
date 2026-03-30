import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { styles } from '../styles/styles';
import { data, Gender } from '../CSConsts';
import NumericField from '../cards/numericfield';

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

      {/* Gender */}
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

      {/* Date of Birth — three inputs side by side */}
      <View style={styles.fieldGroup}>
        <Text style={styles.label}>Date of Birth</Text>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <View style={{ flex: 1.2 }}>
            <NumericField
              label="Day"
              placeholder="D"
              value={data.dobDay}
              unit=""
              onChangeText={v => update('dobDay', v)}
            />
          </View>
          <View style={{ flex: 1.3 }}>
            <NumericField
              label="Month"
              placeholder="M"
              value={data.dobMonth}
              unit=""
              onChangeText={v => update('dobMonth', v)}
            />
          </View>
          <View style={{ flex: 1.5 }}>
            <NumericField
              label="Year"
              placeholder="YYYY"
              value={data.dobYear}
              unit=""
              onChangeText={v => update('dobYear', v)}
            />
          </View>
        </View>
        {errors.dobDay ? <Text style={styles.errorText}>{errors.dobDay}</Text> : null}
      </View>

      <NumericField
        label="Height"
        placeholder="170"
        value={data.height}
        unit="cm"
        error={errors.height}
        onChangeText={v => update('height', v)}
      />

      <NumericField
        label="Current Weight"
        placeholder="70"
        value={data.weight}
        unit="kg"
        error={errors.weight}
        onChangeText={v => update('weight', v)}
        hint="💡 Weigh yourself first thing in the morning, before eating or drinking."
      />
    </View>
  );
}