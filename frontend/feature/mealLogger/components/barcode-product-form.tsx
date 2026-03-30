import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { Meal } from './meal-form';

interface ProductData {
  product_name: string;
  nutriments: {
    'energy-kcal_100g'?: number;
    'proteins_100g'?: number;
    'carbohydrates_100g'?: number;
  };
}

interface BarcodeProductFormProps {
  barcode: string;
  initialTime: string;
  onAddMeal: (meal: Omit<Meal, 'id'>) => void;
  onCancel: () => void;
}

export function BarcodeProductForm({
  barcode,
  initialTime,
  onAddMeal,
  onCancel,
}: BarcodeProductFormProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [productData, setProductData] = useState<ProductData | null>(null);

  const [mealName, setMealName] = useState('');
  const [servings, setServings] = useState('1');
  const [calories, setCalories] = useState('');
  const [protein, setProtein] = useState('');
  const [carbs, setCarbs] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    fetchProductData();
  }, [barcode]);

  const fetchProductData = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(
        `https://world.openfoodfacts.org/api/v2/product/${barcode}.json`
      );
      if (!response.ok) throw new Error('Failed to fetch product data');
      const data = await response.json();
      if (data.status === 0 || !data.product) {
        setError('Product not found. Enter details manually.');
        setLoading(false);
        return;
      }
      const product = data.product;
      setProductData(product);
      setMealName(product.product_name || '');
      const nutriments = product.nutriments || {};
      setCalories(nutriments['energy-kcal_100g']?.toString() || '');
      setProtein(nutriments['proteins_100g']?.toString() || '');
      setCarbs(nutriments['carbohydrates_100g']?.toString() || '');
      setLoading(false);
    } catch (err) {
      setError('Unable to fetch product data. Try again.');
      setLoading(false);
    }
  };

  const calculateNutrition = (base: string, servings: string) => {
    const baseValue = parseFloat(base);
    const servingValue = parseFloat(servings);
    if (isNaN(baseValue) || isNaN(servingValue)) return '';
    return Math.round(baseValue * servingValue).toString();
  };

  const handleSubmit = () => {
    if (!mealName) return;
    const servingMultiplier = parseFloat(servings) || 1;
    const meal: Omit<Meal, 'id'> = {
      name: mealName,
      calories: calories
        ? Math.round(parseFloat(calories) * servingMultiplier)
        : undefined,
      protein: protein
        ? Math.round(parseFloat(protein) * servingMultiplier)
        : undefined,
      carbs: carbs
        ? Math.round(parseFloat(carbs) * servingMultiplier)
        : undefined,
      time: initialTime,
      notes: notes || undefined,
      date: new Date().toISOString().split('T')[0],
    };
    onAddMeal(meal);
    onCancel();
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" />
        <Text>Looking up product...</Text>
      </View>
    );
  }

  if (error && !productData) {
    return (
      <View style={styles.container}>
        <Text style={styles.error}>{error}</Text>
        <Text>Barcode: {barcode}</Text>
        <TouchableOpacity onPress={onCancel} style={styles.button}>
          <Text style={styles.buttonText}>Try Again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 20 }}>
      <Text style={styles.title}>Barcode Scan Result</Text>

      <Text>Product Name *</Text>
      <TextInput
        style={styles.input}
        value={mealName}
        onChangeText={setMealName}
        placeholder="Product name"
      />

      <Text>Servings (100g = 1 serving)</Text>
      <TextInput
        style={styles.input}
        value={servings}
        onChangeText={setServings}
        keyboardType="numeric"
      />
      <Text style={styles.small}>
        Adjust serving size. Values below are per 100g.
      </Text>

      <Text>Calories (per 100g)</Text>
      <TextInput
        style={styles.input}
        value={calories}
        onChangeText={setCalories}
        keyboardType="numeric"
      />

      <Text>Protein (g per 100g)</Text>
      <TextInput
        style={styles.input}
        value={protein}
        onChangeText={setProtein}
        keyboardType="numeric"
      />

      <Text>Carbs (g per 100g)</Text>
      <TextInput
        style={styles.input}
        value={carbs}
        onChangeText={setCarbs}
        keyboardType="numeric"
      />

      {servings && parseFloat(servings) !== 1 && (
        <View style={styles.alert}>
          <Text>
            Total nutrition: ~{calculateNutrition(calories, servings)} cal, ~
            {calculateNutrition(protein, servings)}g protein, ~
            {calculateNutrition(carbs, servings)}g carbs
          </Text>
        </View>
      )}

      <Text>Notes</Text>
      <TextInput
        style={[styles.input, { height: 80 }]}
        value={notes}
        onChangeText={setNotes}
        multiline
      />

      <TouchableOpacity onPress={handleSubmit} style={styles.button}>
        <Text style={styles.buttonText}>Log Meal</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={onCancel} style={[styles.button, styles.outline]}>
        <Text>Cancel</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 20, fontWeight: '600', marginBottom: 12 },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    padding: 10,
    borderRadius: 6,
    marginBottom: 8,
  },
  small: { fontSize: 12, color: '#555', marginBottom: 8 },
  alert: {
    backgroundColor: '#f0f0f0',
    padding: 10,
    borderRadius: 6,
    marginVertical: 8,
  },
  button: {
    backgroundColor: '#000',
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginVertical: 6,
  },
  outline: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#000' },
  buttonText: { color: '#fff', fontWeight: '600' },
  error: { color: 'red', fontWeight: '600', marginBottom: 6 },
});