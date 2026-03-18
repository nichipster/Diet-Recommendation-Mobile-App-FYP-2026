import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
} from "react-native";

export interface Meal {
  id: string;
  name: string;
  calories?: number;
  protein?: number;
  carbs?: number;
  time: string;
  notes?: string;
  date: string;
}

interface MealFormProps {
  onAddMeal: (meal: Omit<Meal, "id">) => void;
  initialTime?: string;
  initialData?: Meal;
  onCancel?: () => void;
}

export default function MealForm({
  onAddMeal,
  initialTime = "",
  initialData,
  onCancel,
}: MealFormProps) {

  const [mealName, setMealName] = useState("");
  const [calories, setCalories] = useState("");
  const [protein, setProtein] = useState("");
  const [carbs, setCarbs] = useState("");
  const [notes, setNotes] = useState("");
  const styles = StyleSheet.create({
  card: {
    backgroundColor: "#fff",
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#eee",
  },

  title: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 20,
  },

  label: {
    fontWeight: "600",
    marginBottom: 5,
  },

  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 10,
    marginBottom: 15,
  },

  textArea: {
    height: 80,
    textAlignVertical: "top",
  },

  row: {
    flexDirection: "row",
    gap: 10,
  },

  column: {
    flex: 1,
  },

  logButton: {
    backgroundColor: "#7c3aed",
    padding: 14,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 10,
  },

  cancelButton: {
    backgroundColor: "#6b7280",
    padding: 14,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 10,
  },

  buttonText: {
    color: "#fff",
    fontWeight: "600",
  },
});

  // Populate form when editing
  useEffect(() => {
    if (!initialData) return;

    setMealName(initialData.name || "");
    setCalories(initialData.calories?.toString() || "");
    setProtein(initialData.protein?.toString() || "");
    setCarbs(initialData.carbs?.toString() || "");
    setNotes(initialData.notes || "");
  }, [initialData]);

  const handleSubmit = () => {
    if (!mealName) return;

    const mealTime =
      initialTime ||
      new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

    const meal: Omit<Meal, "id"> = {
      name: mealName,
      calories: calories ? Number(calories) : undefined,
      protein: protein ? Number(protein) : undefined,
      carbs: carbs ? Number(carbs) : undefined,
      time: mealTime,
      notes: notes || undefined,
      date: new Date().toISOString().split("T")[0],
    };

    onAddMeal(meal);

    setMealName("");
    setCalories("");
    setProtein("");
    setCarbs("");
    setNotes("");

    if (onCancel) onCancel();
  };

  return (
    <View style={styles.card}>
      <Text style={styles.title}>
        {initialData ? "Edit Meal" : "Manual Logging"}
      </Text>

      <Text style={styles.label}>Meal Name *</Text>
      <TextInput
        placeholder="e.g. Grilled Chicken Salad"
        value={mealName}
        onChangeText={setMealName}
        style={styles.input}
      />

      <View style={styles.row}>
        <View style={styles.column}>
          <Text style={styles.label}>Calories</Text>
          <TextInput
            keyboardType="numeric"
            value={calories}
            onChangeText={setCalories}
            placeholder="Optional"
            style={styles.input}
          />
        </View>

        <View style={styles.column}>
          <Text style={styles.label}>Protein (g)</Text>
          <TextInput
            keyboardType="numeric"
            value={protein}
            onChangeText={setProtein}
            placeholder="Optional"
            style={styles.input}
          />
        </View>

        <View style={styles.column}>
          <Text style={styles.label}>Carbohydrates (g)</Text>
          <TextInput
            keyboardType="numeric"
            value={carbs}
            onChangeText={setCarbs}
            placeholder="Optional"
            style={styles.input}
          />
        </View>
      </View>

      <Text style={styles.label}>Notes</Text>
      <TextInput
        multiline
        numberOfLines={3}
        placeholder="Add notes about your meal..."
        value={notes}
        onChangeText={setNotes}
        style={[styles.input, styles.textArea]}
      />

      <TouchableOpacity style={styles.logButton} onPress={handleSubmit}>
        <Text style={styles.buttonText}>
          {initialData ? "Save Changes" : "Log Meal"}
        </Text>
      </TouchableOpacity>

      {onCancel && (
        <TouchableOpacity style={styles.cancelButton} onPress={onCancel}>
          <Text style={styles.buttonText}>Cancel</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}
