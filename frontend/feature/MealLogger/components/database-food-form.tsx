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
  const [calories, setCalories] = useState(foodData.calories.toString());
  const [protein, setProtein] = useState(foodData.protein.toString());
  const [carbs, setCarbs] = useState(foodData.carbs.toString());
  const [servingMultiplier, setServingMultiplier] = useState('1');
  const [notes, setNotes] = useState(foodData.servingSize ? `Serving size: ${foodData.servingSize}` : '');

  const multiplier = parseFloat(servingMultiplier) || 1;

  const handleSubmit = () => {
    if (!mealName) return;

    const meal: Omit<Meal, 'id'> = {
      name: mealName,
      calories: calories ? Math.round(parseFloat(calories) * multiplier) : undefined,
      protein: protein ? parseFloat((parseFloat(protein) * multiplier).toFixed(1)) : undefined,
      carbs: carbs ? parseFloat((parseFloat(carbs) * multiplier).toFixed(1)) : undefined,
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
      <Text style={styles.infoText}>Adjust servings; nutrition values update automatically</Text>

      <View style={styles.nutritionBox}>
        <View style={styles.nutritionRow}>
          <Text style={styles.nutritionLabel}>Calories</Text>
          <Text style={[styles.nutritionValue, { color: 'orange' }]}>{Math.round(parseFloat(calories) * multiplier)}</Text>
        </View>
        <View style={styles.nutritionRow}>
          <Text style={styles.nutritionLabel}>Protein</Text>
          <Text style={[styles.nutritionValue, { color: 'blue' }]}>{(parseFloat(protein) * multiplier).toFixed(1)}g</Text>
        </View>
        <View style={styles.nutritionRow}>
          <Text style={styles.nutritionLabel}>Carbs</Text>
          <Text style={[styles.nutritionValue, { color: 'green' }]}>{(parseFloat(carbs) * multiplier).toFixed(1)}g</Text>
        </View>
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

const styles = StyleSheet.create({
  container: { padding: 16 },
  title: { fontSize: 20, fontWeight: '600', marginBottom: 12, textAlign: 'center' },
  label: { marginTop: 12, marginBottom: 4 },
  input: { borderWidth: 1, borderColor: '#ddd', borderRadius: 6, padding: 10 },
  infoText: { fontSize: 12, color: 'gray', marginTop: 2 },
  nutritionBox: { padding: 12, backgroundColor: '#f2f2f2', borderRadius: 6, marginVertical: 12 },
  nutritionRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  nutritionLabel: { fontSize: 14, fontWeight: '500' },
  nutritionValue: { fontSize: 16, fontWeight: '600' },
  button: { backgroundColor: '#000', padding: 14, borderRadius: 8, alignItems: 'center', marginTop: 12 },
  outlineButton: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#000', marginTop: 8 },
  buttonText: { color: '#fff', fontWeight: '600' },
});