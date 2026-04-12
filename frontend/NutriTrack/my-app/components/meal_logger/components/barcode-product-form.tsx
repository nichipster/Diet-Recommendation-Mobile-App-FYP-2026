import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
  Alert,
} from "react-native";
import { API_URL, getAuthHeaders } from "@/constants/api";

interface FoodDetail {
  external_id: number;
  source: string;
  name: string;
  brand?: string;
  calories: number;
  protein_g: number;
  carb_g: number;
  serving_size: number;
  serving_unit: string;
}

interface BarcodeProductFormProps {
  barcode: string;
  initialTime: string;
  onClose: () => void;
  token: string | null;
  onMealSaved: () => void;
}

export function BarcodeProductForm({
  barcode,
  initialTime,
  onClose,
  token,
  onMealSaved,
}: BarcodeProductFormProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [productData, setProductData] = useState<FoodDetail | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [mealName, setMealName] = useState("");
  const [amount, setAmount] = useState("100");
  const [calories, setCalories] = useState("");
  const [protein, setProtein] = useState("");
  const [carbs, setCarbs] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (barcode && token) {
      fetchProductData();
    }
  }, [barcode, token]);

  const fetchProductData = async () => {
    if (!token) return;
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(`${API_URL}/food/barcode/${barcode}`, {
        headers: getAuthHeaders(token),
      });

      if (!response.ok) {
        setError("Product not found. Enter details manually.");
        setLoading(false);
        return;
      }

      const data: FoodDetail = await response.json();
      setProductData(data);
      setMealName(data.name || "");
      setCalories(data.calories?.toString() || "");
      setProtein(data.protein_g?.toString() || "");
      setCarbs(data.carb_g?.toString() || "");
      setLoading(false);
    } catch (err) {
      setError("Unable to fetch product data. Try again.");
      setLoading(false);
      console.error(err);
    }
  };

  const handleSubmit = async () => {
    if (!mealName || !token || !productData) return;

    setSubmitting(true);
    try {
      // Save external food to backend
      const saveResponse = await fetch(`${API_URL}/food/save-external`, {
        method: "POST",
        headers: getAuthHeaders(token),
        body: JSON.stringify({
          external_id: productData.external_id,
          source: productData.source,
        }),
      });

      if (!saveResponse.ok) {
        throw new Error("Failed to save food");
      }

      const { food_id } = await saveResponse.json();

      // Determine meal type from time
      let mealType = "breakfast";
      const hour = parseInt(initialTime.split(":")[0]);
      if (hour >= 12 && hour < 17) mealType = "lunch";
      else if (hour >= 17) mealType = "dinner";

      // Create meal
      const mealResponse = await fetch(`${API_URL}/meal/`, {
        method: "POST",
        headers: getAuthHeaders(token),
        body: JSON.stringify({
          meal_type: mealType,
          consumed_at: new Date().toISOString(),
          items: [
            {
              food_id,
              amount: parseFloat(amount),
            },
          ],
        }),
      });

      if (!mealResponse.ok) {
        throw new Error("Failed to log meal");
      }

      Alert.alert("Success", "Meal logged successfully!");
      onMealSaved();
      onClose();
    } catch (error) {
      Alert.alert("Error", "Failed to log meal");
      console.error(error);
    } finally {
      setSubmitting(false);
    }
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
        <TouchableOpacity onPress={onClose} style={styles.button}>
          <Text style={styles.buttonText}>Cancel</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 20 }}>
      <Text style={styles.title}>Barcode Scan Result</Text>

      <Text style={styles.label}>Product Name *</Text>
      <TextInput
        style={styles.input}
        value={mealName}
        onChangeText={setMealName}
        placeholder="Product name"
        editable={!submitting}
      />

      <Text style={styles.label}>Amount (g)</Text>
      <TextInput
        style={styles.input}
        value={amount}
        onChangeText={setAmount}
        keyboardType="numeric"
        editable={!submitting}
      />

      <Text style={styles.label}>Calories (per 100g)</Text>
      <TextInput
        style={styles.input}
        value={calories}
        onChangeText={setCalories}
        keyboardType="numeric"
        editable={!submitting}
      />

      <Text style={styles.label}>Protein (g per 100g)</Text>
      <TextInput
        style={styles.input}
        value={protein}
        onChangeText={setProtein}
        keyboardType="numeric"
        editable={!submitting}
      />

      <Text style={styles.label}>Carbs (g per 100g)</Text>
      <TextInput
        style={styles.input}
        value={carbs}
        onChangeText={setCarbs}
        keyboardType="numeric"
        editable={!submitting}
      />

      <Text style={styles.label}>Notes</Text>
      <TextInput
        style={[styles.input, { height: 80 }]}
        value={notes}
        onChangeText={setNotes}
        multiline
        editable={!submitting}
      />

      <TouchableOpacity
        onPress={handleSubmit}
        style={[styles.button, submitting && { opacity: 0.6 }]}
        disabled={submitting}
      >
        {submitting ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Log Meal</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity
        onPress={onClose}
        style={[styles.button, styles.outline]}
        disabled={submitting}
      >
        <Text style={styles.buttonTextDark}>Cancel</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: "#fff" },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  title: { fontSize: 20, fontWeight: "600", marginBottom: 12 },
  label: { fontSize: 14, fontWeight: "600", marginBottom: 5, marginTop: 10 },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    padding: 10,
    borderRadius: 6,
    marginBottom: 8,
  },
  button: {
    backgroundColor: "#000",
    padding: 14,
    borderRadius: 8,
    alignItems: "center",
    marginVertical: 6,
  },
  outline: { backgroundColor: "#fff", borderWidth: 1, borderColor: "#000" },
  buttonText: { color: "#fff", fontWeight: "600" },
  buttonTextDark: { color: "#000", fontWeight: "600" },
  error: { color: "red", fontWeight: "600", marginBottom: 6 },
});