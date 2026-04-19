import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { Meal } from './meal-form';
import { FoodData } from './database-search';

interface DatabaseFoodFormProps {
  foodData: FoodData;
  initialTime: string;
  onAddMeal: (meal: Omit<Meal, 'id'>) => void;
  onCancel: () => void;
}

export function DatabaseFoodForm({ foodData, initialTime, onAddMeal, onCancel }: DatabaseFoodFormProps) {
  const [mealName, setMealName] = useState(foodData.name);
  const [servingMultiplier, setServingMultiplier] = useState('1');
  const [notes, setNotes] = useState(foodData.servingSize ? `Serving size: ${foodData.servingSize}` : '');

  const multiplier = parseFloat(servingMultiplier) || 1;

  // Computed from base foodData × multiplier — never user-editable
  const computedCalories = Math.round(foodData.calories * multiplier);
  const computedProtein = (foodData.protein * multiplier).toFixed(1);
  const computedCarbs = (foodData.carbs * multiplier).toFixed(1);
  

  const handleSubmit = () => {
    if (!mealName) return;

    const meal: Omit<Meal, 'id'> = {
      name: mealName,
      calories: computedCalories,
      protein: parseFloat(computedProtein),
      carbs: parseFloat(computedCarbs),
      fats: undefined,
      time: initialTime,
      notes: notes || undefined,
      date: new Date().toISOString().split('T')[0],
    };

    onAddMeal(meal);
    onCancel();
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>From Database</Text>

      <Text style={styles.label}>Meal Name *</Text>
      <TextInput
        style={styles.input}
        value={mealName}
        onChangeText={setMealName}
        placeholder="E.g., Grilled Chicken Breast"
      />

      <Text style={styles.label}>Servings</Text>
      <TextInput
        style={styles.input}
        keyboardType="numeric"
        value={servingMultiplier}
        onChangeText={setServingMultiplier}
      />
      <Text style={styles.infoText}>Adjust servings — nutrition values update automatically</Text>

      {/* Read-only nutrition display */}
      <View style={styles.nutritionBox}>
        <Text style={styles.nutritionHeading}>Nutrition Info</Text>

        <NutritionRow label="Calories" value={`${computedCalories} kcal`} color="#f97316" />
        <NutritionRow label="Protein"  value={`${computedProtein}g`}       color="#3b82f6" />
        <NutritionRow label="Carbs"    value={`${computedCarbs}g`}         color="#22c55e" />

        {foodData.servingSize && (
          <Text style={styles.infoText}>Base serving: {foodData.servingSize}</Text>
        )}
      </View>

      <Text style={styles.label}>Notes</Text>
      <TextInput
        style={[styles.input, { height: 80 }]}
        multiline
        value={notes}
        onChangeText={setNotes}
        placeholder="Add any notes..."
      />

      <TouchableOpacity style={styles.button} onPress={handleSubmit}>
        <Text style={styles.buttonText}>Log Meal</Text>
      </TouchableOpacity>

      <TouchableOpacity style={[styles.button, styles.outlineButton]} onPress={onCancel}>
        <Text>Cancel</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

// Small helper so each row stays consistent
function NutritionRow({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <View style={styles.nutritionRow}>
      <Text style={styles.nutritionLabel}>{label}</Text>
      <View style={[styles.nutritionValueBox, { borderColor: color }]}>
        <Text style={[styles.nutritionValue, { color }]}>{value}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16 },
  title: { fontSize: 20, fontWeight: '600', marginBottom: 12, textAlign: 'center' },
  label: { marginTop: 12, marginBottom: 4 },
  input: { borderWidth: 1, borderColor: '#ddd', borderRadius: 6, padding: 10 },
  infoText: { fontSize: 12, color: 'gray', marginTop: 4 },
  nutritionBox: {
    padding: 12,
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    marginVertical: 12,
    borderWidth: 1,
    borderColor: '#eee',
  },
  nutritionHeading: {
    fontSize: 13,
    fontWeight: '600',
    color: '#555',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  nutritionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  nutritionLabel: { fontSize: 14, fontWeight: '500', color: '#333' },
  nutritionValueBox: {
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: '#fff',
  },
  nutritionValue: { fontSize: 15, fontWeight: '600' },
  button: { backgroundColor: '#000', padding: 14, borderRadius: 8, alignItems: 'center', marginTop: 12 },
  outlineButton: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#000', marginTop: 8 },
  buttonText: { color: '#fff', fontWeight: '600' },
});