import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { data } from '../CSConsts';
import { ALLERGIES } from '../constants/data';
import { styles } from '../styles/styles';

type Props = {
  data: data;
  update: (key: keyof data, value: any) => void;
  toggleAllergy: (allergy: string) => void;
};

export default function Dietary({ data, update, toggleAllergy }: Props) {
  return (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Any dietary preferences?</Text>
      <Text style={styles.stepSubtitle}>We'll exclude these from your food recommendations.</Text>

      <View style={styles.fieldGroup}>
      <Text style={styles.label}>Special diet</Text>
      {[
        { key: 'isVegan',      label: 'Vegan',       desc: 'No animal products'         },
        { key: 'isVegetarian', label: 'Vegetarian',  desc: 'No meat or fish'            },
        { key: 'isHalal',      label: 'Halal',       desc: 'Halal-certified foods only' },
        { key: 'isGlutenFree', label: 'Gluten-Free', desc: 'No gluten-containing foods' },
      ].map(item => {
        const isActive = data[item.key as keyof data] as boolean;
        return (
          <TouchableOpacity
            key={item.key}
            style={[styles.optionCard, isActive && styles.optionCardActive]}
            onPress={() => update(item.key as keyof data, !isActive)}
          >
            <View style={styles.optionTextGroup}>
              <Text style={[styles.optionLabel, isActive && styles.optionLabelActive]}>
                {item.label}
              </Text>
              <Text style={styles.optionDesc}>{item.desc}</Text>
            </View>
            <View style={[styles.checkbox, isActive && styles.checkboxChecked]}>
              {isActive && <Text style={styles.checkmark}>✓</Text>}
            </View>
          </TouchableOpacity>
        );
      })}
    </View>

    <View style={styles.fieldGroup}>
      <Text style={styles.label}>Allergies</Text>
      <Text style={styles.hint}>Select all that apply — we'll avoid these in recommendations.</Text>
      <View style={styles.allergyGrid}>
        {ALLERGIES.map(a => (
          <TouchableOpacity
            key={a}
            style={[styles.allergyChip, data.allergies.includes(a) && styles.allergyChipActive]}
            onPress={() => toggleAllergy(a)}
          >
            <Text style={[styles.allergyText, data.allergies.includes(a) && styles.allergyTextActive]}>
              {a}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
    </View>
  );
}